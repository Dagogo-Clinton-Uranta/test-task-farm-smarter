import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Upload Service
 * Handles file uploads to AWS S3
 */

// Initialize S3 client
const getS3Client = (): S3Client | null => {
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    logger.warn('AWS S3 credentials not configured');
    return null;
  }

  return new S3Client({
    region: env.AWS_S3_REGION || 'eu-west-2',
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
};

// Allowed file types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

// Max file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// S3 bucket name
const BUCKET_NAME = env.AWS_S3_BUCKET || 'ufarmx-media';

/**
 * Upload result interface
 */
export interface IUploadResult {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  error?: string;
}

/**
 * Validate file before upload
 */
export const validateFile = (
  mimeType: string,
  fileSize: number
): { valid: boolean; error?: string } => {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
    };
  }

  return { valid: true };
};

/**
 * Generate unique file key for S3
 */
export const generateFileKey = (folder: string, originalName: string): string => {
  const timestamp = Date.now();
  const uniqueId = uuidv4().substring(0, 8);
  const ext = path.extname(originalName).toLowerCase();
  const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9-_]/g, '');

  return `${folder}/${timestamp}-${uniqueId}-${baseName}${ext}`;
};

/**
 * Upload a single file to S3
 */
export const uploadSingleFile = async (
  folder: string,
  file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
    size: number;
  }
): Promise<IUploadResult> => {
  // Validate file
  const validation = validateFile(file.mimetype, file.size);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  const s3Client = getS3Client();

  if (!s3Client) {
    // Return mock URL for development without S3
    const mockKey = generateFileKey(folder, file.originalname);
    logger.warn('S3 not configured, returning mock URL', { key: mockKey });

    return {
      success: true,
      fileUrl: `https://${BUCKET_NAME}.s3.${env.AWS_S3_REGION || 'eu-west-2'}.amazonaws.com/${mockKey}`,
      fileName: mockKey,
    };
  }

  try {
    const fileKey = generateFileKey(folder, file.originalname);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
      // Note: ACL removed - bucket policy should be configured for public access
      // or use CloudFront/presigned URLs for file access
    });

    await s3Client.send(command);

    const fileUrl = `https://${BUCKET_NAME}.s3.${env.AWS_S3_REGION || 'eu-west-2'}.amazonaws.com/${fileKey}`;

    logger.info('File uploaded to S3', {
      key: fileKey,
      size: file.size,
      type: file.mimetype,
    });

    return {
      success: true,
      fileUrl,
      fileName: fileKey,
    };
  } catch (error: any) {
    logger.error('S3 upload failed', {
      error: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      error: 'Failed to upload file. Please try again.',
    };
  }
};

/**
 * Upload multiple files to S3
 */
export const uploadMultipleFiles = async (
  folder: string,
  files: Array<{
    buffer: Buffer;
    mimetype: string;
    originalname: string;
    size: number;
  }>
): Promise<IUploadResult[]> => {
  const results = await Promise.all(
    files.map((file) => uploadSingleFile(folder, file))
  );

  return results;
};

/**
 * Delete a file from S3
 */
export const deleteFile = async (fileKey: string): Promise<boolean> => {
  const s3Client = getS3Client();

  if (!s3Client) {
    logger.warn('S3 not configured, cannot delete file', { key: fileKey });
    return false;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    });

    await s3Client.send(command);

    logger.info('File deleted from S3', { key: fileKey });
    return true;
  } catch (error: any) {
    logger.error('S3 delete failed', {
      error: error.message,
      key: fileKey,
    });
    return false;
  }
};

/**
 * Get absolute URL for a relative file path
 */
export const getAbsoluteUrl = (relativePath: string): string => {
  if (!relativePath) {
    return '';
  }

  // If already absolute URL, return as-is
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }

  // Remove leading slash if present
  const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;

  return `https://${BUCKET_NAME}.s3.${env.AWS_S3_REGION || 'eu-west-2'}.amazonaws.com/${cleanPath}`;
};

// Folder constants for different upload types
export const UPLOAD_FOLDERS = {
  FARMER_PHOTOS: 'farmer-photos',
  SHOP_PHOTOS: 'shop-photos',
  PROOF_OF_ADDRESS: 'proof-of-address',
  ID_DOCUMENTS: 'id-documents',
  UTILITY_BILLS: 'utility-bills',
  PRODUCT_IMAGES: 'product-images',
  REQUEST_DOCUMENTS: 'request-documents',
  GENERAL: 'uploads',
} as const;

// Export service object
export const uploadService = {
  validateFile,
  generateFileKey,
  uploadSingleFile,
  uploadMultipleFiles,
  deleteFile,
  getAbsoluteUrl,
  UPLOAD_FOLDERS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
};
