#!/usr/bin/env bash
# Install system dependencies for Tesseract OCR
apt-get install -y tesseract-ocr 2>/dev/null || true

# Install Python dependencies
pip install -r requirements.txt
