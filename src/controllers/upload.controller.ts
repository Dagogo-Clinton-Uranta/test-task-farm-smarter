import { Request, Response, NextFunction } from 'express';
import { uploadService, UPLOAD_FOLDERS } from '../services/upload.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { BadRequestError } from '../utils/error.util.js';
import { logger } from '../utils/logger.js';

/**
 * Upload Controller
 * Handles file upload HTTP requests
 */

/**
 * Upload a single file
 * POST /api/upload/:folder
 */
export const uploadSingle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const folder = req.params.folder || UPLOAD_FOLDERS.GENERAL;
    const file = req.file;

    if (!file) {
      throw new BadRequestError('No file provided');
    }

    const result = await uploadService.uploadSingleFile(folder, {
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
      size: file.size,
    });

    if (!result.success) {
      throw new BadRequestError(result.error || 'Upload failed');
    }

    logger.info('File uploaded', {
      folder,
      fileName: result.fileName,
      userId: req.userId,
    });

    sendSuccess(res, {
      fileUrl: result.fileUrl,
      fileName: result.fileName,
    }, 'File uploaded successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Upload multiple files
 * POST /api/upload/:folder/multiple
 */
export const uploadMultiple = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const folder = req.params.folder || UPLOAD_FOLDERS.GENERAL;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      throw new BadRequestError('No files provided');
    }

    const results = await uploadService.uploadMultipleFiles(
      folder,
      files.map((file) => ({
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalname: file.originalname,
        size: file.size,
      }))
    );

    // Check for any failures
    const failures = results.filter((r) => !r.success);
    if (failures.length > 0) {
      logger.warn('Some files failed to upload', {
        folder,
        failedCount: failures.length,
        totalCount: files.length,
      });
    }

    const successfulUploads = results
      .filter((r) => r.success)
      .map((r) => ({
        fileUrl: r.fileUrl,
        fileName: r.fileName,
      }));

    logger.info('Multiple files uploaded', {
      folder,
      count: successfulUploads.length,
      userId: req.userId,
    });

    sendSuccess(res, {
      files: successfulUploads,
      totalUploaded: successfulUploads.length,
      totalFailed: failures.length,
    }, `${successfulUploads.length} file(s) uploaded successfully`);
  } catch (error) {
    next(error);
  }
};

/**
 * Upload farmer photo
 * POST /api/upload/farmer-photo
 */
export const uploadFarmerPhoto = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file;

    if (!file) {
      throw new BadRequestError('No file provided');
    }

    const result = await uploadService.uploadSingleFile(UPLOAD_FOLDERS.FARMER_PHOTOS, {
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
      size: file.size,
    });

    if (!result.success) {
      throw new BadRequestError(result.error || 'Upload failed');
    }

    sendSuccess(res, {
      fileUrl: result.fileUrl,
      fileName: result.fileName,
    }, 'Farmer photo uploaded successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Upload shop photos
 * POST /api/upload/shop-photos
 */
export const uploadShopPhotos = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      throw new BadRequestError('No files provided');
    }

    const results = await uploadService.uploadMultipleFiles(
      UPLOAD_FOLDERS.SHOP_PHOTOS,
      files.map((file) => ({
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalname: file.originalname,
        size: file.size,
      }))
    );

    const successfulUploads = results
      .filter((r) => r.success)
      .map((r) => ({
        fileUrl: r.fileUrl,
        fileName: r.fileName,
      }));

    sendSuccess(res, {
      files: successfulUploads,
    }, 'Shop photos uploaded successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Upload proof of address document
 * POST /api/upload/proof-of-address
 */
export const uploadProofOfAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file;

    if (!file) {
      throw new BadRequestError('No file provided');
    }

    const result = await uploadService.uploadSingleFile(UPLOAD_FOLDERS.PROOF_OF_ADDRESS, {
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
      size: file.size,
    });

    if (!result.success) {
      throw new BadRequestError(result.error || 'Upload failed');
    }

    sendSuccess(res, {
      fileUrl: result.fileUrl,
      fileName: result.fileName,
    }, 'Proof of address uploaded successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Upload ID document
 * POST /api/upload/id-documents
 */
export const uploadIdDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file;

    if (!file) {
      throw new BadRequestError('No file provided');
    }

    const result = await uploadService.uploadSingleFile(UPLOAD_FOLDERS.ID_DOCUMENTS, {
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
      size: file.size,
    });

    if (!result.success) {
      throw new BadRequestError(result.error || 'Upload failed');
    }

    sendSuccess(res, {
      fileUrl: result.fileUrl,
      fileName: result.fileName,
    }, 'ID document uploaded successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Upload utility bill
 * POST /api/upload/utility-bills
 */
export const uploadUtilityBill = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file;

    if (!file) {
      throw new BadRequestError('No file provided');
    }

    const result = await uploadService.uploadSingleFile(UPLOAD_FOLDERS.UTILITY_BILLS, {
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
      size: file.size,
    });

    if (!result.success) {
      throw new BadRequestError(result.error || 'Upload failed');
    }

    sendSuccess(res, {
      fileUrl: result.fileUrl,
      fileName: result.fileName,
    }, 'Utility bill uploaded successfully');
  } catch (error) {
    next(error);
  }
};
