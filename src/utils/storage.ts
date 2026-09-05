import { Readable } from 'node:stream';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { config } from '../config';
import { ApiError } from './api-error';
import { logger } from './logger';

// Configure Cloudinary SDK singleton with sanitized credentials
const cleanCred = (val: string): string => val.replace(/^["']|["']$/g, '').trim();

if (config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: cleanCred(config.CLOUDINARY_CLOUD_NAME),
    api_key: cleanCred(config.CLOUDINARY_API_KEY),
    api_secret: cleanCred(config.CLOUDINARY_API_SECRET),
    secure: true,
  });
}

export interface IUploadedImage {
  url: string;
  publicId: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
}

/**
 * Checks if Cloudinary is fully configured in the current environment
 */
export const isCloudinaryConfigured = (): boolean => {
  return Boolean(
    config.CLOUDINARY_CLOUD_NAME &&
      config.CLOUDINARY_API_KEY &&
      config.CLOUDINARY_API_SECRET &&
      config.CLOUDINARY_CLOUD_NAME.trim().length > 0 &&
      config.CLOUDINARY_API_KEY.trim().length > 0,
  );
};

/**
 * Extracts a Cloudinary public ID from a full Cloudinary delivery URL
 */
export const extractPublicIdFromUrl = (url: string): string | null => {
  if (!url?.includes('cloudinary.com')) {
    return null;
  }

  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) {
      return null;
    }
    const pathWithVersion = parts[1];
    if (!pathWithVersion) {
      return null;
    }
    // Remove version tag (e.g. "v1725540000/") if present
    const pathWithoutVersion = pathWithVersion.replace(/^v\d+\//, '');
    // Remove extension
    const lastDotIndex = pathWithoutVersion.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return pathWithoutVersion;
    }
    return pathWithoutVersion.substring(0, lastDotIndex);
  } catch {
    return null;
  }
};

export interface IUploadImageOptions {
  folder?: string;
  filename?: string;
  isAvatar?: boolean;
  width?: number;
  height?: number;
  crop?: string;
  gravity?: string;
}

/**
 * Uploads an in-memory image buffer directly to Cloudinary with optional smart face detection cropping
 */
export const uploadImageBuffer = (
  buffer: Buffer,
  optionsOrFolder: string | IUploadImageOptions = 'coaching_center/media',
  filename?: string,
): Promise<IUploadedImage> => {
  const options: IUploadImageOptions =
    typeof optionsOrFolder === 'string' ? { folder: optionsOrFolder, filename } : optionsOrFolder;

  const folder = options.folder || 'coaching_center/media';
  const finalFilename = options.filename || filename;
  const isAvatar = options.isAvatar ?? false;

  // Guard: Ensure Cloudinary credentials are configured
  if (!isCloudinaryConfigured()) {
    logger.error('Cloudinary upload attempted but credentials are not configured.');
    throw ApiError.internal('Cloud storage service is not configured on this server.');
  }

  // Use Cloudinary AI/Face detection transformations for avatars:
  // - crop: 'fill' (or 'thumb')
  // - gravity: 'face' (detects facial landmarks and centers the subject)
  // - width/height: 500x500 (1:1 square ratio for clean profile display)
  // - quality: 'auto', fetch_format: 'auto' (modern WebP/AVIF auto-compression)
  const transformations = isAvatar
    ? [
        {
          width: options.width ?? 500,
          height: options.height ?? 500,
          crop: options.crop ?? 'fill',
          gravity: options.gravity ?? 'face',
        },
        { quality: 'auto', fetch_format: 'auto' },
      ]
    : [{ quality: 'auto', fetch_format: 'auto' }];

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: finalFilename,
        resource_type: 'image',
        transformation: transformations,
      },
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          logger.error('Cloudinary upload error:', error);
          return reject(error || new Error('Upload to Cloudinary failed.'));
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
        });
      },
    );

    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

/**
 * Deletes an image from Cloudinary by public ID or full URL
 */
export const deleteImage = async (publicIdOrUrl: string): Promise<boolean> => {
  if (!publicIdOrUrl || !isCloudinaryConfigured()) {
    return false;
  }

  const publicId = publicIdOrUrl.startsWith('http')
    ? extractPublicIdFromUrl(publicIdOrUrl)
    : publicIdOrUrl;

  if (!publicId) {
    return false;
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    });
    logger.info(`Deleted image from Cloudinary: ${publicId} (Result: ${result.result})`);
    return result.result === 'ok';
  } catch (error) {
    logger.error(`Failed to delete image from Cloudinary (${publicId}):`, error);
    return false;
  }
};
