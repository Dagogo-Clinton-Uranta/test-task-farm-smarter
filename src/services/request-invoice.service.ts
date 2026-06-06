import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { uploadService } from './upload.service.js';

interface InvoiceProductLine {
  name: string;
  quantity: number;
  price: number;
}

interface GenerateRequestInvoicePdfInput {
  requestId: string;
  requestDate: Date;
  farmerName: string;
  retailerName: string;
  retailerEmail?: string;
  products: InvoiceProductLine[];
  downPaymentAmount: number;
  totalAmount: number;
  remainingAmount: number;
  requestedTenorWeeks?: number;
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
    logger.warn('Invoice logo not found, continuing without logo', { logoPath });
    return cachedLogoBuffer;
  }

  cachedLogoBuffer = fs.readFileSync(logoPath);
  return cachedLogoBuffer;
};

const drawTableHeader = (doc: PDFKit.PDFDocument, y: number) => {
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#0A6054')
    .text('Product', 52, y)
    .text('Qty', 320, y, { width: 50, align: 'right' })
    .text('Unit Price', 390, y, { width: 90, align: 'right' })
    .text('Line Total', 495, y, { width: 60, align: 'right' });

  doc
    .moveTo(50, y + 18)
    .lineTo(555, y + 18)
    .strokeColor('#E4E7EC')
    .lineWidth(1)
    .stroke();
};

const generateInvoicePdfBuffer = async (
  input: GenerateRequestInvoicePdfInput
): Promise<Buffer> => {
  return await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.rect(0, 0, doc.page.width, 105).fill('#F0FAF8');

    const logoBuffer = getLogoBuffer();
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 50, 30, { width: 110 });
      } catch (error: any) {
        logger.warn('Failed to render invoice logo', { error: error?.message || String(error) });
      }
    }

    doc
      .fillColor('#0A6054')
      .font('Helvetica-Bold')
      .fontSize(22)
      .text('UFarmX Invoice', 180, 38);

    doc
      .fillColor('#667085')
      .font('Helvetica')
      .fontSize(10)
      .text(`Invoice ID: INV-${input.requestId.slice(-8).toUpperCase()}`, 50, 70)
      .text(`Request ID: ${input.requestId}`, 50, 84);

    doc
      .fillColor('#344054')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Bill To', 50, 130);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#475467')
      .text(input.retailerName || 'Retailer', 50, 147)
      .text(input.retailerEmail || 'N/A', 50, 162)
      .text(`Farmer: ${input.farmerName || 'N/A'}`, 50, 177);

    doc
      .fillColor('#344054')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Invoice Meta', 355, 130);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#475467')
      .text(`Date: ${input.requestDate.toLocaleDateString()}`, 355, 147)
      .text(
        `Requested Tenor: ${input.requestedTenorWeeks ? `${input.requestedTenorWeeks} week(s)` : 'N/A'}`,
        355,
        162
      )
      .text(`Currency: NGN`, 355, 177);

    let tableY = 225;
    drawTableHeader(doc, tableY);
    tableY += 26;

    if (!input.products.length) {
      doc
        .font('Helvetica-Oblique')
        .fontSize(10)
        .fillColor('#667085')
        .text('No products listed', 52, tableY);
      tableY += 24;
    } else {
      for (const item of input.products) {
        const lineTotal = item.quantity * item.price;

        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#344054')
          .text(item.name || 'Unnamed Product', 52, tableY, { width: 255 })
          .text(String(item.quantity || 0), 320, tableY, { width: 50, align: 'right' })
          .text(currency(item.price), 390, tableY, { width: 90, align: 'right' })
          .text(currency(lineTotal), 495, tableY, { width: 60, align: 'right' });

        tableY += 20;
        if (tableY > 700) {
          doc.addPage();
          tableY = 60;
          drawTableHeader(doc, tableY);
          tableY += 26;
        }
      }
    }

    const summaryStartY = Math.max(tableY + 20, 500);
    doc
      .roundedRect(330, summaryStartY, 225, 110, 8)
      .fillAndStroke('#FCFCFD', '#E4E7EC');

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#475467')
      .text('Total Amount', 345, summaryStartY + 16)
      .text('Down Payment', 345, summaryStartY + 40)
      .text('Remaining Amount', 345, summaryStartY + 64);

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#101828')
      .text(currency(input.totalAmount), 450, summaryStartY + 16, { width: 90, align: 'right' })
      .text(currency(input.downPaymentAmount), 450, summaryStartY + 40, { width: 90, align: 'right' })
      .fillColor('#0A6054')
      .text(currency(input.remainingAmount), 450, summaryStartY + 64, { width: 90, align: 'right' });

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#98A2B3')
      .text('Generated automatically by UFarmX request workflow.', 50, 770);

    doc.end();
  });
};

export const generateAndUploadRequestInvoicePdf = async (
  input: GenerateRequestInvoicePdfInput
): Promise<{ fileUrl: string; fileName: string }> => {
  const pdfBuffer = await generateInvoicePdfBuffer(input);
  const fileBaseName = `invoice-${input.requestId}.pdf`;
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
    logger.error('Invoice PDF upload failed', {
      requestId: input.requestId,
      error: uploadResult.error,
    });
    throw new Error(uploadResult.error || 'Failed to upload invoice PDF');
  }

  return {
    fileUrl: uploadResult.fileUrl,
    fileName: uploadResult.fileName,
  };
};
