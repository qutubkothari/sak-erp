from __future__ import annotations

from pathlib import Path

import fitz
from docx import Document
from docx.table import Table as DocxTable
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import BaseDocTemplate, Frame, Image, PageBreak, PageTemplate, Paragraph, Spacer

import render_feature_catalogue_pdf as base


ROOT = Path(__file__).resolve().parents[1]
DOCX = ROOT / "output" / "documents" / "Mizantra_Client_Feature_Catalogue_2026.docx"
PDF = ROOT / "output" / "documents" / "Mizantra_Client_Feature_Catalogue_2026.pdf"
QA_DIR = ROOT / "output" / "documents" / "mizantra_client_catalogue_render"


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = letter
    canvas.setStrokeColor(base.GRID)
    canvas.setLineWidth(0.5)
    canvas.line(0.75 * inch, height - 0.55 * inch, width - 0.75 * inch, height - 0.55 * inch)
    canvas.setFont(base.FONT_BOLD, 8.5)
    canvas.setFillColor(base.BROWN)
    canvas.drawString(0.75 * inch, height - 0.42 * inch, "MIZANTRA")
    canvas.setFont(base.FONT, 7.5)
    canvas.setFillColor(base.MID_GRAY)
    canvas.drawRightString(width - 0.75 * inch, height - 0.42 * inch, "CLIENT CAPABILITY CATALOGUE")
    canvas.line(0.75 * inch, 0.52 * inch, width - 0.75 * inch, 0.52 * inch)
    canvas.drawString(0.75 * inch, 0.35 * inch, "Intelligent, governed enterprise operations | 6 September 2026")
    canvas.drawRightString(width - 0.75 * inch, 0.35 * inch, f"Page {doc.page}")
    canvas.restoreState()


def build_pdf() -> None:
    document = Document(DOCX)
    flow = []
    first_image_done = False
    list_number = 0
    for block in base.iter_blocks(document):
        if isinstance(block, DocxTable):
            flow.append(base.convert_table(block))
            flow.append(Spacer(1, 5))
            continue
        paragraph = block
        if base.has_page_break(paragraph):
            flow.append(PageBreak())
            list_number = 0
            continue
        text = paragraph.text.strip()
        style_name = paragraph.style.name if paragraph.style else "Normal"
        if not text:
            if not first_image_done and paragraph._p.xpath('.//a:blip'):
                logo = ROOT / "apps" / "web" / "public" / "pwa-icon-512.png"
                if logo.exists():
                    flow.append(Spacer(1, 0.32 * inch))
                    image = Image(str(logo), width=0.84 * inch, height=0.84 * inch)
                    image.hAlign = "CENTER"
                    flow.append(image)
                    flow.append(Spacer(1, 0.12 * inch))
                first_image_done = True
            else:
                flow.append(Spacer(1, 3))
            continue
        safe = base.esc(text)
        if style_name == "Title":
            flow.append(Paragraph(safe, base.STYLES["title"]))
        elif style_name == "Subtitle":
            flow.append(Paragraph(safe, base.STYLES["subtitle"]))
        elif style_name == "Heading 1":
            flow.append(Paragraph(safe, base.STYLES["h1"]))
        elif style_name == "Heading 2":
            flow.append(Paragraph(safe, base.STYLES["h2"]))
        elif style_name == "Heading 3":
            flow.append(Paragraph(safe, base.STYLES["h3"]))
        elif style_name.startswith("List Bullet"):
            flow.append(Paragraph("&#8226; " + safe, base.STYLES["bullet"]))
        elif style_name.startswith("List Number"):
            list_number += 1
            flow.append(Paragraph(f"{list_number}. {safe}", base.STYLES["number"]))
        else:
            if len(flow) < 12:
                cover = base.ParagraphStyle(
                    "MizantraCoverBody",
                    parent=base.STYLES["body"],
                    alignment=base.TA_CENTER,
                    fontSize=11,
                    leading=14,
                    textColor=base.MID_GRAY,
                )
                flow.append(Paragraph(safe, cover))
            else:
                flow.append(Paragraph(safe, base.STYLES["body"]))

    pdf = BaseDocTemplate(
        str(PDF),
        pagesize=letter,
        leftMargin=0.82 * inch,
        rightMargin=0.82 * inch,
        topMargin=0.72 * inch,
        bottomMargin=0.68 * inch,
        title="Mizantra - Client Feature Catalogue 2026",
        author="SAK Solution",
        subject="Mizantra differentiation, benefits and enterprise capability catalogue",
    )
    frame = Frame(pdf.leftMargin, pdf.bottomMargin, pdf.width, pdf.height, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    pdf.addPageTemplates(PageTemplate(id="catalogue", frames=[frame], onPage=header_footer))
    pdf.build(flow)


def render_pages() -> int:
    QA_DIR.mkdir(parents=True, exist_ok=True)
    for old in QA_DIR.glob("page-*.png"):
        old.unlink()
    pdf = fitz.open(PDF)
    matrix = fitz.Matrix(1.5, 1.5)
    for index, page in enumerate(pdf):
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        pix.save(QA_DIR / f"page-{index + 1}.png")
    count = len(pdf)
    pdf.close()
    return count


if __name__ == "__main__":
    build_pdf()
    print(f"{PDF}\npages={render_pages()}")
