import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

export interface ProductionRouting {
  id: string;
  tenant_id: string;
  bom_id: string;
  sequence: number;
  work_station_id: string;
  operation_description: string;
  standard_time_minutes: number;
  setup_time_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductionRoutingDto {
  bom_id: string;
  sequence: number;
  work_station_id: string;
  operation_description: string;
  standard_time_minutes?: number;
  setup_time_minutes?: number;
  is_active?: boolean;
}

export interface UpdateProductionRoutingDto {
  sequence?: number;
  work_station_id?: string;
  operation_description?: string;
  standard_time_minutes?: number;
  setup_time_minutes?: number;
  is_active?: boolean;
}

@Injectable()
export class RoutingService {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Create a new routing operation for a BOM
   */
  async create(
    tenantId: string,
    dto: CreateProductionRoutingDto,
  ): Promise<ProductionRouting> {
    // Verify BOM exists
    const { data: bom, error: bomError } = await this.supabase
      .from('bom')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('id', dto.bom_id)
      .single();

    if (bomError || !bom) {
      throw new NotFoundException(`BOM with ID ${dto.bom_id} not found`);
    }

    // Verify work station exists
    const { data: station, error: stationError } = await this.supabase
      .from('work_stations')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('id', dto.work_station_id)
      .single();

    if (stationError || !station) {
      throw new NotFoundException(`Work station with ID ${dto.work_station_id} not found`);
    }

    // Check for sequence conflict
    const { data: existing } = await this.supabase
      .from('production_routing')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('bom_id', dto.bom_id)
      .eq('sequence', dto.sequence)
      .maybeSingle();

    if (existing) {
      throw new BadRequestException(
        `Sequence ${dto.sequence} already exists for this BOM`,
      );
    }

    const { data, error } = await this.supabase
      .from('production_routing')
      .insert({
        tenant_id: tenantId,
        bom_id: dto.bom_id,
        sequence: dto.sequence,
        work_station_id: dto.work_station_id,
        operation_description: dto.operation_description,
        standard_time_minutes: dto.standard_time_minutes || 0,
        setup_time_minutes: dto.setup_time_minutes || 0,
        is_active: dto.is_active !== undefined ? dto.is_active : true,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create routing: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all routing operations for a BOM
   */
  async findByBom(tenantId: string, bomId: string): Promise<ProductionRouting[]> {
    const { data, error } = await this.supabase
      .from('production_routing')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('bom_id', bomId)
      .order('sequence', { ascending: true });

    if (error) {
      throw new BadRequestException(`Failed to fetch routing: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get all routing operations with work station details
   */
  async findByBomWithStations(tenantId: string, bomId: string): Promise<any[]> {
    // Fetch routing operations
    const { data: routings, error: routingError } = await this.supabase
      .from('production_routing')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('bom_id', bomId)
      .order('sequence', { ascending: true });

    if (routingError) {
      throw new BadRequestException(`Failed to fetch routing: ${routingError.message}`);
    }

    if (!routings || routings.length === 0) {
      return [];
    }

    // Fetch work stations
    const stationIds = [...new Set(routings.map((r) => r.work_station_id))];
    const { data: stations, error: stationError } = await this.supabase
      .from('work_stations')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('id', stationIds);

    if (stationError) {
      throw new BadRequestException(`Failed to fetch work stations: ${stationError.message}`);
    }

    // Build station map
    const stationMap = new Map(stations?.map((s) => [s.id, s]) || []);

    // Merge data
    return routings.map((routing) => ({
      ...routing,
      work_station: stationMap.get(routing.work_station_id) || null,
    }));
  }

  /**
   * Get single routing operation
   */
  async findOne(tenantId: string, id: string): Promise<ProductionRouting> {
    const { data, error } = await this.supabase
      .from('production_routing')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Routing operation with ID ${id} not found`);
    }

    return data;
  }

  /**
   * Update routing operation
   */
  async update(
    tenantId: string,
    id: string,
    dto: UpdateProductionRoutingDto,
  ): Promise<ProductionRouting> {
    // Verify routing exists
    const existing = await this.findOne(tenantId, id);

    // If changing work station, verify it exists
    if (dto.work_station_id && dto.work_station_id !== existing.work_station_id) {
      const { data: station, error: stationError } = await this.supabase
        .from('work_stations')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('id', dto.work_station_id)
        .single();

      if (stationError || !station) {
        throw new NotFoundException(`Work station with ID ${dto.work_station_id} not found`);
      }
    }

    // If changing sequence, check for conflicts
    if (dto.sequence !== undefined && dto.sequence !== existing.sequence) {
      const { data: conflict } = await this.supabase
        .from('production_routing')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('bom_id', existing.bom_id)
        .eq('sequence', dto.sequence)
        .neq('id', id)
        .maybeSingle();

      if (conflict) {
        throw new BadRequestException(
          `Sequence ${dto.sequence} already exists for this BOM`,
        );
      }
    }

    const { data, error } = await this.supabase
      .from('production_routing')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update routing: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete routing operation
   */
  async delete(tenantId: string, id: string): Promise<void> {
    // Check if routing has any completions
    const { data: completions } = await this.supabase
      .from('station_completions')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('routing_id', id)
      .limit(1);

    if (completions && completions.length > 0) {
      throw new BadRequestException(
        'Cannot delete routing operation with existing completions',
      );
    }

    const { error } = await this.supabase
      .from('production_routing')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) {
      throw new BadRequestException(`Failed to delete routing: ${error.message}`);
    }
  }

  /**
   * Copy routing from one BOM to another
   */
  async copyRouting(
    tenantId: string,
    sourceBomId: string,
    targetBomId: string,
  ): Promise<ProductionRouting[]> {
    // Verify target BOM exists
    const { data: targetBom, error: bomError } = await this.supabase
      .from('bom')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('id', targetBomId)
      .single();

    if (bomError || !targetBom) {
      throw new NotFoundException(`Target BOM with ID ${targetBomId} not found`);
    }

    // Check if target BOM already has routing
    const { data: existingRouting } = await this.supabase
      .from('production_routing')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('bom_id', targetBomId)
      .limit(1);

    if (existingRouting && existingRouting.length > 0) {
      throw new BadRequestException('Target BOM already has routing operations');
    }

    // Fetch source routing
    const sourceRouting = await this.findByBom(tenantId, sourceBomId);

    if (sourceRouting.length === 0) {
      throw new NotFoundException(`No routing found for source BOM ${sourceBomId}`);
    }

    // Copy operations
    const newRoutings = sourceRouting.map((r) => ({
      tenant_id: tenantId,
      bom_id: targetBomId,
      sequence: r.sequence,
      work_station_id: r.work_station_id,
      operation_description: r.operation_description,
      standard_time_minutes: r.standard_time_minutes,
      setup_time_minutes: r.setup_time_minutes,
      is_active: r.is_active,
    }));

    const { data, error } = await this.supabase
      .from('production_routing')
      .insert(newRoutings)
      .select();

    if (error) {
      throw new BadRequestException(`Failed to copy routing: ${error.message}`);
    }

    return data;
  }

  /**
   * Resequence routing operations
   */
  async resequence(
    tenantId: string,
    bomId: string,
    routingIds: string[],
  ): Promise<ProductionRouting[]> {
    // Verify all routing IDs belong to this BOM
    const { data: existingRoutings, error } = await this.supabase
      .from('production_routing')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('bom_id', bomId)
      .in('id', routingIds);

    if (error) {
      throw new BadRequestException(`Failed to fetch routing: ${error.message}`);
    }

    if (!existingRoutings || existingRoutings.length !== routingIds.length) {
      throw new BadRequestException('Some routing IDs do not belong to this BOM');
    }

    // Update sequences
    const updates = routingIds.map((id, index) =>
      this.supabase
        .from('production_routing')
        .update({ sequence: (index + 1) * 10, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenantId)
        .eq('id', id),
    );

    await Promise.all(updates);

    // Return updated routing
    return this.findByBom(tenantId, bomId);
  }
}
