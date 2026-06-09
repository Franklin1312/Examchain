#!/usr/bin/env python3
"""
detect_blur.py
Detects blur on each page using Laplacian variance.
A low variance = blurred image = evaluator couldn't read clearly.
Usage: python3 detect_blur.py <processed_dir>
"""

import sys
import json
import os
import cv2
import numpy as np

# Threshold below which a page is considered blurred
BLUR_THRESHOLD = 100.0

def get_blur_score(image_path):
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return 0.0
    laplacian = cv2.Laplacian(img, cv2.CV_64F)
    return float(laplacian.var())

def get_content_density(image_path):
    """Ratio of non-white pixels — indicates how much content is on the page"""
    img = cv2.imread(image_path)
    if img is None:
        return 0.0
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
    total = binary.shape[0] * binary.shape[1]
    non_white = np.count_nonzero(binary)
    return float(non_white / total)

def detect_blur(processed_dir):
    page_files = sorted([
        f for f in os.listdir(processed_dir) 
        if f.startswith("page_") and f.endswith(".png")
    ])

    pages = []
    for page_file in page_files:
        page_num = int(page_file.replace("page_", "").replace(".png", ""))
        image_path = os.path.join(processed_dir, page_file)
        
        blur_score = get_blur_score(image_path)
        content_density = get_content_density(image_path)
        is_blurred = blur_score < BLUR_THRESHOLD and content_density > 0.02

        pages.append({
            "page_number": page_num,
            "image_path": image_path,
            "blur_score": blur_score,
            "content_density": content_density,
            "is_blurred": is_blurred,
            "threshold": BLUR_THRESHOLD
        })

    print(json.dumps({
        "pages": pages,
        "blurred_count": sum(1 for p in pages if p["is_blurred"]),
        "total_pages": len(pages)
    }))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: detect_blur.py <processed_dir>"}))
        sys.exit(1)
    
    detect_blur(sys.argv[1])
