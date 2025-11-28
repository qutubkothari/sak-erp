import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class ItemsService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
  );

  async findAll(tenantId: string, search?: string) {
    let query = this.supabase
      .from('items')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch items: ${error.message}`);
    }

    return data || [];
  }

  async search(tenantId: string, query: string) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.trim();
    const { data, error } = await this.supabase
      .from('items')
      .select('id, code, name, description, uom, category')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .or(`code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .limit(20)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Search failed: ${error.message}`);
    }

    return data || [];
  }

  async findOne(tenantId: string, id: string) {
    const { data, error } = await this.supabase
      .from('items')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch item: ${error.message}`);
    }

    return data;
  }

  async create(tenantId: string, itemData: any) {
    const { data, error } = await this.supabase
      .from('items')
      .insert({
        tenant_id: tenantId,
        code: itemData.code,
        name: itemData.name,
        description: itemData.description,
        category: itemData.category,
        uom: itemData.uom,
        reorder_level: itemData.reorderLevel,
        min_stock: itemData.minStock,
        max_stock: itemData.maxStock,
        standard_cost: itemData.standardCost,
        is_active: true,
        metadata: itemData.metadata || {},
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create item: ${error.message}`);
    }

    return data;
  }

  async update(tenantId: string, id: string, itemData: any) {
    const { data, error } = await this.supabase
      .from('items')
      .update({
        code: itemData.code,
        name: itemData.name,
        description: itemData.description,
        category: itemData.category,
        uom: itemData.uom,
        reorder_level: itemData.reorderLevel,
        min_stock: itemData.minStock,
        max_stock: itemData.maxStock,
        standard_cost: itemData.standardCost,
        metadata: itemData.metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update item: ${error.message}`);
    }

    return data;
  }

  async delete(tenantId: string, id: string) {
    // Soft delete
    const { error } = await this.supabase
      .from('items')
      .update({ is_active: false })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete item: ${error.message}`);
    }

    return { message: 'Item deleted successfully' };
  }

  // Drawing/Document Management
  async getDrawings(tenantId: string, itemId: string) {
    const { data, error } = await this.supabase
      .from('item_drawings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .order('version', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch drawings: ${error.message}`);
    }

    return data || [];
  }

  async uploadDrawing(tenantId: string, userId: string, itemId: string, drawingData: any) {
    // Get current max version for this item
    const { data: existingDrawings } = await this.supabase
      .from('item_drawings')
      .select('version')
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existingDrawings && existingDrawings.length > 0
      ? existingDrawings[0].version + 1
      : 1;

    const { data, error } = await this.supabase
      .from('item_drawings')
      .insert({
        tenant_id: tenantId,
        item_id: itemId,
        file_name: drawingData.fileName,
        file_url: drawingData.fileUrl,
        file_type: drawingData.fileType,
        file_size: drawingData.fileSize,
        version: nextVersion,
        revision_notes: drawingData.revisionNotes,
        is_active: true,
        uploaded_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upload drawing: ${error.message}`);
    }

    return data;
  }

  async updateDrawing(tenantId: string, itemId: string, drawingId: string, drawingData: any) {
    const { data, error } = await this.supabase
      .from('item_drawings')
      .update({
        revision_notes: drawingData.revisionNotes,
        is_active: drawingData.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .eq('id', drawingId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update drawing: ${error.message}`);
    }

    return data;
  }

  async deleteDrawing(tenantId: string, itemId: string, drawingId: string) {
    const { error } = await this.supabase
      .from('item_drawings')
      .update({ is_active: false })
      .eq('tenant_id', tenantId)
      .eq('item_id', itemId)
      .eq('id', drawingId);

    if (error) {
      throw new Error(`Failed to delete drawing: ${error.message}`);
    }

    return { message: 'Drawing deleted successfully' };
  }
}
