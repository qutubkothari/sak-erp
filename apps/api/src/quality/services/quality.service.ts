import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class QualityService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = new SupabaseClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_KEY || '',
    );
  }

  // ==================== Quality Inspections ====================

  async createInspection(tenantId: string, userId: string, data: any) {
    console.log('=== CREATE INSPECTION API ===');
    console.log('Received data:', JSON.stringify(data, null, 2));
    console.log('tenantId:', tenantId);
    console.log('userId:', userId);
    
    const inspectionNumber = await this.generateInspectionNumber(tenantId, data.inspection_type);

    const inspectionData = {
      tenant_id: tenantId,
      inspection_number: inspectionNumber,
      inspection_type: data.inspection_type,
      inspection_date: data.inspection_date || new Date().toISOString().split('T')[0],
      status: 'PENDING',
      grn_id: data.grn_id || null,
      production_order_id: data.production_order_id || null,
      uid: data.uid || null,
      item_id: data.item_id,
      item_name: data.item_name,
      item_code: data.item_code,
      vendor_id: data.vendor_id || null,
      vendor_name: data.vendor_name || null,
      batch_number: data.batch_number,
      lot_number: data.lot_number,
      inspected_quantity: data.inspected_quantity,
      inspector_id: userId,
      inspector_name: data.inspector_name,
      inspection_checklist: data.inspection_checklist,
      created_by: userId,
    };

    console.log('Prepared inspectionData:', JSON.stringify(inspectionData, null, 2));

    const { data: inspection, error } = await this.supabase
      .from('quality_inspections')
      .insert(inspectionData)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw new BadRequestException(error.message);
    }

    // Add inspection parameters if provided
    if (data.parameters && data.parameters.length > 0) {
      await this.addInspectionParameters(inspection.id, data.parameters);
    }

    return inspection;
  }

  async getInspections(tenantId: string, filters?: any) {
    let query = this.supabase
      .from('quality_inspections')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('inspection_date', { ascending: false });

    if (filters?.inspection_type) {
      query = query.eq('inspection_type', filters.inspection_type);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.vendor_id) {
      query = query.eq('vendor_id', filters.vendor_id);
    }
    if (filters?.uid) {
      query = query.eq('uid', filters.uid);
    }

    const { data, error } = await query;

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  async getInspectionById(tenantId: string, inspectionId: string) {
    const { data, error } = await this.supabase
      .from('quality_inspections')
      .select(`
        *,
        parameters:inspection_parameters(*),
        defects:inspection_defects(*),
        ncr:ncr(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('id', inspectionId)
      .single();

    if (error) throw new NotFoundException('Inspection not found');

    return data;
  }

  async updateInspection(tenantId: string, inspectionId: string, data: any) {
    const updateData = {
      inspection_type: data.inspection_type,
      inspection_date: data.inspection_date,
      grn_id: data.grn_id,
      production_order_id: data.production_order_id,
      uid: data.uid,
      item_id: data.item_id,
      item_name: data.item_name,
      item_code: data.item_code,
      vendor_id: data.vendor_id,
      vendor_name: data.vendor_name,
      batch_number: data.batch_number,
      lot_number: data.lot_number,
      inspected_quantity: data.inspected_quantity,
      inspector_id: data.inspector_id,
      inspector_name: data.inspector_name,
      inspection_checklist: data.inspection_checklist,
      remarks: data.remarks,
      updated_at: new Date().toISOString(),
    };

    const { data: inspection, error } = await this.supabase
      .from('quality_inspections')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .eq('id', inspectionId)
      .eq('status', 'PENDING') // Only allow updates for pending inspections
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return inspection;
  }

  async deleteInspection(tenantId: string, inspectionId: string) {
    // Only allow deletion of pending inspections
    const { data: inspection, error: fetchError } = await this.supabase
      .from('quality_inspections')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('id', inspectionId)
      .single();

    if (fetchError) throw new NotFoundException('Inspection not found');
    if (inspection.status !== 'PENDING') {
      throw new BadRequestException('Only pending inspections can be deleted');
    }

    const { error } = await this.supabase
      .from('quality_inspections')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', inspectionId);

    if (error) throw new BadRequestException(error.message);

    return { message: 'Inspection deleted successfully' };
  }

  async completeInspection(
    tenantId: string,
    userId: string,
    inspectionId: string,
    data: any,
  ) {
    // Get inspection details
    const { data: inspection, error: fetchError } = await this.supabase
      .from('quality_inspections')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', inspectionId)
      .single();

    if (fetchError) throw new NotFoundException('Inspection not found');

    // Calculate defect rate
    const totalQty =
      (data.quantity_accepted || 0) +
      (data.quantity_rejected || 0) +
      (data.quantity_on_hold || 0);
    const defectRate =
      totalQty > 0 ? ((data.quantity_rejected || 0) / totalQty) * 100 : 0;

    // Update inspection
    const updateData = {
      status: data.inspection_status,
      accepted_quantity: data.quantity_accepted || 0,
      rejected_quantity: data.quantity_rejected || 0,
      on_hold_quantity: data.quantity_on_hold || 0,
      defect_rate: defectRate,
      inspector_remarks: data.inspector_remarks,
      completion_date: new Date().toISOString().split('T')[0],
      completed_by: userId,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedInspection, error: updateError } = await this.supabase
      .from('quality_inspections')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .eq('id', inspectionId)
      .select()
      .single();

    if (updateError) throw new BadRequestException(updateError.message);

    // Generate NCR if requested
    if (data.generate_ncr && data.ncr_description) {
      await this.createNCRFromInspection(
        tenantId,
        { ...inspection, ...updatedInspection },
        { description: data.ncr_description },
      );
    }

    return updatedInspection;
  }

  async addInspectionParameters(inspectionId: string, parameters: any[]) {
    const parameterData = parameters.map(param => ({
      inspection_id: inspectionId,
      parameter_name: param.parameter_name,
      parameter_type: param.parameter_type,
      specification: param.specification,
      measured_value: param.measured_value,
      unit_of_measure: param.unit_of_measure,
      tolerance_min: param.tolerance_min,
      tolerance_max: param.tolerance_max,
      result: param.result,
      deviation: param.deviation,
      remarks: param.remarks,
    }));

    const { error } = await this.supabase
      .from('inspection_parameters')
      .insert(parameterData);

    if (error) throw new BadRequestException(error.message);
  }

  async addInspectionDefects(inspectionId: string, defects: any[]) {
    const defectData = defects.map(defect => ({
      inspection_id: inspectionId,
      defect_code: defect.defect_code,
      defect_description: defect.defect_description,
      defect_category: defect.defect_category,
      severity: defect.severity,
      location: defect.location,
      quantity_affected: defect.quantity_affected,
      root_cause: defect.root_cause,
      corrective_action: defect.corrective_action,
    }));

    const { error } = await this.supabase
      .from('inspection_defects')
      .insert(defectData);

    if (error) throw new BadRequestException(error.message);
  }

  // ==================== NCR Management ====================

  async createNCR(tenantId: string, userId: string, data: any) {
    const ncrNumber = await this.generateNCRNumber(tenantId);

    const ncrData = {
      tenant_id: tenantId,
      ncr_number: ncrNumber,
      inspection_id: data.inspection_id || null,
      ncr_date: data.ncr_date || new Date().toISOString().split('T')[0],
      status: 'OPEN',
      nonconformance_type: data.nonconformance_type,
      description: data.description,
      item_id: data.item_id,
      item_name: data.item_name,
      uid: data.uid,
      vendor_id: data.vendor_id,
      production_order_id: data.production_order_id,
      quantity_affected: data.quantity_affected,
      root_cause: data.root_cause,
      immediate_action: data.immediate_action,
      containment_action: data.containment_action,
      cost_impact: data.cost_impact || 0,
      raised_by: userId,
    };

    const { data: ncr, error } = await this.supabase
      .from('ncr')
      .insert(ncrData)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Update inspection with NCR link if applicable
    if (data.inspection_id) {
      await this.supabase
        .from('quality_inspections')
        .update({ ncr_generated: true, ncr_id: ncr.id })
        .eq('id', data.inspection_id);
    }

    return ncr;
  }

  async createNCRFromInspection(tenantId: string, inspection: any, ncrDetails: any) {
    const ncrData = {
      tenant_id: tenantId,
      inspection_id: inspection.id,
      nonconformance_type: 'MATERIAL',
      description: ncrDetails?.description || `Failed inspection ${inspection.inspection_number}`,
      item_id: inspection.item_id,
      item_name: inspection.item_name,
      uid: inspection.uid,
      vendor_id: inspection.vendor_id,
      quantity_affected: inspection.rejected_quantity,
      immediate_action: ncrDetails?.immediate_action,
    };

    return this.createNCR(tenantId, inspection.created_by, ncrData);
  }

  async getNCRs(tenantId: string, filters?: any) {
    let query = this.supabase
      .from('ncr')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('ncr_date', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.nonconformance_type) {
      query = query.eq('nonconformance_type', filters.nonconformance_type);
    }
    if (filters?.vendor_id) {
      query = query.eq('vendor_id', filters.vendor_id);
    }

    const { data, error } = await query;

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  async getNCRById(tenantId: string, ncrId: string) {
    const { data, error } = await this.supabase
      .from('ncr')
      .select(`
        *,
        inspection:quality_inspections(*)
      `)
      .eq('tenant_id', tenantId)
      .eq('id', ncrId)
      .single();

    if (error) throw new NotFoundException('NCR not found');

    return data;
  }

  async updateNCR(tenantId: string, ncrId: string, data: any) {
    const { data: ncr, error } = await this.supabase
      .from('ncr')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', ncrId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return ncr;
  }

  async closeNCR(tenantId: string, ncrId: string, userId: string, data: any) {
    const { data: ncr, error } = await this.supabase
      .from('ncr')
      .update({
        status: 'CLOSED',
        closure_date: data.closure_date || new Date().toISOString().split('T')[0],
        closed_by: userId,
        closure_remarks: data.closure_remarks,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', ncrId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return ncr;
  }

  // ==================== Quality Analytics ====================

  async getVendorQualityRatings(tenantId: string, vendorId?: string) {
    let query = this.supabase
      .from('vendor_quality_rating')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('rating_period_start', { ascending: false });

    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }

    const { data, error } = await query;

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  async calculateVendorQualityRating(tenantId: string, vendorId: string, periodStart: string, periodEnd: string) {
    // Get inspections for vendor in period
    const { data: inspections, error: inspError } = await this.supabase
      .from('quality_inspections')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('vendor_id', vendorId)
      .eq('inspection_type', 'INCOMING')
      .gte('inspection_date', periodStart)
      .lte('inspection_date', periodEnd);

    if (inspError) throw new BadRequestException(inspError.message);

    const totalInspections = inspections.length;
    const passedInspections = inspections.filter(i => i.status === 'PASSED').length;
    const failedInspections = inspections.filter(i => i.status === 'FAILED' || i.status === 'REJECTED').length;
    const passRate = totalInspections > 0 ? (passedInspections / totalInspections) * 100 : 0;

    // Get defects
    const totalDefects = inspections.reduce((sum, i) => sum + (i.defect_count || 0), 0);
    const totalQuantity = inspections.reduce((sum, i) => sum + (i.inspected_quantity || 0), 0);
    const defectRate = totalQuantity > 0 ? (totalDefects / totalQuantity) * 1000000 : 0; // PPM

    // Get NCRs
    const { data: ncrs, error: ncrError } = await this.supabase
      .from('ncr')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('vendor_id', vendorId)
      .gte('ncr_date', periodStart)
      .lte('ncr_date', periodEnd);

    if (ncrError) throw new BadRequestException(ncrError.message);

    const totalNCRs = ncrs.length;
    const openNCRs = ncrs.filter(n => n.status !== 'CLOSED').length;

    // Calculate quality score (weighted)
    const passRateScore = passRate; // 0-100
    const defectRateScore = Math.max(0, 100 - (defectRate / 100)); // Lower is better
    const ncrScore = Math.max(0, 100 - (totalNCRs * 10)); // Penalty for NCRs

    const qualityScore = (passRateScore * 0.5) + (defectRateScore * 0.3) + (ncrScore * 0.2);

    // Determine grade
    let ratingGrade = 'F';
    if (qualityScore >= 95) ratingGrade = 'A+';
    else if (qualityScore >= 90) ratingGrade = 'A';
    else if (qualityScore >= 80) ratingGrade = 'B';
    else if (qualityScore >= 70) ratingGrade = 'C';
    else if (qualityScore >= 60) ratingGrade = 'D';

    // Get vendor name
    const { data: vendor } = await this.supabase
      .from('vendors')
      .select('vendor_name')
      .eq('id', vendorId)
      .single();

    const ratingData = {
      tenant_id: tenantId,
      vendor_id: vendorId,
      vendor_name: vendor?.vendor_name || '',
      rating_period_start: periodStart,
      rating_period_end: periodEnd,
      total_inspections: totalInspections,
      passed_inspections: passedInspections,
      failed_inspections: failedInspections,
      pass_rate: passRate,
      total_defects: totalDefects,
      defect_rate: defectRate,
      total_ncrs: totalNCRs,
      open_ncrs: openNCRs,
      quality_score: qualityScore,
      rating_grade: ratingGrade,
    };

    const { data: rating, error } = await this.supabase
      .from('vendor_quality_rating')
      .insert(ratingData)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    return rating;
  }

  async getQualityDashboard(tenantId: string) {
    // Get inspection summary
    const { data: inspections } = await this.supabase
      .from('quality_inspections')
      .select('status, inspection_type')
      .eq('tenant_id', tenantId);

    const inspectionSummary = {
      total: inspections?.length || 0,
      passed: inspections?.filter(i => i.status === 'PASSED').length || 0,
      failed: inspections?.filter(i => i.status === 'FAILED').length || 0,
      pending: inspections?.filter(i => i.status === 'PENDING').length || 0,
      by_type: {
        incoming: inspections?.filter(i => i.inspection_type === 'INCOMING').length || 0,
        in_process: inspections?.filter(i => i.inspection_type === 'IN_PROCESS').length || 0,
        final: inspections?.filter(i => i.inspection_type === 'FINAL').length || 0,
      },
    };

    // Get NCR summary
    const { data: ncrs } = await this.supabase
      .from('ncr')
      .select('status, nonconformance_type')
      .eq('tenant_id', tenantId);

    const ncrSummary = {
      total: ncrs?.length || 0,
      open: ncrs?.filter(n => ['OPEN', 'UNDER_REVIEW', 'ACTION_PLANNED', 'IN_PROGRESS'].includes(n.status)).length || 0,
      closed: ncrs?.filter(n => n.status === 'CLOSED').length || 0,
      by_type: {
        material: ncrs?.filter(n => n.nonconformance_type === 'MATERIAL').length || 0,
        process: ncrs?.filter(n => n.nonconformance_type === 'PROCESS').length || 0,
        product: ncrs?.filter(n => n.nonconformance_type === 'PRODUCT').length || 0,
      },
    };

    // Get top defect categories
    const { data: defects } = await this.supabase
      .from('inspection_defects')
      .select('defect_category');

    const defectCounts: Record<string, number> = {};
    defects?.forEach(d => {
      if (d.defect_category) {
        defectCounts[d.defect_category] = (defectCounts[d.defect_category] || 0) + 1;
      }
    });

    const topDefects = Object.entries(defectCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      inspections: inspectionSummary,
      ncrs: ncrSummary,
      top_defects: topDefects,
    };
  }

  // ==================== Helper Methods ====================

  private async generateInspectionNumber(tenantId: string, type: string): Promise<string> {
    const prefix = type === 'INCOMING' ? 'IQC' : type === 'IN_PROCESS' ? 'IPQC' : 'FQC';
    
    const { count } = await this.supabase
      .from('quality_inspections')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('inspection_type', type);

    const nextNumber = (count || 0) + 1;
    return `${prefix}-${String(nextNumber).padStart(6, '0')}`;
  }

  private async generateNCRNumber(tenantId: string): Promise<string> {
    const { count } = await this.supabase
      .from('ncr')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const nextNumber = (count || 0) + 1;
    return `NCR-${String(nextNumber).padStart(6, '0')}`;
  }
}
