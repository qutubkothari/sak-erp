import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';

interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  roleId?: string;
}

interface LoginDto {
  email: string;
  password: string;
  tenantId: string;
}

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_KEY must be set in environment variables');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async register(dto: RegisterDto) {
    // Get or use default tenant if not provided
    let tenantId = dto.tenantId;
    if (!tenantId) {
      // Get the default tenant (first active tenant)
      const { data: defaultTenant, error: tenantError } = await this.supabase
        .from('tenants')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single();
      
      if (tenantError || !defaultTenant) {
        throw new Error('No active tenant found. Please contact administrator.');
      }
      tenantId = defaultTenant.id;
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', dto.email)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Get default role if not provided
    let roleId = dto.roleId;
    if (!roleId) {
      const { data: defaultRole, error: roleError } = await this.supabase
        .from('roles')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('name', 'USER')
        .maybeSingle();
      
      if (roleError && roleError.code !== 'PGRST116') {
        throw new Error(`Failed to fetch default role: ${roleError.message}`);
      }
      roleId = defaultRole?.id;
    }

    // Create user
    const { data: newUser, error: createError } = await this.supabase
      .from('users')
      .insert({
        email: dto.email,
        password: hashedPassword,
        first_name: dto.firstName,
        last_name: dto.lastName,
        tenant_id: tenantId,
        role_id: roleId,
        is_active: true,
      })
      .select('id, email, first_name, last_name, tenant_id')
      .single();

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    // Fetch user with role for response
    const { data: userWithRole, error: fetchError } = await this.supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role:roles (
          id,
          name,
          permissions
        )
      `)
      .eq('id', newUser.id)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch user details: ${fetchError.message}`);
    }

    // Transform to match expected format
    const user = {
      id: userWithRole.id,
      email: userWithRole.email,
      firstName: userWithRole.first_name,
      lastName: userWithRole.last_name,
      roles: userWithRole.role ? [{ role: userWithRole.role }] : [],
    };

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, tenantId);

    return {
      user,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    // Get or use default tenant if not provided
    let tenantId = dto.tenantId;
    if (!tenantId) {
      const { data: defaultTenant } = await this.supabase
        .from('tenants')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single();
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      throw new UnauthorizedException('No active tenant found');
    }

    // Find user
    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select(`
        id,
        email,
        password,
        is_active,
        tenant_id,
        first_name,
        last_name,
        role:roles (
          id,
          name,
          permissions
        )
      `)
      .eq('email', dto.email)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (userError || !user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, tenantId);

    // Remove password from response and transform to camelCase
    const { password, ...userWithoutPassword } = user;
    const transformedUser = {
      ...userWithoutPassword,
      firstName: user.first_name,
      lastName: user.last_name,
      tenantId: user.tenant_id,
      isActive: user.is_active,
      roles: user.role ? [{ role: user.role }] : [],
    };

    return {
      user: transformedUser,
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('id, email, is_active, tenant_id')
        .eq('id', payload.sub)
        .single();

      if (userError || !user || !user.is_active) {
        throw new UnauthorizedException('Invalid token');
      }

      return this.generateTokens(user.id, user.email, user.tenant_id);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    // Could implement token blacklist here if needed
    return { message: 'Logged out successfully' };
  }

  async validateUser(userId: string, tenantId: string) {
    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        is_active,
        tenant_id,
        role:roles (
          id,
          name,
          permissions
        )
      `)
      .eq('id', userId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .maybeSingle();

    if (userError || !user) {
      return null;
    }

    // Transform to camelCase format
    const result = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      isActive: user.is_active,
      tenantId: user.tenant_id,
      roles: user.role ? [{ role: user.role }] : [],
    };

    return result;
  }

  private async generateTokens(userId: string, email: string, tenantId: string) {
    const payload = { sub: userId, email, tenantId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'default-secret',
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select('id, password')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const { error: updateError } = await this.supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Failed to update password: ${updateError.message}`);
    }

    return { message: 'Password changed successfully' };
  }

  async resetPasswordRequest(email: string, tenantId: string) {
    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (userError || !user) {
      // Don't reveal if user exists
      return { message: 'If user exists, password reset email will be sent' };
    }

    // Generate reset token (24 hour expiry)
    const resetToken = this.jwtService.sign(
      { sub: user.id, type: 'reset' },
      { expiresIn: '24h' },
    );

    // TODO: Send email with reset link
    // await this.emailService.sendPasswordReset(user.email, resetToken);

    return { message: 'If user exists, password reset email will be sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwtService.verify(token);

      if (payload.type !== 'reset') {
        throw new UnauthorizedException('Invalid reset token');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      const { error: updateError } = await this.supabase
        .from('users')
        .update({ password: hashedPassword })
        .eq('id', payload.sub);

      if (updateError) {
        throw new Error(`Failed to reset password: ${updateError.message}`);
      }

      return { message: 'Password reset successfully' };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }
}
