import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class ServiceService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = new SupabaseClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_KEY || '',
    );
  }

  // ==================== Service Tickets ====================

  async createServiceTicket(tenantId: string, userId: string, data: any) {
    // Generate ticket number
    const ticketNumber = await this.generateTicketNumber(tenantId);

    // Validate warranty if UID provided
    let warrantyValidation: any = null;
    if (data.uid) {
      warrantyValidation = await this.validateWarrantyForUID(tenantId, data.uid);
    }

    const ticketData = {
      tenant_id: tenantId,
      ticket_number: ticketNumber,
      customer_id: data.customer_id,
      uid: data.uid || null,
      ship_name: data.ship_name || null,
      location: data.location || null,
      warranty_id: warrantyValidation?.warranty?.id || null,
      service_type: warrantyValidation?.is_valid ? 'WARRANTY' : data.service_type || 'PAID',
      priority: data.priority || 'MEDIUM',
      status: 'OPEN',
      complaint_date: data.complaint_date || new Date().toISOString().split('T')[0],
      complaint_description: data.complaint_description,
      reported_by: data.reported_by,
      contact_number: data.contact_number,
      email: data.email,
      product_name: data.product_name,
      model_number: data.model_number,
      serial_number: data.serial_number,
      installation_date: data.installation_date,
      service_location: data.service_location,
      is_under_warranty: warrantyValidation?.is_valid || false,
      warranty_valid_until: warrantyValidation?.warranty?.warranty_end_date || null,
      expected_completion_date: data.expected_completion_date,
      estimated_cost: warrantyValidation?.is_valid ? 0 : data.estimated_cost || 0,
      attachments: data.attachments || [],
      created_by: userId,
    };

    const { data: ticket, error } = await this.supabase
      .from('service_tickets')
      .insert(ticketData)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return ticket;
  }

  async getServiceTickets(tenantId: string, filters?: any) {
    let query = this.supabase
      .from('service_tickets')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.service_type) {
      query = query.eq('service_type', filters.service_type);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }
    if (filters?.uid) {
      query = query.eq('uid', filters.uid);
    }

    const { data: tickets, error } = await query;

    if (error) throw new BadRequestException(error.message);

    // Fetch related data separately
    if (tickets && tickets.length > 0) {
      const customerIds = [...new Set(tickets.map(t => t.customer_id).filter(Boolean))];
      const warrantyIds = [...new Set(tickets.map(t => t.warranty_id).filter(Boolean))];

      // Fetch customers
      let customersMap: Record<string, any> = {};
      if (customerIds.length > 0) {
        const { data: customers } = await this.supabase
          .from('customers')
          .select('id, customer_name, customer_code')
          .in('id', customerIds);
        
        if (customers) {
          customersMap = Object.fromEntries(customers.map(c => [c.id, c]));
        }
      }

      // Fetch warranties
      let warrantiesMap: Record<string, any> = {};
      if (warrantyIds.length > 0) {
        const { data: warranties } = await this.supabase
          .from('warranties')
          .select('id, warranty_number, warranty_end_date')
          .in('id', warrantyIds);
        
        if (warranties) {
          warrantiesMap = Object.fromEntries(warranties.map(w => [w.id, w]));
        }
      }

      // Attach related data to tickets
      return tickets.map(ticket => ({
        ...ticket,
        customer: customersMap[ticket.customer_id] || null,
        warranty: ticket.warranty_id ? warrantiesMap[ticket.warranty_id] || null : null,
      }));
    }

    return tickets || [];
  }

  async getServiceTicketById(tenantId: string, ticketId: string) {
    const { data, error } = await this.supabase
      .from('service_tickets')
      .select(`
        *,
        customer:customers(*),
        warranty:warranties(*),
        assignments:service_assignments(
          *,
          technician:technicians(*)
        ),
        parts_used:service_parts_used(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('id', ticketId)
      .single();

    if (error) throw new NotFoundException('Service ticket not found');

    return data;
  }

  async updateServiceTicket(tenantId: string, ticketId: string, data: any) {
    const { data: ticket, error } = await this.supabase
      .from('service_tickets')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return ticket;
  }

  async closeServiceTicket(tenantId: string, ticketId: string, userId: string, data: any) {
    // Update ticket status to CLOSED
    const { data: ticket, error } = await this.supabase
      .from('service_tickets')
      .update({
        status: 'CLOSED',
        actual_completion_date: data.completion_date || new Date().toISOString().split('T')[0],
        resolution_description: data.resolution_description,
        actual_cost: data.actual_cost,
        parts_cost: data.parts_cost,
        labor_cost: data.labor_cost,
        closed_by: userId,
        closed_at: new Date().toISOString(),
        customer_feedback: data.customer_feedback,
        customer_rating: data.customer_rating,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Create service history entry
    if (ticket.uid) {
      await this.createServiceHistoryEntry(tenantId, ticket);
    }

    return ticket;
  }

  // ==================== Warranty Validation ====================

  async validateWarrantyForUID(tenantId: string, uid: string) {
    const { data: warranty, error } = await this.supabase
      .from('warranties')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('uid', uid)
      .eq('status', 'ACTIVE')
      .single();

    if (error || !warranty) {
      // Fallback: deployment tracking (supports part-number based workflows)
      const { data: deploymentStatus } = await this.supabase
        .from('v_uid_deployment_status')
        .select('warranty_expiry_date')
        .eq('tenant_id', tenantId)
        .eq('uid', uid)
        .single();

      const warrantyExpiryDate = deploymentStatus?.warranty_expiry_date;
      if (!warrantyExpiryDate) {
        return {
          is_valid: false,
          warranty: null,
          message: 'No active warranty found for this UID',
        };
      }

      const today = new Date();
      const warrantyEndDate = new Date(warrantyExpiryDate);
      const isValid = today <= warrantyEndDate;

      return {
        is_valid: isValid,
        warranty: {
          warranty_end_date: warrantyExpiryDate,
          source: 'deployment',
        },
        message: isValid
          ? 'Warranty is valid'
          : `Warranty expired on ${warrantyExpiryDate}`,
        days_remaining: isValid
          ? Math.ceil((warrantyEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : 0,
      };
    }

    const today = new Date();
    const warrantyEndDate = new Date(warranty.warranty_end_date);

    const isValid = today <= warrantyEndDate;

    return {
      is_valid: isValid,
      warranty: warranty,
      message: isValid
        ? 'Warranty is valid'
        : `Warranty expired on ${warranty.warranty_end_date}`,
      days_remaining: isValid
        ? Math.ceil((warrantyEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    };
  }

  // ==================== Technicians ====================

  async createTechnician(tenantId: string, data: any) {
    const technicianCode = await this.generateTechnicianCode(tenantId);

    const technicianData = {
      tenant_id: tenantId,
      technician_code: technicianCode,
      technician_name: data.technician_name,
      employee_id: data.employee_id || null,
      specialization: data.specialization,
      contact_number: data.contact_number,
      email: data.email,
      is_active: true,
    };

    const { data: technician, error } = await this.supabase
      .from('technicians')
      .insert(technicianData)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return technician;
  }

  async getTechnicians(tenantId: string, activeOnly = true) {
    let query = this.supabase
      .from('technicians')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('technician_name');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  // ==================== Service Assignments ====================

  async assignTechnician(tenantId: string, userId: string, data: any) {
    // Check if ticket exists
    const { data: ticket, error: ticketError } = await this.supabase
      .from('service_tickets')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', data.service_ticket_id)
      .single();

    if (ticketError) throw new NotFoundException('Service ticket not found');

    // Create assignment
    const assignmentData = {
      service_ticket_id: data.service_ticket_id,
      technician_id: data.technician_id,
      assigned_date: new Date().toISOString(),
      assigned_by: userId,
      scheduled_start_date: data.scheduled_start_date,
      scheduled_end_date: data.scheduled_end_date,
      status: 'ASSIGNED',
    };

    const { data: assignment, error } = await this.supabase
      .from('service_assignments')
      .insert(assignmentData)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Update ticket status to ASSIGNED
    await this.supabase
      .from('service_tickets')
      .update({ status: 'ASSIGNED', updated_at: new Date().toISOString() })
      .eq('id', data.service_ticket_id);

    // Update technician's total assignments
    await this.supabase.rpc('increment', {
      table_name: 'technicians',
      id_value: data.technician_id,
      field_name: 'total_assignments',
    });

    return assignment;
  }

  async getAssignmentsByTechnician(technicianId: string, status?: string) {
    let query = this.supabase
      .from('service_assignments')
      .select(`
        *,
        service_ticket:service_tickets(
          *,
          customer:customers(customer_name, contact_person, mobile)
        )
      `)
      .eq('technician_id', technicianId)
      .order('assigned_date', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  async updateAssignment(assignmentId: string, data: any) {
    const { data: assignment, error } = await this.supabase
      .from('service_assignments')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // If assignment completed, update ticket status
    if (data.status === 'COMPLETED') {
      await this.supabase
        .from('service_tickets')
        .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
        .eq('id', assignment.service_ticket_id);
    }

    return assignment;
  }

  // ==================== Service Parts Used ====================

  async addServicePart(tenantId: string, data: any) {
    // Generate new UID for replacement part if provided
    let newPartUID = data.new_part_uid;
    if (!newPartUID && data.generate_new_uid) {
      // This would call UID service to generate new UID
      // For now, we'll use the provided UID
      newPartUID = data.new_part_uid;
    }

    const partData = {
      service_ticket_id: data.service_ticket_id,
      service_assignment_id: data.service_assignment_id || null,
      part_id: data.part_id,
      part_name: data.part_name,
      part_code: data.part_code,
      old_part_uid: data.old_part_uid || null,
      old_part_condition: data.old_part_condition || null,
      new_part_uid: newPartUID,
      new_part_batch: data.new_part_batch,
      new_part_serial: data.new_part_serial,
      quantity: data.quantity,
      unit_price: data.unit_price,
      total_cost: data.quantity * data.unit_price,
      replacement_warranty_months: data.replacement_warranty_months || 6,
      replacement_warranty_start: data.replacement_warranty_start || new Date().toISOString().split('T')[0],
      charged_to_customer: data.charged_to_customer !== false,
      notes: data.notes,
    };

    // Calculate warranty end date
    let replacementWarrantyEnd: string | undefined;
    if (partData.replacement_warranty_start) {
      const startDate = new Date(partData.replacement_warranty_start);
      startDate.setMonth(startDate.getMonth() + partData.replacement_warranty_months);
      replacementWarrantyEnd = startDate.toISOString().split('T')[0];
    }

    const { data: part, error } = await this.supabase
      .from('service_parts_used')
      .insert({ ...partData, replacement_warranty_end: replacementWarrantyEnd })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Update old part UID status in uid_registry if exists
    if (data.old_part_uid) {
      await this.supabase
        .from('uid_registry')
        .update({
          status: 'DEFECTIVE',
          notes: `Replaced during service ticket ${data.service_ticket_id}`,
        })
        .eq('uid', data.old_part_uid);
    }

    // Register new part UID in uid_registry if provided
    if (newPartUID) {
      await this.supabase.from('uid_registry').insert({
        tenant_id: tenantId,
        uid: newPartUID,
        item_id: data.part_id,
        status: 'ACTIVE',
        current_location: 'CUSTOMER',
        notes: `Installed as replacement in service ticket ${data.service_ticket_id}`,
      });
    }

    return part;
  }

  async getServicePartsByTicket(ticketId: string) {
    const { data, error } = await this.supabase
      .from('service_parts_used')
      .select('*')
      .eq('service_ticket_id', ticketId)
      .order('used_date', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  // ==================== Service History ====================

  async createServiceHistoryEntry(tenantId: string, ticket: any) {
    const historyData = {
      tenant_id: tenantId,
      uid: ticket.uid,
      service_ticket_id: ticket.id,
      customer_id: ticket.customer_id,
      service_date: ticket.actual_completion_date || new Date().toISOString().split('T')[0],
      service_type: ticket.service_type,
      issue_description: ticket.complaint_description,
      resolution_description: ticket.resolution_description,
      total_cost: ticket.actual_cost || 0,
    };

    const { data, error } = await this.supabase
      .from('service_history')
      .insert(historyData)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  async getServiceHistoryByUID(tenantId: string, uid: string) {
    const { data, error } = await this.supabase
      .from('service_history')
      .select(`
        *,
        service_ticket:service_tickets(ticket_number, status),
        customer:customers(customer_name),
        technician:technicians(technician_name)
      `)
      .eq('tenant_id', tenantId)
      .eq('uid', uid)
      .order('service_date', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  // ==================== Reports ====================

  async getServiceReports(tenantId: string, filters?: any) {
    // Get open vs closed tickets
    const { data: statusCounts, error: statusError } = await this.supabase
      .from('service_tickets')
      .select('status')
      .eq('tenant_id', tenantId);

    if (statusError) throw new BadRequestException(statusError.message);

    const openCount = statusCounts.filter(t => ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PARTS_PENDING'].includes(t.status)).length;
    const closedCount = statusCounts.filter(t => ['COMPLETED', 'CLOSED'].includes(t.status)).length;

    // Get warranty claim costs
    const { data: warrantyClaims, error: claimsError } = await this.supabase
      .from('service_tickets')
      .select('actual_cost, parts_cost, labor_cost')
      .eq('tenant_id', tenantId)
      .eq('service_type', 'WARRANTY');

    if (claimsError) throw new BadRequestException(claimsError.message);

    const totalWarrantyCost = warrantyClaims.reduce((sum, claim) => sum + (claim.actual_cost || 0), 0);
    const totalWarrantyPartsCost = warrantyClaims.reduce((sum, claim) => sum + (claim.parts_cost || 0), 0);

    // Get top issues (product reliability)
    const { data: tickets, error: ticketsError } = await this.supabase
      .from('service_tickets')
      .select('product_name, uid')
      .eq('tenant_id', tenantId);

    if (ticketsError) throw new BadRequestException(ticketsError.message);

    const productIssues: Record<string, number> = {};
    tickets.forEach(t => {
      if (t.product_name) {
        productIssues[t.product_name] = (productIssues[t.product_name] || 0) + 1;
      }
    });

    return {
      open_tickets: openCount,
      closed_tickets: closedCount,
      total_tickets: statusCounts.length,
      warranty_claims_count: warrantyClaims.length,
      warranty_claims_cost: totalWarrantyCost,
      warranty_parts_cost: totalWarrantyPartsCost,
      product_reliability: Object.entries(productIssues)
        .map(([product, count]) => ({ product, issue_count: count }))
        .sort((a, b) => b.issue_count - a.issue_count)
        .slice(0, 10),
    };
  }

  // ==================== Helper Methods ====================

  private async generateTicketNumber(tenantId: string): Promise<string> {
    const { count } = await this.supabase
      .from('service_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const nextNumber = (count || 0) + 1;
    return `ST-${String(nextNumber).padStart(6, '0')}`;
  }

  private async generateTechnicianCode(tenantId: string): Promise<string> {
    const { count } = await this.supabase
      .from('technicians')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const nextNumber = (count || 0) + 1;
    return `TECH-${String(nextNumber).padStart(4, '0')}`;
  }
}
