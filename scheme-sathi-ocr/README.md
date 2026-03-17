# 🇮🇳 Scheme Sathi — Aadhaar OCR Auto-Fill Module

**HackNova 3 | Jaya Engineering College**
**Team: Moulitha C, Jothika J, Dilli Basker M, Mohan B**

---

## What This Does

Uploads an Aadhaar / Voter ID image → Tesseract.js reads the text →
Extracts Name, DOB, Gender, Aadhaar Number, Address, Pincode →
Auto-fills a welfare scheme application form.

**100% runs in your browser. Your Aadhaar data never leaves your device.**

---

## Project Files

```
scheme-sathi-ocr/
├── index.html   ← Main page (UI layout)
├── style.css    ← India-themed styling (saffron + green)
├── app.js       ← All OCR logic, field extraction, form fill
└── README.md    ← This file
```

---

## How to Run in VS Code

### Step 1 — Extract ZIP
- Right-click `scheme-sathi-ocr.zip` → Extract All
- You get a folder: `scheme-sathi-ocr`

### Step 2 — Open in VS Code
- Open VS Code
- File → Open Folder → select `scheme-sathi-ocr`

### Step 3 — Install Live Server (only once)
- Click Extensions icon (left sidebar — 4 squares)
- Search: `Live Server`
- Install (by Ritwick Dey)

### Step 4 — Run
- Right-click `index.html` in Explorer panel
- Click **Open with Live Server**
- Browser opens at `http://127.0.0.1:5500`

### Step 5 — Test It
- Select "Aadhaar Card" or "Voter ID"
- Upload any ID card image (or a sample image with text)
- Click "Extract Data from ID"
- Watch it extract Name, DOB, Address automatically
- The form fills itself — edit if needed — click Submit

---

## What Gets Extracted

| Field | Example Output |
|-------|---------------|
| Name | LAVANYA V |
| Date of Birth | 12/08/2004 |
| Gender | Female |
| Aadhaar | 1234 5678 9012 |
| Address | Chennai, Tamil Nadu |
| Pincode | 600001 |
| State | Tamil Nadu (auto from pincode) |
| Voter ID | ABC1234567 |

---

## Languages Supported

Tesseract is configured for: **English + Hindi + Tamil + Telugu**

---

## Data Storage (Privacy)

| Step | Where |
|------|-------|
| Image selected | Browser RAM only |
| OCR runs | Local — no server |
| Text extracted | JS variable in RAM |
| Form filled | HTML inputs in RAM |
| Download JSON | Your device (hard disk) |
| Tab closed | Everything wiped |

---

## No Installation Required

Zero npm install. Tesseract.js loads from CDN automatically.
Just need: VS Code + Live Server extension + Chrome/Firefox.
