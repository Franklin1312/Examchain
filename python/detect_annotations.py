#!/usr/bin/env python3
"""
detect_annotations.py
Detects OSM evaluator annotation boxes from CBSE answer sheet images.

Box types:
  GREEN  → marks awarded  (e.g. "1 30a_iORS1")
  RED    → zero marks     (e.g. "0 34_ivaORS1")
  BLUE   → totals summary (e.g. "30a_i : 0.5 + 0 = 0.5")
  PURPLE → REPEAT ANS+ stamp
  RED ⊗  → wrong answer cross

Usage: python3 detect_annotations.py <processed_dir>
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

# HSV color ranges (tuned from real CBSE OSM samples)
COLOR_RANGES = {
    "green": {
        "lower": np.array([40, 80, 80]),
        "upper": np.array([85, 255, 255])
    },
    "red": {
        "lower1": np.array([0, 100, 100]),
        "upper1": np.array([10, 255, 255]),
        "lower2": np.array([160, 100, 100]),
        "upper2": np.array([180, 255, 255])
    },
    "blue": {
        "lower": np.array([100, 80, 80]),
        "upper": np.array([130, 255, 255])
    },
    "purple": {
        "lower": np.array([130, 50, 50]),
        "upper": np.array([160, 255, 255])
    }
}

def get_color_mask(hsv, color):
    if color == "red":
        m1 = cv2.inRange(hsv, COLOR_RANGES["red"]["lower1"], COLOR_RANGES["red"]["upper1"])
        m2 = cv2.inRange(hsv, COLOR_RANGES["red"]["lower2"], COLOR_RANGES["red"]["upper2"])
        return cv2.bitwise_or(m1, m2)
    return cv2.inRange(hsv, COLOR_RANGES[color]["lower"], COLOR_RANGES[color]["upper"])

def ocr_region(img, x, y, w, h):
    """OCR a cropped region of the image"""
    if not TESSERACT_AVAILABLE:
        return ""
    padding = 5
    x1 = max(0, x - padding)
    y1 = max(0, y - padding)
    x2 = min(img.shape[1], x + w + padding)
    y2 = min(img.shape[0], y + h + padding)
    region = img[y1:y2, x1:x2]
    
    # Upscale for better OCR
    region = cv2.resize(region, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    config = "--psm 7 -c tessedit_char_whitelist=0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_.:+= "
    text = pytesseract.image_to_string(thresh, config=config).strip()
    return text

def parse_annotation_text(text, box_color):
    """
    Parse OCR text from annotation box into structured data.
    Green/Red: "1 30a_iORS1" → {mark: 1, question_code: "30a_iORS1"}
    Blue: "30a_i : 0.5 + 0 = 0.5" → {question_code: "30a_i", parts: [...], total: 0.5}
    """
    result = {"raw_text": text, "mark": None, "question_code": None}
    
    if box_color in ["green", "red"]:
        # Pattern: number followed by question code
        match = re.search(r'([0-9.]+)\s+([A-Za-z0-9_]+)', text)
        if match:
            try:
                result["mark"] = float(match.group(1))
            except:
                result["mark"] = 0
            result["question_code"] = match.group(2)
    
    elif box_color == "blue":
        # Pattern: "30a_i : 0.5 + 0 = 0.5"
        code_match = re.search(r'([A-Za-z0-9_]+)\s*:', text)
        total_match = re.search(r'=\s*([0-9.]+)', text)
        parts_match = re.findall(r'([0-9.]+)\s*\+', text)
        
        if code_match:
            result["question_code"] = code_match.group(1)
        if total_match:
            try:
                result["total"] = float(total_match.group(1))
            except:
                result["total"] = 0
        if parts_match:
            try:
                result["parts"] = [float(p) for p in parts_match]
                result["computed_sum"] = sum(result["parts"])
            except:
                result["parts"] = []
    
    return result

def detect_colored_rectangles(img, color):
    """Detect rectangular annotation boxes of a given color"""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    mask = get_color_mask(hsv, color)
    
    # Morphological cleanup
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    boxes = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < 200 or area > 50000:  # Filter noise and huge blobs
            continue
        
        x, y, w, h = cv2.boundingRect(contour)
        
        # Annotation boxes are typically wider than tall
        aspect_ratio = w / max(h, 1)
        if aspect_ratio < 1.5 or aspect_ratio > 15:
            continue
        
        text = ocr_region(img, x, y, w, h)
        parsed = parse_annotation_text(text, color)
        
        boxes.append({
            "color": color,
            "x": int(x),
            "y": int(y),
            "width": int(w),
            "height": int(h),
            "area": float(area),
            "text": text,
            **parsed
        })
    
    return boxes

def detect_repeat_stamp(img):
    """Detect purple REPEAT ANS+ stamp"""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    mask = get_color_mask(hsv, "purple")
    large_regions = cv2.morphologyEx(mask, cv2.MORPH_OPEN, 
                                      cv2.getStructuringElement(cv2.MORPH_RECT, (20, 20)))
    return np.count_nonzero(large_regions) > 500

def detect_wrong_cross(img):
    """Detect red ⊗ wrong answer circles"""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    red_mask = get_color_mask(hsv, "red")
    
    contours, _ = cv2.findContours(red_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    crosses = []
    for c in contours:
        area = cv2.contourArea(c)
        if area < 1000:
            continue
        perimeter = cv2.arcLength(c, True)
        if perimeter == 0:
            continue
        circularity = 4 * np.pi * area / (perimeter ** 2)
        if circularity > 0.5:  # Roughly circular = likely the ⊗ mark
            x, y, w, h = cv2.boundingRect(c)
            crosses.append({"x": int(x), "y": int(y), "width": int(w), "height": int(h)})
    
    return crosses

def detect_annotations(processed_dir):
    page_files = sorted([
        f for f in os.listdir(processed_dir)
        if f.startswith("page_") and f.endswith(".png")
    ])

    all_pages = []
    all_question_codes = []
    total_annotations = 0

    for page_file in page_files:
        page_num = int(page_file.replace("page_", "").replace(".png", ""))
        image_path = os.path.join(processed_dir, page_file)
        img = cv2.imread(image_path)
        
        if img is None:
            continue

        green_boxes = detect_colored_rectangles(img, "green")
        red_boxes   = detect_colored_rectangles(img, "red")
        blue_boxes  = detect_colored_rectangles(img, "blue")
        has_repeat  = detect_repeat_stamp(img)
        wrong_crosses = detect_wrong_cross(img)

        # Check arithmetic: blue box total vs sum of green/red for same question
        arithmetic_errors = []
        for blue in blue_boxes:
            if blue.get("question_code") and blue.get("total") is not None and blue.get("computed_sum") is not None:
                if abs(blue["total"] - blue["computed_sum"]) > 0.1:
                    arithmetic_errors.append({
                        "question_code": blue["question_code"],
                        "recorded_total": blue["total"],
                        "computed_total": blue["computed_sum"]
                    })

        all_annotations = green_boxes + red_boxes
        all_zeros = len(all_annotations) > 0 and all(
            (b.get("mark") or 0) == 0 for b in all_annotations
        )

        # Collect question codes for the paper
        for box in all_annotations:
            if box.get("question_code"):
                all_question_codes.append(box["question_code"])

        total_annotations += len(all_annotations)

        all_pages.append({
            "page_number": page_num,
            "image_path": image_path,
            "annotations": all_annotations,
            "green_boxes": green_boxes,
            "red_boxes": red_boxes,
            "blue_boxes": blue_boxes,
            "has_repeat_stamp": has_repeat,
            "wrong_crosses": wrong_crosses,
            "all_zeros": all_zeros,
            "arithmetic_errors": arithmetic_errors
        })

    print(json.dumps({
        "pages": all_pages,
        "total_annotations": total_annotations,
        "all_question_codes": list(set(all_question_codes))
    }))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: detect_annotations.py <processed_dir>"}))
        sys.exit(1)
    
    detect_annotations(sys.argv[1])
