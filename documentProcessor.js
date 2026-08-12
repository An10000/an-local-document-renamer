import * as pdfjsLib from "./lib/pdfjs/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "./lib/pdfjs/pdf.worker.mjs";

export async function extractTextItemsFromPDF(file) {
    const data = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({
        data: data
    });

    const pdf = await loadingTask.promise;

    const items = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);

        const textContent = await page.getTextContent();

        for (const item of textContent.items) {
            if (!("str" in item)) {
                continue;
            }

            items.push({
                page: pageNumber,
                text: item.str,

                x: item.transform[4],
                y: item.transform[5],

                width: item.width,
                height: item.height,

                hasEOL: item.hasEOL
            });
        }
    }

    return items;
}
function isAwbHeader(item) {
    const text = item.text.trim().toUpperCase();

    return text === "AWB" || text === "MAWB" || text === "Air Waybill No. " || text === "Air Waybill Number";
}
function normalizeAwb(text) {
    const raw = text.trim();

    if (!/^[\d\s\-‐-‒–—−*]+$/.test(raw)) {
        return null;
    }

    const digits = raw.replace(/[\s\-‐-‒–—−*]/g, "");

    if (!/^\d{11}$/.test(digits)) {
        return null;
    }

    return digits.slice(0, 3) + "-" + digits.slice(3);
}
function isAwbNumber(text) {
    const normalized_text = normalizeAwb(text);
    return normalized_text !== null && /^\d{3}-\d{8}$/.test(normalized_text);
}
function findAwb(items) {
    const headers = items.filter(isAwbHeader);

    const values = items.filter(item =>
        isAwbNumber(item.text)
    );
    let samePageValues = [];
    for (const header of headers) {
        samePageValues = values.filter(value =>
            value.page === header.page
        );

        console.log("Header:", header);
        console.log("Candidates:", samePageValues);
    }
    if (samePageValues.length > 0) {
        const awbValue = samePageValues[0].text;
        const normalizedAwb = normalizeAwb(awbValue);
        console.log("Found AWB:", normalizedAwb);
        return normalizedAwb;
    }
    else {
        const awbValue = values[0].text;
        const normalizedAwb = normalizeAwb(awbValue);
        console.log("Warning: No AWB header found, using first candidate:", normalizedAwb);
        return normalizedAwb;
    }
}

export async function extractFieldsFromPDF(file) {
    // TODO: PDF -> text
    const textItems = await extractTextItemsFromPDF(file);
    const awb = findAwb(textItems);
    return {
        "AWB": awb
    };
}
