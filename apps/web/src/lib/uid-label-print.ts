import QRCode from "qrcode";

import { escapeHtml } from "./document-branding";

export type UidLabelPrintRecord = {
  uid: string;
  partNumber?: string | null;
  itemCode?: string | null;
};

const LABEL_WIDTH_MM = 25;
const LABEL_HEIGHT_MM = 15;
function printableIdentifier(value: string): string {
  return escapeHtml(value).replaceAll("-", "-<wbr>");
}

/**
 * Builds a print-only document for 25 x 15 mm direct-thermal labels.
 * At 203 DPI this is a 200 x 120 dot label. Each UID is one physical page.
 */
export async function buildUidLabelPrintHtml(
  records: UidLabelPrintRecord[],
  title = "UID Labels",
): Promise<string> {
  const labels = records
    .map((record) => ({
      uid: String(record.uid || "").trim(),
      partNumber: String(record.partNumber || record.itemCode || "").trim(),
    }))
    .filter((record) => record.uid);

  const qrImages = await Promise.all(
    labels.map((record) =>
      QRCode.toDataURL(record.uid, {
        errorCorrectionLevel: "L",
        margin: 1,
        width: 376,
        color: { dark: "#000000", light: "#ffffff" },
      }),
    ),
  );

  const labelMarkup = labels
    .map(
      (record, index) => `
        <article class="uid-label">
          <img class="uid-qr" src="${qrImages[index]}" alt="QR for ${escapeHtml(record.uid)}" />
          <section class="uid-copy">
            <div class="uid-value">${printableIdentifier(record.uid)}</div>
            ${record.partNumber ? `<div class="part-value">${printableIdentifier(record.partNumber)}</div>` : ""}
          </section>
        </article>`,
    )
    .join("");

  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: ${LABEL_WIDTH_MM}mm ${LABEL_HEIGHT_MM}mm; margin: 0; }
          * { box-sizing: border-box; }
          html, body {
            width: ${LABEL_WIDTH_MM}mm;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff;
          }
          .uid-label {
            position: relative;
            width: ${LABEL_WIDTH_MM}mm;
            height: ${LABEL_HEIGHT_MM}mm;
            margin: 0;
            padding: 0;
            overflow: hidden;
            break-after: page;
            page-break-after: always;
          }
          .uid-label:last-child {
            break-after: auto;
            page-break-after: auto;
          }
          .uid-qr {
            position: absolute;
            left: 1.25mm;
            top: 2.75mm;
            width: 10mm;
            height: 10mm;
            display: block;
            image-rendering: pixelated;
          }
          .uid-copy {
            position: absolute;
            left: 12.5mm;
            top: 2.5mm;
            right: 0.5mm;
            bottom: 1.25mm;
            color: #000;
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.02;
            overflow: hidden;
          }
          .uid-value {
            font-size: 5.25pt;
            font-weight: 800;
            overflow-wrap: anywhere;
          }
          .part-value {
            margin-top: 0.55mm;
            font-size: 4.75pt;
            font-weight: 800;
            overflow-wrap: anywhere;
          }
          @media screen {
            body { background: #eee; }
            .uid-label { background: #fff; outline: 1px solid #bbb; }
          }
          @media print {
            html, body { width: ${LABEL_WIDTH_MM}mm !important; }
          }
        </style>
        <script>
          window.addEventListener('load', function () {
            var images = Array.prototype.slice.call(document.images || []);
            Promise.all(images.map(function (image) {
              if (image.complete && image.naturalWidth > 0) return Promise.resolve();
              return new Promise(function (resolve) {
                image.addEventListener('load', resolve, { once: true });
                image.addEventListener('error', resolve, { once: true });
              });
            })).then(function () {
              window.focus();
              setTimeout(function () { window.print(); }, 150);
            });
          });
        </script>
      </head>
      <body>${labelMarkup}</body>
    </html>`;
}
