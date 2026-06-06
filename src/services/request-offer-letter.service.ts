import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { uploadService } from './upload.service.js';

interface GenerateOfferLetterPdfInput {
  requestId: string;
  requestDate: Date;
  farmerName: string;
  retailerName: string;
  coveragePercent: number;
  approvedTenorWeeks: number;
  downPaymentAmount: number;
  totalAmount: number;
  remainingAmount: number;
}

const currency = (amount: number): string => {
  return `NGN ${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

let cachedLogoBuffer: Buffer | null | undefined;

const getLogoBuffer = (): Buffer | null => {
  if (cachedLogoBuffer !== undefined) {
    return cachedLogoBuffer;
  }

  const logoPath = path.resolve(process.cwd(), 'assets/images/ufarmx_logo.png');
  if (!fs.existsSync(logoPath)) {
    cachedLogoBuffer = null;
    logger.warn('Offer letter logo not found, continuing without logo', { logoPath });
    return cachedLogoBuffer;
  }

  cachedLogoBuffer = fs.readFileSync(logoPath);
  return cachedLogoBuffer;
};

const generateOfferLetterPdfBuffer = async (
  input: GenerateOfferLetterPdfInput
): Promise<Buffer> => {
  return await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const coveredAmount = input.remainingAmount * (input.coveragePercent / 100);

    doc.rect(0, 0, doc.page.width, 120).fill('#F4F8EC');
    const logoBuffer = getLogoBuffer();
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 50, 30, { width: 110 });
      } catch (error: any) {
        logger.warn('Failed to render offer-letter logo', { error: error?.message || String(error) });
      }
    }

    doc
      .fillColor('#0A6054')
      .font('Helvetica-Bold')
      .fontSize(24)
      .text('Offer Letter', 180, 42);
    doc
      .fillColor('#667085')
      .font('Helvetica')
      .fontSize(10)
      .text(`Reference: OFF-${input.requestId.slice(-8).toUpperCase()}`, 50, 78)
      .text(`Issue Date: ${input.requestDate.toLocaleDateString()}`, 50, 92);

    doc
      .fillColor('#344054')
      .font('Helvetica')
      .fontSize(12)
      .text(`Dear ${input.retailerName || 'Retailer'},`, 50, 150)
      .moveDown(0.8)
      .text(
        `We are pleased to extend a financing offer for farmer ${input.farmerName || 'N/A'} under request ${input.requestId}.`,
        { width: 500, lineGap: 3 }
      );

    doc
      .roundedRect(50, 240, 505, 210, 12)
      .fillAndStroke('#FCFCFD', '#D0D5DD');

    doc
      .fillColor('#0A6054')
      .font('Helvetica-Bold')
      .fontSize(13)
      .text('Offer Summary', 70, 262);

    const summaryRows: Array<[string, string]> = [
      ['Total Request Amount', currency(input.totalAmount)],
      ['Down Payment', currency(input.downPaymentAmount)],
      ['Principal (Remaining)', currency(input.remainingAmount)],
      ['Coverage Percentage', `${input.coveragePercent}%`],
      ['UFarmX Covered Amount', currency(coveredAmount)],
      ['Approved Tenor', `${input.approvedTenorWeeks} week(s)`],
    ];

    let y = 292;
    summaryRows.forEach(([label, value]) => {
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor('#475467')
        .text(label, 72, y)
        .font('Helvetica-Bold')
        .fillColor('#101828')
        .text(value, 360, y, { width: 170, align: 'right' });
      y += 26;
    });

    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#344054')
      .text(
        'Please review this offer and respond from your UFarmX request details page. Terms remain subject to final compliance checks and disbursement processing.',
        50,
        490,
        { width: 505, lineGap: 3 }
      );

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#98A2B3')
      .text('Generated automatically by UFarmX financing workflow.', 50, 770);

    doc.end();
  });
};

export const generateAndUploadRequestOfferLetterPdf = async (
  input: GenerateOfferLetterPdfInput
): Promise<{ fileUrl: string; fileName: string }> => {
  const pdfBuffer = await generateOfferLetterPdfBuffer(input);
  const fileBaseName = `offer-letter-${input.requestId}.pdf`;
  const uploadResult = await uploadService.uploadSingleFile(
    uploadService.UPLOAD_FOLDERS.REQUEST_DOCUMENTS,
    {
      buffer: pdfBuffer,
      mimetype: 'application/pdf',
      originalname: fileBaseName,
      size: pdfBuffer.length,
    }
  );

  if (!uploadResult.success || !uploadResult.fileUrl || !uploadResult.fileName) {
    logger.error('Offer letter PDF upload failed', {
      requestId: input.requestId,
      error: uploadResult.error,
    });
    throw new Error(uploadResult.error || 'Failed to upload offer letter PDF');
  }

  return {
    fileUrl: uploadResult.fileUrl,
    fileName: uploadResult.fileName,
  };
};
