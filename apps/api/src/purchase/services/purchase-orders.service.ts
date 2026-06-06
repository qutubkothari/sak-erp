import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

const PAYMENT_TERMS_LABELS: Record<string, string> = {
  NET_30: 'Net 30 Days',
  NET_45: 'Net 45 Days',
  NET_60: 'Net 60 Days',
  NET_90: 'Net 90 Days',
  ADVANCE: 'Advance Payment',
  COD: 'Cash on Delivery',
  IMMEDIATE: 'Immediate Payment',
};
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EmailService } from '../../email/email.service';
import { normalizeInventoryCategory } from '../../inventory/utils/inventory-category';
import { WorldClassPoPdfService } from './world-class-po-pdf.service';

@Injectable()
export class PurchaseOrdersService {
  private readonly poDrawingSelectionAttachmentType = 'PO_DRAWING_SELECTIONS';
  private supabase: SupabaseClient;

  constructor(
    private emailService: EmailService,
    private worldClassPoPdfService: WorldClassPoPdfService,
  ) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!,
    );
  }

  private parseTermsMetadata(value: any): Record<string, any> {
    if (!value) return {};
    if (typeof value === 'object' && !Array.isArray(value)) return { ...value };
    if (typeof value !== 'string') return {};
    const trimmed = value.trim();
    if (!trimmed.startsWith('{')) return {};
    try {
      const parsed = JSON.parse(trimmed);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  private formatUserDisplayName(user: any): string {
    return `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || user?.email || '';
  }

  private async resolveUserDisplayName(userId?: string | null): Promise<string> {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) return '';
    try {
      const { data } = await this.supabase
        .from('users')
        .select('first_name, last_name, username, email')
        .eq('id', normalizedUserId)
        .maybeSingle();
      return this.formatUserDisplayName(data);
    } catch {
      return '';
    }
  }

  private async resolvePoApproverNameFromAudit(tenantId: string, poId: string): Promise<string> {
    try {
      const { data } = await this.supabase
        .from('activity_logs')
        .select('user_id')
        .eq('tenant_id', tenantId)
        .eq('resource_id', poId)
        .in('action', ['APPROVE', 'UPDATE_STATUS'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return this.resolveUserDisplayName((data as any)?.user_id);
    } catch {
      return '';
    }
  }

  private buildPOAttachmentsWithDrawingSelections(attachments: any, items: any[]): any[] {
    const cleanAttachments = (Array.isArray(attachments) ? attachments : []).filter(
      (attachment: any) => attachment?.type !== this.poDrawingSelectionAttachmentType,
    );

    const drawingSelections = (Array.isArray(items) ? items : [])
      .map((item: any) => ({
        itemId: item.itemId || item.item_id || null,
        itemCode: item.itemCode || item.item_code || null,
        includeDrawing: item.includeDrawing === true || item.include_drawing === true,
        selectedDrawingId: item.selectedDrawingId || item.selected_drawing_id || null,
      }))
      .filter((selection: any) => selection.includeDrawing || selection.selectedDrawingId);

    if (drawingSelections.length > 0) {
      cleanAttachments.push({
        type: this.poDrawingSelectionAttachmentType,
        drawingSelections,
      });
    }

    return cleanAttachments;
  }

  private hasPODrawingSelections(items: any[]): boolean {
    return (Array.isArray(items) ? items : []).some((item: any) =>
      item?.includeDrawing === true ||
      item?.include_drawing === true ||
      Boolean(item?.selectedDrawingId || item?.selected_drawing_id),
    );
  }

  private hydratePODrawingSelections(po: any): any {
    const poItems = Array.isArray(po?.purchase_order_items) ? po.purchase_order_items : [];
    const attachments = Array.isArray(po?.attachments) ? po.attachments : [];
    const selectionHolder = attachments.find(
      (attachment: any) => attachment?.type === this.poDrawingSelectionAttachmentType,
    );
    const selections = Array.isArray(selectionHolder?.drawingSelections)
      ? selectionHolder.drawingSelections
      : [];

    po.attachments = attachments.filter(
      (attachment: any) => attachment?.type !== this.poDrawingSelectionAttachmentType,
    );

    if (poItems.length === 0 || selections.length === 0) return po;

    const byItemId = new Map<string, any>();
    const byItemCode = new Map<string, any>();
    for (const selection of selections) {
      if (selection?.itemId) byItemId.set(selection.itemId, selection);
      if (selection?.itemCode) byItemCode.set(selection.itemCode, selection);
    }

    po.purchase_order_items = poItems.map((poItem: any) => {
      const selection =
        (poItem?.item_id ? byItemId.get(poItem.item_id) : null) ||
        (poItem?.item_code ? byItemCode.get(poItem.item_code) : null);

      if (!selection) return poItem;

      return {
        ...poItem,
        include_drawing: selection.includeDrawing === true,
        selected_drawing_id: selection.selectedDrawingId || null,
      };
    });

    return po;
  }

  private isMissingItemVendorsTenantIdColumn(error: any): boolean {
    const message = String(error?.message || '').toLowerCase();
    return (
      message.includes('item_vendors') &&
      message.includes('tenant_id') &&
      (message.includes('does not exist') || message.includes('column'))
    );
  }

  private async resolveItemIdByCode(tenantId: string, itemCode?: string | null): Promise<string | null> {
    const code = String(itemCode || '').trim();
    if (!code) return null;
    const { data, error } = await this.supabase
      .from('items')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('code', code)
      .maybeSingle();
    if (error) {
      return null;
    }
    return data?.id || null;
  }

  private toNumber(value: any): number {
    const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'));
    return Number.isFinite(n) ? n : 0;
  }

  private safeNumber(value: any): number {
    return this.toNumber(value);
  }

  private buildWorldClassPoPdfData(po: any) {
    const safeNumber = (value: any): number => this.toNumber(value);
    const poItems = Array.isArray(po?.purchase_order_items || po?.items) ? (po.purchase_order_items || po.items) : [];
    const vendorBillingLine2 = po.vendor?.billing_line2 || po.vendor?.metadata?.billingLine2 || '';

    const pdfData: any = {
      poNumber: po.po_number,
      poDate: po.po_date || po.order_date,
      quotationRef: po.quotation_ref,
      prNumber: po.pr_number || po.pr?.pr_number,
      vendorName: (po.vendor?.name || po.vendor_name || 'N/A') + ((po.vendor?.code || po.vendor_code) ? ` - ${po.vendor?.code || po.vendor_code}` : ''),
      vendorCode: undefined,
      vendorAddress: vendorBillingLine2,
      vendorStreet: po.vendor?.street || po.vendor?.address,
      vendorCity: po.vendor?.city,
      vendorState: po.vendor?.state,
      vendorPincode: po.vendor?.pincode,
      vendorGSTIN: po.vendor?.tax_id || po.vendor?.gstin,
      vendorPAN: po.vendor?.pan,
      vendorEmail: po.vendor?.email,
      vendorPhone: po.vendor?.phone,
      vendorContactPerson: po.vendor?.contact_person,
      companyName: '',
      companyAddress: '',
      companyCity: '',
      companyState: '',
      companyPincode: '',
      companyGSTIN: '',
      companyEmail: '',
      companyPhone: '',
      companyWebsite: '',
      deliveryAddress: po.delivery_address,
      deliveryContactPerson: po.delivery_contact_person || null,
      deliveryPhone: po.delivery_contact_phone || null,
      items: poItems.map((row: any, index: number) => {
        const quantity = safeNumber(row.ordered_qty ?? row.quantity ?? row.orderedQuantity ?? 0);
        const discountPercent = safeNumber(row.discount_percent ?? row.discountPercent ?? 0);
        const taxPercent = safeNumber(row.tax_percent ?? row.taxPercent ?? row.tax_rate ?? row.taxRate ?? 0);
        const storedAmount = safeNumber(row.amount ?? row.total_price ?? row.total ?? row.totalPrice ?? 0);

        let unitPrice = safeNumber(row.rate ?? row.unit_price ?? row.unitPrice ?? row.price ?? 0);
        if (unitPrice <= 0 && quantity > 0 && storedAmount > 0) {
          unitPrice = storedAmount / quantity;
        }

        const baseAmount = quantity > 0 && unitPrice > 0 ? quantity * unitPrice : storedAmount;
        const discountAmount = Math.max(
          0,
          safeNumber(row.discount_amount ?? row.discountAmount) || baseAmount * (discountPercent / 100),
        );
        const taxableAmount = Math.max(0, baseAmount - discountAmount);
        const computedTaxTotal = Math.max(0, taxableAmount * (taxPercent / 100));
        const cgstRate = safeNumber(row.cgst_rate ?? row.cgstRate) || (taxPercent > 0 ? taxPercent / 2 : 0);
        const sgstRate = safeNumber(row.sgst_rate ?? row.sgstRate) || (taxPercent > 0 ? taxPercent / 2 : 0);
        const igstRate = safeNumber(row.igst_rate ?? row.igstRate) || 0;
        const cgstAmount = safeNumber(row.cgst_amount ?? row.cgstAmount) || (cgstRate > 0 ? taxableAmount * (cgstRate / 100) : 0);
        const sgstAmount = safeNumber(row.sgst_amount ?? row.sgstAmount) || (sgstRate > 0 ? taxableAmount * (sgstRate / 100) : 0);
        const igstAmount = safeNumber(row.igst_amount ?? row.igstAmount) || (igstRate > 0 ? taxableAmount * (igstRate / 100) : 0);
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
          uom: row.uom || row?.item?.uom || 'Nos',
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
      subtotal: safeNumber(po.subtotal ?? po.total_amount ?? 0),
      totalDiscount: safeNumber(po.total_discount ?? 0),
      taxableAmount: safeNumber(po.taxable_amount ?? 0),
      cgstTotal: safeNumber(po.cgst_total ?? 0),
      sgstTotal: safeNumber(po.sgst_total ?? 0),
      igstTotal: safeNumber(po.igst_total ?? 0),
      grandTotal: safeNumber(po.grand_total || po.total_amount || 0),
      paymentTerms: PAYMENT_TERMS_LABELS[po.payment_terms] || po.payment_terms || undefined,
      deliveryDate: po.expected_delivery || po.delivery_date,
      terms: {
        payment_terms: PAYMENT_TERMS_LABELS[po.payment_terms] || po.payment_terms || undefined,
        delivery_terms: undefined,
        freight_terms: undefined,
      },
      freightAmount: 0,
      freightGstApplicable: false,
      freightGstPercent: 0,
      freightGstAmount: 0,
      additionalExpenses: safeNumber(po.other_charges ?? 0),
      customsDuty: safeNumber(po.customs_duty ?? 0),
      remarks: (po.notes || po.remarks || '').replace(/\nDepartment:.*?(\n|$)/g, '').replace(/\nPriority:.*?(\n|$)/g, '').replace(/^Generated from PR:.*?\n?/m, '').trim() || undefined,
      currency: 'INR',
      projectName: po.project_name || '',
      preparedBy: po.created_by_name || '',
      reviewedBy: '',
      approvedBy: po.approved_by_name || '',
    };

    // Parse terms_and_conditions JSON for project/freight if stored there
    try {
      const tc = po.terms_and_conditions;
      if (tc && typeof tc === 'string' && tc.startsWith('{')) {
        const tcJson = JSON.parse(tc);
        if (!pdfData.projectName && tcJson.project) pdfData.projectName = tcJson.project;
        if (tcJson.freight) pdfData.terms.freight_terms = tcJson.freight;
          if (tcJson.freightAmount) (pdfData as any).freightAmount = safeNumber(tcJson.freightAmount);
          if (tcJson.freightGstApplicable) (pdfData as any).freightGstApplicable = tcJson.freightGstApplicable === true;
          if (tcJson.freightGstPercent) (pdfData as any).freightGstPercent = safeNumber(tcJson.freightGstPercent);
          if (tcJson.freightGstAmount) (pdfData as any).freightGstAmount = safeNumber(tcJson.freightGstAmount);
          if (tcJson.additionalExpenses) (pdfData as any).additionalExpenses = safeNumber(tcJson.additionalExpenses);
      } else if (tc && typeof tc === 'object') {
        if (!pdfData.projectName && (tc as any).project) pdfData.projectName = (tc as any).project;
        if ((tc as any).freight) pdfData.terms.freight_terms = (tc as any).freight;
          if ((tc as any).freightAmount) (pdfData as any).freightAmount = safeNumber((tc as any).freightAmount);
          if ((tc as any).freightGstApplicable) (pdfData as any).freightGstApplicable = (tc as any).freightGstApplicable === true;
          if ((tc as any).freightGstPercent) (pdfData as any).freightGstPercent = safeNumber((tc as any).freightGstPercent);
          if ((tc as any).freightGstAmount) (pdfData as any).freightGstAmount = safeNumber((tc as any).freightGstAmount);
          if ((tc as any).additionalExpenses) (pdfData as any).additionalExpenses = safeNumber((tc as any).additionalExpenses);
      }
    } catch {}

    const uniq = (values: any[]) => Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
    const itemPaymentTerms = uniq(pdfData.items.map((item: any) => item?.payment_terms ?? item?.paymentTerms));
    const itemDeliveryTerms = uniq(pdfData.items.map((item: any) => item?.delivery_terms ?? item?.deliveryTerms));

    if (!pdfData.paymentTerms && itemPaymentTerms.length > 0) {
      const joined = itemPaymentTerms.join(', ');
      pdfData.paymentTerms = joined;
      pdfData.terms = { ...pdfData.terms, payment_terms: joined };
    }

    if (itemDeliveryTerms.length > 0) {
      pdfData.terms = { ...pdfData.terms, delivery_terms: itemDeliveryTerms.join(', ') };
    }

    // Parse delivery address to extract state for Place of Supply (Point 2)
    // delivery_address is a free-text field; try to detect common Indian state names
    const INDIAN_STATES: Record<string, { name: string; code: string }> = {
      'andhra pradesh': { name: 'Andhra Pradesh', code: '37' },
      'telangana': { name: 'Telangana', code: '36' },
      'karnataka': { name: 'Karnataka', code: '29' },
      'tamil nadu': { name: 'Tamil Nadu', code: '33' },
      'maharashtra': { name: 'Maharashtra', code: '27' },
      'gujarat': { name: 'Gujarat', code: '24' },
      'rajasthan': { name: 'Rajasthan', code: '08' },
      'uttar pradesh': { name: 'Uttar Pradesh', code: '09' },
      'west bengal': { name: 'West Bengal', code: '19' },
      'delhi': { name: 'Delhi', code: '07' },
      'haryana': { name: 'Haryana', code: '06' },
      'punjab': { name: 'Punjab', code: '03' },
      'madhya pradesh': { name: 'Madhya Pradesh', code: '23' },
      'odisha': { name: 'Odisha', code: '21' },
      'kerala': { name: 'Kerala', code: '32' },
      'bihar': { name: 'Bihar', code: '10' },
      'jharkhand': { name: 'Jharkhand', code: '20' },
    };
    const deliveryAddrLower = String(po.delivery_address || '').toLowerCase();
    let deliveryStateName = '';
    let deliveryStateCode = '';
    for (const [key, val] of Object.entries(INDIAN_STATES)) {
      if (deliveryAddrLower.includes(key)) {
        deliveryStateName = val.name;
        deliveryStateCode = val.code;
        break;
      }
    }
    // Place of Supply = delivery state (Point 2); fallback to vendor state
    pdfData.placeOfSupply = deliveryStateName || pdfData.vendorState || '';

    // IGST vs CGST/SGST: if vendor state differs from company state (Andhra Pradesh / code 37), use IGST
    // Note: companyGSTIN is populated after branding is applied, so we use AP state code directly.
    const AP_STATE_CODE = '37';
    const vendorGstin = String(pdfData.vendorGSTIN || '');
    const vendorStateCode = vendorGstin.substring(0, 2);
    const isInterState = vendorStateCode.length === 2 && vendorStateCode !== AP_STATE_CODE;
    if (isInterState) {
      pdfData.items = pdfData.items.map((item: any) => {
        const combinedRate = safeNumber(item.cgst_rate) + safeNumber(item.sgst_rate);
        const combinedAmount = safeNumber(item.cgst_amount) + safeNumber(item.sgst_amount);
        return { ...item, igst_rate: combinedRate || item.igst_rate, igst_amount: combinedAmount || item.igst_amount, cgst_rate: 0, cgst_amount: 0, sgst_rate: 0, sgst_amount: 0 };
      });
      pdfData.igstTotal = (pdfData.cgstTotal || 0) + (pdfData.sgstTotal || 0) || pdfData.igstTotal;
      pdfData.cgstTotal = 0;
      pdfData.sgstTotal = 0;
    }

    const computedSubtotal = pdfData.items.reduce(
      (sum: number, item: any) => sum + safeNumber(item.quantity) * safeNumber(item.unit_price),
      0,
    );
    const computedDiscount = pdfData.items.reduce((sum: number, item: any) => sum + safeNumber(item.discount_amount), 0);
    const computedTaxable = pdfData.items.reduce((sum: number, item: any) => sum + safeNumber(item.taxable_amount), 0);
    const computedCgst = pdfData.items.reduce((sum: number, item: any) => sum + safeNumber(item.cgst_amount), 0);
    const computedSgst = pdfData.items.reduce((sum: number, item: any) => sum + safeNumber(item.sgst_amount), 0);
    const computedIgst = pdfData.items.reduce((sum: number, item: any) => sum + safeNumber(item.igst_amount), 0);
    const computedTaxTotal = computedCgst + computedSgst + computedIgst;
    const computedGrand = computedTaxable + computedTaxTotal;

    if (computedSubtotal > 0) {
      pdfData.subtotal = computedSubtotal;
    }
    if (computedTaxable > 0) {
      pdfData.taxableAmount = computedTaxable;
    }
    if (!safeNumber(pdfData.totalDiscount) && computedDiscount > 0) {
      pdfData.totalDiscount = computedDiscount;
    }

    const headerHasAnyTax = safeNumber(pdfData.cgstTotal) + safeNumber(pdfData.sgstTotal) + safeNumber(pdfData.igstTotal) > 0;
    if (!headerHasAnyTax && computedTaxTotal > 0) {
      pdfData.cgstTotal = computedCgst;
      pdfData.sgstTotal = computedSgst;
      pdfData.igstTotal = computedIgst;
    }

    const currentGrand = safeNumber(pdfData.grandTotal);
    const currentTaxable = safeNumber(pdfData.taxableAmount);
    if (computedTaxTotal > 0 && (currentGrand <= 0 || Math.abs(currentGrand - currentTaxable) < 0.01)) {
      pdfData.grandTotal = computedGrand;
    }

    pdfData.isServiceOrder = poItems.length > 0 && poItems.every((item: any) => normalizeInventoryCategory(item?.item?.category) === 'SERVICES');

    return pdfData;
  }

  private async fetchGrnReceivedByPoItem(tenantId: string, poItemIds: string[]): Promise<Map<string, number>> {
    if (poItemIds.length === 0) return new Map();
    
    const { data: grnItems, error } = await this.supabase
      .from('grn_items')
      .select('po_item_id, received_qty, received_quantity')
      .eq('tenant_id', tenantId)
      .in('po_item_id', poItemIds)
      .eq('inspection_status', 'ACCEPTED');
    
    if (error) {
      console.error('[PO] Failed to fetch GRN received quantities:', error);
      return new Map();
    }
    
    const receivedByPoItem = new Map<string, number>();
    for (const item of grnItems || []) {
      const poItemId = String(item.po_item_id || '').trim();
      if (!poItemId) continue;
      const qty = this.toNumber(item.received_qty ?? item.received_quantity ?? 0);
      receivedByPoItem.set(poItemId, (receivedByPoItem.get(poItemId) || 0) + qty);
    }
    
    return receivedByPoItem;
  }

  private async computeReceiptSummary(tenantId: string, po: any) {
    const items: any[] = Array.isArray(po?.purchase_order_items) ? po.purchase_order_items : [];
    if (items.length === 0) {
      return {
        receipt_status: 'OPEN',
        receipt_progress: { ordered_qty: 0, received_qty: 0, remaining_qty: 0, received_percent: 0 },
        purchase_order_items: items,
      };
    }

    // Fetch actual received quantities from GRN ledger
    const poItemIds = items.map((it: any) => String(it?.id || '').trim()).filter(Boolean);
    const grnReceivedByPoItem = await this.fetchGrnReceivedByPoItem(tenantId, poItemIds);

    let orderedTotal = 0;
    let receivedTotal = 0;

    const patchedItems = items.map((it: any) => {
      const ordered = this.toNumber(it?.ordered_qty);
      const poItemId = String(it?.id || '').trim();
      const received = grnReceivedByPoItem.get(poItemId) || 0;
      const remaining = Math.max(0, ordered - received);
      orderedTotal += ordered;
      receivedTotal += Math.min(received, ordered);
      return {
        ...it,
        received_qty: received,
        remaining_qty: remaining,
      };
    });

    const allFullyReceived = patchedItems.every((it: any) => this.toNumber(it.ordered_qty) <= this.toNumber(it.received_qty) + 1e-9);
    const anyReceived = patchedItems.some((it: any) => this.toNumber(it.received_qty) > 0);

    const receiptStatus = allFullyReceived ? 'FULLY_RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : 'OPEN';
    const receivedPercent = orderedTotal > 0 ? Math.round((receivedTotal / orderedTotal) * 1000) / 10 : 0;

    return {
      receipt_status: receiptStatus,
      receipt_progress: {
        ordered_qty: orderedTotal,
        received_qty: receivedTotal,
        remaining_qty: Math.max(0, orderedTotal - receivedTotal),
        received_percent: receivedPercent,
      },
      purchase_order_items: patchedItems,
    };
  }

  private async resolveVendorMap(tenantId: string, vendorIds: Array<string | null | undefined>) {
    const uniqueVendorIds = Array.from(
      new Set(
        vendorIds
          .map((vendorId) => String(vendorId || '').trim())
          .filter((vendorId) => vendorId.length > 0),
      ),
    );

    if (uniqueVendorIds.length === 0) {
      return new Map<string, any>();
    }

    const { data, error } = await this.supabase
      .from('vendors')
      .select('id, code, name, contact_person, email, phone, address, street, billing_line2, metadata, city, state, pincode, tax_id')
      .eq('tenant_id', tenantId)
      .in('id', uniqueVendorIds);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return new Map((data || []).map((vendor: any) => [vendor.id, vendor]));
  }

  private async assertVendorVerified(tenantId: string, vendorId?: string | null) {
    const normalizedVendorId = String(vendorId || '').trim();
    if (!normalizedVendorId) return;

    const { data, error } = await this.supabase
      .from('vendors')
      .select('id, name, code, is_active, is_verified')
      .eq('tenant_id', tenantId)
      .eq('id', normalizedVendorId)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data?.id) throw new BadRequestException('Vendor not found');
    if (data.is_active === false) throw new BadRequestException(`Vendor ${data.name || data.code || ''} is inactive and cannot be used.`);
    // Verification check disabled - causing too many errors
    // if (data.is_verified !== true) throw new BadRequestException(`Vendor ${data.name || data.code || ''} is not verified by admin and cannot be used.`);
  }

  private async assertItemsVerified(tenantId: string, rawItems: any[]) {
    const items = Array.isArray(rawItems) ? rawItems : [];
    const ids = Array.from(new Set(items.map((item) => String(item?.itemId || item?.item_id || '').trim()).filter(Boolean)));
    const codes = Array.from(new Set(items.map((item) => String(item?.itemCode || item?.item_code || '').trim()).filter(Boolean)));
    if (ids.length === 0 && codes.length === 0) return;

    const byId = new Map<string, any>();
    const byCode = new Map<string, any>();

    if (ids.length > 0) {
      const { data, error } = await this.supabase
        .from('items')
        .select('id, code, name, is_active, is_verified')
        .eq('tenant_id', tenantId)
        .in('id', ids);
      if (error) throw new BadRequestException(error.message);
      (data || []).forEach((item: any) => byId.set(String(item.id), item));
    }

    if (codes.length > 0) {
      const { data, error } = await this.supabase
        .from('items')
        .select('id, code, name, is_active, is_verified')
        .eq('tenant_id', tenantId)
        .in('code', codes);
      if (error) throw new BadRequestException(error.message);
      (data || []).forEach((item: any) => byCode.set(String(item.code), item));
    }

    for (const rawItem of items) {
      const id = String(rawItem?.itemId || rawItem?.item_id || '').trim();
      const code = String(rawItem?.itemCode || rawItem?.item_code || '').trim();
      const item = (id && byId.get(id)) || (code && byCode.get(code));
      if (!item) continue;
      const label = item.name || item.code || code || id;
      if (item.is_active === false) throw new BadRequestException(`Item ${label} is inactive and cannot be used.`);
      // Verification check disabled - causing too many errors
      // if (item.is_verified !== true) throw new BadRequestException(`Item ${label} is not verified by admin and cannot be used.`);
    }
  }

  private async upsertPreferredItemVendors(
    tenantId: string,
    userId: string,
    vendorId: string,
    items: Array<{ itemId?: string; itemCode?: string; rate?: number }>,
  ) {
    const rows: Array<Record<string, any>> = [];

    for (const item of items) {
      let itemId = String(item.itemId || '').trim();
      if (!itemId) {
        itemId = (await this.resolveItemIdByCode(tenantId, item.itemCode)) || '';
      }
      if (!itemId) continue;

      rows.push({
        tenant_id: tenantId,
        item_id: itemId,
        vendor_id: vendorId,
        priority: 1,
        unit_price: Number.isFinite(Number(item.rate)) ? Number(item.rate) : null,
        is_active: true,
        created_by: userId,
        updated_by: userId,
      });
    }

    if (rows.length === 0) return;

    const { error } = await this.supabase
      .from('item_vendors')
      .upsert(rows, { onConflict: 'item_id,vendor_id' });

    if (error) {
      if (this.isMissingItemVendorsTenantIdColumn(error)) {
        const fallbackRows = rows.map(({ tenant_id, ...rest }) => rest);
        const { error: fallbackError } = await this.supabase
          .from('item_vendors')
          .upsert(fallbackRows, { onConflict: 'item_id,vendor_id' });
        if (fallbackError) {
          console.error('[PurchaseOrdersService] Failed to upsert preferred item vendors (fallback):', fallbackError);
        }
        return;
      }
      console.error('[PurchaseOrdersService] Failed to upsert preferred item vendors:', error);
    }
  }

  // In-memory cache to track recent PO creations (prevents rapid duplicates)
  private recentCreations = new Map<string, number>();

  async create(tenantId: string, userId: string, data: any) {
    console.log('=== PO CREATE - Payment data received:', {
      paymentStatus: data.paymentStatus,
      paymentNotes: data.paymentNotes,
      paymentTerms: data.paymentTerms
    });

    // Layer 1: Timestamp-based duplicate prevention (within 10 seconds)
    const creationKey = `${tenantId}:${data.vendorId}:${(data.items ?? []).map((i: any) => `${i.itemId || i.item_code}:${i.orderedQty || i.quantity}`).join('|')}`;
    const lastCreation = this.recentCreations.get(creationKey);
    const now = Date.now();
    if (lastCreation && (now - lastCreation) < 10000) {
      console.error('[PO CREATE] Blocked: Duplicate submission within 10 seconds');
      throw new BadRequestException('A Purchase Order with these items was just created. Please wait 10 seconds before creating another.');
    }
    this.recentCreations.set(creationKey, now);
    // Cleanup old entries (older than 60 seconds)
    for (const [key, ts] of this.recentCreations.entries()) {
      if (now - ts > 60000) this.recentCreations.delete(key);
    }
    
    // VERIFICATION DISABLED TEMPORARILY - uncomment below to re-enable
    // const isDraftCreate = (data.status || 'DRAFT') === 'DRAFT';
    // if (!isDraftCreate) {
    //   await this.assertVendorVerified(tenantId, data.vendorId);
    //   await this.assertItemsVerified(tenantId, data.items || []);
    // }

    // Duplicate prevention logic:
    // - Allow multiple (partial) POs for same PR+vendor if item+qty differs.
    // - Block only if an identical item+qty set already exists.
    let isPartialPo = false;
    let partialPoSequence: number | null = null;
    let parentPrId: string | null = null;

    if (data.prId && data.vendorId) {
      const { data: existingPOs, error: checkError } = await this.supabase
        .from('purchase_orders')
        .select('id, po_number, vendor_id, partial_po_sequence')
        .eq('tenant_id', tenantId)
        .eq('pr_id', data.prId)
        .eq('vendor_id', data.vendorId);

      if (checkError) {
        console.error('Duplicate check error:', checkError);
        throw new BadRequestException(checkError.message);
      }

      const existing = existingPOs ?? [];
      if (existing.length > 0) {
        const incomingLines = (data.items ?? []).map((item: any) => {
          const code = item.itemCode ?? item.item_code ?? item.itemId ?? item.item_id ?? '';
          const qty = item.orderedQty ?? item.ordered_qty ?? item.quantity ?? 0;
          return `${String(code)}:${Number(qty)}`;
        });

        const incomingKey = incomingLines
          .filter(Boolean)
          .sort()
          .join('|');

        if (incomingKey.length > 0) {
          const existingIds = existing.map((p: any) => p.id);
          const { data: existingItems, error: itemsErr } = await this.supabase
            .from('purchase_order_items')
            .select('po_id, item_code, item_id, ordered_qty')
            .in('po_id', existingIds);

          if (itemsErr) {
            console.error('Duplicate items check error:', itemsErr);
            throw new BadRequestException(itemsErr.message);
          }

          const itemsByPo = new Map<string, Array<{ item_code: string | null; item_id: string | null; ordered_qty: any }>>();
          for (const row of existingItems ?? []) {
            const list = itemsByPo.get(row.po_id) ?? [];
            list.push(row);
            itemsByPo.set(row.po_id, list);
          }

          for (const po of existing) {
            const lines = (itemsByPo.get(po.id) ?? []).map((r: any) => {
              const code = r.item_code ?? r.item_id ?? '';
              const qty = r.ordered_qty ?? 0;
              return `${String(code)}:${Number(qty)}`;
            });

            const key = lines
              .filter(Boolean)
              .sort()
              .join('|');

            if (key.length > 0 && key === incomingKey) {
              // Fetch vendor name separately to avoid relation issues
              const { data: vendorData } = await this.supabase
                .from('vendors')
                .select('name')
                .eq('id', po.vendor_id)
                .single();

              const vendorName = vendorData?.name || 'this vendor';
              throw new BadRequestException(
                `A Purchase Order (${po.po_number}) already exists for this PR and ${vendorName} with the same items and quantities. Cannot create duplicate PO.`
              );
            }
          }
        }

        // Not an exact duplicate; treat as partial PO.
        isPartialPo = true;
        parentPrId = data.prId;
        const maxSeq = existing.reduce((max: number, p: any) => {
          const seq = typeof p.partial_po_sequence === 'number' ? p.partial_po_sequence : 1;
          return Math.max(max, seq);
        }, 1);
        partialPoSequence = maxSeq + 1;
      }
    }

    // Generate PO number — only for confirmed POs, not drafts
    const isDraft = (data.status || 'DRAFT') === 'DRAFT';
    let poNumber: string;
    if (isDraft) {
      // Use a temporary placeholder; real number assigned on approval
      const { randomBytes } = await import('crypto');
      poNumber = `DRAFT-${randomBytes(4).toString('hex').toUpperCase()}`;
    } else {
      poNumber = await this.generatePONumber(tenantId);
    }

    if (!Array.isArray(data.attachments) || data.attachments.length === 0) {
      throw new BadRequestException('Vendor quotation attachment is mandatory for Purchase Order.');
    }

    const { data: po, error } = await this.supabase
      .from('purchase_orders')
      .insert({
        tenant_id: tenantId,
        po_number: poNumber,
        pr_id: data.prId,
        is_partial_po: isPartialPo,
        parent_pr_id: parentPrId,
        partial_po_sequence: partialPoSequence ?? undefined,
        vendor_id: data.vendorId,
        po_date: data.poDate || new Date().toISOString().split('T')[0],
        delivery_date: data.deliveryDate,
        quotation_ref: data.quotationRef || null,
        payment_terms: data.paymentTerms || 'NET_30',
        payment_status: data.paymentStatus || 'UNPAID',
        payment_notes: data.paymentNotes,
        delivery_address: data.deliveryAddress,
        delivery_contact_person: data.deliveryContactPerson || null,
        delivery_contact_phone: data.deliveryContactPhone || null,
        terms_and_conditions: (() => {
          const project = data.projectName || '';
          const freight = data.freightTerms || '';
          const freightAmount = this.safeNumber(data.freightAmount);
          const freightGstApplicable = data.freightGstApplicable === true;
          const freightGstPercent = freightGstApplicable ? this.safeNumber(data.freightGstPercent) : 0;
          const freightGstAmount = freightGstApplicable ? this.safeNumber(data.freightGstAmount) : 0;
          const additionalExpenses = this.safeNumber(data.otherCharges);
          // Check if any freight-related field was explicitly provided (including 0 values)
          const hasFreightData = data.freightAmount !== undefined || data.freightGstApplicable !== undefined || data.freightGstPercent !== undefined || data.freightGstAmount !== undefined || data.freightTerms !== undefined || data.projectName !== undefined || data.otherCharges !== undefined;
          if (hasFreightData || project || freight || freightAmount || freightGstApplicable || freightGstPercent || freightGstAmount || additionalExpenses) {
            return JSON.stringify({ project, freight, freightAmount, freightGstApplicable, freightGstPercent, freightGstAmount, additionalExpenses });
          }
          return data.termsAndConditions;
        })(),
        status: data.status || 'DRAFT',
        total_amount: data.totalAmount || 0,
        tax_amount: data.taxAmount || 0,
        discount_amount: data.discountAmount || 0,
        grand_total: data.grandTotal ?? data.totalAmount ?? 0,
        customs_duty: this.safeNumber(data.customsDuty),
        other_charges: this.safeNumber(data.otherCharges),
        remarks: data.remarks,
        attachments: data.attachments !== undefined || this.hasPODrawingSelections(data.items)
          ? this.buildPOAttachmentsWithDrawingSelections(data.attachments, data.items)
          : undefined,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    // Insert items
    if (data.items && data.items.length > 0) {
      const items = data.items.map((item: any) => {
        const baseAmount = (item.orderedQty || 0) * (item.rate || 0);
        const taxAmount = baseAmount * ((item.taxPercent || 0) / 100);
        const discountAmount = baseAmount * ((item.discountPercent || 0) / 100);
        const finalAmount = baseAmount + taxAmount - discountAmount;
        
        return {
          po_id: po.id,
          pr_item_id: item.prItemId,
          item_id: item.itemId || item.item_id || null,
          item_code: item.itemCode,
          item_name: item.itemName,
          description: item.description,
          uom: item.uom,
          ordered_qty: item.orderedQty,
          rate: item.rate,
          tax_percent: item.taxPercent || 0,
          discount_percent: item.discountPercent || 0,
          amount: item.amount || finalAmount,
          delivery_date: item.deliveryDate,
          payment_terms: item.paymentTerms ?? null,
          delivery_terms: item.deliveryTerms ?? null,
          remarks: item.remarks,
        };
      });

      const { error: itemsError } = await this.supabase
        .from('purchase_order_items')
        .insert(items);

      if (itemsError) throw new BadRequestException(itemsError.message);

      await this.upsertPreferredItemVendors(
        tenantId,
        userId,
        data.vendorId,
        data.items.map((item: any) => ({
          itemId: item.itemId || item.item_id || null,
          itemCode: item.itemCode || null,
          rate: item.rate || null,
        })),
      );
    }

    return this.findOne(tenantId, po.id);
  }

  async findAll(tenantId: string, filters?: any) {
    let query = this.supabase
      .from('purchase_orders')
      .select(`
        *,
        vendor:vendors(id, code, name, contact_person, email),
        purchase_order_items(*, item:items(hsn_code, uom, category))
      `)
      .eq('tenant_id', tenantId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.vendorId) {
      query = query.eq('vendor_id', filters.vendorId);
    }

    if (filters?.prId) {
      query = query.eq('pr_id', filters.prId);
    }

    if (filters?.search) {
      query = query.or(`po_number.ilike.%${filters.search}%,remarks.ilike.%${filters.search}%`);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw new BadRequestException(error.message);

    // Avoid PostgREST embed ambiguity: purchase_orders has multiple FKs to purchase_requisitions
    // (e.g. pr_id and parent_pr_id). Fetch PRs separately and attach as `pr`.
    const rows = Array.isArray(data) ? data : [];
    const prIds = Array.from(
      new Set(
        rows
          .map((po: any) => po?.pr_id)
          .filter((id: any) => typeof id === 'string' && id.trim().length > 0),
      ),
    );

    let prById = new Map<string, any>();
    if (prIds.length > 0) {
      const { data: prRows, error: prError } = await this.supabase
        .from('purchase_requisitions')
        .select('id, pr_number')
        .in('id', prIds);

      if (prError) throw new BadRequestException(prError.message);
      prById = new Map((prRows || []).map((pr: any) => [pr.id, pr]));
    }

    const vendorById = await this.resolveVendorMap(
      tenantId,
      rows.map((po: any) => po?.vendor_id),
    );

    const result = [];
    for (const po of rows) {
      const hydratedPo = this.hydratePODrawingSelections(po);
      const receipt = await this.computeReceiptSummary(tenantId, hydratedPo);
      
      // Filter out fully received POs if pendingOnly is requested (for GRN creation)
      if (filters?.pendingOnly && receipt.receipt_status === 'FULLY_RECEIVED') {
        continue;
      }
      
      result.push({
        ...hydratedPo,
        ...receipt,
        vendor: po?.vendor_id ? vendorById.get(po.vendor_id) ?? null : null,
        pr: po?.pr_id ? prById.get(po.pr_id) ?? null : null,
      });
    }
    return result;
  }

  async findOne(tenantId: string, id: string) {
    const { data, error } = await this.supabase
      .from('purchase_orders')
      .select(`
        *,
        vendor:vendors(id, code, name, contact_person, email, phone, address, street, billing_line2, metadata, city, state, pincode, tax_id),
        purchase_order_items(*, item:items(hsn_code, uom, category))
      `)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[PO findOne] Supabase error for id=%s:', id, error);
      throw new NotFoundException('Purchase order not found');
    }
    const hydratedData = this.hydratePODrawingSelections(data);
    const receipt = await this.computeReceiptSummary(tenantId, hydratedData);

    // Attach PR (see note in findAll about multiple relationships)
    let pr: any = null;
    let rfqTrail: any = null;
    if ((hydratedData as any)?.pr_id) {
      const { data: prRow, error: prError } = await this.supabase
        .from('purchase_requisitions')
        .select('id, pr_number')
        .eq('id', (hydratedData as any).pr_id)
        .maybeSingle();

      if (prError) throw new BadRequestException(prError?.message || 'Failed to load PR');
      pr = prRow ?? null;

      // Fetch RFQ trail for this vendor on this PR
      if ((hydratedData as any)?.vendor_id) {
        const { data: rfqRows } = await this.supabase
          .from('rfqs')
          .select('id, rfq_number, status, notes, created_at, vendor:vendors(id, name)')
          .eq('tenant_id', tenantId)
          .eq('pr_id', (hydratedData as any).pr_id)
          .eq('vendor_id', (hydratedData as any).vendor_id)
          .order('created_at', { ascending: false });

        if (Array.isArray(rfqRows) && rfqRows.length > 0) {
          const rfq = rfqRows[0];
          let meta: any = {};
          try { meta = rfq.notes ? (typeof rfq.notes === 'string' ? JSON.parse(rfq.notes) : rfq.notes) : {}; } catch {}
          rfqTrail = {
            rfq_number: rfq.rfq_number,
            status: rfq.status,
            created_at: rfq.created_at,
            response_attachments: Array.isArray(meta.responseAttachments) ? meta.responseAttachments : [],
            response_remarks: meta.responseRemarks || null,
          };
        }
      }
    }

    const vendorById = await this.resolveVendorMap(tenantId, [(hydratedData as any)?.vendor_id]);

    const termsMetadata = this.parseTermsMetadata((hydratedData as any)?.terms_and_conditions);

    // Lookup prepared-by user name
    let createdByName = '';
    if ((hydratedData as any)?.created_by) {
      createdByName = await this.resolveUserDisplayName((hydratedData as any).created_by);
    }

    const approvedByName =
      String(termsMetadata.approvedByName || '').trim() ||
      (await this.resolveUserDisplayName((hydratedData as any)?.approved_by || termsMetadata.approvedByUserId)) ||
      (await this.resolvePoApproverNameFromAudit(tenantId, id));

    return {
      ...(hydratedData as any),
      ...receipt,
      vendor: (hydratedData as any)?.vendor_id ? vendorById.get((hydratedData as any).vendor_id) ?? null : null,
      pr,
      rfq_trail: rfqTrail,
      created_by_name: createdByName,
      approved_by_name: approvedByName,
    };
  }

  async update(tenantId: string, id: string, data: any) {
    console.log('=== PO UPDATE - Payment data received:', {
      paymentStatus: data.paymentStatus,
      paymentNotes: data.paymentNotes,
      paymentTerms: data.paymentTerms
    });

    const { data: existingPO } = await this.supabase
      .from('purchase_orders')
      .select('status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
    // VERIFICATION DISABLED TEMPORARILY - uncomment below to re-enable
    // const isDraftUpdate = (data.status || existingPO?.status || '') === 'DRAFT';
    // if (!isDraftUpdate) {
    //   if (data.vendorId) {
    //     await this.assertVendorVerified(tenantId, data.vendorId);
    //   }
    //   if (data.items) {
    //     await this.assertItemsVerified(tenantId, data.items);
    //   }
    // }

    if (data.attachments !== undefined && (!Array.isArray(data.attachments) || data.attachments.length === 0)) {
      throw new BadRequestException('Vendor quotation attachment is mandatory for Purchase Order.');
    }
    
    const { error } = await this.supabase
      .from('purchase_orders')
      .update({
        vendor_id: data.vendorId,
        po_date: data.poDate || data.orderDate,
        delivery_date: data.deliveryDate || data.expectedDelivery,
        quotation_ref: data.quotationRef !== undefined ? (data.quotationRef || null) : undefined,
        payment_terms: data.paymentTerms,
        payment_status: data.paymentStatus,
        payment_notes: data.paymentNotes,
        delivery_address: data.deliveryAddress,
        delivery_contact_person: data.deliveryContactPerson !== undefined ? (data.deliveryContactPerson || null) : undefined,
        delivery_contact_phone: data.deliveryContactPhone !== undefined ? (data.deliveryContactPhone || null) : undefined,
        terms_and_conditions: (() => {
          const project = data.projectName || '';
          const freight = data.freightTerms || '';
          const freightAmount = this.safeNumber(data.freightAmount);
          const freightGstApplicable = data.freightGstApplicable === true;
          const freightGstPercent = freightGstApplicable ? this.safeNumber(data.freightGstPercent) : 0;
          const freightGstAmount = freightGstApplicable ? this.safeNumber(data.freightGstAmount) : 0;
          const additionalExpenses = this.safeNumber(data.otherCharges);
          // Check if any freight-related field was explicitly provided (including 0 values for removal)
          const hasFreightData = data.freightAmount !== undefined || data.freightGstApplicable !== undefined || data.freightGstPercent !== undefined || data.freightGstAmount !== undefined || data.freightTerms !== undefined || data.projectName !== undefined || data.otherCharges !== undefined;
          if (hasFreightData || project || freight || freightAmount || freightGstApplicable || freightGstPercent || freightGstAmount || additionalExpenses) {
            return JSON.stringify({ project, freight, freightAmount, freightGstApplicable, freightGstPercent, freightGstAmount, additionalExpenses });
          }
          return data.termsAndConditions ?? undefined;
        })(),
        remarks: data.remarks || data.notes,
        attachments: data.attachments !== undefined || this.hasPODrawingSelections(data.items)
          ? this.buildPOAttachmentsWithDrawingSelections(data.attachments, data.items)
          : undefined,
        total_amount: data.totalAmount,
        grand_total: data.grandTotal ?? data.totalAmount,
        customs_duty: data.customsDuty !== undefined ? this.safeNumber(data.customsDuty) : undefined,
        other_charges: data.otherCharges !== undefined ? this.safeNumber(data.otherCharges) : undefined,
        updated_at: new Date().toISOString(),
        ...(existingPO?.status === 'REJECTED' ? { status: 'PENDING' } : {}),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id);
    
    console.log('=== PO UPDATE - After update:', {
      id,
      paymentStatus: data.paymentStatus,
      error: error
    });

    if (error) throw new BadRequestException(error.message);

    // Update items if provided
    if (data.items) {
      await this.supabase
        .from('purchase_order_items')
        .delete()
        .eq('po_id', id);

      if (data.items.length > 0) {
        const items = data.items.map((item: any) => ({
          po_id: id,
          pr_item_id: item.prItemId,
          item_id: item.itemId || item.item_id || null,
          item_code: item.itemCode,
          item_name: item.itemName,
          description: item.description,
          uom: item.uom,
          ordered_qty: item.orderedQty || item.quantity,
          rate: item.rate || item.unitPrice,
          tax_percent: item.taxPercent ?? item.taxRate ?? 0,
          discount_percent: item.discountPercent || 0,
          amount: item.amount || item.totalPrice,
          delivery_date: item.deliveryDate,
          payment_terms: item.paymentTerms ?? null,
          delivery_terms: item.deliveryTerms ?? null,
          remarks: item.remarks || item.specifications,
        }));

        await this.supabase
          .from('purchase_order_items')
          .insert(items);
      }
    }

    return this.findOne(tenantId, id);
  }

  async updateStatus(tenantId: string, id: string, status: string, userId?: string) {
    console.log('Updating PO status:', { tenantId, id, status, userId });

    const normalizedStatus = String(status || '').trim().toUpperCase();
    const nowIso = new Date().toISOString();
    const updateData: any = {
      status: normalizedStatus,
      updated_at: nowIso,
    };

    const { data: currentPo } = await this.supabase
      .from('purchase_orders')
      .select('po_number, status, terms_and_conditions')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    // When approving a DRAFT PO, assign the real sequential PO number
    if (normalizedStatus === 'APPROVED') {
      if (currentPo?.po_number?.startsWith('DRAFT-')) {
        updateData.po_number = await this.generatePONumber(tenantId);
      }
      updateData.approved_by = userId || null;
      updateData.approved_at = nowIso;

      const termsMetadata = this.parseTermsMetadata(currentPo?.terms_and_conditions);
      const approverName = await this.resolveUserDisplayName(userId);
      updateData.terms_and_conditions = JSON.stringify({
        ...termsMetadata,
        approvedByUserId: userId || termsMetadata.approvedByUserId || null,
        approvedByName: approverName || termsMetadata.approvedByName || '',
        approvedAt: nowIso,
      });
    }

    const { data, error } = await this.supabase
      .from('purchase_orders')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Status update error:', error);
      throw new BadRequestException(error.message);
    }
    
    console.log('Status updated successfully:', data);

    // AUTOMATIC EMAIL DISABLED - Vendors were receiving unsolicited emails
    // if (normalizedStatus === 'APPROVED') {
    //   try {
    //     await this.sendPOEmail(tenantId, id);
    //   } catch (emailError: any) {
    //     console.error('PO approved but automatic email failed:', emailError?.message || emailError);
    //   }
    // }

    return this.findOne(tenantId, id);
  }

  async updateTracking(tenantId: string, id: string, trackingData: any) {
    console.log('Updating PO tracking:', { tenantId, id, trackingData });
    
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (trackingData.tracking_number !== undefined) {
      updateData.tracking_number = trackingData.tracking_number;
    }
    if (trackingData.shipped_date !== undefined) {
      updateData.shipped_date = trackingData.shipped_date;
    }
    if (trackingData.estimated_delivery_date !== undefined) {
      updateData.estimated_delivery_date = trackingData.estimated_delivery_date;
    }
    if (trackingData.actual_delivery_date !== undefined) {
      updateData.actual_delivery_date = trackingData.actual_delivery_date;
    }
    if (trackingData.carrier_name !== undefined) {
      updateData.carrier_name = trackingData.carrier_name;
    }
    if (trackingData.tracking_url !== undefined) {
      updateData.tracking_url = trackingData.tracking_url;
    }
    if (trackingData.delivery_status !== undefined) {
      updateData.delivery_status = trackingData.delivery_status;
    } else if (
      trackingData.tracking_number !== undefined ||
      trackingData.shipped_date !== undefined ||
      trackingData.carrier_name !== undefined ||
      trackingData.tracking_url !== undefined
    ) {
      updateData.delivery_status = 'IN_TRANSIT';
    }

    const { data, error } = await this.supabase
      .from('purchase_orders')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Tracking update error:', error);
      throw new BadRequestException(error.message);
    }
    
    console.log('Tracking updated successfully:', data);
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string) {
    const { data: po, error: poError } = await this.supabase
      .from('purchase_orders')
      .select('id, po_number')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle();

    if (poError) {
      throw new BadRequestException(poError.message);
    }

    if (!po) {
      throw new NotFoundException('Purchase Order not found');
    }

    const grnBlock = await this.findBlockingGrnForPo(tenantId, id);
    if (grnBlock) {
      throw new BadRequestException(
        `Cannot delete Purchase Order ${po.po_number} because GRN ${grnBlock.grnNumber} exists. Delete/void the GRN first.`,
      );
    }

    const { error } = await this.supabase
      .from('purchase_orders')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) {
      // Foreign key violations are common here (e.g., GRN references); show a clearer message.
      if (error.code === '23503') {
        throw new BadRequestException(
          `Cannot delete Purchase Order ${po.po_number} because it is referenced by other records (e.g., GRN). Remove related records first.`,
        );
      }

      throw new BadRequestException(error.message);
    }

    return { message: 'Purchase Order deleted successfully' };
  }

  private async findBlockingGrnForPo(
    tenantId: string,
    poId: string,
  ): Promise<{ table: 'grns' | 'grn'; grnNumber: string } | null> {
    const tryFindInTable = async (table: 'grns' | 'grn') => {
      const { data, error } = await this.supabase
        .from(table)
        .select('id, grn_number')
        .eq('tenant_id', tenantId)
        .eq('po_id', poId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        // Ignore missing legacy tables.
        if (error.code === '42P01') {
          return null;
        }

        throw new BadRequestException(error.message);
      }

      if (!data) {
        return null;
      }

      return {
        table,
        grnNumber: (data as any).grn_number,
      };
    };

    return (await tryFindInTable('grns')) ?? (await tryFindInTable('grn'));
  }

  private async generatePONumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `PO-${year}-${month}`;

    // Fetch ALL real PO numbers across all months to find the global max sequence.
    // This prevents the counter resetting to 001 when the month rolls over.
    const { data } = await this.supabase
      .from('purchase_orders')
      .select('po_number')
      .eq('tenant_id', tenantId)
      .like('po_number', 'PO-%');

    let maxSeq = 0;
    for (const row of (data || [])) {
      const match = /^PO-\d{4}-\d{2}-(\d+)$/.exec(row.po_number || '');
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }

    return `${prefix}-${String(maxSeq + 1).padStart(3, '0')}`;
  }

  private sanitizeFilename(value: string) {
    const safe = (value || 'attachment').trim();
    return safe.replace(/[\\/:*?"<>|\r\n]+/g, '_');
  }

  private dataUrlToNodemailerAttachment(input: {
    fileUrl: string;
    filename: string;
    contentType?: string | null;
  }) {
    const filename = this.sanitizeFilename(input.filename);
    const fileUrl = input.fileUrl;

    if (!fileUrl) {
      throw new BadRequestException('Attachment fileUrl missing');
    }

    if (fileUrl.startsWith('data:')) {
      const commaIndex = fileUrl.indexOf(',');
      if (commaIndex === -1) {
        throw new BadRequestException('Invalid data URL');
      }

      const header = fileUrl.slice(0, commaIndex);
      const base64Payload = fileUrl.slice(commaIndex + 1);

      const isBase64 = header.toLowerCase().includes(';base64');
      const mimeMatch = header.match(/^data:([^;]+)/i);
      const contentType = input.contentType || (mimeMatch ? mimeMatch[1] : undefined);

      if (!isBase64) {
        throw new BadRequestException('Unsupported data URL encoding (expected base64)');
      }

      return {
        filename,
        content: Buffer.from(base64Payload, 'base64'),
        contentType,
      };
    }

    // Fallback for non-data URLs (e.g. http(s) links)
    return {
      filename,
      path: fileUrl,
      contentType: input.contentType || undefined,
    };
  }

  private async buildPOEmailData(
    tenantId: string,
    po: any,
    overrides?: { to?: string; subject?: string; customMessage?: string },
  ) {
    const recipient = String(overrides?.to || '').trim() || String(po?.vendor?.email || '').trim();
    if (!recipient) {
      throw new BadRequestException('Vendor email not found');
    }

    const poItems: any[] = Array.isArray(po.purchase_order_items)
      ? po.purchase_order_items
      : [];

    const attachments: any[] = [];
    const { drawings, missingCompulsory } = await this.resolvePODrawingChoices(tenantId, poItems);

    for (const drawingChoice of drawings) {
      const activeDrawing = drawingChoice.drawing;
      const poItem = drawingChoice.poItem;
      const resolvedItem = drawingChoice.resolvedItem;
      const itemCodeOrName =
        poItem?.item_code ||
        resolvedItem?.code ||
        poItem?.item_name ||
        resolvedItem?.name ||
        'ITEM';
      const versionText = activeDrawing.version ? `v${activeDrawing.version}` : 'v';
      const baseName = activeDrawing.file_name || 'drawing';
      const filename = `${itemCodeOrName}_${versionText}_${baseName}`;

      attachments.push(
        this.dataUrlToNodemailerAttachment({
          fileUrl: activeDrawing.file_url,
          filename,
          contentType: activeDrawing.file_type,
        }),
      );
    }

    if (missingCompulsory.length > 0) {
      throw new BadRequestException(
        `Cannot send PO email. ACTIVE drawing missing for compulsory item(s): ${missingCompulsory.join(', ')}`,
      );
    }

    // Generate PO PDF attachment using the latest world-class template
    let poPdfBuffer = await this.worldClassPoPdfService.generatePOPdf(
      tenantId,
      this.buildWorldClassPoPdfData(po),
    );

    const drawingFiles = drawings.map((drawingChoice) => drawingChoice.drawing);
    if (drawingFiles.length > 0) {
      poPdfBuffer = await this.worldClassPoPdfService.appendDrawings(poPdfBuffer, drawingFiles);
    }

    const poAttachmentFiles = (Array.isArray(po.attachments) ? po.attachments : [])
      .filter((attachment: any) => attachment?.url)
      .map((attachment: any) => {
        const fileName = attachment.name || String(attachment.url).split('/').pop() || '';
        const extension = fileName.split('.').pop()?.toLowerCase() || '';
        return { file_url: attachment.url, file_name: fileName, file_type: extension };
      });

    if (poAttachmentFiles.length > 0) {
      poPdfBuffer = await this.worldClassPoPdfService.appendDrawings(poPdfBuffer, poAttachmentFiles);
    }

    const pdfFilename = this.worldClassPoPdfService.generateFilename(po.po_number);
    
    // Add PDF to attachments
    attachments.push({
      filename: pdfFilename,
      content: poPdfBuffer,
      contentType: 'application/pdf',
    });

    const emailData = {
      tenant_id: tenantId,
      po_number: po.po_number,
      po_date: po.po_date,
      delivery_date: po.delivery_date,
      vendor_name: po.vendor.name,
      items: poItems.map((item: any) => ({
        item_name: item.item_name,
        quantity: item.ordered_qty,
        unit_price: item.rate,
        tax_percent: item.tax_percent,
        amount: item.amount,
        payment_terms: (item.payment_terms ?? item.paymentTerms ?? '')?.toString?.() ?? '',
        delivery_terms: (item.delivery_terms ?? item.deliveryTerms ?? '')?.toString?.() ?? '',
      })),
      customs_duty: po.customs_duty,
      other_charges: po.other_charges,
      total_amount: po.total_amount,
      delivery_address: po.delivery_address,
      remarks: po.remarks,
      subject: overrides?.subject,
      custom_message: overrides?.customMessage,
      attachments,
    };

    return { recipient, emailData };
  }

  async previewPOEmail(tenantId: string, poId: string, body?: any) {
    const po = await this.findOne(tenantId, poId);
    const overrides = {
      to:
        typeof body?.to === 'string'
          ? body.to
          : typeof body?.recipient === 'string'
            ? body.recipient
            : undefined,
      subject: typeof body?.subject === 'string' ? body.subject : undefined,
      customMessage:
        typeof body?.customMessage === 'string'
          ? body.customMessage
          : typeof body?.custom_message === 'string'
            ? body.custom_message
            : undefined,
    };
    const { recipient, emailData } = await this.buildPOEmailData(tenantId, po, overrides);

    const preview = await this.emailService.buildPOPreview(recipient, emailData);

    return {
      po_id: poId,
      recipient,
      preview,
    };
  }

  async fetchActiveDrawingsForItems(tenantId: string, itemIds: string[]): Promise<any[]> {
    if (!itemIds || itemIds.length === 0) return [];
    const { data, error } = await this.supabase
      .from('item_drawings')
      .select('id, item_id, file_name, file_type, file_url')
      .eq('tenant_id', tenantId)
      .in('item_id', itemIds)
      .eq('is_active', true);
    if (error) {
      console.warn('[PO] fetchActiveDrawingsForItems error:', error.message);
      return [];
    }
    // Deduplicate: one drawing per item (highest version already selected by is_active)
    const seen = new Set<string>();
    return (data || []).filter((d) => {
      if (seen.has(d.item_id)) return false;
      seen.add(d.item_id);
      return true;
    });
  }

  private async resolvePODrawingChoices(tenantId: string, poItems: any[]): Promise<{ drawings: any[]; missingCompulsory: string[] }> {
    const rows = Array.isArray(poItems) ? poItems : [];
    if (rows.length === 0) return { drawings: [], missingCompulsory: [] };

    const itemIds = Array.from(new Set(rows.map((poItem) => poItem?.item_id).filter(Boolean)));
    const itemCodes = Array.from(new Set(rows.map((poItem) => poItem?.item_code).filter(Boolean)));

    const itemsById = new Map<string, any>();
    const itemsByCode = new Map<string, any>();

    if (itemIds.length > 0) {
      const { data, error } = await this.supabase
        .from('items')
        .select('id, code, name, drawing_required')
        .eq('tenant_id', tenantId)
        .in('id', itemIds);

      if (error) throw new BadRequestException(error.message);
      for (const itemRow of data || []) {
        itemsById.set(itemRow.id, itemRow);
        if (itemRow.code) itemsByCode.set(itemRow.code, itemRow);
      }
    }

    if (itemCodes.length > 0) {
      const { data, error } = await this.supabase
        .from('items')
        .select('id, code, name, drawing_required')
        .eq('tenant_id', tenantId)
        .in('code', itemCodes);

      if (error) throw new BadRequestException(error.message);
      for (const itemRow of data || []) {
        itemsById.set(itemRow.id, itemRow);
        if (itemRow.code) itemsByCode.set(itemRow.code, itemRow);
      }
    }

    const selectedDrawingIds = Array.from(
      new Set(
        rows
          .map((poItem) => poItem?.selected_drawing_id || poItem?.selectedDrawingId)
          .filter(Boolean),
      ),
    );

    const selectedDrawingById = new Map<string, any>();
    if (selectedDrawingIds.length > 0) {
      const { data, error } = await this.supabase
        .from('item_drawings')
        .select('id, item_id, file_name, file_type, file_url, file_size, version, is_active')
        .eq('tenant_id', tenantId)
        .in('id', selectedDrawingIds);

      if (error) throw new BadRequestException(error.message);
      for (const drawingRow of data || []) {
        selectedDrawingById.set(drawingRow.id, drawingRow);
      }
    }

    const resolvedItemIds = Array.from(
      new Set(
        rows
          .map((poItem) => {
            const resolvedItem =
              (poItem?.item_id ? itemsById.get(poItem.item_id) : null) ||
              (poItem?.item_code ? itemsByCode.get(poItem.item_code) : null);
            return resolvedItem?.id || poItem?.item_id || null;
          })
          .filter(Boolean),
      ),
    );

    const activeDrawingByItemId = new Map<string, any>();
    if (resolvedItemIds.length > 0) {
      const { data, error } = await this.supabase
        .from('item_drawings')
        .select('id, item_id, file_name, file_type, file_url, file_size, version, is_active')
        .eq('tenant_id', tenantId)
        .in('item_id', resolvedItemIds)
        .eq('is_active', true)
        .order('version', { ascending: false });

      if (error) throw new BadRequestException(error.message);
      for (const drawingRow of data || []) {
        if (!activeDrawingByItemId.has(drawingRow.item_id)) {
          activeDrawingByItemId.set(drawingRow.item_id, drawingRow);
        }
      }
    }

    const drawings: any[] = [];
    const missingCompulsory: string[] = [];

    for (const poItem of rows) {
      const resolvedItem =
        (poItem?.item_id ? itemsById.get(poItem.item_id) : null) ||
        (poItem?.item_code ? itemsByCode.get(poItem.item_code) : null);
      const resolvedItemId = resolvedItem?.id || poItem?.item_id || null;
      const isCompulsory = resolvedItem?.drawing_required === 'COMPULSORY';
      const includeDrawing = isCompulsory || poItem?.include_drawing === true || poItem?.includeDrawing === true;

      if (!includeDrawing || !resolvedItemId) continue;

      const requestedDrawingId = poItem?.selected_drawing_id || poItem?.selectedDrawingId || null;
      const selectedDrawing = requestedDrawingId ? selectedDrawingById.get(requestedDrawingId) : null;
      const drawing = selectedDrawing?.item_id === resolvedItemId
        ? selectedDrawing
        : activeDrawingByItemId.get(resolvedItemId) || null;

      if (drawing) {
        drawings.push({ drawing, poItem, resolvedItem });
        continue;
      }

      if (isCompulsory) {
        missingCompulsory.push(
          poItem?.item_code || poItem?.item_name || resolvedItem?.code || resolvedItem?.name || resolvedItemId,
        );
      }
    }

    return { drawings, missingCompulsory };
  }

  async fetchDrawingsForPOItems(tenantId: string, poItems: any[]): Promise<any[]> {
    const { drawings } = await this.resolvePODrawingChoices(tenantId, poItems);
    return drawings.map((drawingChoice) => drawingChoice.drawing);
  }

  async sendPOEmail(tenantId: string, poId: string, body?: any) {
    const po = await this.findOne(tenantId, poId);
    const overrides = {
      to:
        typeof body?.to === 'string'
          ? body.to
          : typeof body?.recipient === 'string'
            ? body.recipient
            : undefined,
      subject: typeof body?.subject === 'string' ? body.subject : undefined,
      customMessage:
        typeof body?.customMessage === 'string'
          ? body.customMessage
          : typeof body?.custom_message === 'string'
            ? body.custom_message
            : undefined,
    };
    const { recipient, emailData } = await this.buildPOEmailData(tenantId, po, overrides);

    await this.emailService.sendPO(recipient, emailData);

    // Record that the PO was sent (used for automatic tracking reminders).
    const nowIso = new Date().toISOString();
    const statusUpdate: any = {
      sent_at: po.sent_at || nowIso,
      updated_at: nowIso,
    };
    await this.supabase
      .from('purchase_orders')
      .update(statusUpdate)
      .eq('tenant_id', tenantId)
      .eq('id', poId);

    return { message: 'PO email sent successfully', recipient };
  }

  async sendTrackingReminder(tenantId: string, poId: string) {
    const po = await this.findOne(tenantId, poId);
    
    if (!po.vendor?.email) {
      throw new BadRequestException('Vendor email not found');
    }

    const emailData = {
      tenant_id: tenantId,
      po_number: po.po_number,
      po_date: po.po_date,
      delivery_date: po.delivery_date,
      vendor_name: po.vendor.name,
      items: po.purchase_order_items,
    };

    await this.emailService.sendPOTrackingReminder(po.vendor.email, emailData);

    return { message: 'Tracking reminder sent successfully', recipient: po.vendor.email };
  }
}

