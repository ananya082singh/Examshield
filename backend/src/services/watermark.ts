import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { JWT_SECRET } from '../config';

interface WatermarkMetadata {
  centerName: string;
  centerCode: string;
  userEmail: string;
  watermarkId: string;
  timestamp: Date;
}

/**
 * Generates an HMAC signature for the watermark to prevent alteration/forgery
 */
export const generateWatermarkSignature = (watermarkId: string, centerCode: string, timestamp: string): string => {
  return crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${watermarkId}:${centerCode}:${timestamp}`)
    .digest('hex');
};

/**
 * Generates a PNG buffer of a QR code containing security verification metadata
 */
const generateQRCodeBuffer = async (text: string): Promise<Buffer> => {
  return QRCode.toBuffer(text, {
    margin: 1,
    width: 100,
    color: {
      dark: '#0f172a',  // Slate 900
      light: '#ffffff', // White
    }
  });
};

/**
 * Injects a dynamic watermark and verification QR code into a PDF buffer
 */
export const applyWatermark = async (
  pdfBuffer: Buffer,
  meta: WatermarkMetadata
): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const timestampStr = meta.timestamp.toISOString();
  
  // Format watermark lines
  const watermarkText = `EXAMSHIELD SECURITY WATERMARK - DO NOT COPY`;
  const detailText = `CENTER: ${meta.centerName} (${meta.centerCode}) | USER: ${meta.userEmail} | TIME: ${timestampStr} | ID: ${meta.watermarkId}`;
  
  // Generate QR code content (with a verification signature)
  const signature = generateWatermarkSignature(meta.watermarkId, meta.centerCode, timestampStr);
  const qrData = JSON.stringify({
    wid: meta.watermarkId,
    code: meta.centerCode,
    time: timestampStr,
    sig: signature.substring(0, 16) // Shortened signature for size
  });
  
  const qrCodeBuffer = await generateQRCodeBuffer(qrData);
  const qrImage = await pdfDoc.embedPng(qrCodeBuffer);

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();

    // 1. Draw Diagonal Watermark Text (Semi-transparent)
    const fontSizeDiagonal = 24;
    const textWidthDiagonal = font.widthOfTextAtSize(watermarkText, fontSizeDiagonal);
    
    // Draw diagonal watermarks in a grid overlay
    page.drawText(watermarkText, {
      x: (width - textWidthDiagonal) / 2,
      y: (height) / 2,
      size: fontSizeDiagonal,
      font: font,
      color: rgb(0.7, 0.7, 0.7), // Light grey
      opacity: 0.15,
      rotate: degrees(-45),
    });

    // Draw secondary diagonal watermarks if height is large
    if (height > 600) {
      page.drawText(watermarkText, {
        x: (width - textWidthDiagonal) / 2 - 100,
        y: (height) / 2 + 150,
        size: fontSizeDiagonal - 4,
        font: font,
        color: rgb(0.7, 0.7, 0.7),
        opacity: 0.08,
        rotate: degrees(-45),
      });

      page.drawText(watermarkText, {
        x: (width - textWidthDiagonal) / 2 + 100,
        y: (height) / 2 - 150,
        size: fontSizeDiagonal - 4,
        font: font,
        color: rgb(0.7, 0.7, 0.7),
        opacity: 0.08,
        rotate: degrees(-45),
      });
    }

    // 2. Draw Footer Watermark (Highly visible, small size)
    const fontSizeFooter = 7;
    page.drawText(detailText, {
      x: 20,
      y: 15,
      size: fontSizeFooter,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
      opacity: 0.6,
    });
    
    page.drawText(`ExamShield Trace ID: ${meta.watermarkId}`, {
      x: 20,
      y: 25,
      size: fontSizeFooter,
      font: font,
      color: rgb(0.8, 0.1, 0.1), // Subtle warning red
      opacity: 0.8,
    });

    // 3. Draw QR code on the First Page
    if (i === 0) {
      // Draw QR code container box
      page.drawRectangle({
        x: width - 115,
        y: 15,
        width: 100,
        height: 110,
        color: rgb(0.95, 0.95, 0.95),
        borderColor: rgb(0.8, 0.8, 0.8),
        borderWidth: 1,
      });

      page.drawImage(qrImage, {
        x: width - 115,
        y: 25,
        width: 100,
        height: 100,
      });

      page.drawText("SECURE VERIFY", {
        x: width - 103,
        y: 19,
        size: 6,
        font: font,
        color: rgb(0.1, 0.1, 0.1),
      });
    }
  }

  // ─── FORENSIC MARKER: Embed trace ID as raw bytes appended after PDF %%EOF ───
  // pdf-lib v1 compresses the Info dictionary via FlateDecode, making standard
  // metadata invisible to binary search. We append a raw, uncompressed marker
  // block AFTER the %%EOF marker — PDF readers ignore trailing data, but it is
  // always scannable in the binary. This is a forensic watermarking standard.
  const modifiedPdfBytes = await pdfDoc.save();

  const markerBlock = Buffer.from(
    `\n%% EXAMSHIELD FORENSIC MARKER %%\n` +
    `%% TRACE_ID:${meta.watermarkId} %%\n` +
    `%% CENTER_CODE:${meta.centerCode} %%\n` +
    `%% CENTER_NAME:${meta.centerName} %%\n` +
    `%% USER_EMAIL:${meta.userEmail} %%\n` +
    `%% TIMESTAMP:${timestampStr} %%\n` +
    `%% END_EXAMSHIELD_MARKER %%\n`,
    'ascii'
  );

  const finalBytes = Buffer.concat([Buffer.from(modifiedPdfBytes), markerBlock]);
  return finalBytes;
};
