import { PDFDocument, StandardFonts, degrees } from 'pdf-lib';

export async function genererBordereau(pdfFile, destinataireText) {
  // 1. On charge le PDF original
  const originalPdfBytes = await pdfFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(originalPdfBytes);

  // 2. On sélectionne la première page
  const page = pdfDoc.getPages()[0];
  const { width: originalWidth, height: originalHeight } = page.getSize();

  // 3. Mesures du rognage (150mm x 100mm)
  const cropX = 10;       
  const cropY = 20;       
  const cropWidth = 425.20;  // 150 mm
  const cropHeight = 283.46; // 100 mm
  
  // En PDF, le point d'origine 0,0 est en bas à gauche.
  // On calcule donc le bord "bas" de notre zone de découpe.
  const bottomY = originalHeight - cropY - cropHeight;

  // 4. On rogne la page aux dimensions 150x100mm
  page.setCropBox(cropX, bottomY, cropWidth, cropHeight);
  page.setMediaBox(cropX, bottomY, cropWidth, cropHeight);

  // 5. Ajout des polices d'écriture
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // 6. Calcul du milieu de la zone découpée
  const milieuHauteurY = bottomY + (cropHeight / 2);
  const milieuLargeurX = cropX + (cropWidth / 2);

  // 7. Texte du Destinataire (Moitié gauche, positionné vers le milieu en hauteur)
  page.drawText(destinataireText, {
    x: cropX + 15,
    y: milieuHauteurY - 20,
    size: 22,
    font: fontBold,
    lineHeight: 22,
  });

  // 8. Texte de l'Expéditeur (Moitié droite, juste à côté)
  const expediteurText = "Sender:\nMatthieu AFANE\n52 Rue des Vieilles Postes\n51000 Châlons en champagne\nFRANCE";
  page.drawText(expediteurText, {
    x: milieuLargeurX + 25,
    y: milieuHauteurY - 10,
    size: 10,
    font: fontBold,
    lineHeight: 14,
  });

  // 9. Rotation de la page de 90 degrés vers la droite
  page.setRotation(degrees(-90));

  // 10. On génère le document final et on l'ouvre
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}