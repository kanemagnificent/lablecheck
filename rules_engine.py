import re

# PART 1: TEXT-PRESENCE RULEBOOK (Rule 6 declarations)
TEXT_RULES = [
    {
        "field_name": "net_quantity",
        "display_name": "Net Quantity",
        "legal_reference": "Rule 6(1)(c)",
        "pattern": r"net\s*(wt|weight|qty|quantity)\s*[:\-]?\s*(\d+(\.\d+)?\s?(g|gm|kg|ml|l|litre|liter))",
        "severity": "violation",
        "fail_message": "Net quantity not found or missing a standard unit."
    },
    {
        "field_name": "mrp",
        "display_name": "MRP (Maximum Retail Price)",
        "legal_reference": "Rule 6(1)(e)",
        "pattern": r"(mrp|m\.r\.p\.?)\s*[:\-]?\s*(rs\.?|inr|\u20b9)?\s*(\d+(\.\d{1,2})?)",
        "severity": "violation",
        "fail_message": "MRP not found on the label.",
        "extra_check_pattern": r"incl(usive|\.)?\s*(of)?\s*all\s*tax",
        "extra_check_fail_message": "MRP found, but not declared as inclusive of all taxes."
    },
    {
        "field_name": "batch_details",
        "display_name": "Batch / Lot Number",
        "legal_reference": "Common industry practice / traceability",
        "pattern": r"\b(batch|lot)\s*(no\.?|number|#)?\s*[:\-]\s*([A-Za-z0-9\-]{2,20})",
        "severity": "warning",
        "fail_message": "Batch or lot number not detected."
    },
    {
        "field_name": "manufacturer",
        "display_name": "Manufacturer / Packer Details",
        "legal_reference": "Rule 6(1)(a)",
        "pattern": r"(mfd|manufactured|marketed|packed)\s*(by|for)\s*[:\-]?\s*([A-Za-z0-9,.&\-\s]{5,80}?)(?=\n|Mfg|MRP|Net|$)",
        "severity": "violation",
        "fail_message": "Manufacturer/packer name and address not clearly detected."
    },
    {
        "field_name": "mfg_date",
        "display_name": "Month & Year of Manufacture",
        "legal_reference": "Rule 6(1)(d)",
        "pattern": r"(mfg|manufactur(ed|ing)|pkd|packed)\s*(date|dt)?\s*[:\-]?\s*(\d{1,2}[\/\-])?([A-Za-z]{3,9}|\d{1,2})[\/\-\s]?(\d{4}|\d{2})",
        "severity": "violation",
        "fail_message": "Month/year of manufacture not found in expected format."
    },
    {
        "field_name": "consumer_care",
        "display_name": "Consumer Care Details",
        "legal_reference": "Rule 6(2)",
        "pattern": r"(customer|consumer)\s*(care|support)?\s*[:\-]?\s*(\d{10})",
        "severity": "warning",
        "fail_message": "No consumer care contact detected."
    },
]

# PART 2: FONT-SIZE TABLE (Rule 7, as amended by G.S.R. 629(E), 2017)
FONT_SIZE_TABLE = [
    {"min_area_cm2": 0,    "max_area_cm2": 50,   "normal_mm": 1.0, "molded_mm": 1.5},
    {"min_area_cm2": 50,   "max_area_cm2": 100,  "normal_mm": 1.5, "molded_mm": 3.0},
    {"min_area_cm2": 100,  "max_area_cm2": 500,  "normal_mm": 2.5, "molded_mm": 4.0},
    {"min_area_cm2": 500,  "max_area_cm2": 2500, "normal_mm": 4.0, "molded_mm": 6.0},
    {"min_area_cm2": 2500, "max_area_cm2": None, "normal_mm": 6.0, "molded_mm": 6.0},
]
def calculate_panel_area(shape: str, **dimensions) -> float:
    if shape == "rectangular":
        return dimensions["height_cm"] * dimensions["width_cm"]
    elif shape == "cylindrical":
        return 0.40 * dimensions["height_cm"] * dimensions["circumference_cm"]
    elif shape == "other":
        return 0.40 * dimensions["total_surface_area_cm2"]
    else:
        raise ValueError("shape must be 'rectangular', 'cylindrical', or 'other'")

def get_minimum_font_height(panel_area_cm2: float, is_molded: bool = False) -> float:
    for row in FONT_SIZE_TABLE:
        min_a, max_a = row["min_area_cm2"], row["max_area_cm2"]
        if max_a is None:
            if panel_area_cm2 >= min_a:
                return row["molded_mm"] if is_molded else row["normal_mm"]
        elif min_a <= panel_area_cm2 < max_a:
            return row["molded_mm"] if is_molded else row["normal_mm"]
    raise ValueError("Could not determine font size threshold for the given area.")

# PART 3: THE EXTRACTOR (Machine 1)
class RegexFieldExtractor:
    def __init__(self):
        self.rules = TEXT_RULES

    def extract(self, raw_text: str) -> dict:
        results = {}
        for rule in self.rules:
            field = rule["field_name"]
            match = re.search(rule["pattern"], raw_text, re.IGNORECASE)

            if not match:
                results[field] = {"value": None, "confidence": 0.0, "issue": rule["fail_message"]}
                continue

            value = match.group(0).strip()
            confidence = 1.0
            issue = None

            if "extra_check_pattern" in rule:
                extra_match = re.search(rule["extra_check_pattern"], raw_text, re.IGNORECASE)
                if not extra_match:
                    confidence = 0.6
                    issue = rule["extra_check_fail_message"]

            results[field] = {"value": value, "confidence": confidence, "issue": issue}

        # ---- NEW: common/generic name of commodity (Rule 6(1)(b)) ----
        # This is free text, so we can't use a fixed keyword pattern like
        # the other fields. Heuristic: take the first non-empty line of
        # the label that ISN'T itself a matched declaration (net qty,
        # MRP, etc.) -- product names are almost always printed first,
        # above the mandatory declarations.
        results["common_name"] = self._extract_common_name(raw_text, results)

        return results

    def _extract_common_name(self, raw_text: str, already_found: dict) -> dict:
        lines = [line.strip() for line in raw_text.strip().split("\n") if line.strip()]
        if not lines:
            return {"value": None, "confidence": 0.0,
                     "issue": "No text detected to determine product name."}

        first_line = lines[0]

        # If the first line itself looks like one of our OTHER fields
        # (e.g. OCR jumbled the order and "Net Wt: 200g" came first),
        # we can't confidently call it the product name.
        looks_like_other_field = any(
            data["value"] and data["value"].lower() in first_line.lower()
            for data in already_found.values() if isinstance(data, dict)
        )

        if looks_like_other_field or len(first_line) < 3:
            return {"value": None, "confidence": 0.3,
                     "issue": "Could not confidently identify a product name line "
                              "separate from other declarations."}

        return {"value": first_line, "confidence": 0.8, "issue": None}
        # confidence capped at 0.8 (not 1.0) since this is a heuristic,
        # not a precise pattern match like the other fields.


# =====================================================================
# PART 4: FONT-SIZE CHECKER
# =====================================================================

class FontSizeChecker:
    def check(self, package_shape: str, dimensions: dict,
              detected_font_height_mm: float, is_molded: bool = False) -> dict:

        panel_area = calculate_panel_area(package_shape, **dimensions)
        min_required = get_minimum_font_height(panel_area, is_molded)

        compliant = detected_font_height_mm >= min_required
        return {
            "value": f"{detected_font_height_mm} mm",
            "confidence": 1.0,
            "issue": None if compliant else (
                f"Detected font height {detected_font_height_mm}mm is below the "
                f"{min_required}mm minimum required for a {panel_area:.1f} cm^2 panel."
            ),
            "panel_area_cm2": round(panel_area, 1),
            "minimum_required_mm": min_required,
            "compliant": compliant
        }
# PART 5: THE AUDITOR (Machine 2)
class LegalMetrologyAuditor:
    CONFIDENCE_THRESHOLD = 0.7

    # NEW: if overall OCR confidence for the whole label is below this,
    # we don't trust ANY individual verdict enough to report it plainly.
    OVERALL_OCR_REVIEW_THRESHOLD = 0.5

    def __init__(self):
        self.rules = TEXT_RULES

    def audit(self, extracted_fields: dict, font_size_result: dict = None,
              overall_ocr_confidence: float = None) -> dict:

        violations = []
        warnings = []
        audit_trail = []
        step_num = 1

        # ---- NEW: low-confidence catch-all, checked first ----
        # Instead of a dead-end "manual review" message, we ask the user
        # to rescan -- same corrective action as a flagged compliance
        # issue, just triggered by poor image/OCR quality instead of a
        # rule violation. Keeps the UX consistent: every non-ideal
        # outcome ends in "upload again," not a stuck state.
        rescan_needed = False
        if overall_ocr_confidence is not None and overall_ocr_confidence < self.OVERALL_OCR_REVIEW_THRESHOLD:
            rescan_needed = True
            audit_trail.append({
                "step": step_num, "field": "overall_ocr_quality",
                "label": "Image Quality",
                "result": "rescan_needed",
                "confidence": overall_ocr_confidence,
                "reason": (f"The photo wasn't clear enough to read reliably "
                           f"(confidence: {overall_ocr_confidence}). Try rescanning "
                           "with better lighting or a flatter, closer shot of the label.")
            })
            step_num += 1

        # ---- Text-presence fields (including common_name now) ----
        for rule in self.rules:
            field = rule["field_name"]
            data = extracted_fields.get(field, {"value": None, "confidence": 0.0, "issue": "Not extracted."})
            value, confidence, issue = data["value"], data["confidence"], data["issue"]
            label, severity = rule["display_name"], rule["severity"]

            if value is None:
                result = "fail"
                reason = rule["fail_message"]
                (violations if severity == "violation" else warnings).append(f"{label}: {reason}")
            elif confidence < self.CONFIDENCE_THRESHOLD:
                result = "warning"
                reason = issue
                warnings.append(f"{label}: {reason}")
            else:
                result = "pass"
                reason = "Requirement satisfied."

            audit_trail.append({
                "step": step_num, "field": field, "label": label,
                "result": result, "confidence": confidence, "reason": reason
            })
            step_num += 1

        # ---- Common name of commodity (Rule 6(1)(b)) ----
        cn = extracted_fields.get("common_name", {"value": None, "confidence": 0.0, "issue": "Not extracted."})
        label = "Common Name of Commodity"
        if cn["value"] is None:
            result = "warning"
            reason = cn["issue"]
            warnings.append(f"{label}: {reason}")
        elif cn["confidence"] < self.CONFIDENCE_THRESHOLD:
            result = "warning"
            reason = cn["issue"] or "Low-confidence product name detection."
            warnings.append(f"{label}: {reason}")
        else:
            result = "pass"
            reason = f'Detected as: "{cn["value"]}"'

        audit_trail.append({
            "step": step_num, "field": "common_name", "label": label,
            "result": result, "confidence": cn["confidence"], "reason": reason
        })
        step_num += 1

        # ---- Font size (Rule 7), if provided ----
        if font_size_result is not None:
            label = "Declaration Font Size (Rule 7)"
            if not font_size_result["compliant"]:
                result = "fail"
                reason = font_size_result["issue"]
                violations.append(f"{label}: {reason}")
            else:
                result = "pass"
                reason = f"Font height meets the {font_size_result['minimum_required_mm']}mm minimum."

            audit_trail.append({
                "step": step_num, "field": "font_size", "label": label,
                "result": result, "confidence": 1.0, "reason": reason
            })

        # ---- Final verdict ----
        if rescan_needed:
            status = "RESCAN NEEDED"
        elif violations:
            status = "NON-COMPLIANT"
        elif warnings:
            status = "COMPLIANT WITH WARNINGS"
        else:
            status = "COMPLIANT"

        return {
            "compliance_status": status,
            "violations": violations,
            "warnings": warnings,
            "audit_trail": audit_trail
        }

# PART 6: ONE EASY FUNCTION - what Member 1 will call from FastAPI
def run_full_check(raw_text: str, font_size_input: dict = None,
                    overall_ocr_confidence: float = None) -> dict:
    extractor = RegexFieldExtractor()
    auditor = LegalMetrologyAuditor()

    extracted = extractor.extract(raw_text)

    font_result = None
    if font_size_input is not None:
        checker = FontSizeChecker()
        font_result = checker.check(
            package_shape=font_size_input["package_shape"],
            dimensions=font_size_input["dimensions"],
            detected_font_height_mm=font_size_input["detected_font_height_mm"],
            is_molded=font_size_input.get("is_molded", False)
        )

    audit_result = auditor.audit(extracted, font_result, overall_ocr_confidence)

    return {
        "extracted_fields": extracted,
        "font_size_check": font_result,
        **audit_result
    }

