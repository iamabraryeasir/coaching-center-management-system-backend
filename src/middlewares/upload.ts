import type { NextFunction, Request, RequestHandler, Response } from 'express';
import multer, { MulterError } from 'multer';
import { ApiError } from '../utils';

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// 5MB max file size
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback,
) => {
  if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      ApiError.badRequest(
        `Invalid file type '${file.mimetype}'. Only JPEG, PNG, WebP, and GIF images are allowed.`,
      ),
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
});

/**
 * Express middleware for single image upload with error interception
 */
export const singleImageUpload = (fieldName = 'image'): RequestHandler => {
  const multerHandler = upload.single(fieldName);

  return (req: Request, res: Response, next: NextFunction): void => {
    multerHandler(req, res, (err: unknown) => {
      if (err) {
        if (err instanceof MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(
              ApiError.badRequest(
                'File size exceeds the 5MB limit. Please upload a smaller image.',
              ),
            );
          }
          return next(ApiError.badRequest(`Upload error: ${err.message}`));
        }
        return next(err);
      }

      next();
    });
  };
};
