import json
from unified_compliance_engine import HybridOCREngine, run_full_check_from_ocr_result

engine = HybridOCREngine()
image_path = "uploads/3eaecc34-f24a-4835-930c-72d87010a59b_ff4cf377-4187-4f8f-ac8d-ecd34e5962c7.jpg"
print(f"Extracting OCR from {image_path}...")

ocr_res = engine.extract(image_path)
print("--- RAW TEXT ---")
print(ocr_res["raw_text"])
print("----------------")

res = run_full_check_from_ocr_result(ocr_res, enable_ai_synthesis=True)
print("--- EXTRACTED FIELDS ---")
print(json.dumps(res["extracted_fields"], indent=2))
print("----------------")
