type PdfModule = {
  default?: new (options?: Record<string, unknown>) => {
    internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
    addPage: () => void;
    addImage: (imageData: string, format: string, x: number, y: number, width: number, height: number) => void;
    save: (fileName: string) => void;
  };
  jsPDF?: new (options?: Record<string, unknown>) => {
    internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
    addPage: () => void;
    addImage: (imageData: string, format: string, x: number, y: number, width: number, height: number) => void;
    save: (fileName: string) => void;
  };
};

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(images.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.addEventListener("load", () => resolve(), { once: true });
      img.addEventListener("error", () => resolve(), { once: true });
    });
  }));
}

export async function downloadHoroscopePdf(html: string, fileName: string) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("PDF export is only available in browser");
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, "text/html");
  const styleMarkup = Array.from(parsed.head.querySelectorAll("style, link[rel='stylesheet']"))
    .map((node) => node.outerHTML)
    .join("\n");

  const host = document.createElement("div");
  host.setAttribute("data-horoscope-pdf-export", "true");
  host.style.position = "fixed";
  host.style.left = "-20000px";
  host.style.top = "0";
  host.style.width = "210mm";
  host.style.background = "white";
  host.style.zIndex = "-1";
  host.style.pointerEvents = "none";
  host.innerHTML = `${styleMarkup}<div data-export-root>${parsed.body.innerHTML}</div>`;
  document.body.appendChild(host);

  try {
    const exportRoot = host.querySelector("[data-export-root]") as HTMLElement | null;
    if (!exportRoot) throw new Error("Failed to prepare horoscope content");

    await waitForImages(exportRoot);

    const [{ default: html2canvas }, jsPdfModule] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    const JsPdf = (jsPdfModule as PdfModule).jsPDF ?? (jsPdfModule as PdfModule).default;
    if (!JsPdf) throw new Error("jsPDF not available");

    const pageNodes = Array.from(exportRoot.querySelectorAll(".page")) as HTMLElement[];
    const targets = pageNodes.length ? pageNodes : [exportRoot];
    const pdf = new JsPdf({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let index = 0; index < targets.length; index++) {
      const page = targets[index];
      const canvas = await html2canvas(page, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        imageTimeout: 0,
        windowWidth: Math.max(page.scrollWidth, page.offsetWidth, 794),
        windowHeight: Math.max(page.scrollHeight, page.offsetHeight, 1123),
      });

      const image = canvas.toDataURL("image/jpeg", 0.95);
      const imageHeight = (canvas.height * pdfWidth) / canvas.width;

      if (index > 0) pdf.addPage();
      pdf.addImage(image, "JPEG", 0, 0, pdfWidth, Math.min(imageHeight, pdfHeight));
    }

    pdf.save(fileName);
  } finally {
    host.remove();
  }
}