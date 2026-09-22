#!/usr/bin/env bash
set -e

# Install Tesseract OCR binary
apt-get update -qq && apt-get install -y -qq tesseract-ocr tesseract-ocr-eng libgl1-mesa-glx libglib2.0-0

# Install Python dependencies
pip install -r requirements.txt
