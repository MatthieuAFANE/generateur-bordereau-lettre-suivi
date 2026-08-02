import { PDFDocument, StandardFonts, degrees } from 'pdf-lib';

export const PAGE_WIDTH = 425.20;  // 150 mm en points
export const PAGE_HEIGHT = 283.46; // 100 mm en points

// AJOUT: On ajoute expText dans les paramètres
export async function genererPdfFinal(originalPdfBytes, destText, expText, config) {
  const srcDoc = await PDFDocument.load(originalPdfBytes);
  const srcPage = srcDoc.getPages()[0];
  const { height: originalHeight } = srcPage.getSize();

  const bottomY = originalHeight - config.cropY - PAGE_HEIGHT;
  const cropBox = { 
    left: config.cropX, 
    bottom: bottomY, 
    right: config.cropX + PAGE_WIDTH, 
    top: bottomY + PAGE_HEIGHT 
  };

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const [embeddedLabel] = await pdfDoc.embedPages([srcPage], [cropBox]);
  page.drawPage(embeddedLabel, { x: 0, y: 0, xScale: 1, yScale: 1 });

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const destPdfY = PAGE_HEIGHT - config.destY - (config.destSize * 0.8);
  page.drawText(destText, {
    x: config.destX,
    y: destPdfY,
    size: config.destSize,
    font: config.destBold ? fontBold : fontNormal,
    lineHeight: config.destSize * 1.2,
  });

  // AJOUT: On utilise le texte expText dynamique
  const expPdfY = PAGE_HEIGHT - config.expY - (config.expSize * 0.8);
  page.drawText(expText, {
    x: config.expX,
    y: expPdfY,
    size: config.expSize,
    font: config.expBold ? fontBold : fontNormal,
    lineHeight: config.expSize * 1.4,
  });

  page.setRotation(degrees(-90));

  const finalBytes = await pdfDoc.save();
  return new Blob([finalBytes], { type: 'application/pdf' });
}