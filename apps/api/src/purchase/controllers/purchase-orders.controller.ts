import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { PurchaseOrdersService } from '../services/purchase-orders.service';
import { WorldClassPoPdfService } from '../services/world-class-po-pdf.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DuplicateDetectionService } from '../../common/services/duplicate-detection.service';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequireDelete, RequireCreate, RequireUpdate } from '../../auth/decorators/permissions.decorator';

@Controller('purchase/orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchaseOrdersController {
  constructor(
    private readonly poService: PurchaseOrdersService,
    private readonly worldClassPoPdfService: WorldClassPoPdfService,
    private readonly duplicateDetectionService: DuplicateDetectionService,
  ) {}

  @Post('check-duplicates')
  async checkDuplicates(@Request() req: any, @Body() poData: any) {
    const existing = await this.poService.findAll(req.user.tenantId, {});
    
    // Check for same vendor + items within last 7 days
    const recentPOs = existing.filter((po: any) => {
      const vendorId = poData.vendorId ?? poData.vendor_id;
      if (!vendorId) return false;
      if (po.vendor_id !== vendorId) return false;
      const daysDiff = Math.abs(new Date().getTime() - new Date(po.created_at).getTime()) / (1000 * 3600 * 24);
      return daysDiff <= 7;
    });
    
    if (recentPOs.length === 0) {
      return { hasDuplicates: false, exactMatches: [], fuzzyMatches: [] };
    }
    
    const incomingLines = (poData.items ?? []).map((item: any) => {
      const code = item.itemCode ?? item.item_code ?? item.itemId ?? item.item_id ?? '';
      const qty = item.orderedQty ?? item.ordered_qty ?? item.quantity ?? 0;
      return `${String(code)}:${Number(qty)}`;
    });
    const incomingKey = incomingLines.filter(Boolean).sort().join('|');

    // Check if items match (code + ordered qty)
    for (const recentPO of recentPOs) {
      const lines = (recentPO.purchase_order_items ?? []).map((row: any) => {
        const code = row.item_code ?? row.item_id ?? '';
        const qty = row.ordered_qty ?? row.quantity ?? 0;
        return `${String(code)}:${Number(qty)}`;
      });
      const key = lines.filter(Boolean).sort().join('|');

      if (incomingKey.length > 0 && key.length > 0 && key === incomingKey) {
        return {
          hasDuplicates: true,
          exactMatches: [
            {
              id: recentPO.id,
              matchScore: 100,
              matchedFields: ['vendor_id', 'items'],
              data: recentPO,
            },
          ],
          fuzzyMatches: [],
          message: 'Identical PO with same vendor and items created in last 7 days',
        };
      }
    }
    
    return { hasDuplicates: false, exactMatches: [], fuzzyMatches: [] };
  }

  @Post()
  @RequireCreate('purchase_orders')
  async create(@Request() req: any, @Body() body: any) {
    return this.poService.create(req.user.tenantId, req.user.userId, body);
  }

  @Get()
  async findAll(@Request() req: any, @Query() query: any) {
    return this.poService.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.poService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  @RequireUpdate('purchase_orders')
  async update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.poService.update(req.user.tenantId, id, body);
  }

  @Post(':id/status')
  async updateStatus(@Request() req: any, @Param('id') id: string, @Body() body: { status: string }) {
    return this.poService.updateStatus(req.user.tenantId, id, body.status);
  }

  @Post(':id/tracking')
  async updateTracking(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      tracking_number?: string;
      shipped_date?: string;
      estimated_delivery_date?: string;
      actual_delivery_date?: string;
      carrier_name?: string;
      tracking_url?: string;
      delivery_status?: string;
    }
  ) {
    return this.poService.updateTracking(req.user.tenantId, id, body);
  }

  @Post(':id/send-email')
  async sendPOEmail(@Request() req: any, @Param('id') id: string, @Body() body?: any) {
    return this.poService.sendPOEmail(req.user.tenantId, id, body);
  }

  @Post(':id/preview-email')
  async previewPOEmail(@Request() req: any, @Param('id') id: string, @Body() body?: any) {
    return this.poService.previewPOEmail(req.user.tenantId, id, body);
  }

  @Post(':id/send-tracking-reminder')
  async sendTrackingReminder(@Request() req: any, @Param('id') id: string) {
    return this.poService.sendTrackingReminder(req.user.tenantId, id);
  }

  @Get(':id/pdf/world-class')
  async generateWorldClassPdf(@Request() req: any, @Param('id') id: string, @Res() res: Response) {
    try {
      // Fetch PO with all details
      const po = await this.poService.findOne(req.user.tenantId, id);

      if (!po) {
        return res.status(404).json({ message: 'Purchase Order not found' });
      }

      // Map PO data to PDF data structure
      const pdfData = {
        // Header
        poNumber: po.po_number,
        poDate: po.po_date || po.order_date,
        quotationRef: po.quotation_ref,
        prNumber: po.pr_number,

        // Vendor Details
        vendorName: po.vendor?.name || po.vendor_name || 'N/A',
        vendorCode: po.vendor?.code || po.vendor_code,
        vendorAddress: po.vendor?.address,
        vendorCity: po.vendor?.city,
        vendorState: po.vendor?.state,
        vendorPincode: po.vendor?.pincode,
        vendorGSTIN: po.vendor?.gstin,
        vendorPAN: po.vendor?.pan,
        vendorEmail: po.vendor?.email,
        vendorPhone: po.vendor?.phone,
        vendorContactPerson: po.vendor?.contact_person,

        // Company Details (Delivery Address - Works)
        companyName: 'SAIF AUTOMATIONS SERVICES LLP',
        companyAddress: '1st Floor, Nasscom CoE-IOT, Sunrise Incubations Hub, Hill 3, Rushikonda',
        companyCity: 'Visakhapatnam',
        companyState: 'Andhra Pradesh',
        companyPincode: '530045',
        companyGSTIN: '37ADSFS6370G1ZG',
        companyEmail: 'saif.automations@gmail.com',
        companyPhone: '0891-6662153',

        // Items
        items: (po.purchase_order_items || po.items || []).map((item: any, index: number) => ({
          sl_no: index + 1,
          item_code: item.item_code || item.code || '',
          item_name: item.item_name || item.name || '',
          description: item.description || item.specifications,
          hsn_code: item.hsn_code || item.hsn,
          quantity: item.quantity || item.ordered_qty,
          uom: item.uom || 'Nos',
          unit_price: item.unit_price || item.price || 0,
          discount_percent: item.discount_percent || 0,
          discount_amount: item.discount_amount || 0,
          taxable_amount: item.taxable_amount || (item.unit_price * item.quantity),
          cgst_rate: item.cgst_rate || 9,
          cgst_amount: item.cgst_amount || 0,
          sgst_rate: item.sgst_rate || 9,
          sgst_amount: item.sgst_amount || 0,
          igst_rate: item.igst_rate,
          igst_amount: item.igst_amount,
          total_price: item.total_price || item.total,
          specifications: item.specifications,
        })),

        // Financial Summary
        subtotal: po.subtotal || po.total_amount || 0,
        totalDiscount: po.total_discount || 0,
        taxableAmount: po.taxable_amount || po.total_amount || 0,
        cgstTotal: po.cgst_total || 0,
        sgstTotal: po.sgst_total || 0,
        igstTotal: po.igst_total || 0,
        grandTotal: po.grand_total || po.total_amount || 0,

        // Terms
        paymentTerms: po.payment_terms,
        deliveryDate: po.expected_delivery || po.delivery_date,
        terms: {
          payment_terms: po.payment_terms,
          delivery_terms: po.delivery_terms,
        },
        remarks: po.notes || po.remarks,

        currency: 'INR',
      };

      // Generate PDF
      const pdfBuffer = await this.worldClassPoPdfService.generatePOPdf(pdfData);
      const filename = this.worldClassPoPdfService.generateFilename(po.po_number);

      // Send PDF response
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length,
      });

      return res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating world-class PO PDF:', error);
      return res.status(500).json({ 
        message: 'Error generating PDF', 
        error: error.message 
      });
    }
  }

  @Delete(':id')
  @RequireDelete('purchase_orders')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.poService.delete(req.user.tenantId, id);
  }
}
