from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.document import Document as _Document
from docx.table import Table as DocxTable
from docx.text.paragraph import Paragraph as DocxParagraph
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
DOCX = ROOT / "deliverables" / "SAK_ERP_Complete_Feature_Catalogue.docx"
PDF = ROOT / "deliverables" / "SAK_ERP_Complete_Feature_Catalogue.pdf"

BROWN = colors.HexColor("#4A3020")
GOLD = colors.HexColor("#A67C3D")
BLUE = colors.HexColor("#1F4E79")
DARK_BLUE = colors.HexColor("#17365D")
PALE_BLUE = colors.HexColor("#E8EEF5")
PALE_GOLD = colors.HexColor("#F3E8D7")
LIGHT_GRAY = colors.HexColor("#F5F6F7")
MID_GRAY = colors.HexColor("#667085")
GRID = colors.HexColor("#D8C8B3")


def iter_blocks(parent):
    body = parent.element.body
    for child in body.iterchildren():
        if child.tag.endswith("}p"):
            yield DocxParagraph(child, parent)
        elif child.tag.endswith("}tbl"):
            yield DocxTable(child, parent)


def esc(text: str) -> str:
    return (text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace("\n", "<br/>"))


def has_page_break(p: DocxParagraph) -> bool:
    return bool(p._p.xpath('.//w:br[@w:type="page"]'))


def register_fonts():
    fonts = Path("C:/Windows/Fonts")
    regular = fonts / "calibri.ttf"
    bold = fonts / "calibrib.ttf"
    if regular.exists() and bold.exists():
        pdfmetrics.registerFont(TTFont("Calibri", str(regular)))
        pdfmetrics.registerFont(TTFont("Calibri-Bold", str(bold)))
        pdfmetrics.registerFontFamily("Calibri", normal="Calibri", bold="Calibri-Bold")
        return "Calibri", "Calibri-Bold"
    return "Helvetica", "Helvetica-Bold"


FONT, FONT_BOLD = register_fonts()


def make_styles():
    s = getSampleStyleSheet()
    return {
        "body": ParagraphStyle("Body", parent=s["BodyText"], fontName=FONT, fontSize=9.2,
                               leading=11.5, textColor=colors.HexColor("#252525"), spaceAfter=5),
        "title": ParagraphStyle("Title", parent=s["Title"], fontName=FONT_BOLD, fontSize=28,
                                leading=32, textColor=BROWN, alignment=TA_CENTER, spaceAfter=10),
        "subtitle": ParagraphStyle("Subtitle", parent=s["Normal"], fontName=FONT, fontSize=15,
                                   leading=18, textColor=GOLD, alignment=TA_CENTER, spaceAfter=9),
        "h1": ParagraphStyle("H1", parent=s["Heading1"], fontName=FONT_BOLD, fontSize=16,
                             leading=19, textColor=BLUE, spaceBefore=4, spaceAfter=8, keepWithNext=True),
        "h2": ParagraphStyle("H2", parent=s["Heading2"], fontName=FONT_BOLD, fontSize=12.5,
                             leading=15, textColor=BLUE, spaceBefore=8, spaceAfter=5, keepWithNext=True),
        "h3": ParagraphStyle("H3", parent=s["Heading3"], fontName=FONT_BOLD, fontSize=11,
                             leading=13, textColor=DARK_BLUE, spaceBefore=6, spaceAfter=4, keepWithNext=True),
        "bullet": ParagraphStyle("Bullet", parent=s["BodyText"], fontName=FONT, fontSize=9,
                                 leading=11.2, leftIndent=16, firstLineIndent=-8, spaceAfter=3),
        "number": ParagraphStyle("Number", parent=s["BodyText"], fontName=FONT, fontSize=9,
                                 leading=11.2, leftIndent=16, firstLineIndent=-8, spaceAfter=3),
        "cell": ParagraphStyle("Cell", parent=s["BodyText"], fontName=FONT, fontSize=8.25,
                               leading=10, spaceAfter=0),
        "cell_bold": ParagraphStyle("CellBold", parent=s["BodyText"], fontName=FONT_BOLD,
                                    fontSize=8.25, leading=10, textColor=BROWN, spaceAfter=0),
        "cell_head": ParagraphStyle("CellHead", parent=s["BodyText"], fontName=FONT_BOLD,
                                    fontSize=8.25, leading=10, textColor=BLUE, spaceAfter=0),
        "cover_meta": ParagraphStyle("CoverMeta", parent=s["BodyText"], fontName=FONT,
                                     fontSize=9, leading=11, spaceAfter=0),
    }


STYLES = make_styles()


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = letter
    canvas.setStrokeColor(GRID)
    canvas.setLineWidth(0.5)
    canvas.line(0.75 * inch, height - 0.55 * inch, width - 0.75 * inch, height - 0.55 * inch)
    canvas.setFont(FONT_BOLD, 8.5)
    canvas.setFillColor(BROWN)
    canvas.drawString(0.75 * inch, height - 0.42 * inch, "SAK ERP")
    canvas.setFont(FONT, 7.5)
    canvas.setFillColor(MID_GRAY)
    canvas.drawRightString(width - 0.75 * inch, height - 0.42 * inch, "COMPLETE FEATURE CATALOGUE")
    canvas.line(0.75 * inch, 0.52 * inch, width - 0.75 * inch, 0.52 * inch)
    canvas.drawString(0.75 * inch, 0.35 * inch,
                      "Client presentation • Current implemented scope • 19 August 2026")
    canvas.drawRightString(width - 0.75 * inch, 0.35 * inch, f"Page {doc.page}")
    canvas.restoreState()


def convert_table(t: DocxTable):
    raw = [[c.text.strip() for c in row.cells] for row in t.rows]
    if not raw:
        return Spacer(1, 2)
    cols = max(len(r) for r in raw)
    raw = [r + [""] * (cols - len(r)) for r in raw]
    # Preserve the feature catalogue's deliberately wide descriptive column.
    if cols == 1:
        widths = [6.48 * inch]
    elif cols == 2:
        widths = [2.25 * inch, 4.23 * inch]
    else:
        widths = [6.48 * inch / cols] * cols
    data = []
    for r_idx, row in enumerate(raw):
        converted = []
        for c_idx, value in enumerate(row):
            style = STYLES["cell_head"] if r_idx == 0 else (STYLES["cell_bold"] if c_idx == 0 else STYLES["cell"])
            converted.append(Paragraph(esc(value), style))
        data.append(converted)
    table = Table(data, colWidths=widths, repeatRows=1 if len(raw) > 1 else 0,
                  hAlign="LEFT", splitByRow=True)
    commands = [
        ("GRID", (0, 0), (-1, -1), 0.45, GRID),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    if len(raw) > 1:
        commands.append(("BACKGROUND", (0, 0), (-1, 0), PALE_BLUE))
        for idx in range(2, len(raw), 2):
            commands.append(("BACKGROUND", (0, idx), (-1, idx), LIGHT_GRAY))
    else:
        commands.append(("BACKGROUND", (0, 0), (-1, 0), PALE_GOLD))
    table.setStyle(TableStyle(commands))
    return table


def build_pdf():
    document = Document(DOCX)
    flow = []
    first_image_done = False
    list_number = 0
    for block in iter_blocks(document):
        if isinstance(block, DocxTable):
            flow.append(convert_table(block))
            flow.append(Spacer(1, 5))
            continue
        p = block
        if has_page_break(p):
            flow.append(PageBreak())
            list_number = 0
            continue
        text = p.text.strip()
        style_name = p.style.name if p.style else "Normal"
        if not text:
            if not first_image_done and p._p.xpath('.//a:blip'):
                logo = ROOT / "apps" / "web" / "public" / "pwa-icon-512.png"
                if logo.exists():
                    flow.append(Spacer(1, 0.35 * inch))
                    img = Image(str(logo), width=0.82 * inch, height=0.82 * inch)
                    img.hAlign = "CENTER"
                    flow.append(img)
                    flow.append(Spacer(1, 0.12 * inch))
                first_image_done = True
            else:
                flow.append(Spacer(1, 3))
            continue
        safe = esc(text)
        if style_name == "Title":
            flow.append(Paragraph(safe, STYLES["title"]))
        elif style_name == "Subtitle":
            flow.append(Paragraph(safe, STYLES["subtitle"]))
        elif style_name == "Heading 1":
            flow.append(Paragraph(safe, STYLES["h1"]))
        elif style_name == "Heading 2":
            flow.append(Paragraph(safe, STYLES["h2"]))
        elif style_name == "Heading 3":
            flow.append(Paragraph(safe, STYLES["h3"]))
        elif style_name.startswith("List Bullet"):
            flow.append(Paragraph("• " + safe, STYLES["bullet"]))
        elif style_name.startswith("List Number"):
            list_number += 1
            flow.append(Paragraph(f"{list_number}. {safe}", STYLES["number"]))
        else:
            # Center the cover strapline; remaining body copy stays left aligned.
            if len(flow) < 12:
                centered = ParagraphStyle("CoverBody", parent=STYLES["body"], alignment=TA_CENTER,
                                          fontSize=11, leading=14, textColor=MID_GRAY)
                flow.append(Paragraph(safe, centered))
            else:
                flow.append(Paragraph(safe, STYLES["body"]))

    PDF.parent.mkdir(parents=True, exist_ok=True)
    pdf = BaseDocTemplate(str(PDF), pagesize=letter, leftMargin=inch, rightMargin=inch,
                          topMargin=0.72 * inch, bottomMargin=0.68 * inch,
                          title="SAK ERP — Complete Feature Catalogue",
                          author="SAK Solution", subject="Client-facing ERP feature catalogue")
    frame = Frame(pdf.leftMargin, pdf.bottomMargin, pdf.width, pdf.height,
                  leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    pdf.addPageTemplates(PageTemplate(id="catalogue", frames=[frame], onPage=header_footer))
    pdf.build(flow)
    print(PDF)


if __name__ == "__main__":
    build_pdf()
