# Inkless — CBSE OSM Audit Platform

Independent verification and audit layer for CBSE's OSM digital evaluation system.

---

## Project Structure

```
inkless/
├── frontend/     Next.js + React + TailwindCSS + Shadcn UI
├── backend/      Node.js + Express + MongoDB + Mongoose
└── python/       OpenCV + Tesseract + PyMuPDF detection scripts
```

---

## Prerequisites

- Node.js 18+
- Python 3.9+
- MongoDB (running locally on port 27017)
- Tesseract OCR installed on system

### Install Tesseract

**Ubuntu/Debian:**
```bash
sudo apt install tesseract-ocr
```

**macOS:**
```bash
brew install tesseract
```

**Windows:**
Download installer from: https://github.com/UB-Mannheim/tesseract/wiki

---

## Setup

### 1. Python environment

```bash
cd python
pip install -r requirements.txt
```

Test it works:
```bash
python3 detect_blur.py
# Should print: {"error": "Usage: detect_blur.py <processed_dir>"}
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY
npm run dev
```

Backend runs on: http://localhost:5000

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: http://localhost:3000

---

## Environment Variables

### backend/.env

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/inkless
ANTHROPIC_API_KEY=sk-ant-...your key here...
UPLOADS_DIR=./uploads
PROCESSED_DIR=./processed
```

---

## How It Works

1. Student uploads evaluated answer sheet PDF (the one with OSM marks)
2. Backend saves file, creates paper record in MongoDB, starts pipeline
3. Python scripts run in sequence:
   - `extract_pages.py` — renders each PDF page as PNG
   - `detect_blur.py` — Laplacian variance blur score per page
   - `detect_annotations.py` — detects green/red/blue OSM annotation boxes
   - `detect_content.py` — detects student ink + OCR per page
4. Node cross-references all signals, writes issues to MongoDB
5. Trust score calculated from weighted issue deductions
6. Claude API generates natural language re-evaluation recommendation
7. SHA-256 hash chain records every event as tamper-evident audit trail
8. Frontend polls for status, renders dashboard with viewer + audit trail

---

## OSM Annotation Format (CBSE 2026)

| Box Color | Meaning | Format |
|-----------|---------|--------|
| Green | Marks awarded | `1 30a_iORS1` |
| Red | Zero marks | `0 34_ivaORS1` |
| Blue | Sub-total | `30a_i : 0.5 + 0 = 0.5` |
| Purple | REPEAT ANS+ stamp | disqualified answer |
| Red ⊗ | Wrong answer cross | wrong mark |

Question code format: `30a_iORS1`
- `30` = Question number
- `a`  = Part
- `_i` = Sub-part
- `ORS` = Optional/alternate (if applicable)
- `S1` = Set number

---

## Detection Modules

| Module | What It Detects | Tech |
|--------|----------------|------|
| Blur detector | Pages too blurry for fair evaluation | OpenCV Laplacian |
| Annotation detector | All evaluator marks + question codes | OpenCV HSV + Tesseract |
| Content detector | Student writing presence | Pixel density + OCR |
| Cross-reference engine | Content vs marks mismatch | Pure Python logic |
| Trust score | Weighted issue scoring | Pure math |
| AI advisor | Natural language recommendation | Claude API |
| Audit trail | Tamper-evident event log | SHA-256 chain |

---

## Issue Types

| Type | Severity | Description |
|------|----------|-------------|
| `unevaluated_page` | Critical | Page has student content, zero evaluator annotations |
| `blur_penalized` | Critical | Blurred page received zero marks |
| `missing_page` | Critical | Gap in page number sequence |
| `supplement_missing` | Critical | PTO marker found, supplement not attached |
| `wrong_sheet` | Critical | Roll number mismatch on cover page |
| `anomalous_zero` | High | Substantial content, zero marks |
| `arithmetic_error` | High | Blue box total ≠ sum of sub-marks |
| `repeat_stamp` | High | REPEAT ANS+ stamp detected |
| `mark_mismatch` | High | Detected mark ≠ recorded mark |

---

## Demo Setup

To prepare a reliable demo PDF:

1. Take any CBSE answer sheet sample
2. Ensure at least one page has visible student content but no green/red annotation box
3. Ensure at least one page is noticeably blurred with a red zero box
4. Run through Inkless — output should show Trust Score < 70 with critical issues

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, React 18, TypeScript, TailwindCSS |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB |
| CV | OpenCV, PyMuPDF |
| OCR | Tesseract |
| AI | Claude API (claude-haiku-4-5) |
| Audit | SHA-256 hash chaining |
| Viewer | React-Konva canvas |
