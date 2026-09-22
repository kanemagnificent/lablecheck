r"""
test_image.py
=============
Standalone driver supporting single or multi-image multi-side scanning.

Usage:
    python test_image.py test_img0.jpeg test_img2.jpeg cylindrical
"""

import json
import sys
import uuid
from datetime import datetime

from unified_compliance_engine import HybridOCREngine, run_full_check_from_ocr_result
from database import save_audit_log
from report_renderer import render_pdf_report


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    image_paths = []
    package_shape = "rectangular"
    use_ai = True

    for arg in sys.argv[1:]:
        if arg == "--no-ai":
            use_ai = False
        elif arg in ["rectangular", "cylindrical", "other"]:
            package_shape = arg
        else:
            for p in arg.split(","):
                clean_p = p.strip()
                if clean_p and not clean_p.startswith("--"):
                    image_paths.append(clean_p)

    if not image_paths:
        print("Error: No valid image file paths specified.")
        sys.exit(1)

    print(f"Running OCR on ({len(image_paths)} image(s)): {', '.join(image_paths)}")
    print(f"Package shape : {package_shape}")
    print(f"AI enabled    : {use_ai}")
    print("-" * 70)

    engine = HybridOCREngine()
    if len(image_paths) == 1:
        ocr_result = engine.extract(image_paths[0])
    else:
        ocr_result = engine.extract_multiple(image_paths)

    print("RAW OCR COMBINED TEXT:")
    print(ocr_result["raw_text"] or "(nothing detected)")
    print(f"\n{len(ocr_result['text_blocks'])} text block(s) detected across image(s)")
    print("-" * 70)

    result = run_full_check_from_ocr_result(
        ocr_result,
        package_shape=package_shape,
        enable_ai_rescue=use_ai,
        enable_ai_synthesis=use_ai,
    )

    print(f"STATUS : {result['compliance_status']}")
    print(f"SCORE  : {result.get('compliance_score')}")
    print(f"CONFIDENCE (overall OCR): {result.get('overall_ocr_confidence')}")
    print(f"VIOLATIONS: {result['violations']}")
    print(f"WARNINGS  : {result['warnings']}")
    print(f"NEEDS MANUAL REVIEW: {result.get('needs_manual_review')}")
    print("-" * 70)

    tox = result.get("toxicity_analysis") or {}
    print("INGREDIENT TOXICITY ADVISORY:")
    print(f"  Verdict     : {tox.get('verdict')}")
    print(f"  Score       : {tox.get('toxicity_score')}/100")
    print(f"  Reason      : {tox.get('verdict_reason')}")
    flagged = tox.get("flagged_ingredients") or []
    if flagged:
        print(f"  Flagged ({len(flagged)}):")
        for f in flagged:
            banned_tag = " [BANNED IN INDIA]" if f.get("banned_in_india") else ""
            print(f"    - {f['name']} [{f['risk_level'].upper()}]{banned_tag}: {f['reason']}")
    print("-" * 70)

    if result["compliance_status"] == "RESCAN NEEDED":
        print("Image quality too low -- stopping before DB save / PDF report.")
        return

    scan_id = str(uuid.uuid4())
    filename_record = ", ".join(image_paths)

    save_audit_log(
        scan_id=scan_id,
        filename=filename_record,
        compliance_status=result["compliance_status"],
        confidence=result.get("overall_ocr_confidence", 0.0),
        violations=result["violations"],
        warnings=result["warnings"],
        audit_trail=result["audit_trail"],
        fields=result["extracted_fields"],
        font_size_check=result["font_size_check"],
        compliance_score=result.get("compliance_score"),
        needs_manual_review=result.get("needs_manual_review"),
        ai_analysis=result.get("ai_analysis"),
        toxicity_analysis=result.get("toxicity_analysis"),
    )
    print(f"Saved to database as scan_id: {scan_id}")

    record = {
        "scan_id": scan_id,
        "timestamp": datetime.now().isoformat(),
        "filename": filename_record,
        "confidence": result.get("overall_ocr_confidence", 0.0),
        "status": result["compliance_status"],
        "compliance_score": result.get("compliance_score"),
        "fields": result["extracted_fields"],
        "font_size_check": result["font_size_check"],
        "violations": result["violations"],
        "warnings": result["warnings"],
        "needs_manual_review": result.get("needs_manual_review", []),
        "ai_analysis": result.get("ai_analysis"),
        "toxicity_analysis": result.get("toxicity_analysis"),
        "audit_trail": result["audit_trail"],
    }

    out_pdf = f"report_{scan_id[:8]}.pdf"
    final_path = render_pdf_report(record, out_pdf)
    print(f"Report saved to: {final_path}")


if __name__ == "__main__":
    main()
