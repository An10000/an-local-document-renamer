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
            console.log(`Page ${pageNumber}:`, item.str, "at", item.transform[4], item.transform[5]);
        }
    }

    return items;
}

function NormalizeText(item) {
    return item.text.trim().toUpperCase();
}
// Awb header detection
function isAwbHeader(item) {
    const text = NormalizeText(item);
    const AWB_HEADERS = [
        "AWB",
        "MAWB",
        "AIRWAYBILLNO",
        "AIRWAYBILLNUMBER",
        "AIRWAYBILLNO.",
        "AIR WAYBILL NO."
    ];
    const containsHeaderKeyword =
        AWB_HEADERS.some(keyword =>
            text.includes(keyword)
        );
    console.log("Checking if item is AWB header:", text, "Result:", containsHeaderKeyword);
    return containsHeaderKeyword;
}
// AWB number detection
function normalizeAwb(text) {
    const raw = text.trim();
    const match = raw.match(
        /(?<!\d)(\d{3})[\s\-‐-‒–—−*]*(\d{8})(?!\d)/
    );
    if (!match) {
        return null;
    }
    return match[1] + "-" + match[2];
}
function isAwbNumber(item) {
    return {
        "result":normalizeAwb(item.text) !== null,
        "priority": 1
    };
}

// PCS header detection
function isPcsHeader(item) {
    const text = NormalizeText(item);
    const PCS_HEADERS = [
        "PCS",
        "PIECES",
        "PCS ACTUAL"
    ];
    const containsHeaderKeyword =
        PCS_HEADERS.some(keyword =>
            text.includes(keyword)
        );
    const isNumber = isPcsNumber(item)["result"];
    console.log("Checking if item is PCS header:", text, "Result:", containsHeaderKeyword && !isNumber);
    return containsHeaderKeyword && !isNumber;
}
// pcs number detection
function normalizePcs(text) {
    const raw = text.trim();
    const pcsMatch = raw.match(/(\d+)\s*PCS/i);
    if (pcsMatch) {
        return pcsMatch[1];
    }
    if (/^\d+$/.test(raw)) {
        return raw;
    }
    return null;
}
function isPcsNumber(item) {
    const raw = item.text.trim();
    if (/\d+\s*PCS/i.test(raw)) {
        console.log("Checking if item is PCS number:", raw, "Result:", /\d+\s*PCS/i.test(raw));
        return {
            "result": true,
            "priority": 2
        };
    }
    else if (/^\d+$/.test(raw)) {
        console.log("Checking if item is PCS number:", raw, "Result:", /^\d+$/.test(raw));
        return {
            "result": true,
            "priority": 1
        };
    }
    console.log("Checking if item is PCS number:", raw, "Result:", false);
    return {
        "result": false,
        "priority": 1
    };
}

// SKID header detection
function isSkidHeader(item) {
    const text = NormalizeText(item);
    const SKID_HEADERS = [
        "SKID",
        "SKIDS",
        "SKIDCOUNT",
        "SKIDEXCHANGE",
        "SKID COUNT",
        "SKID EXCHANGE"
    ];
    const containsHeaderKeyword =
        SKID_HEADERS.some(keyword =>
            text.includes(keyword)
        );
    const isNumber = isSkidNumber(item);
    console.log(
        "Checking if item is SKID header:",
        text,
        "Result:",
        containsHeaderKeyword && !isNumber["result"],
        "item:",
        item
    );
    return containsHeaderKeyword && !isNumber["result"];
}
// SKID value detection
function normalizeSkid(text) {
    const raw = text.trim();
    // Prefer a number explicitly associated with SKID/SKIDS
    const skidMatch = raw.match(/(\d+)\s*SKIDS?/i);
    if (skidMatch) {
        return skidMatch[1];
    }
    // Otherwise accept a pure number
    if (/^\d+$/.test(raw)) {
        return raw;
    }
    return null;
}
function isSkidNumber(item) {
    const raw = item.text.trim();
    if (/\d+\s*SKIDS?/i.test(raw)) {
        console.log("Checking if item is SKID number:", raw, "Result:", /\d+\s*SKIDS?/i.test(raw), "item: ", item);
        return {
            "result": true,
            "priority": 2
        };
    }
    else if (/^\d+$/.test(raw)) {
        console.log("Checking if item is SKID number:", raw, "Result:", /^\d+$/.test(raw), "item: ", item);
        return {
            "result": true,
            "priority": 1
        };
    }
    console.log("Checking if item is SKID number:", raw, "Result:", false, "item: ", item);
    return {
        "result": false,
        "priority": 1
    };
}


// function to find by geometry
// horizontal find helper:
function horizontallyOverlaps(a, b) {
    const aLeft = a.x;
    const aRight = a.x + a.width;

    const bLeft = b.x;
    const bRight = b.x + b.width;

    return aLeft <= bRight && bLeft <= aRight;
}
// vertical find helper:
function verticallyOverlaps(a, b) {
    const aTop = a.y;
    const aBottom = a.y + a.height;

    const bTop = b.y;
    const bBottom = b.y + b.height;

    return aTop <= bBottom && bTop <= aBottom;
}
// distance helper: 
function getDistance(header, value) {
    const headerRight = header.x + header.width;
    const valueRight = value.x + value.width;

    let dx = 0;

    if (value.x > headerRight) {
        dx = value.x - headerRight;
    } else if (header.x > valueRight) {
        dx = header.x - valueRight;
    }

    const dy = Math.abs(value.y - header.y);

    return dx + dy;
}
function findByGeo(items, headerPredicate, valuePredicate, valueNormalizer) {
    const headers = items.filter(headerPredicate);
    let values = items.filter(valuePredicate["result"] ? valuePredicate : (item) => valuePredicate(item)["result"]);
    const sortedValues = values.sort((a, b) => {
        const aPriority = valuePredicate(a)["priority"];
        const bPriority = valuePredicate(b)["priority"];
        return bPriority - aPriority; // Sort in descending order of priority
    });
    

    let allSamePageValues = [];
    let allValues = [];
    for (const header of headers) {
        const samePageValues = sortedValues.filter(value =>
            value.page === header.page
        );
        allSamePageValues.push(...samePageValues);
        const yTolerance = header.height;   // 同行允许一点误差
        const xTolerance = 30;              // 同列允许一点左右偏差

        const maxHorizontalDistance = 150;
        const maxVerticalDistance = 100;

        // right
        const rightValues = samePageValues.filter(value =>
            verticallyOverlaps(header, value) &&
            value.x > header.x + header.width
        );
        // bottom
        const bottomValues = samePageValues.filter(value => {
            const verticalGap =
                header.y - value.y;
            return (
                Math.abs(value.x - header.x) <= xTolerance &&
                verticalGap > 0 &&
                verticalGap <= maxVerticalDistance
            );
        });

        const rightBottomValues = [...rightValues, ...bottomValues];
        rightBottomValues.sort(
            (a, b) =>
                getDistance(header, a) -
                getDistance(header, b)
        );
        const closestValue = rightBottomValues[0];
        if (closestValue) {
            allValues.push(closestValue);
        }
    }
    if (allValues.length > 0) {
        const pickedValue = allValues[0];
        const normalizedValue = valueNormalizer(pickedValue.text);
        console.log("Found Values:", normalizedValue);
        return normalizedValue;
    }
    else if (allSamePageValues.length > 0) {
        // if no right/bottom values, pick the first one on the same page
        const pickedValue = allSamePageValues[0];
        const normalizedValue = valueNormalizer(pickedValue.text);
        console.log("Warning: No right/bottom values found for header, using first same-page value:", normalizedValue);
        return normalizedValue;
    }
    else if (sortedValues.length > 0) {
        // if no values on the same page, pick the first one from all pages
        const pickedValue = sortedValues[0];
        const normalizedValue = valueNormalizer(pickedValue.text);
        console.log("Warning: No header found, using first candidate:", normalizedValue);
        return normalizedValue;
    }
    return null;
}


export async function extractFieldsFromPDF(file) {
    // TODO: PDF -> text
    const textItems = await extractTextItemsFromPDF(file);
    const awb = findByGeo(textItems, isAwbHeader, isAwbNumber, normalizeAwb);
    const pcs = findByGeo(textItems, isPcsHeader, isPcsNumber, normalizePcs);
    const skids = findByGeo(textItems, isSkidHeader, isSkidNumber, normalizeSkid);
    return {
        "AWB": awb,
        "pcs": pcs,
        "skids": skids
    };
}
