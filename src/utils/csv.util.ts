import { Response } from 'express';
import { IFormField } from '../interfaces/form.interface.js';

/**
 * CSV Utilities
 * Handles CSV generation and parsing for form responses
 */

/**
 * Generate CSV headers from form fields
 */
export const generateCSVHeaders = (formFields: IFormField[]): string => {
  const headings = formFields.map((field) => field.name);
  return headings.join(',');
};

/**
 * Generate CSV row from response object
 */
export const generateCSVRow = (formFields: IFormField[], responseObject: Record<string, any>): string => {
  const headings = formFields.map((field) => field.name);
  const row: string[] = [];

  headings.forEach((heading) => {
    const value = responseObject[heading] ?? '';
    // Escape quotes and wrap in quotes
    const escapedValue = String(value).replace(/"/g, '""');
    row.push(`"${escapedValue}"`);
  });

  return row.join(',');
};

/**
 * Send CSV file as response
 */
export const sendCSVResponse = (
  res: Response,
  formFields: IFormField[],
  formResponses: Array<{ responseObject: Record<string, any> }>,
  filename: string
): void => {
  // Set response headers
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // Write the headings as the first row
  const headers = generateCSVHeaders(formFields);
  res.write(`${headers}\n`);

  // Write each row of the data
  formResponses.forEach((response) => {
    const row = generateCSVRow(formFields, response.responseObject);
    res.write(`${row}\n`);
  });

  res.end();
};

/**
 * Generate CSV template (headers only)
 */
export const sendCSVTemplate = (res: Response, formFields: IFormField[], filename: string): void => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const headers = generateCSVHeaders(formFields);
  res.write(`${headers}\n`);
  res.end();
};
