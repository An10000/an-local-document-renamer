import * as pdfjsLib from "./lib/pdfjs/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "./lib/pdfjs/pdf.worker.mjs";

export async function extractTextFromPDF(file) {
    // TODO: PDF -> text

    const data = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({
        data: data
    });

    const pdf = await loadingTask.promise;

    console.log("PDF pages:", pdf.numPages);
    return "pcs: 15";
}


export async function extractFieldsFromText(text) {
    // TODO: text -> extracted fields
    const jsonData = {
        "pcs": 15,
        "AWB": "123-456-789",
        "parts": "Yes",
        "skids": 3,
        "CAD": 20,
        "LFD": "2026-11-11",
        "AN_Date": "2026-11-12",
        "Storage_period": 30
    }
    return jsonData;
}
