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
- PCS
- Skid count
- CAD amount
- LFD
- AN Date
- Storage Period

Some fields can also be derived from other document information when a direct value is unavailable.

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
