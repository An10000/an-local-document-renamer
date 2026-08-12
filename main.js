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
}
// right panel logic
// click to copy the filename to clipboard
const copyButton = document.getElementById("copy-button");
const copyIcon = document.getElementById("copy-icon");
const checkIcon = document.getElementById("check-icon");
const filenameText = document.getElementById("filename-text");

copyButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(
        filenameText.textContent.trim()
    );

    copyIcon.style.display = "none";
    checkIcon.style.display = "block";

    setTimeout(() => {
        copyIcon.style.display = "block";
        checkIcon.style.display = "none";
    }, 1500);
});