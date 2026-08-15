# an-local-document-renamer

A browser-based tool for extracting key information from PDF logistics Arrival Notice documents and generating standardized filenames.

The application runs locally in the browser. PDF files are processed on the user's device and are not uploaded to a server.

## Features

- Drag and drop or select a PDF file
- Preview the PDF directly in the browser
- Extract text and layout information using PDF.js
- Detect document fields using text patterns and geometric relationships
- Allow extracted values to be reviewed and edited manually
- Generate a standardized filename
- Copy the generated filename to the clipboard
- Reset the page for processing the next document

Currently supported fields include:

- AWB / MAWB
- Pieces count
- Skid count
- Total CAD amount
- LFD
- AN Date
- Storage Period

LFD can also be derived from ANdate and storage period when a direct value is unavailable.

## How It Works

The document processing pipeline is:

```text
PDF
 ↓
PDF.js text extraction
 ↓
Positioned text items
 ↓
Header and value detection
 ↓
Geometry-based matching
 ↓
Value normalization
 ↓
Structured fields
 ↓
Generated filename
```
Instead of relying only on text order, the application also uses PDF coordinates to associate headers with nearby values.

For example:
```text
SKID EXCHANGE        6
```

The tool identifies SKID EXCHANGE as the field header and selects the nearby 6 as its value.

## Date Handling

Several date formats are supported, including examples such as:

12-Aug-2026 11:16
13.08.2026 / 23:59
8/15/2026

Dates are normalized into the browser-compatible format:

```text
YYYY-MM-DD
```

LFD may be read directly from the document or derived from AN Date and Storage Period when appropriate.

## Privacy

Document processing is performed locally in the browser.

The application does not require a backend server and does not intentionally upload selected PDF files anywhere.

Because this project is hosted as a static web application, the host only serves the HTML, CSS, JavaScript, and PDF.js files required to run the tool.

Technology
```text
HTML
CSS
Vanilla JavaScript
PDF.js
GitHub Pages
```

No frontend framework or build system is required.
```text
Project Structure
an-local-document-renamer/
├── index.html
├── style.css
├── main.js
├── documentProcessor.js
├── lib/
│   └── pdfjs/
│       ├── pdf.mjs
│       └── pdf.worker.mjs
├── package.json
├── package-lock.json
└── README.md
```
## How to Use

The project is hosted online using GitHub Pages. You can access the application here:

[Open Local Document Renamer](https://an10000.github.io/an-local-document-renamer/)

The application runs directly in the browser and requires a modern browser with HTML5 and JavaScript support, such as Google Chrome, Mozilla Firefox, or Microsoft Edge.

No installation is required.
## Local Development

Clone the repository and serve the project with a local HTTP server.

For example, using Python:
```code
python -m http.server 8000
```

Then open:
```link
http://localhost:8000
```
Using a local server is recommended because the project uses JavaScript ES modules.

## Use of PDF.js

PDF.js is used for extracting text and positional information from PDF documents.

The browser's built-in PDF viewer is used separately for document preview.

This allows the application to keep the preview simple while using PDF.js for document analysis.

## Current Limitations
- Designed primarily for digitally generated PDFs
- Scanned/image-only PDFs are not currently OCR processed
- PDF layouts vary, so some document formats may require additional detection rules
- Ambiguous fields may require manual review
- Field extraction is currently rule-based rather than semantic/AI-based

## Future Improvements
Possible future improvements include:

- OCR fallback for scanned documents
- Improved table and layout recognition
- Confidence scoring for extracted fields
- Additional document formats and field types
- Semantic document understanding
- Optional AI-assisted extraction for difficult documents
## License
This project is currently intended for personal/internal use.
