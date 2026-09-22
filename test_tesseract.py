import cv2
from unified_compliance_engine import preprocess_image, _run_tesseract

original_img, processed = preprocess_image("uploads/f787cc6b-82c3-43bc-b257-e96ae63c4cf1_05a6e125-f975-4043-aa19-a1a933a49ad8.jpg")
blocks, conf = _run_tesseract(processed)
print("TESSERACT CONF:", conf)
print("RAW TEXT:")
print(" ".join([b["text"] for b in blocks]))
