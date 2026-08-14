import {
    extractFieldsFromPDF,
    pad2
} from "./documentProcessor.js";
// left panel logic
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const pdfViewer = document.getElementById("pdf-viewer");

dropZone.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];

    if (file) {
        openPDF(file);
    }
});

dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
});
dropZone.addEventListener("drop", (event) => {
    event.preventDefault();

    const file = event.dataTransfer.files[0];

    if (file) {
        openPDF(file);
    }
});

function openPDF(file) {
    if (file.type !== "application/pdf") {
        alert("Please select a PDF file.");
        return;
    }

    const pdfURL = URL.createObjectURL(file);

    pdfViewer.src = pdfURL;

    dropZone.style.display = "none";
    pdfViewer.style.display = "block";

    // Extract text from the PDF and then extract fields from the text
    extractFieldsFromPDF(file)
        .then((fields) => {
            // Display the extracted fields in the right panel
            const awbInput = document.getElementById("awb-input");
            awbInput.value = `${fields.AWB}`;
            const pcsInput = document.getElementById("pcs-input");
            pcsInput.value = `${fields.pcs}`;
            if (fields.parts === "Yes") {
                document.querySelector('input[name="parts"][value="yes"]').checked = true;
            }
            else {
                document.querySelector('input[name="parts"][value="no"]').checked = true;
            }
            const skidsInput = document.getElementById("skids-input");
            skidsInput.value = `${fields.skids}`;
            const cadInput = document.getElementById("cad-input");
            cadInput.value = `${fields.CAD}`;
            const lfdInput = document.getElementById("lfd-input");
            lfdInput.value = `${fields.LFD}`;
            const anDateInput = document.getElementById("an-date");
            anDateInput.value = `${fields.AN_Date}` ?? "";
            const storagePeriodInput = document.getElementById("storage-period-days");
            storagePeriodInput.value = `${fields.Storage_period}` ?? "";
            // const filenameText = document.getElementById("filename-text");
            // filenameText.value = "AN-"+`${fields.AWB}`+"-"+`${fields.pcs}`+"pcs-"+`${fields.skids}`+"skids-"+`${fields.CAD}`+"CAD-"+"LFD"+`${fields.LFD}`;
            updateFilename();
        })
        .catch((error) => {
            console.error("Error extracting text or fields:", error);
        });
}
// right panel logic
// click to copy the filename to clipboard
const copyButton = document.getElementById("copy-button");
const copyIcon = document.getElementById("copy-icon");
const checkIcon = document.getElementById("check-icon");
const filenameText = document.getElementById("filename-text");

function updateFilename() {
    const awb = document.getElementById("awb-input").value.trim();
    const pcs = document.getElementById("pcs-input").value.trim();
    const skid = document.getElementById("skids-input").value.trim();
    const cad = document.getElementById("cad-input").value.trim();
    let LFD = document.getElementById("lfd-input").value.trim();
    const ANDate = document.getElementById("an-date").value.trim();
    const storagePeriod = document.getElementById("storage-period-days").value.trim();
    const parts = [];
    if (awb) {
        parts.push(awb);
    }
    if (pcs && pcs !== "undefined" && pcs !== "" && pcs !== "null") {
        parts.push(pcs + "pcs");
    }
    if (skid && skid !== "undefined" && skid !== "" && skid !== "null") {
        parts.push(skid + "skids");
    }
    if (cad && cad !== "undefined" && cad !== "" && cad !== "null") {
        parts.push(cad + "CAD");
    }
    if (LFD && LFD !== "undefined" && LFD !== "" && LFD !== "null") {
        parts.push("LFD" + LFD);
    }
    if (ANDate && ANDate !== "undefined" && ANDate !== "" && ANDate !== "null") {
        if (storagePeriod && storagePeriod !== "undefined" && storagePeriod !== "" && storagePeriod !== "null"){
            console.log("updating lfd using andate", ANDate);
            const [year, month, day] = ANDate.split("-").map(Number);
            const ANdate_date = new Date(year, month - 1, day);
            const storagePeriod_num = Number(storagePeriod);
            if (
                Number.isNaN(ANdate_date.getTime()) ||
                Number.isNaN(storagePeriod_num)
            ) {
                console.warn(
                    "ANDate or storage period is invalid"
                );
            }
            else {
                ANdate_date.setDate(
                    ANdate_date.getDate() +
                    storagePeriod_num
                );

                const newLfd =
                    `${ANdate_date.getFullYear()}-` +
                    `${pad2(ANdate_date.getMonth() + 1)}-` +
                    `${pad2(ANdate_date.getDate())}`;
                console.warn("updating lfd using andate");
                LFD = newLfd;

                console.log(
                    "updating lfd using andate end",
                    LFD
                );
                document.getElementById("lfd-input").value = LFD;
                parts.push("LFD" + LFD);
            }
        }
    }
    filenameText.value = "AN-" + parts.join("-") + ".pdf";
}

const infoTable = document.getElementsByClassName("info-table-input");

console.log("Found inputs:", infoTable.length);
console.log(infoTable);

for (let i = 0; i < infoTable.length; i++) {     
    infoTable[i].addEventListener(         
        "input",         
        () => {             
            console.log("Input event detected, updating filename...");             
            updateFilename();         
        }     
    );     
    infoTable[i].addEventListener(         
        "change",         
        () => {             
            console.log("Change event detected, updating filename...");             
            updateFilename();         
        }     
    ); 
}

copyButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(filenameText.value);

    copyIcon.style.display = "none";
    checkIcon.style.display = "block";

    setTimeout(() => {
        copyIcon.style.display = "block";
        checkIcon.style.display = "none";
    }, 1500);
});