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
      const safeNumber = (value: any): number => {
        const n = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(n) ? n : 0;
      };

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
        items: (po.purchase_order_items || po.items || []).map((row: any, index: number) => {
          const quantity = safeNumber(row.ordered_qty ?? row.quantity ?? row.orderedQuantity ?? 0);
          const discountPercent = safeNumber(row.discount_percent ?? row.discountPercent ?? 0) || 0;
          const taxPercent = safeNumber(row.tax_percent ?? row.taxPercent ?? row.tax_rate ?? row.taxRate ?? 0) || 0;

          const storedAmount = safeNumber(row.amount ?? row.total_price ?? row.total ?? row.totalPrice ?? 0);

          // Prefer explicit rate; if missing/zero but we have amount+qty, derive rate for printing.
          let unitPrice = safeNumber(row.rate ?? row.unit_price ?? row.unitPrice ?? row.price ?? 0);
          if (unitPrice <= 0 && quantity > 0 && storedAmount > 0) {
            unitPrice = storedAmount / quantity;
          }

          const baseAmount = quantity > 0 && unitPrice > 0 ? quantity * unitPrice : storedAmount;
          const discountAmount = Math.max(0, safeNumber(row.discount_amount ?? row.discountAmount) || baseAmount * (discountPercent / 100));
          const taxableAmount = Math.max(0, safeNumber(row.taxable_amount ?? row.taxableAmount) || (baseAmount - discountAmount));

          // Compute GST amounts from taxable + tax% when not present.
          const computedTaxTotal = Math.max(0, taxableAmount * (taxPercent / 100));
          const cgstRate = safeNumber(row.cgst_rate ?? row.cgstRate) || (taxPercent > 0 ? taxPercent / 2 : 0);
          const sgstRate = safeNumber(row.sgst_rate ?? row.sgstRate) || (taxPercent > 0 ? taxPercent / 2 : 0);
          const igstRate = safeNumber(row.igst_rate ?? row.igstRate) || 0;

          const cgstAmount = safeNumber(row.cgst_amount ?? row.cgstAmount) || (cgstRate > 0 ? taxableAmount * (cgstRate / 100) : 0);
          const sgstAmount = safeNumber(row.sgst_amount ?? row.sgstAmount) || (sgstRate > 0 ? taxableAmount * (sgstRate / 100) : 0);
          const igstAmount = safeNumber(row.igst_amount ?? row.igstAmount) || (igstRate > 0 ? taxableAmount * (igstRate / 100) : 0);

          // Amount column in PDF uses total_price. Prefer stored amount if it looks like an inclusive total;
          // otherwise compute inclusive total as taxable + tax.
          const storedLooksLikeInclusive = storedAmount > 0 && computedTaxTotal > 0 && storedAmount > taxableAmount;
          const totalPrice = storedLooksLikeInclusive
            ? storedAmount
            : Math.max(0, taxableAmount + Math.max(0, cgstAmount + sgstAmount + igstAmount));

          return {
            sl_no: index + 1,
            item_code: row.item_code || row.code || '',
            item_name: row.item_name || row.name || '',
            description: row.description || row.specifications,
            hsn_code: row?.item?.hsn_code || row.hsn_code || row.hsn,
            quantity,
            uom: row.uom || 'Nos',
            unit_price: unitPrice,
            discount_percent: discountPercent,
            discount_amount: discountAmount,
            taxable_amount: taxableAmount,
            cgst_rate: cgstRate,
            cgst_amount: cgstAmount,
            sgst_rate: sgstRate,
            sgst_amount: sgstAmount,
            igst_rate: igstRate,
            igst_amount: igstAmount,
            total_price: totalPrice,
            specifications: row.specifications,
            payment_terms: (row.payment_terms ?? row.paymentTerms ?? '')?.toString?.() ?? '',
            delivery_terms: (row.delivery_terms ?? row.deliveryTerms ?? '')?.toString?.() ?? '',
          };
        }),

        // Financial Summary (will be recomputed below if missing)
        subtotal: safeNumber(po.subtotal ?? po.total_amount ?? 0),
        totalDiscount: safeNumber(po.total_discount ?? 0),
        taxableAmount: safeNumber(po.taxable_amount ?? po.total_amount ?? 0),
        cgstTotal: safeNumber(po.cgst_total ?? 0),
        sgstTotal: safeNumber(po.sgst_total ?? 0),
        igstTotal: safeNumber(po.igst_total ?? 0),
        grandTotal: safeNumber(po.grand_total ?? po.total_amount ?? 0),

        // Terms (derive from line items; header fields are no longer the source of truth)
        paymentTerms: undefined,
        deliveryDate: po.expected_delivery || po.delivery_date,
        terms: {
          payment_terms: undefined,
          delivery_terms: undefined,
        },
        remarks: po.notes || po.remarks,

        currency: 'INR',
      };

      // Pull terms from line items (unique values). If multiple values exist, join them.
      try {
        const items: any[] = Array.isArray((pdfData as any).items) ? (pdfData as any).items : [];
        const uniq = (values: any[]) => Array.from(new Set(values.map((v) => String(v || '').trim()).filter(Boolean)));

        const itemPaymentTerms = uniq(items.map((it) => it?.payment_terms ?? it?.paymentTerms));
        const itemDeliveryTerms = uniq(items.map((it) => it?.delivery_terms ?? it?.deliveryTerms));

        if (itemPaymentTerms.length > 0) {
          const joined = itemPaymentTerms.join(', ');
          (pdfData as any).paymentTerms = joined;
          (pdfData as any).terms = { ...(pdfData as any).terms, payment_terms: joined };
        }

        if (itemDeliveryTerms.length > 0) {
          const joined = itemDeliveryTerms.join(', ');
          (pdfData as any).terms = { ...(pdfData as any).terms, delivery_terms: joined };
        }
      } catch {
        // Ignore term aggregation issues; PDF will fall back to defaults.
      }

      // If PO header does not have tax totals, compute from items so tax is calculated & visible in PDF.
      try {
        const items: any[] = Array.isArray((pdfData as any).items) ? (pdfData as any).items : [];
        const computedSubtotal = items.reduce((sum, it) => sum + safeNumber(it.quantity) * safeNumber(it.unit_price), 0);
        const computedDiscount = items.reduce((sum, it) => sum + safeNumber(it.discount_amount), 0);
        const computedTaxable = items.reduce((sum, it) => sum + safeNumber(it.taxable_amount), 0);
        const computedCgst = items.reduce((sum, it) => sum + safeNumber(it.cgst_amount), 0);
        const computedSgst = items.reduce((sum, it) => sum + safeNumber(it.sgst_amount), 0);
        const computedIgst = items.reduce((sum, it) => sum + safeNumber(it.igst_amount), 0);
        const computedTaxTotal = computedCgst + computedSgst + computedIgst;
        const computedGrand = computedTaxable + computedTaxTotal;

        // Prefer stored values only if they look populated; otherwise fill from computed values.
        if (!safeNumber((pdfData as any).subtotal) && computedSubtotal > 0) (pdfData as any).subtotal = computedSubtotal;
        if (!safeNumber((pdfData as any).taxableAmount) && computedTaxable > 0) (pdfData as any).taxableAmount = computedTaxable;

        if (!safeNumber((pdfData as any).totalDiscount) && computedDiscount > 0) (pdfData as any).totalDiscount = computedDiscount;

        const headerHasAnyTax = safeNumber((pdfData as any).cgstTotal) + safeNumber((pdfData as any).sgstTotal) + safeNumber((pdfData as any).igstTotal) > 0;
        if (!headerHasAnyTax && computedTaxTotal > 0) {
          (pdfData as any).cgstTotal = computedCgst;
          (pdfData as any).sgstTotal = computedSgst;
          (pdfData as any).igstTotal = computedIgst;
        }

        // If computed tax exists and grandTotal equals taxable (common current bug), use computed grand total.
        const currentGrand = safeNumber((pdfData as any).grandTotal);
        const currentTaxable = safeNumber((pdfData as any).taxableAmount);
        if (computedTaxTotal > 0 && (currentGrand <= 0 || Math.abs(currentGrand - currentTaxable) < 0.01)) {
          (pdfData as any).grandTotal = computedGrand;
        }
      } catch {
        // Ignore computation issues; PDF will fall back to stored totals.
      }

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
