import easyocr
import cv2

reader = easyocr.Reader(['en'], gpu=False)
image_path = "uploads/3eaecc34-f24a-4835-930c-72d87010a59b_ff4cf377-4187-4f8f-ac8d-ecd34e5962c7.jpg"

print("--- DEFAULT ---")
results = reader.readtext(image_path)
print(" ".join([res[1] for res in results]))

print("--- TUNED ---")
results2 = reader.readtext(image_path, mag_ratio=2.0, contrast_ths=0.1, adjust_contrast=0.5, text_threshold=0.5, low_text=0.3)
print(" ".join([res[1] for res in results2]))

