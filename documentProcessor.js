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
    return {"result":containsHeaderKeyword, "priority": 1};
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
    return {"result":containsHeaderKeyword && !isNumber, "priority": 1};
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
    return {
        "result":containsHeaderKeyword && !isNumber["result"],
        "priority": 1
    };
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
// CAD header detection
function isCADHeader(item) {
    const text = item.text
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // 前后有其它文字没关系
    if (/\bGRAND\s+TOTAL\b/.test(text)) {
        console.log(
            "Checking if item is CAD header:",
            text,
            "Result:",
            true,
            "item:",
            item
        );
        return {
            "result": true,
            "priority": 3
        };
    }

    if (/\bTOTAL\s+DUE\b/.test(text)) {
        console.log(
            "Checking if item is CAD header:",
            text,
            "Result:",
            true,
            "item:",
            item
        );
        return {
            "result": true,
            "priority": 2
        };
    }

    // 避免 SUBTOTAL / SUB TOTAL
    if (
        /\bTOTAL\b/.test(text) &&
        !/\bSUB\s*TOTAL\b/.test(text)
    ) {
        console.log(
            "Checking if item is CAD header:",
            text,
            "Result:",
            true,
            "item:",
            item
        );
        return {
            "result": true,
            "priority": 1
        };
    }

    return {
        "result": false,
        "priority": 0
    };
}
function normalizeCAD(text){
    const raw = text.trim();

    const match = raw.match(
        /(?:CAD\s*)?\$?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/i
    );

    if (!match) {
        return null;
    }

    const dollars = match[1].replace(/,/g, "");
    const cents = (match[2] ?? "00").padEnd(2, "0");

    return `${dollars}.${cents}`;
}
function isCADNumber(item){
    console.log("Checking if item is CAD number:", item.text, "Result:", normalizeCAD(item.text) !== null, "item: ", item);
    return {
        "result": normalizeCAD(item.text) !== null,
        "priority": 1
    };
}

// LFD Header Detection
function isLFDHeader(item){
    const text = item.text
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // Explicit / strong LFD wording
    if (
        /\bLFD\b/.test(text) ||
        text.includes("LAST FREE DAY") ||
        text.includes("LAST FREE DATE") ||
        text.includes("WAREHOUSE IS FREE UNTIL") ||
        text.includes("FREE STORAGE UNTIL") ||
        text.includes("STORAGE FREE UNTIL")
    ) {
        return {
            result: true,
            priority: 3
        };
    }

    // Charge-start wording
    if (
        text.includes("STORAGE CHARGE START DATE") ||
        text.includes("STORAGE CHARGES COMMENCE") ||
        text.includes("STORAGE CHARGES START") ||
        text.includes("STORAGE CHARGES BEGIN")
    ) {
        return {
            result: true,
            priority: 2
        };
    }

    return {
        result: false,
        priority: 0
    };
}
// LFD/ANDate Value
const MONTH_ABBR = {
    JAN: 1,
    FEB: 2,
    MAR: 3,
    APR: 4,
    MAY: 5,
    JUN: 6,
    JUL: 7,
    AUG: 8,
    SEP: 9,
    SEPT: 9,
    OCT: 10,
    NOV: 11,
    DEC: 12
};

const MONTH_FULL = {
    JANUARY: 1,
    FEBRUARY: 2,
    MARCH: 3,
    APRIL: 4,
    MAY: 5,
    JUNE: 6,
    JULY: 7,
    AUGUST: 8,
    SEPTEMBER: 9,
    OCTOBER: 10,
    NOVEMBER: 11,
    DECEMBER: 12
};
function getEnglishMonth(part) {
    const text = part.toUpperCase();
    if (MONTH_ABBR[text]) {
        return MONTH_ABBR[text];
    }
    if (MONTH_FULL[text]) {
        return MONTH_FULL[text];
    }
    return null;
}
function getNearbyYear(part) {
    if (part.length !== 2) {
        return null;
    }
    const number = Number(part);
    const currentYear = new Date().getFullYear();
    const nearbyYears = [
        currentYear - 1,
        currentYear,
        currentYear + 1
    ];
    for (const year of nearbyYears) {
        if (year % 100 === number) {
            return year;
        }
    }
    return null;
}
function decideMonthAndDay(partA, partB) {
    const a = Number(partA);
    const b = Number(partB);
    // A 不可能是月份
    if (a > 12 && b <= 12) {
        return {
            month: b,
            day: a
        };
    }
    // B 不可能是月份
    if (b > 12 && a <= 12) {
        return {
            month: a,
            day: b
        };
    }
    // 两个都不可能是月份
    if (a > 12 && b > 12) {
        return null;
    }
    // 两个都可能是月份
    const currentMonth =
        new Date().getMonth() + 1;
    const aDistance =
        Math.abs(a - currentMonth);
    const bDistance =
        Math.abs(b - currentMonth);
    if (aDistance <= bDistance) {
        return {
            month: a,
            day: b
        };
    }
    return {
        month: b,
        day: a
    };
}
function getDateParts(text) {
    // 12-Aug-2026
    // 2026-Aug-12
    let match = text.match(
        /(\d{1,4})\s*[-./\s]\s*([A-Za-z]+)\s*[-./\s]\s*(\d{1,4})/
    );
    if (match) {
        return [
            match[1],
            match[2],
            match[3]
        ];
    }
    // Aug-12-2026
    // Aug 12 2026
    match = text.match(
        /([A-Za-z]+)\s*[-./\s]\s*(\d{1,2})\s*[-.,/\s]\s*(\d{2,4})/
    );
    if (match) {
        return [
            match[1],
            match[2],
            match[3]
        ];
    }
    // 13.08.2026
    // 8/15/2026
    // 08-12-26
    match = text.match(
        /(\d{1,4})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{1,4})/
    );
    if (match) {
        return [
            match[1],
            match[2],
            match[3]
        ];
    }
    return null;
}
function parseEnglishMonthDate(part1, part2, part3) {
    const parts = [part1, part2, part3];
    let month = null;
    let monthIndex = null;
    // 先找英文月份
    for (let i = 0; i < parts.length; i++) {
        const foundMonth =
            getEnglishMonth(parts[i]);
        if (foundMonth !== null) {
            month = foundMonth;
            monthIndex = i;
            break;
        }
    }
    if (month === null) {
        return null;
    }
    // 剩下两个
    const remaining = parts
        .map((value, index) => ({
            value,
            index
        }))
        .filter(part =>
            part.index !== monthIndex
        );
    let year = null;
    let day = null;
    // 有没有 4 位年份
    const fourDigitYear =
        remaining.find(part =>
            part.value.length === 4
        );
    if (fourDigitYear) {
        year = Number(fourDigitYear.value);
        const dayPart =
            remaining.find(part =>
                part !== fourDigitYear
            );
        day = Number(dayPart.value);
    }
    else {
        // 都是两位数：
        // 看哪个像今年 ±1
        const yearPart =
            remaining.find(part =>
                getNearbyYear(part.value) !== null
            );
        if (!yearPart) {
            return null;
        }
        year =
            getNearbyYear(yearPart.value);
        const dayPart =
            remaining.find(part =>
                part !== yearPart
            );
        day = Number(dayPart.value);
    }
    return {
        year,
        month,
        day
    };
}
function parseNumericDate(part1, part2, part3) {
    const parts = [part1, part2, part3];
    let year = null;
    let yearIndex = null;
    // 先找四位年份
    for (let i = 0; i < parts.length; i++) {
        if (parts[i].length === 4) {
            year = Number(parts[i]);
            yearIndex = i;
            break;
        }
    }
    // 没有四位年份
    // 就找是否有今年 ±1 的两位年份
    if (year === null) {
        for (let i = 0; i < parts.length; i++) {
            const nearbyYear =
                getNearbyYear(parts[i]);

            if (nearbyYear !== null) {
                year = nearbyYear;
                yearIndex = i;
                break;
            }
        }
    }
    // 年份还是无法确定
    if (year === null) {
        return null;
    }
    // 剩下两个就是 month / day
    const remaining =
        parts.filter(
            (_, index) =>
                index !== yearIndex
        );
    const monthDay =
        decideMonthAndDay(
            remaining[0],
            remaining[1]
        );
    if (!monthDay) {
        return null;
    }
    return {
        year,
        month: monthDay.month,
        day: monthDay.day
    };
}
function getTime(text) {
    const match = text.match(
        /(\d{1,2}):(\d{2})\s*(AM|PM)?/i
    );

    if (!match) {
        return null;
    }

    let hour = Number(match[1]);
    const minute = Number(match[2]);

    const ampm =
        match[3]?.toUpperCase();

    if (ampm === "PM" && hour < 12) {
        hour += 12;
    }

    if (ampm === "AM" && hour === 12) {
        hour = 0;
    }

    return {
        hour,
        minute
    };
}
function parseDateTime(text){
    const parts = getDateParts(text);
    if (!parts) {
        return null;
    }
    const part1 = parts[0];
    const part2 = parts[1];
    const part3 = parts[2];
    // 看三个部分有没有英文月份
    const hasEnglishMonth =
        getEnglishMonth(part1) !== null ||
        getEnglishMonth(part2) !== null ||
        getEnglishMonth(part3) !== null;
    let date;
    if (hasEnglishMonth) {
        date = parseEnglishMonthDate(
            part1,
            part2,
            part3
        );
    }
    else {
        date = parseNumericDate(
            part1,
            part2,
            part3
        );
    }
    if (!date) {
        return null;
    }
    const time = getTime(text);
    return {
        year: date.year,
        month: date.month,
        day: date.day,
        hour: time?.hour ?? null,
        minute: time?.minute ?? null
    };
}
export function pad2(number) {
    return String(number).padStart(2, "0");
}
function normalizeDate(text){
    const parsed = parseDateTime(text);
    if (!parsed) {
        return null;
    }
    return (
        `${parsed.year}-` +
        `${pad2(parsed.month)}-` +
        `${pad2(parsed.day)}`
    );
}
function isDate(item){
    const parsed = parseDateTime(item.text);
    return {
        result: parsed !== null,
        priority: 1
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
function findByGeo(items, headerPredicate, valuePredicate, valueNormalizer, strictGeometry=false) {
    let headers = items.filter(headerPredicate["result"] ? headerPredicate : (item) => headerPredicate(item)["result"]);
    const sortedHeaders = headers.sort((a, b) => {
        const aPriority = headerPredicate(a)["priority"];
        const bPriority = headerPredicate(b)["priority"];
        return bPriority - aPriority;
    });
    let values = items.filter(valuePredicate["result"] ? valuePredicate : (item) => valuePredicate(item)["result"]);
    const sortedValues = values.sort((a, b) => {
        const aPriority = valuePredicate(a)["priority"];
        const bPriority = valuePredicate(b)["priority"];
        return bPriority - aPriority; // Sort in descending order of priority
    });
    

    let allSamePageValues = [];
    let headers_record = [];
    let allValues = [];
    for (const header of sortedHeaders) {
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
        const bottomValues = samePageValues.filter(value =>
            horizontallyOverlaps(header, value) &&
            value.y < header.y
        );

        const rightBottomValues = [...rightValues, ...bottomValues];
        rightBottomValues.sort(
            (a, b) =>
                getDistance(header, a) -
                getDistance(header, b)
        );
        const closestValue = rightBottomValues[0];
        if (closestValue) {
            allValues.push(closestValue);
            headers_record.push(header)
        }
    }
    if (allValues.length > 0) {
        const pickedHeader = headers_record[headers_record.length - 1].text
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        const pickedValue = allValues[allValues.length - 1];
        let normalizedValue = valueNormalizer(pickedValue.text);
        if (pickedHeader.includes("STORAGE CHARGE START DATE") ||
            pickedHeader.includes("STORAGE CHARGES COMMENCE") ||
            pickedHeader.includes("STORAGE CHARGES START") ||
            pickedHeader.includes("STORAGE CHARGES BEGIN")
        ){
            console.log("special: day - 1", normalizedValue)
            const [year, month, day] =
                normalizedValue.split("-").map(Number);
            const date =
                new Date(year, month - 1, day);
            date.setDate(date.getDate() - 1);
            normalizedValue = `${date.getFullYear()}-` +
                `${pad2(date.getMonth() + 1)}-` +
                `${pad2(date.getDate())}`;
            console.log("special: day -1 end", normalizedValue);
        }
        console.log("Found Values:", normalizedValue);
        return normalizedValue;
    }
    else if (strictGeometry){return null;}
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
    const CAD = findByGeo(textItems, isCADHeader, isCADNumber, normalizeCAD);
    const LFD = findByGeo(textItems, isLFDHeader, isDate, normalizeDate, true);
    return {
        "AWB": awb,
        "pcs": pcs,
        "skids": skids,
        "CAD": CAD,
        "LFD": LFD
    };
}
