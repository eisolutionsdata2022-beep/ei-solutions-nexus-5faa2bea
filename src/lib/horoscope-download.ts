import type { jsPDF } from "jspdf";
import { generateHoroscopePDF } from "./horoscope-pdf";
import { generatePremiumHoroscopePDF } from "./horoscope-premium-pdf";
import type { HoroscopeRequest } from "./horoscope-types";

const PDF_MARGIN_MM = 8;
const PDF_CONTENT_WIDTH_MM = 210 - PDF_MARGIN_MM * 2;
const PDF_CONTENT_HEIGHT_MM = 297 - PDF_MARGIN_MM * 2;

type Html2CanvasModule = typeof import("html2canvas").default;

export async function downloadHoroscopePdf(request: HoroscopeRequest): Promise<string> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "900px";
  frame.style.height = "1200px";
  frame.style.opacity = "0";
  frame.style.pointerEvents = "none";
  frame.style.border = "0";

  const html = request.pdfTemplate === "premium" || request.product !== "standard"
    ? generatePremiumHoroscopePDF(request)
    : generateHoroscopePDF(request);

  document.body.appendChild(frame);

  try {
    await new Promise<void>((resolve, reject) => {
      frame.onload = () => resolve();
      frame.onerror = () => reject(new Error("Failed to prepare report preview"));
      frame.srcdoc = html;
    });

    const doc = frame.contentDocument;
    if (!doc) throw new Error("Report preview unavailable");

    await waitForImages(doc);
    await doc.fonts?.ready?.catch(() => undefined);
    await waitForPaint();

    const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
    const pages = Array.from(doc.querySelectorAll<HTMLElement>(".page"));
    const targets = pages.length ? pages : [doc.body as HTMLBodyElement];

    let firstPage = true;
    for (const target of targets) {
      firstPage = await appendElementToPdf({
        pdf,
        html2canvas,
        element: target,
        firstPage,
      });
    }

    const fileName = getHoroscopeFileName(request);
    pdf.save(fileName);
    return fileName;
  } finally {
    frame.remove();
  }
}

async function appendElementToPdf({
  pdf,
  html2canvas,
  element,
  firstPage,
}: {
  pdf: jsPDF;
  html2canvas: Html2CanvasModule;
  element: HTMLElement;
  firstPage: boolean;
}): Promise<boolean> {
  const canvas = await html2canvas(element, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    logging: false,
    windowWidth: Math.max(element.scrollWidth, 900),
    windowHeight: Math.max(element.scrollHeight, 1200),
  });

  const sliceHeightPx = Math.max(
    1,
    Math.floor((PDF_CONTENT_HEIGHT_MM / PDF_CONTENT_WIDTH_MM) * canvas.width),
  );

  let offsetY = 0;
  while (offsetY < canvas.height) {
    const currentSliceHeight = Math.min(sliceHeightPx, canvas.height - offsetY);
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = currentSliceHeight;

    const context = sliceCanvas.getContext("2d");
    if (!context) throw new Error("Failed to render report page");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    context.drawImage(
      canvas,
      0,
      offsetY,
      canvas.width,
      currentSliceHeight,
      0,
      0,
      canvas.width,
      currentSliceHeight,
    );

    if (!firstPage) {
      pdf.addPage();
    }

    const renderedHeightMm = (currentSliceHeight / canvas.width) * PDF_CONTENT_WIDTH_MM;
    pdf.addImage(
      sliceCanvas.toDataURL("image/png"),
      "PNG",
      PDF_MARGIN_MM,
      PDF_MARGIN_MM,
      PDF_CONTENT_WIDTH_MM,
      renderedHeightMm,
      undefined,
      "FAST",
    );

    firstPage = false;
    offsetY += currentSliceHeight;
  }

  return firstPage;
}

function getHoroscopeFileName(request: HoroscopeRequest): string {
  const safeName = (request.customerName || "horoscope")
    .replace(/[^\p{L}\p{N}_-]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "horoscope";

  return `Horoscope_${safeName}_${request.product || "standard"}.pdf`;
}

async function waitForImages(doc: Document): Promise<void> {
  const images = Array.from(doc.images);

  await Promise.all(images.map((image) => new Promise<void>((resolve) => {
    if (image.complete) {
      resolve();
      return;
    }

    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => resolve(), { once: true });
  })));
}

async function waitForPaint(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}