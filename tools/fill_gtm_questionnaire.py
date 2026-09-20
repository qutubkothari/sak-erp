from copy import deepcopy
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


SRC = Path(r"C:\Users\QK\Downloads\GTM - 1. finalize Manufacturing ERP positioning and USP.docx")
OUT = Path("deliverables/GTM_Manufacturing_ERP_Positioning_USP_Completed_v2.docx")


def shade(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=100, start=120, bottom=100, end=120):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for m, v in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{m}"))
        if node is None:
            node = OxmlElement(f"w:{m}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(v))
        node.set(qn("w:type"), "dxa")


def set_cell_text(cell, text, bold=False, color=None, size=9.5):
    cell.text = ""
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.05
    r = p.add_run(text)
    r.bold = bold
    r.font.name = "Aptos"
    r.font.size = Pt(size)
    if color:
        r.font.color.rgb = RGBColor(*color)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    set_cell_margins(cell)


def mark_header_row(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def ensure_bullet_numbering(doc):
    # Kept as a no-op for compatibility with the authoring flow. The source
    # template has its own numbering definitions; adding a new custom list
    # definition can make older Word installations report a repair warning.
    return


def add_response(doc, number, question, answer, bullets=None):
    h = doc.add_paragraph()
    h.paragraph_format.space_before = Pt(10)
    h.paragraph_format.space_after = Pt(3)
    r = h.add_run(f"{number}. {question}")
    r.bold = True
    r.font.name = "Aptos Display"
    r.font.size = Pt(12)
    r.font.color.rgb = RGBColor(31, 78, 121)
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.08
    r = p.add_run("SAK ERP response: ")
    r.bold = True
    r.font.color.rgb = RGBColor(73, 73, 73)
    r = p.add_run(answer)
    r.font.name = "Aptos"
    r.font.size = Pt(10.5)
    if bullets:
        for item in bullets:
            bp = doc.add_paragraph(style="List Paragraph")
            bp.paragraph_format.left_indent = Inches(0.28)
            bp.paragraph_format.first_line_indent = Inches(-0.18)
            bp.paragraph_format.space_after = Pt(1)
            run = bp.add_run("• " + item)
            run.font.name = "Aptos"
            run.font.size = Pt(10)


def main():
    # Build a clean response document rather than modifying the legacy
    # questionnaire package. This avoids carrying forward incompatible legacy
    # OOXML while retaining every question and providing a completed answer.
    doc = Document()
    ensure_bullet_numbering(doc)
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.paragraph_format.space_after = Pt(4)
    run = title.add_run("Completed questionnaire")
    run.bold = True
    run.font.name = "Aptos Display"
    run.font.size = Pt(22)
    run.font.color.rgb = RGBColor(31, 78, 121)

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub.paragraph_format.space_after = Pt(10)
    run = sub.add_run("SAK ERP — Manufacturing ERP positioning and USP | 21 August 2026")
    run.italic = True
    run.font.name = "Aptos"
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor(90, 90, 90)

    note = doc.add_paragraph()
    note.paragraph_format.space_after = Pt(10)
    run = note.add_run("Scope note: ")
    run.bold = True
    run.font.color.rgb = RGBColor(192, 80, 77)
    run = note.add_run("The source document is a discovery questionnaire. The responses below are completed from the ERP capabilities currently implemented and should be treated as the factual baseline for the GTM discussion. A/B/C ratings are intentionally conservative; they do not claim full parity with SAP S/4HANA.")
    run.font.name = "Aptos"
    run.font.size = Pt(10)

    h = doc.add_paragraph()
    r = h.add_run("Capability rating key")
    r.bold = True
    r.font.size = Pt(12)
    r.font.color.rgb = RGBColor(31, 78, 121)
    p = doc.add_paragraph("A = strong and actively usable today; B = available and usable but with defined depth/roadmap gaps; C = partial foundation or planned expansion; D = not currently positioned as a product capability.")
    p.paragraph_format.space_after = Pt(8)

    add_response(doc, 1, "What exactly are we selling?", "A modular manufacturing ERP that connects commercial, procurement, inventory, production, subcontracting, service and finance workflows in one operational record. The strongest present-day value is controlled execution and traceability from demand through stock, work, receipt/QC and settlement.")

    table = doc.add_table(rows=1, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    widths = [Inches(2.55), Inches(3.8)]
    for i, w in enumerate(widths):
        table.columns[i].width = w
    hdr = table.rows[0].cells
    set_cell_text(hdr[0], "Module", True, (255, 255, 255), 9.5)
    set_cell_text(hdr[1], "Current rating and evidence", True, (255, 255, 255), 9.5)
    shade(hdr[0], "1F4E79"); shade(hdr[1], "1F4E79")
    mark_header_row(table.rows[0])
    ratings = [
        ("Sales", "A — customers, quotations, revisions, sales orders, dispatch, billing, receivables, returns and warranty."),
        ("CRM", "C — customer master and commercial history are present; a full opportunity/marketing automation layer is a roadmap item."),
        ("Purchase", "A — PR/RFQ/quotation/PO, approvals, GRN/QC, supplier invoices, advances and payables."),
        ("Inventory", "A — stock master/UOM, ledger and trail, SIV/MOC/SRV, GRN, UID/serial tracking and adjustments."),
        ("BOM", "A — BOM/route-style material and output definitions with production linkage."),
        ("MRP / Planning", "B — planning signals, low-stock/reorder exposure and production WIP exist; advanced finite-capacity MRP remains an enhancement area."),
        ("Production execution", "B — work orders, shop-floor execution and subcontracting are usable; broader MES depth is a roadmap."),
        ("Quality", "B — GRN and subcontract QC, inspection decisions and traceability are implemented; a full QMS suite is not claimed."),
        ("Maintenance", "C — service/installed-base foundation exists; plant-maintenance depth is a future module."),
        ("Job work / subcontracting", "A — route, single-vendor service order, consolidated material issue, vendor WIP, receipt/QC, backflush, deductions and AP trail."),
        ("Costing / Finance", "B — operational costing, GST, AP/AR, invoices, payments, deductions and status controls; full enterprise GL/controlling depth is a roadmap area."),
        ("HR / Payroll", "B — HR attendance, movement trail, GPS/evidence and attendance controls; payroll depth varies by deployment."),
        ("Service", "B — ticket-to-call execution, technicians, site evidence, parts, warranty, service reports, billing and customer-facing traceability."),
        ("Dashboards / BI", "A — executive cockpit, action queues, operational KPIs, stock/WIP/payables and drill-through trails."),
        ("AI / Intelligence", "B — rules-based alerts and worklists are live; predictive AI recommendations are an active roadmap, not a claim of current automation."),
    ]
    for mod, desc in ratings:
        cells = table.add_row().cells
        set_cell_text(cells[0], mod, True, (50, 50, 50), 9.2)
        set_cell_text(cells[1], desc, False, (50, 50, 50), 9.2)
        shade(cells[0], "EAF2F8")

    add_response(doc, 2, "What type of manufacturing do we handle particularly well?", "Discrete, make-to-order and job-shop environments are the strongest fit, especially where material traceability, multiple UOMs, outside processing and service after delivery matter.", [
        "Discrete manufacturing and assembly.",
        "Metal fabrication, machining, fasteners and machinery components.",
        "Electrical/electromechanical products and industrial equipment.",
        "Make-to-order, engineer-to-order and mixed make-to-stock operations.",
        "UAE focus industries: industrial fabrication/machining, electrical and automation, marine/defence suppliers, building products/hardware, and equipment service businesses.",
    ])
    add_response(doc, 3, "What is the biggest problem our ERP solves?", "Our manufacturing ERP helps a manufacturer run the complete order-to-cash and procure-to-produce cycle with one accountable record—so management can see what was ordered, issued, produced, received, rejected, billed and paid, without reconciling disconnected spreadsheets.")
    add_response(doc, 4, "What makes our ERP different from a typical ERP?", "The differentiation is operational ownership rather than a feature-count claim: a configurable vertical core connects factory execution to commercial and financial control, while preserving a practical implementation path for mid-market manufacturers.", [
        "One traceable flow across PR/RFQ/PO, inventory, work orders, subcontracting, QC, sales, service and payables/receivables.",
        "Strong outside-processing controls: one route/order/vendor, one consolidated raw-material issue, vendor WIP, backflush and document trail.",
        "Configurable workflows and local statutory/commercial fields without forcing a customer into a generic template.",
        "Implementation and support are part of the product promise; SAK owns the business-process outcome, not only the software license.",
        "Position against SAP Business One/Dynamics/NetSuite on fit, speed and accountability—not on pretending to replace their global breadth.",
    ])
    add_response(doc, 5, "How much customization do we offer?", "Closest answer: D, with a controlled C-style product core. We keep a standard ERP foundation, configure where possible, and develop only where a justified manufacturing or service process cannot be handled through configuration. Changes should remain auditable, supportable and reusable across customers.")
    add_response(doc, 6, "What do customers normally appreciate most about SAK Solutions?", "The strongest working message is that SAK understands the customer’s operational reality and stays involved through implementation and refinement. This should be validated as a formal reference program, but the product experience supports three credible themes: practical manufacturing understanding, flexibility without abandoning control, and responsive post-go-live support.")
    add_response(doc, 7, "What is SAK Solutions' strongest capability?", "H — a combination of manufacturing process understanding, software development, business-process consulting and implementation/support. The combined capability is more defensible than presenting any one ingredient in isolation.")
    add_response(doc, 8, "How important is your long experience?", "Use 30+/40+ years as a supporting credibility factor and proof of staying power, not as the only USP. The lead message should be the measurable operational outcome; experience reassures a buyer that SAK will remain accountable after go-live.")
    add_response(doc, 9, "Does the Manufacturing ERP only show information, or can it actually tell management what needs attention?", "Today it provides operational intelligence through dashboards, exception worklists and drill-through alerts: approvals pending, low stock/reorder risk, QC pending, open vendor WIP, production WIP, unpaid invoices and action-required queues. It is rules-based intelligence today. Predictive statements such as ‘will run out in 12 days’ or automated margin forecasting should be positioned as roadmap capabilities unless a specific deployment has enabled them.")
    add_response(doc, 10, "Who do we REALLY want to sell to?", "A growing UAE discrete manufacturer or industrial service business with 30–250 employees, multiple warehouses or outside processors, and a need to replace Excel/Tally/legacy tools with controlled traceability. The ideal company has a hands-on owner/MD, a production or operations team, and enough transaction volume that stock leakage, late delivery, subcontracting and service visibility are already costing money.")
    add_response(doc, 11, "What size company should we target initially?", "Primary beachhead: AED 20–100M turnover, approximately 30–250 ERP users. A smaller company can fit when its process complexity is high; a larger prospect should be qualified for implementation governance, integrations and finance depth before committing.")
    add_response(doc, 12, "Who is the person we want to convince?", "Lead with the Owner/Managing Director or COO, because they feel cross-functional leakage and accountability. Build the business case with the Factory/Production Manager, CFO and IT lead: each gets a different proof point—execution, control, financial visibility and supportability.")
    add_response(doc, 13, "Why should a UAE manufacturer choose SAK Solutions?", "One compelling reason: SAK gives a mid-market manufacturer one accountable operating system for the factory and the business around it—configured to the way the company actually works, with traceability from material issue to finished goods, customer delivery, service and payment.")

    doc.add_page_break()
    h = doc.add_paragraph()
    r = h.add_run("Recommended UAE positioning derived from the answers")
    r.bold = True
    r.font.name = "Aptos Display"
    r.font.size = Pt(16)
    r.font.color.rgb = RGBColor(31, 78, 121)
    add_response(doc, "A", "One-line positioning", "SAK ERP is the configurable manufacturing ERP for growing UAE manufacturers that need one traceable flow from procurement and production through sales, service and finance.")
    add_response(doc, "B", "Core USP", "Factory-to-finance accountability without enterprise-ERP complexity: SAK connects material, work, quality, commercial and payment events into a single operational trail, with implementation owned by a team that understands the customer’s process.")
    add_response(doc, "C", "30-second elevator pitch", "SAK ERP helps growing manufacturers replace disconnected spreadsheets and legacy tools with one controlled flow across purchasing, inventory, BOMs, production, subcontracting, sales, service and finance. Managers can follow the material and money trail from order to issue, receipt, QC, delivery, invoice and payment. It is configurable for the way a mid-market factory actually works, with SAK accountable for implementation and support.")
    add_response(doc, "D", "Messaging pillars", "Use these four pillars consistently in sales material:", [
        "Traceable execution: every material, work order, receipt, QC decision, invoice and payment has a linked trail.",
        "Manufacturing fit: BOMs, job work, subcontracting, UOM-aware quantities, WIP and service-after-sales are first-class workflows.",
        "Commercial control: quotations, revisions, sales orders, dispatch, billing, receivables, warranty and service costs connect to execution.",
        "Accountable transformation: standard core, controlled customization, local fit and a long-term implementation/support partner.",
    ])

    # Set a stable, readable font on newly-added content while preserving the source questionnaire.
    for p in doc.paragraphs:
        for run in p.runs:
            if run.font.name is None:
                run.font.name = "Aptos"
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(OUT))
    print(OUT)


if __name__ == "__main__":
    main()
