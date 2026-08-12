import {
    extractTextFromPDF,
    extractFieldsFromText
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
    extractTextFromPDF(file)
        .then((text) => {
            return extractFieldsFromText(text);
        })
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
            anDateInput.value = `${fields.AN_Date}`;
            const storagePeriodInput = document.getElementById("storage-period-days");
            storagePeriodInput.value = `${fields.Storage_period}`;
            const filenameText = document.getElementById("filename-text");
            filenameText.value = `pcs: ${fields.pcs}, AWB: ${fields.AWB}`;
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

copyButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(filenameText.value);

    copyIcon.style.display = "none";
    checkIcon.style.display = "block";

    setTimeout(() => {
        copyIcon.style.display = "block";
        checkIcon.style.display = "none";
    }, 1500);
});