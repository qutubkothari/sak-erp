import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  private supabase: SupabaseClient;

  private normalizeEmail(email: unknown): string {
    return String(email ?? '').trim().toLowerCase();
  }

  private normalizeUsername(username: unknown): string {
    return String(username ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 100);
  }

  private isMissingColumnError(error: unknown, columnName: string): boolean {
    const message = error && typeof error === 'object' && 'message' in error
      ? String((error as any).message)
      : String(error ?? '');

    const lower = message.toLowerCase();
    const column = columnName.toLowerCase();

    return lower.includes('does not exist') && lower.includes(column);
  }

  private splitName(firstName?: string, lastName?: string, employeeName?: string) {
    const trimmedFirst = String(firstName ?? '').trim();
    const trimmedLast = String(lastName ?? '').trim();

    if (trimmedFirst || trimmedLast) {
      return { firstName: trimmedFirst, lastName: trimmedLast };
    }

    const fallback = String(employeeName ?? '').trim();
    if (!fallback) {
      return { firstName: '', lastName: '' };
    }

    const parts = fallback.split(/\s+/).filter(Boolean);
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' '),
    };
  }

  private buildEmployeeName(firstName?: string, lastName?: string, employeeName?: string) {
    const explicitName = String(employeeName ?? '').trim();
    if (explicitName) return explicitName;

    const fullName = [String(firstName ?? '').trim(), String(lastName ?? '').trim()]
      .filter(Boolean)
      .join(' ')
      .trim();

    return fullName;
  }

  private normalizeRequiredEmail(email: unknown) {
    const normalizedEmail = this.normalizeEmail(email);

    if (!normalizedEmail) {
      throw new ConflictException('Email is required');
    }

    return normalizedEmail;
  }

  private async tryLoadEmployeeLinks(tenantId: string, users: any[]) {
    const map = new Map<string, any>();
    if (!Array.isArray(users) || users.length === 0) return map;

    const userIds = users.map((u: any) => String(u?.id || '')).filter(Boolean);

    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('id, tenant_id, user_id, employee_code, employee_name, designation, department, email, status')
        .eq('tenant_id', tenantId)
        .in('user_id', userIds);

      if (error) throw error;

      for (const row of data || []) {
        if ((row as any)?.user_id) {
          map.set(String((row as any).user_id), row);
        }
      }

      return map;
    } catch (error) {
      return map;
    }
  }

  private async ensureUniqueUsername(tenantId: string, username: string, ignoreUserId?: string) {
    const normalizedUsername = this.normalizeUsername(username);

    if (!normalizedUsername) {
      throw new ConflictException('Username is required');
    }

    let query = this.supabase
      .from('users')
      .select('id')
      .ilike('username', normalizedUsername)
      .eq('tenant_id', tenantId);

    if (ignoreUserId) {
      query = query.neq('id', ignoreUserId);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      throw new ConflictException('User with this username already exists');
    }

    return normalizedUsername;
  }

  private async tryLoadUserRoles(tenantId: string, userIds: string[]) {
    if (userIds.length === 0) return new Map<string, any[]>();

    try {
      // Load each role definition once. The previous embedded relation repeated
      // the complete permissions JSON for every user-role assignment.
      const [assignmentsResult, rolesResult] = await Promise.all([
        this.supabase
          .from('user_roles')
          .select('user_id, role_id')
          .eq('tenant_id', tenantId)
          .in('user_id', userIds),
        this.supabase
          .from('roles')
          .select('id, name, permissions')
          .eq('tenant_id', tenantId),
      ]);

      if (assignmentsResult.error) throw assignmentsResult.error;
      if (rolesResult.error) throw rolesResult.error;

      const roleById = new Map(
        (rolesResult.data || []).map((role: any) => [String(role.id), role]),
      );

      const map = new Map<string, any[]>();
      for (const row of assignmentsResult.data || []) {
        const uid = (row as any).user_id as string;
        const role = roleById.get(String((row as any).role_id || ''));
        if (!uid || !role) continue;
        const list = map.get(uid) ?? [];
        list.push(role);
        map.set(uid, list);
      }
      return map;
    } catch {
      return new Map<string, any[]>();
    }
  }

  private async trySyncUserRoles(tenantId: string, userId: string, roleIds: string[]) {
    const removed = await this.supabase
      .from('user_roles')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('user_id', userId);
    if (removed.error) throw new Error(`Unable to replace user roles: ${removed.error.message}`);

    if (roleIds.length === 0) return;

    const rows = roleIds.map((roleId) => ({
      tenant_id: tenantId,
      user_id: userId,
      role_id: roleId,
    }));

    const inserted = await this.supabase.from('user_roles').insert(rows);
    if (inserted.error) throw new Error(`Unable to assign approved roles: ${inserted.error.message}`);
  }

  private async currentRoleIds(tenantId: string, userId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('user_roles')
      .select('role_id')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId);
    if (error) throw new Error(`Unable to read current roles: ${error.message}`);
    const ids = (data || []).map((row: any) => String(row.role_id)).filter(Boolean).sort();
    if (ids.length) return ids;

    // Support older records that only have the legacy primary role column.
    const legacy = await this.supabase
      .from('users')
      .select('role_id')
      .eq('tenant_id', tenantId)
      .eq('id', userId)
      .maybeSingle();
    if (legacy.error) throw new Error(`Unable to read current role: ${legacy.error.message}`);
    return legacy.data?.role_id ? [String(legacy.data.role_id)] : [];
  }

  private async requestRoleChange(tenantId: string, userId: string, roleIds: string[], requestedBy: string) {
    const requested = [...new Set(roleIds.map(String).filter(Boolean))].sort();
    if (requested.length) {
      const { data: tenantRoles, error: roleError } = await this.supabase
        .from('roles')
        .select('id')
        .eq('tenant_id', tenantId)
        .in('id', requested);
      if (roleError) throw new Error(`Unable to validate tenant roles: ${roleError.message}`);
      if ((tenantRoles || []).length !== requested.length) {
        throw new ForbiddenException('One or more selected roles are not available in this tenant.');
      }
    }
    const previous = await this.currentRoleIds(tenantId, userId);
    if (requested.join(',') === previous.join(',')) return null;

    const { data: pending } = await this.supabase
      .from('user_role_change_requests')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('status', 'PENDING')
      .maybeSingle();
    if (pending) throw new ConflictException('A role change for this user is already awaiting approval.');

    const { data, error } = await this.supabase
      .from('user_role_change_requests')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        requested_role_ids: requested,
        previous_role_ids: previous,
        requested_by: requestedBy,
      })
      .select('*')
      .single();
    if (error) throw new Error(`Unable to submit role approval: ${error.message}`);
    return data;
  }

  async roleApprovalRequests(tenantId: string, status = 'PENDING') {
    const { data, error } = await this.supabase
      .from('user_role_change_requests')
      .select('*, user:users!user_role_change_requests_user_id_fkey(id, username, email, first_name, last_name), maker:users!user_role_change_requests_requested_by_fkey(id, username, first_name, last_name)')
      .eq('tenant_id', tenantId)
      .eq('status', status)
      .order('requested_at', { ascending: false });
    if (error) throw new Error(`Unable to load role approvals: ${error.message}`);

    const roleIds = [...new Set((data || []).flatMap((row: any) => row.requested_role_ids || []))];
    const roleNames = new Map<string, string>();
    if (roleIds.length) {
      const roles = await this.supabase.from('roles').select('id, name').eq('tenant_id', tenantId).in('id', roleIds);
      if (roles.error) throw new Error(`Unable to load requested roles: ${roles.error.message}`);
      (roles.data || []).forEach((role: any) => roleNames.set(String(role.id), role.name));
    }
    return (data || []).map((row: any) => ({
      ...row,
      requested_roles: (row.requested_role_ids || []).map((id: string) => ({ id, name: roleNames.get(String(id)) || 'Unknown role' })),
    }));
  }

  async decideRoleRequest(requestId: string, tenantId: string, checkerId: string, approve: boolean, note?: string) {
    const { data: request, error } = await this.supabase
      .from('user_role_change_requests')
      .select('*')
      .eq('id', requestId)
      .eq('tenant_id', tenantId)
      .eq('status', 'PENDING')
      .maybeSingle();
    if (error || !request) throw new NotFoundException('Pending role approval not found.');
    if (String(request.requested_by) === String(checkerId)) {
      throw new ForbiddenException('Maker-checker violation: the requester cannot approve or reject their own role request.');
    }

    if (approve) {
      const requestedIds = (request.requested_role_ids || []).map(String).filter(Boolean);
      const { data: requestedRoles, error: requestedRolesError } = requestedIds.length
        ? await this.supabase.from('roles').select('id, name, code').eq('tenant_id', tenantId).in('id', requestedIds)
        : { data: [], error: null };
      if (requestedRolesError) throw new Error(`Unable to validate requested roles: ${requestedRolesError.message}`);
      const privilegedNames = new Set(['SUPER_ADMIN', 'SUPERADMIN', 'OWNER', 'PLATFORM_OWNER']);
      const hasPrivilegedTarget = (requestedRoles || []).some((role: any) => [role.name, role.code]
        .some((value) => privilegedNames.has(String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_'))));
      if (hasPrivilegedTarget) {
        const checkerRoleIds = await this.currentRoleIds(tenantId, checkerId);
        const { data: checkerRoles, error: checkerRolesError } = checkerRoleIds.length
          ? await this.supabase.from('roles').select('name, code').eq('tenant_id', tenantId).in('id', checkerRoleIds)
          : { data: [], error: null };
        if (checkerRolesError) throw new Error(`Unable to validate approver authority: ${checkerRolesError.message}`);
        const isMasterAdmin = (checkerRoles || []).some((role: any) => [role.name, role.code]
          .some((value) => privilegedNames.has(String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_'))));
        if (!isMasterAdmin) throw new ForbiddenException('Only a Master Admin can approve assignment of a privileged role.');
      }
      await this.trySyncUserRoles(tenantId, request.user_id, request.requested_role_ids || []);
      const { error: userError } = await this.supabase
        .from('users')
        .update({ role_id: request.requested_role_ids?.[0] || null })
        .eq('tenant_id', tenantId)
        .eq('id', request.user_id);
      if (userError) throw new Error(`Unable to apply approved roles: ${userError.message}`);
    }

    const { data, error: decisionError } = await this.supabase
      .from('user_role_change_requests')
      .update({
        status: approve ? 'APPROVED' : 'REJECTED',
        decided_by: checkerId,
        decided_at: new Date().toISOString(),
        decision_note: String(note || '').trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('tenant_id', tenantId)
      .eq('status', 'PENDING')
      .select('*')
      .single();
    if (decisionError) throw new Error(`Unable to record role decision: ${decisionError.message}`);
    return data;
  }

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_KEY must be set');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async findAll(tenantId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select(`
        id,
        username,
        email,
        first_name,
        last_name,
        is_active,
        last_login_at,
        created_at,
        role:roles (
          id,
          name,
          permissions
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    const users = data || [];
    const rolesByUserId = await this.tryLoadUserRoles(
      tenantId,
      users.map((u: any) => u.id),
    );

    const employeesByUserId = await this.tryLoadEmployeeLinks(tenantId, users);

    return users.map((u: any) => {
      const multi = rolesByUserId.get(u.id) ?? [];
      const fallback = u.role ? [u.role] : [];
      const employee = employeesByUserId.get(u.id) || null;
      return {
        ...u,
        employee,
        roles: (multi.length > 0 ? multi : fallback).map((role: any) => ({ role })),
      };
    });
  }

  async employeeCandidates(tenantId: string) {
    const { data, error } = await this.supabase
      .from('employees')
      .select('id, employee_code, employee_name, designation, department, email, status')
      .eq('tenant_id', tenantId)
      .eq('status', 'ACTIVE')
      .is('user_id', null)
      .order('employee_name', { ascending: true });
    if (error) throw new Error(`Unable to load employees eligible for account access: ${error.message}`);
    return data || [];
  }

  async findOne(id: string, tenantId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select(`
        id,
        username,
        email,
        first_name,
        last_name,
        is_active,
        created_at,
        role:roles (
          id,
          name,
          permissions
        )
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      throw new NotFoundException('User not found');
    }

    const rolesByUserId = await this.tryLoadUserRoles(tenantId, [data.id]);
    const multi = rolesByUserId.get(data.id) ?? [];
    const fallback = (data as any).role ? [(data as any).role] : [];

    const employeesByUserId = await this.tryLoadEmployeeLinks(tenantId, [data]);

    return {
      ...data,
      employee: employeesByUserId.get(data.id) || null,
      roles: (multi.length > 0 ? multi : fallback).map((role: any) => ({ role })),
    };
  }

  async create(dto: {
    username: string;
    password: string;
    employee_id: string;
    roleId?: string;
    roleIds?: string[];
    tenantId: string;
  }, requestedBy: string) {
    if (String(dto.password || '').length < 10) {
      throw new ConflictException('Temporary password must be at least 10 characters.');
    }
    const employeeId = String(dto.employee_id || '').trim();
    if (!employeeId) {
      throw new ConflictException('Select an existing HR employee before creating account access.');
    }
    const { data: employee, error: employeeError } = await this.supabase
      .from('employees')
      .select('id, tenant_id, user_id, employee_name, email, status')
      .eq('tenant_id', dto.tenantId)
      .eq('id', employeeId)
      .maybeSingle();
    if (employeeError || !employee) throw new NotFoundException('HR employee not found for this tenant.');
    if (employee.user_id) throw new ConflictException('This HR employee already has a linked user account.');
    if (String(employee.status || 'ACTIVE').toUpperCase() !== 'ACTIVE') {
      throw new ConflictException('Only active HR employees can be given account access.');
    }
    const normalizedEmail = this.normalizeRequiredEmail(employee.email);
    const { firstName, lastName } = this.splitName(undefined, undefined, employee.employee_name);
    if (!firstName) throw new ConflictException('The selected HR employee needs a name in Employee Master.');
    const normalizedUsername = await this.ensureUniqueUsername(dto.tenantId, dto.username);

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const roleIds = Array.isArray(dto.roleIds)
      ? dto.roleIds.filter(Boolean)
      : dto.roleId
        ? [dto.roleId]
        : [];

    // Create user
    const { data, error } = await this.supabase
      .from('users')
      .insert({
        username: normalizedUsername,
        email: normalizedEmail,
        password: hashedPassword,
        must_change_password: true,
        first_name: firstName,
        last_name: lastName,
        role_id: null,
        tenant_id: dto.tenantId,
        is_active: true,
      })
      .select(`
        id,
        username,
        email,
        first_name,
        last_name,
        is_active,
        must_change_password,
        created_at
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    try {
      const { data: linked, error: linkError } = await this.supabase
        .from('employees')
        .update({ user_id: data.id, updated_at: new Date().toISOString() })
        .eq('tenant_id', dto.tenantId)
        .eq('id', employeeId)
        .is('user_id', null)
        .select('id')
        .maybeSingle();
      if (linkError || !linked) {
        throw new ConflictException('Employee account linkage changed. Refresh the register and try again.');
      }
      const roleApproval = roleIds.length
        ? await this.requestRoleChange(dto.tenantId, data.id, roleIds, requestedBy)
        : null;
      return { ...data, role_approval: roleApproval };
    } catch (syncError: any) {
      await this.supabase
        .from('employees')
        .update({ user_id: null, updated_at: new Date().toISOString() })
        .eq('tenant_id', dto.tenantId)
        .eq('id', employeeId)
        .eq('user_id', data.id);
      await this.supabase
        .from('user_roles')
        .delete()
        .eq('tenant_id', dto.tenantId)
        .eq('user_id', data.id);

      await this.supabase
        .from('users')
        .delete()
        .eq('tenant_id', dto.tenantId)
        .eq('id', data.id);

      throw new Error(syncError?.message || 'Failed to create employee profile');
    }

    return data;
  }

  async requirePasswordChange(id: string, tenantId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .update({ must_change_password: true })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id, must_change_password')
      .maybeSingle();
    if (error || !data) throw new NotFoundException('User not found for this tenant.');
    return data;
  }

  async update(
    id: string,
    dto: {
      first_name?: string;
      last_name?: string;
      username?: string;
      role_id?: string;
      roleIds?: string[];
      is_active?: boolean;
      email?: string;
      employee_code?: string;
      employee_name?: string;
      designation?: string;
      department?: string;
      date_of_joining?: string;
      date_of_birth?: string;
      contact_number?: string;
      address?: string;
      biometric_id?: string;
    },
    tenantId: string,
    requestedBy: string,
  ) {
    const roleIds = Array.isArray((dto as any).roleIds)
      ? (dto as any).roleIds.filter(Boolean)
      : dto.role_id
        ? [dto.role_id]
        : null;

    const updateDto: any = { ...dto };
    delete updateDto.roleIds;

    const { data: employeeLink, error: employeeLookupError } = await this.supabase
      .from('employees')
      .select('id, employee_name, email, status')
      .eq('tenant_id', tenantId)
      .eq('user_id', id)
      .maybeSingle();
    if (employeeLookupError && !this.isMissingColumnError(employeeLookupError, 'user_id')) {
      throw new Error(`Unable to validate the HR employee link: ${employeeLookupError.message}`);
    }
    const linkedEmployee = employeeLookupError ? null : employeeLink;
    if (linkedEmployee) {
      // HR Employee Master owns identity and employment status for linked accounts.
      delete updateDto.email;
      delete updateDto.first_name;
      delete updateDto.last_name;
      if (dto.is_active === true && String(linkedEmployee.status || 'ACTIVE').toUpperCase() !== 'ACTIVE') {
        throw new ConflictException('Reactivate this account only after the linked HR employee is active.');
      }
    }

    if (typeof updateDto.username === 'string') {
      updateDto.username = await this.ensureUniqueUsername(tenantId, updateDto.username, id);
    }

    if (typeof updateDto.email === 'string') {
      updateDto.email = this.normalizeRequiredEmail(updateDto.email);
    }

    delete updateDto.employee_code;
    delete updateDto.employee_name;
    delete updateDto.designation;
    delete updateDto.department;
    delete updateDto.date_of_joining;
    delete updateDto.date_of_birth;
    delete updateDto.contact_number;
    delete updateDto.address;
    delete updateDto.biometric_id;

    delete updateDto.role_id;

    const { data, error } = await this.supabase
      .from('users')
      .update(updateDto)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(`
        id,
        username,
        email,
        first_name,
        last_name,
        is_active,
        created_at
      `)
      .single();

    if (error || !data) {
      throw new NotFoundException('User not found');
    }

    const roleApproval = roleIds
      ? await this.requestRoleChange(tenantId, id, roleIds, requestedBy)
      : null;

    return { ...data, role_approval: roleApproval };
  }

  async delete(id: string, tenantId: string) {
    // First check if user exists
    const { data: user, error: findError } = await this.supabase
      .from('users')
      .select('username, email, first_name, last_name')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (findError || !user) {
      throw new NotFoundException('User not found');
    }

    const { error } = await this.supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      // Check if it's a foreign key constraint error
      if (error.code === '23503') {
        throw new Error(
          `Cannot delete user ${user.first_name} ${user.last_name} (${user.username || user.email}) because they have associated records in the system. ` +
          `Please reassign or delete their records first, or deactivate the user instead.`
        );
      }
      throw new Error(`Failed to delete user: ${error.message}`);
    }

    // Removing login access must not deactivate the HR employee record.
    const { error: unlinkError } = await this.supabase
      .from('employees')
      .update({ user_id: null, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('user_id', id);
    if (unlinkError) throw new Error(`User access was removed but HR employee linkage needs review: ${unlinkError.message}`);

    return { message: 'User deleted successfully' };
  }
}
