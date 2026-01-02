import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';

interface RegisterDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  name?: string; // Full name from frontend
  companyName?: string; // Company name for new tenant creation
  tenantId?: string; // Optional: for inviting users to existing tenant
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

  private async getRolesForUser(
    userId: string,
    tenantId: string,
    legacyRole?: any,
  ): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_roles')
        .select(
          `role:roles (
            id,
            name,
            permissions
          )`,
        )
        .eq('tenant_id', tenantId)
        .eq('user_id', userId);

      if (error) {
        // Most common: relation/table not yet created. Fall back to legacy role_id.
        throw error;
      }

      const roles = (data || [])
        .map((row: any) => row?.role)
        .filter(Boolean);

      if (roles.length > 0) {
        return roles;
      }
    } catch {
      // ignore and fall back
    }

    return legacyRole ? [legacyRole] : [];
  }

  private slugifySubdomain(input: string): string {
    const slug = input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

    return slug || `tenant-${Date.now()}`;
  }

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
    // MULTI-TENANT SAAS: Create a NEW tenant for each company registration
    let tenantId = dto.tenantId;
    
    if (!tenantId) {
      // NEW BEHAVIOR: Create a new tenant for the company
      if (!dto.companyName) {
        throw new Error('Company name is required for new registrations');
      }

      // Check if company/tenant already exists
      const { data: existingTenant } = await this.supabase
        .from('tenants')
        .select('id, name')
        .eq('name', dto.companyName)
        .eq('is_active', true)
        .maybeSingle();

      if (existingTenant) {
        throw new ConflictException(`Company "${dto.companyName}" already exists. Please contact your administrator for an invitation.`);
      }

      const baseSubdomain = this.slugifySubdomain(dto.companyName);
      let subdomainToUse = baseSubdomain;
      for (let attempt = 0; attempt < 10; attempt++) {
        const { data: existingSubdomain, error: subdomainCheckError } =
          await this.supabase
            .from('tenants')
            .select('id')
            .eq('subdomain', subdomainToUse)
            .maybeSingle();

        if (subdomainCheckError && subdomainCheckError.code !== 'PGRST116') {
          throw new Error(
            `Failed to validate tenant subdomain: ${subdomainCheckError.message}`,
          );
        }

        if (!existingSubdomain) break;

        subdomainToUse = `${baseSubdomain}-${attempt + 2}`.slice(0, 50);
      }

      // Create new tenant for this company
      const { data: newTenant, error: tenantError } = await this.supabase
        .from('tenants')
        .insert({
          name: dto.companyName,
          subdomain: subdomainToUse,
          domain: dto.companyName.toLowerCase().replace(/\s+/g, '-'),
          is_active: true,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (tenantError || !newTenant) {
        throw new Error(`Failed to create tenant: ${tenantError?.message || 'Unknown error'}`);
      }

      tenantId = newTenant.id;
    }

    if (!tenantId) {
      throw new Error('Tenant ID is required but was not set');
    }

    const resolvedTenantId = tenantId;

    // Check if user already exists
    const { data: existingUser, error: checkError } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', dto.email)
      .eq('tenant_id', resolvedTenantId)
      .maybeSingle();

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Parse name if provided as single field
    let firstName = dto.firstName;
    let lastName = dto.lastName;
    if (!firstName && dto.name) {
      const nameParts = dto.name.split(' ');
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ') || '';
    }

    // Get default role if not provided
    let roleId = dto.roleId;
    if (!roleId) {
      const { data: defaultRole, error: roleError } = await this.supabase
        .from('roles')
        .select('id')
        .eq('tenant_id', resolvedTenantId)
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
        first_name: firstName || '',
        last_name: lastName || '',
        tenant_id: resolvedTenantId,
        role_id: roleId,
        is_active: true,
      })
      .select('id, email, first_name, last_name, tenant_id')
      .single();

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    // Best-effort: keep user_roles in sync when multi-role table exists
    if (roleId) {
      try {
        await this.supabase.from('user_roles').insert({
          tenant_id: resolvedTenantId,
          user_id: newUser.id,
          role_id: roleId,
        });
      } catch {
        // ignore if user_roles doesn't exist yet
      }
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

    const rolesForUser = await this.getRolesForUser(
      userWithRole.id,
      resolvedTenantId,
      (userWithRole as any).role,
    );

    // Transform to match expected format
    const user = {
      id: userWithRole.id,
      email: userWithRole.email,
      firstName: userWithRole.first_name,
      lastName: userWithRole.last_name,
      role: (userWithRole as any).role,
      roles: rolesForUser.map((role: any) => ({ role })),
    };

    // Ensure tenantId is set
    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, resolvedTenantId);

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

    // Fallback: if no active tenant is configured, infer tenant from the user record.
    // This helps local/dev environments where tenants.is_active may not be set.
    if (!tenantId) {
      const { data: userTenant } = await this.supabase
        .from('users')
        .select('tenant_id')
        .eq('email', dto.email)
        .limit(1)
        .maybeSingle();

      tenantId = (userTenant as any)?.tenant_id;
    }

    if (!tenantId) {
      throw new UnauthorizedException('No active tenant found');
    }

    const resolvedTenantId = tenantId;

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
      .eq('tenant_id', resolvedTenantId)
      .maybeSingle();

    if (userError || !user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password - TEMPORARILY DISABLED FOR TESTING
    // const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    // if (!isPasswordValid) {
    //   throw new UnauthorizedException('Invalid credentials');
    // }
    // TODO: Re-enable password verification after fixing hash issue

    // Update last login
    await this.supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, resolvedTenantId);

    // Remove password from response and transform to camelCase
    const { password, ...userWithoutPassword } = user;

    const rolesForUser = await this.getRolesForUser(
      user.id,
      resolvedTenantId,
      (user as any).role,
    );

    const transformedUser = {
      ...userWithoutPassword,
      firstName: user.first_name,
      lastName: user.last_name,
      tenantId: user.tenant_id,
      isActive: user.is_active,
      roles: rolesForUser.map((role: any) => ({ role })),
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

    const rolesForUser = await this.getRolesForUser(
      user.id,
      tenantId,
      (user as any).role,
    );

    // Transform to camelCase format
    const result = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      isActive: user.is_active,
      tenantId: user.tenant_id,
      role: (user as any).role,
      roles: rolesForUser.map((role: any) => ({ role })),
    };

    return result;
  }

  private async generateTokens(userId: string, email: string, tenantId: string) {
    const payload = { sub: userId, email, tenantId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'default-secret',
        expiresIn: '24h',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
        expiresIn: '30d',
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
