def render_pdf_report(record, out_pdf):
    # Dummy report renderer to allow the code to run
    # If the user wants actual PDF generation, they'll need weasyprint and jinja2
    print(f"Mocking PDF report generation for {out_pdf}...")
    with open(out_pdf, "w") as f:
        f.write(f"Mock PDF Report for scan: {record.get('scan_id')}\n")
    return out_pdf
