#!/usr/bin/env python3
"""
detect_content.py
Detects whether each page has student-written content.
Uses two signals: pixel density + OCR character count.
Also detects page numbers, PTO markers, and supplement indicators.

Usage: python3 detect_content.py <processed_dir>
"""

import sys
import json
import os
import re
import cv2
import numpy as np

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False

# A page is considered to have content if either:
# - Ink density > 2% (non-white pixels)
# - OCR finds > 10 characters
DENSITY_THRESHOLD = 0.005
OCR_CHAR_THRESHOLD = 10

PTO_PATTERNS = [
    r'\bP\.T\.O\b', r'\bPTO\b', r'\bContd\b', r'\bCont\.d\b',
    r'\bcontinued\b', r'\bover\b', r'\bP\.T\.O\.', r'please turn over'
]

def get_ink_density(img):
    """Fraction of non-white pixels in the page (ignoring annotation colors)"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
    total = binary.shape[0] * binary.shape[1]
    ink_pixels = np.count_nonzero(binary)
    return float(ink_pixels / total)

def get_student_ink_density(img):
    """
    Density of blue/black ink only (student writing).
    Excludes red/green/blue annotation colors.
    """
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # Mask out evaluator annotation colors (red, green, blue borders)
    red_mask1 = cv2.inRange(hsv, np.array([0, 100, 100]),  np.array([10, 255, 255]))
    red_mask2 = cv2.inRange(hsv, np.array([160, 100, 100]), np.array([180, 255, 255]))
    green_mask = cv2.inRange(hsv, np.array([40, 80, 80]),  np.array([85, 255, 255]))
    blue_border_mask = cv2.inRange(hsv, np.array([100, 80, 80]), np.array([130, 255, 255]))
    purple_mask = cv2.inRange(hsv, np.array([130, 50, 50]), np.array([160, 255, 255]))
    
    annotation_mask = cv2.bitwise_or(
        cv2.bitwise_or(cv2.bitwise_or(red_mask1, red_mask2), green_mask),
        cv2.bitwise_or(blue_border_mask, purple_mask)
    )
    
    # What's left is student ink + printed lines
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, ink = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY_INV)
    
    # Remove annotation pixels from student ink map
    annotation_dilated = cv2.dilate(annotation_mask, 
                                     cv2.getStructuringElement(cv2.MORPH_RECT, (10, 10)))
    student_ink = cv2.bitwise_and(ink, cv2.bitwise_not(annotation_dilated))
    
    total = student_ink.shape[0] * student_ink.shape[1]
    return float(np.count_nonzero(student_ink) / total)

def ocr_full_page(img):
    """Run OCR on the full page to extract text"""
    if not TESSERACT_AVAILABLE:
        return ""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    text = pytesseract.image_to_string(gray, config="--psm 6")
    return text

def extract_page_number(text):
    """Try to extract the printed page number from OCR text"""
    patterns = [
        r'(?:^|\n)\s*(\d{1,3})\s*(?:\n|$)',  # standalone number on its own line
        r'Page\s+(\d+)',
        r'Pg\.\s*(\d+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            num = int(match.group(1))
            if 1 <= num <= 100:  # Reasonable page number range
                return num
    return None

def has_pto_marker(text):
    for pattern in PTO_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

def detect_content(processed_dir):
    page_files = sorted([
        f for f in os.listdir(processed_dir)
        if f.startswith("page_") and f.endswith(".png")
    ])

    pages = []
    total_pages = len(page_files)

    for page_file in page_files:
        page_num = int(page_file.replace("page_", "").replace(".png", ""))
        image_path = os.path.join(processed_dir, page_file)
        img = cv2.imread(image_path)
        
        if img is None:
            continue

        ink_density = get_ink_density(img)
        student_density = get_student_ink_density(img)
        
        page_text = ocr_full_page(img) if TESSERACT_AVAILABLE else ""
        char_count = len([c for c in page_text if c.strip()])
        
        printed_page_number = extract_page_number(page_text)
        pto_marker = has_pto_marker(page_text)
        
        # Page has content if either signal passes threshold
        has_content = (
            student_density > DENSITY_THRESHOLD or 
            char_count > OCR_CHAR_THRESHOLD
        )

        pages.append({
            "page_number": page_num,
            "image_path": image_path,
            "has_content": has_content,
            "ink_density": ink_density,
            "content_density": student_density,
            "ocr_char_count": char_count,
            "ocr_text_preview": page_text[:200] if page_text else "",
            "printed_page_number": printed_page_number,
            "has_pto_marker": pto_marker,
            "expected_min_pages": total_pages + 4 if pto_marker else total_pages
        })

    print(json.dumps({
        "pages": pages,
        "pages_with_content": sum(1 for p in pages if p["has_content"]),
        "total_pages": len(pages)
    }))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: detect_content.py <processed_dir>"}))
        sys.exit(1)
    
    detect_content(sys.argv[1])
