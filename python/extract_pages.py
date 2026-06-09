#!/usr/bin/env python3
"""
extract_pages.py
Renders each page of a PDF as a high-resolution PNG image.
Usage: python3 extract_pages.py <pdf_path> <output_dir>
Output: JSON with total_pages and list of page image paths
"""

import sys
import json
import os
import fitz  # PyMuPDF

def extract_pages(pdf_path, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    page_files = []

    for page_num in range(total_pages):
        page = doc[page_num]
        
        # Render at 2x zoom for better OCR accuracy
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat)
        
        output_path = os.path.join(output_dir, f"page_{page_num + 1:03d}.png")
        pix.save(output_path)
        page_files.append(output_path)

    doc.close()

    result = {
        "total_pages": total_pages,
        "page_files": page_files,
        "output_dir": output_dir
    }
    print(json.dumps(result))

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: extract_pages.py <pdf_path> <output_dir>"}))
        sys.exit(1)
    
    extract_pages(sys.argv[1], sys.argv[2])
