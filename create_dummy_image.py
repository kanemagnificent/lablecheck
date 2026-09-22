import cv2
import numpy as np

# Create a blank white image
img = np.ones((500, 800, 3), dtype=np.uint8) * 255

# Add text to simulate a product label
font = cv2.FONT_HERSHEY_SIMPLEX
cv2.putText(img, "Crispy Wheat Biscuits", (50, 50), font, 1, (0, 0, 0), 2)
cv2.putText(img, "Net Wt: 200 g", (50, 100), font, 1, (0, 0, 0), 2)
cv2.putText(img, "MRP Rs. 45 (Inclusive of all taxes)", (50, 150), font, 1, (0, 0, 0), 2)
cv2.putText(img, "Batch No: BW2026A1", (50, 200), font, 1, (0, 0, 0), 2)
cv2.putText(img, "Mfd by: Sunrise Foods Pvt Ltd, Pune", (50, 250), font, 1, (0, 0, 0), 2)
cv2.putText(img, "Mfg Date: 03/2026", (50, 300), font, 1, (0, 0, 0), 2)
cv2.putText(img, "Customer care: 9876543210", (50, 350), font, 1, (0, 0, 0), 2)
cv2.putText(img, "Ingredients: Wheat flour, Sugar, Tartrazine (E102)", (50, 400), font, 0.8, (0, 0, 0), 2)

cv2.imwrite("dummy_label.jpg", img)
print("Created dummy_label.jpg")
