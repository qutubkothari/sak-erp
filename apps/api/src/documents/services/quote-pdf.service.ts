import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

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
  async renderQuotePdf(input: QuotePdfInput): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // A4 size in points (72 dpi)
    const PAGE_W = 595.28;
    const PAGE_H = 841.89;

    const brand = {
      dark: rgb(0.05, 0.12, 0.25),
      accent: rgb(0.85, 0.55, 0.05),
      light: rgb(0.97, 0.97, 0.98),
      text: rgb(0.12, 0.12, 0.14),
      muted: rgb(0.45, 0.45, 0.5),
      border: rgb(0.87, 0.87, 0.9),
    };

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
      page.drawText(`${input.company.name} • ${input.quote_number}`, {
        x: PAGE_W - 40 - font.widthOfTextAtSize(`${input.company.name} • ${input.quote_number}`, 9),
        y: 32,
        size: 9,
        font,
        color: brand.muted,
      });
    };

    // --- Cover page ---
    const cover = pdfDoc.addPage([PAGE_W, PAGE_H]);

    cover.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: brand.light });
    cover.drawRectangle({ x: 0, y: PAGE_H - 160, width: PAGE_W, height: 160, color: brand.dark });
    cover.drawRectangle({ x: 0, y: 0, width: 16, height: PAGE_H, color: brand.accent });

    cover.drawText(input.company.name, {
      x: 40,
      y: PAGE_H - 70,
      size: 22,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    cover.drawText('QUOTATION', {
      x: 40,
      y: PAGE_H - 115,
      size: 40,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    cover.drawText(input.title, {
      x: 40,
      y: PAGE_H - 195,
      size: 16,
      font: fontBold,
      color: brand.text,
    });

    const coverMetaY = PAGE_H - 245;
    cover.drawText(`Quote No: ${input.quote_number}`, {
      x: 40,
      y: coverMetaY,
      size: 12,
      font,
      color: brand.text,
    });
    cover.drawText(`Date: ${input.quote_date_iso.slice(0, 10)}`, {
      x: 40,
      y: coverMetaY - 18,
      size: 12,
      font,
      color: brand.text,
    });

    cover.drawText('Prepared For', {
      x: 40,
      y: coverMetaY - 70,
      size: 12,
      font: fontBold,
      color: brand.muted,
    });
    cover.drawText(input.customer.name, {
      x: 40,
      y: coverMetaY - 92,
      size: 16,
      font: fontBold,
      color: brand.text,
    });

    if (input.customer.address) {
      cover.drawText(input.customer.address, {
        x: 40,
        y: coverMetaY - 112,
        size: 11,
        font,
        color: brand.text,
        maxWidth: PAGE_W - 80,
      });
    }

    // --- Body pages ---
    const pages: any[] = [];
    const addBodyPage = () => {
      const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      pages.push(page);
      return page;
    };

    const drawHeader = (page: any) => {
      page.drawRectangle({ x: 0, y: PAGE_H - 90, width: PAGE_W, height: 90, color: brand.dark });
      page.drawText(input.company.name, {
        x: 40,
        y: PAGE_H - 55,
        size: 16,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
      page.drawText(`Quotation • ${input.quote_number}`, {
        x: 40,
        y: PAGE_H - 75,
        size: 10,
        font,
        color: rgb(1, 1, 1),
      });

      page.drawText(`Date: ${input.quote_date_iso.slice(0, 10)}`, {
        x: PAGE_W - 40 - font.widthOfTextAtSize(`Date: ${input.quote_date_iso.slice(0, 10)}`, 10),
        y: PAGE_H - 55,
        size: 10,
        font,
        color: rgb(1, 1, 1),
      });

      // Customer block
      const topY = PAGE_H - 125;
      page.drawText('Bill To', {
        x: 40,
        y: topY,
        size: 10,
        font: fontBold,
        color: brand.muted,
      });
      page.drawText(input.customer.name, {
        x: 40,
        y: topY - 16,
        size: 12,
        font: fontBold,
        color: brand.text,
      });
      if (input.customer.address) {
        page.drawText(input.customer.address, {
          x: 40,
          y: topY - 32,
          size: 10,
          font,
          color: brand.text,
          maxWidth: PAGE_W - 80,
        });
      }
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
    let page = addBodyPage();
    drawHeader(page);

    let y = PAGE_H - 190;
    drawTableHeader(page, y);
    y -= 36;

    const x0 = 40;
    const w = PAGE_W - 80;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];

      if (y < 170) {
        page = addBodyPage();
        drawHeader(page);
        y = PAGE_H - 190;
        drawTableHeader(page, y);
        y -= 36;
      }

      page.drawLine({ start: { x: x0, y: y - 4 }, end: { x: x0 + w, y: y - 4 }, thickness: 1, color: brand.border });

      page.drawText(String(i + 1), { x: x0 + 8, y, size: 10, font, color: brand.text });
      page.drawText(it.description || '-', { x: x0 + 40, y, size: 10, font, color: brand.text, maxWidth: w - 260 });

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

      y -= rowHeight;
    }

    // Totals block (place on last page)
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

    const notesTop = totalsY - 110;
    if (input.notes) {
      page.drawText('Notes', { x: x0, y: notesTop, size: 10, font: fontBold, color: brand.muted });
      page.drawText(input.notes, {
        x: x0,
        y: notesTop - 16,
        size: 10,
        font,
        color: brand.text,
        maxWidth: w,
      });
    }

    const termsTop = notesTop - (input.notes ? 70 : 0);
    if (input.terms) {
      page.drawText('Terms', { x: x0, y: termsTop, size: 10, font: fontBold, color: brand.muted });
      page.drawText(input.terms, {
        x: x0,
        y: termsTop - 16,
        size: 10,
        font,
        color: brand.text,
        maxWidth: w,
      });
    }

    // --- Back page ---
    const back = pdfDoc.addPage([PAGE_W, PAGE_H]);
    back.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: brand.dark });
    back.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 120, color: brand.accent });

    back.drawText('Thank you', {
      x: 40,
      y: PAGE_H - 180,
      size: 42,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    back.drawText('We look forward to working with you.', {
      x: 40,
      y: PAGE_H - 220,
      size: 14,
      font,
      color: rgb(1, 1, 1),
    });

    const contactY = 160;
    const contactLines: string[] = [];
    if (input.company.address) contactLines.push(input.company.address);
    if (input.company.phone) contactLines.push(`Phone: ${input.company.phone}`);
    if (input.company.email) contactLines.push(`Email: ${input.company.email}`);
    if (input.company.website) contactLines.push(`Web: ${input.company.website}`);

    back.drawText(input.company.legal_name || input.company.name, {
      x: 40,
      y: contactY + 90,
      size: 14,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    for (let i = 0; i < contactLines.length; i++) {
      back.drawText(contactLines[i], {
        x: 40,
        y: contactY + 70 - i * 16,
        size: 11,
        font,
        color: rgb(1, 1, 1),
        maxWidth: PAGE_W - 80,
      });
    }

    back.drawText(`Reference: ${input.quote_number}`, {
      x: 40,
      y: 80,
      size: 10,
      font,
      color: rgb(1, 1, 1),
    });

    // Apply footers (cover excluded)
    const all = pdfDoc.getPages();
    const pageCount = all.length;
    for (let i = 1; i < pageCount; i++) {
      drawFooter(all[i], i, pageCount);
    }

    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);
  }
}
