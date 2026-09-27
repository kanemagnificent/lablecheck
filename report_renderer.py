from fpdf import FPDF
import datetime

class PDFReport(FPDF):
    def header(self):
        self.set_font('helvetica', 'B', 15)
        self.set_text_color(17, 24, 39)
        self.cell(0, 10, 'LabelCheck Compliance Engine', ln=True, align='L')
        self.set_font('helvetica', 'I', 10)
        self.set_text_color(107, 114, 128)
        self.cell(0, 10, 'Official Legal Metrology Audit Report', ln=True, align='L')
        self.ln(5)
        self.set_draw_color(229, 231, 235)
        self.line(10, 30, 200, 30)
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(156, 163, 175)
        self.cell(0, 10, f'Page {self.page_no()} | Generated on {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', align='C')

def render_pdf_report(record, out_pdf, report_type="audit"):
    pdf = PDFReport()
    pdf.add_page()
    
    pdf.set_font('helvetica', 'B', 24)
    if report_type == "certificate" and record.get("compliance_status") == "COMPLIANT":
        pdf.set_text_color(34, 197, 94)
        pdf.cell(0, 15, 'CERTIFICATE OF COMPLIANCE', ln=True, align='C')
    else:
        pdf.set_text_color(220, 38, 38)
        pdf.cell(0, 15, 'NON-COMPLIANCE AUDIT REPORT', ln=True, align='C')
    
    pdf.ln(10)
    
    # Try to add product image
    filename = record.get('filename')
    if filename:
        import os
        img_path = os.path.join("uploads", filename.split(",")[0].strip())
        if os.path.exists(img_path):
            try:
                pdf.image(img_path, x=150, y=40, w=45)
            except Exception as e:
                print("Could not add image to PDF:", e)
                
    pdf.set_font('helvetica', 'B', 12)
    pdf.set_text_color(17, 24, 39)
    pdf.cell(40, 10, 'Scan ID:', border=1)
    pdf.set_font('helvetica', '', 12)
    pdf.cell(0, 10, str(record.get('scan_id', 'N/A')), border=1, ln=True)
    
    pdf.set_font('helvetica', 'B', 12)
    pdf.cell(40, 10, 'Status:', border=1)
    pdf.set_font('helvetica', 'B', 12)
    status = record.get('compliance_status', 'UNKNOWN')
    if status == 'COMPLIANT':
        pdf.set_text_color(34, 197, 94)
    elif status == 'WARNING':
        pdf.set_text_color(245, 158, 11)
    else:
        pdf.set_text_color(220, 38, 38)
    pdf.cell(0, 10, status, border=1, ln=True)
    
    pdf.set_text_color(17, 24, 39)
    pdf.set_font('helvetica', 'B', 12)
    pdf.cell(40, 10, 'Score:', border=1)
    pdf.set_font('helvetica', '', 12)
    pdf.cell(0, 10, f"{record.get('compliance_score', 0)}/100", border=1, ln=True)
    
    pdf.ln(10)
    
    violations = record.get('violations')
    if isinstance(violations, str):
        import json
        try:
            violations = json.loads(violations)
        except:
            violations = []
            
    if violations:
        pdf.set_font('helvetica', 'B', 14)
        pdf.set_text_color(220, 38, 38)
        pdf.cell(0, 10, 'Identified Violations', ln=True)
        pdf.set_font('helvetica', '', 11)
        pdf.set_text_color(17, 24, 39)
        for v in violations:
            pdf.multi_cell(0, 8, f"- {v}")
            pdf.ln(2)
    elif status == 'COMPLIANT':
        pdf.set_font('helvetica', 'I', 12)
        pdf.set_text_color(34, 197, 94)
        pdf.cell(0, 10, 'No statutory violations found. Product label meets requirements.', ln=True)

    pdf.output(out_pdf)
    return out_pdf
