import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";

/**
 * Generate a tiled watermark on every page of a PDF.
 * @param {Buffer} pdfBuffer - Original PDF file buffer
 * @param {string} userName - User's full name
 * @param {string} schoolName - User's school name
 * @returns {Promise<Buffer>} Watermarked PDF buffer
 */
export async function addWatermarkToPDF(pdfBuffer, userName, schoolName) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const text = `${userName} – ${schoolName}`;
  const fontSize = 12;
  const opacity = 0.25; // subtle watermark
  const textColor = rgb(0.5, 0.5, 0.5); // gray

  // Measure text width for better tiling
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const tileSpacing = 200; // pixels between tiles

  for (const page of pages) {
    const { width, height } = page.getSize();

    // Tile across the page
    for (let x = 50; x < width + textWidth; x += tileSpacing) {
      for (let y = 50; y < height; y += tileSpacing) {
        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: textColor,
          opacity,
          rotate: degrees(45), // diagonal tilt for better coverage
        });
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}