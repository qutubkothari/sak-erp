import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { DOCUMENT_BRAND_COLORS, DocumentBrandingService } from '../../common/services/document-branding.service';

export type QuoteItemInput = {
  description: string;
  quantity: number;
  unit?: string;
  unit_price: number;
};

export type QuoteCompanyInfo = {
  name: string;
  legal_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
};

export type QuoteCustomerInfo = {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
};

export type QuotePdfInput = {
  quote_number: string;
  quote_date_iso: string;
  title: string;
  company: QuoteCompanyInfo;
  customer: QuoteCustomerInfo;
  items: QuoteItemInput[];
  currency?: string;
  tax_rate?: number; // ex: 0.18 for 18%
  discount?: number;
  notes?: string;
  terms?: string;
};

@Injectable()
export class QuotePdfService {
  constructor(private readonly documentBrandingService: DocumentBrandingService) {}

  async renderQuotePdf(tenantId: string, input: QuotePdfInput): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const assets = await this.documentBrandingService.preparePdfBrandingAssets(pdfDoc);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // A4 size in points (72 dpi)
    const PAGE_W = 595.28;
    const PAGE_H = 841.89;

    const brand = {
      dark: DOCUMENT_BRAND_COLORS.primary,
      accent: DOCUMENT_BRAND_COLORS.accent,
      light: DOCUMENT_BRAND_COLORS.light,
      text: DOCUMENT_BRAND_COLORS.text,
      muted: DOCUMENT_BRAND_COLORS.muted,
      border: DOCUMENT_BRAND_COLORS.border,
    };
    const branding = await this.documentBrandingService.getBranding(tenantId, {
      companyName: input.company?.name,
      address: input.company?.address,
      phone: input.company?.phone,
      email: input.company?.email,
      website: input.company?.website,
    });

    const currency = (input.currency || 'INR').toUpperCase();
    const taxRate = typeof input.tax_rate === 'number' ? input.tax_rate : 0;
    const discount = typeof input.discount === 'number' ? input.discount : 0;

    const items = (input.items || []).map((it) => ({
      description: String(it.description || '').trim(),
      quantity: Number(it.quantity || 0),
      unit: (it.unit || '').trim(),
      unit_price: Number(it.unit_price || 0),
      line_total: Number(it.quantity || 0) * Number(it.unit_price || 0),
    }));

    const subtotal = items.reduce((sum, it) => sum + it.line_total, 0);
    const tax = subtotal * taxRate;
    const total = subtotal + tax - discount;

    const money = (n: number) => {
      const safe = Number.isFinite(n) ? n : 0;
      return `${currency} ${safe.toFixed(2)}`;
    };

    const wrapText = (text: string, maxWidth: number, size: number) => {
      const words = String(text || '').split(/\s+/).filter(Boolean);
      if (words.length === 0) return [''];

      const lines: string[] = [];
      let current = words[0];

      for (let index = 1; index < words.length; index++) {
        const next = `${current} ${words[index]}`;
        if (font.widthOfTextAtSize(next, size) <= maxWidth) {
          current = next;
        } else {
          lines.push(current);
          current = words[index];
        }
      }

      lines.push(current);
      return lines;
    };

    const drawFooter = (page: any, pageIndex: number, pageCount: number) => {
      const text = `Page ${pageIndex + 1} of ${pageCount}`;
      page.drawLine({
        start: { x: 40, y: 50 },
        end: { x: PAGE_W - 40, y: 50 },
        thickness: 1,
        color: brand.border,
      });
      page.drawText(text, {
        x: 40,
        y: 32,
        size: 9,
        font,
        color: brand.muted,
      });
      const footerRef = `${branding.companyName} • ${input.quote_number}`;
      page.drawText(footerRef, {
        x: PAGE_W - 40 - font.widthOfTextAtSize(footerRef, 9),
        y: 32,
        size: 9,
        font,
        color: brand.muted,
      });
    };

    const pages: any[] = [];
    const addBodyPage = async () => {
      const page = await this.documentBrandingService.createBrandedPage(pdfDoc, assets, [PAGE_W, PAGE_H]);
      pages.push(page);
      return page;
    };

    const drawHeader = (page: any) => {
      const headerBottom = this.documentBrandingService.drawStandardHeader({
        page,
        topY: PAGE_H - 30,
        marginX: 40,
        width: PAGE_W - 80,
        title: 'QUOTATION',
        reference: input.quote_number,
        branding,
        font,
        fontBold,
        assets,
      });

      page.drawText(input.title || 'Quotation', {
        x: 40,
        y: headerBottom - 18,
        size: 16,
        font: fontBold,
        color: brand.text,
      });

      const dateLabel = `Date: ${input.quote_date_iso.slice(0, 10)}`;
      page.drawText(dateLabel, {
        x: PAGE_W - 40 - font.widthOfTextAtSize(dateLabel, 10),
        y: headerBottom - 16,
        size: 10,
        font,
        color: brand.muted,
      });

      const topY = headerBottom - 54;
      page.drawRectangle({
        x: 40,
        y: topY - 52,
        width: PAGE_W - 80,
        height: 58,
        color: brand.light,
        borderColor: brand.border,
        borderWidth: 1,
      });

      page.drawText('Bill To', {
        x: 50,
        y: topY - 12,
        size: 10,
        font: fontBold,
        color: brand.muted,
      });
      page.drawText(input.customer.name, {
        x: 50,
        y: topY - 28,
        size: 12,
        font: fontBold,
        color: brand.text,
      });

      const customerLines = [
        input.customer.address || '',
        [input.customer.phone ? `Phone: ${input.customer.phone}` : '', input.customer.email ? `Email: ${input.customer.email}` : '']
          .filter(Boolean)
          .join('  |  '),
      ].filter(Boolean);

      let customerY = topY - 42;
      customerLines.forEach((line) => {
        wrapText(line, PAGE_W - 100, 9,).forEach((part) => {
          page.drawText(part, {
            x: 50,
            y: customerY,
            size: 9,
            font,
            color: brand.text,
          });
          customerY -= 10;
        });
      });

      return topY - 74;
    };

    const drawTableHeader = (page: any, y: number) => {
      const x0 = 40;
      const w = PAGE_W - 80;
      page.drawRectangle({ x: x0, y: y - 20, width: w, height: 24, color: rgb(0.93, 0.93, 0.95) });
      page.drawLine({ start: { x: x0, y: y - 20 }, end: { x: x0 + w, y: y - 20 }, thickness: 1, color: brand.border });
      const cols = [
        { label: '#', x: x0 + 8 },
        { label: 'Description', x: x0 + 40 },
        { label: 'Qty', x: x0 + w - 210 },
        { label: 'Unit Price', x: x0 + w - 150 },
        { label: 'Amount', x: x0 + w - 65 },
      ];
      for (const col of cols) {
        page.drawText(col.label, { x: col.x, y: y - 12, size: 10, font: fontBold, color: brand.text });
      }
    };

    const rowHeight = 18;
    let page = await addBodyPage();
    let y = drawHeader(page);

    drawTableHeader(page, y);
    y -= 36;

    const x0 = 40;
    const w = PAGE_W - 80;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const descriptionLines = wrapText(it.description || '-', w - 260, 10).slice(0, 3);
      const itemRowHeight = Math.max(rowHeight, descriptionLines.length * 12);

      if (y < 170 + itemRowHeight) {
        page = await addBodyPage();
        y = drawHeader(page);
        drawTableHeader(page, y);
        y -= 36;
      }

      page.drawLine({ start: { x: x0, y: y - 4 }, end: { x: x0 + w, y: y - 4 }, thickness: 1, color: brand.border });

      page.drawText(String(i + 1), { x: x0 + 8, y, size: 10, font, color: brand.text });
      descriptionLines.forEach((line, lineIndex) => {
        page.drawText(line, { x: x0 + 40, y: y - lineIndex * 12, size: 10, font, color: brand.text });
      });

      const qtyText = it.unit ? `${it.quantity} ${it.unit}` : String(it.quantity);
      page.drawText(qtyText, {
        x: x0 + w - 210,
        y,
        size: 10,
        font,
        color: brand.text,
      });

      const unitPriceText = money(it.unit_price);
      page.drawText(unitPriceText, {
        x: x0 + w - 150,
        y,
        size: 10,
        font,
        color: brand.text,
      });

      const amountText = money(it.line_total);
      page.drawText(amountText, {
        x: x0 + w - 65 - font.widthOfTextAtSize(amountText, 10),
        y,
        size: 10,
        font,
        color: brand.text,
      });

      y -= itemRowHeight;
    }

    // Totals block (place on last page)
    if (y < 230) {
      page = await addBodyPage();
      y = drawHeader(page);
    }

    const totalsY = Math.max(y - 10, 170);
    page.drawLine({ start: { x: x0, y: totalsY }, end: { x: x0 + w, y: totalsY }, thickness: 1, color: brand.border });

    const rightX = x0 + w;
    const drawKV = (label: string, value: string, line: number, bold = false) => {
      const yy = totalsY - 26 - line * 16;
      page.drawText(label, { x: rightX - 260, y: yy, size: 10, font: bold ? fontBold : font, color: brand.text });
      page.drawText(value, {
        x: rightX - 40 - font.widthOfTextAtSize(value, 10),
        y: yy,
        size: 10,
        font: bold ? fontBold : font,
        color: brand.text,
      });
    };

    drawKV('Subtotal', money(subtotal), 0);
    drawKV(`Tax (${(taxRate * 100).toFixed(0)}%)`, money(tax), 1);
    if (discount > 0) drawKV('Discount', `- ${money(discount)}`, 2);
    drawKV('Total', money(total), discount > 0 ? 3 : 2, true);

    let notesTop = totalsY - 110;
    if (input.notes) {
      page.drawText('Notes', { x: x0, y: notesTop, size: 10, font: fontBold, color: brand.muted });
      wrapText(input.notes, w, 10).forEach((line, index) => {
        page.drawText(line, {
          x: x0,
          y: notesTop - 16 - index * 12,
          size: 10,
          font,
          color: brand.text,
        });
      });
      notesTop -= 16 + wrapText(input.notes, w, 10).length * 12;
    }

    const termsTop = input.notes ? notesTop - 18 : totalsY - 110;
    if (input.terms) {
      page.drawText('Terms', { x: x0, y: termsTop, size: 10, font: fontBold, color: brand.muted });
      wrapText(input.terms, w, 10).forEach((line, index) => {
        page.drawText(line, {
          x: x0,
          y: termsTop - 16 - index * 12,
          size: 10,
          font,
          color: brand.text,
        });
      });
    }

    const all = pdfDoc.getPages();
    const pageCount = all.length;
    for (let i = 0; i < pageCount; i++) {
      drawFooter(all[i], i, pageCount);
    }

    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);
  }
}
