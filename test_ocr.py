import json
from unified_compliance_engine import HybridOCREngine, run_full_check_from_ocr_result

engine = HybridOCREngine()
image_path = "uploads/9b94e583-6def-4c52-b204-255bdaaff44c_d2befbb1-7c28-4d10-a613-d194e3dc6d34.jpg"
print(f"Extracting OCR from {image_path}...")

ocr_res = engine.extract(image_path)
print("--- RAW TEXT ---")
print(ocr_res["raw_text"])
print("----------------")

res = run_full_check_from_ocr_result(ocr_res, enable_ai_synthesis=True)
print("--- EXTRACTED FIELDS ---")
print(json.dumps(res["extracted_fields"], indent=2))
print("----------------")
