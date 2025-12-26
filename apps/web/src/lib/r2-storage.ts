/**
 * Cloudflare R2 Storage Utility
 * Handles avatar uploads to R2 (S3-compatible)
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export interface UploadResult {
  success: boolean;
  path?: string;
  url?: string;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

/**
 * Check if R2 is configured
 */
function isR2Configured(): boolean {
  return !!(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
    process.env.CLOUDFLARE_R2_BUCKET
  );
}

/**
 * Create S3 client for R2
 */
function createR2Client(): S3Client {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!;

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Get the public URL for an avatar
 */
export function getAvatarUrl(linkedinId: string): string | null {
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
  if (!publicUrl) {
    return null;
  }
  return `${publicUrl}/avatars/${linkedinId}.jpg`;
}

/**
 * Get the storage path for an avatar
 */
function getAvatarPath(linkedinId: string): string {
  return `avatars/${linkedinId}.jpg`;
}

/**
 * Upload avatar buffer to R2
 */
export async function uploadAvatar(
  linkedinId: string,
  buffer: Buffer
): Promise<UploadResult> {
  if (!isR2Configured()) {
    return {
      success: false,
      error: 'R2 storage is not configured',
    };
  }

  try {
    const client = createR2Client();
    const bucket = process.env.CLOUDFLARE_R2_BUCKET!;
    const path = getAvatarPath(linkedinId);

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: path,
        Body: buffer,
        ContentType: 'image/jpeg',
      })
    );

    return {
      success: true,
      path,
      url: getAvatarUrl(linkedinId) || undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete avatar from R2
 */
export async function deleteAvatar(linkedinId: string): Promise<DeleteResult> {
  if (!isR2Configured()) {
    return {
      success: false,
      error: 'R2 storage is not configured',
    };
  }

  try {
    const client = createR2Client();
    const bucket = process.env.CLOUDFLARE_R2_BUCKET!;
    const path = getAvatarPath(linkedinId);

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: path,
      })
    );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Download image from URL and upload to R2
 */
export async function downloadAndUploadAvatar(
  linkedinId: string,
  imageUrl: string
): Promise<UploadResult> {
  // Validate URL
  try {
    new URL(imageUrl);
  } catch {
    return {
      success: false,
      error: 'Invalid URL provided',
    };
  }

  try {
    // Download image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return {
        success: false,
        error: `Failed to download image: HTTP ${response.status}`,
      };
    }

    // Convert to buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    return uploadAvatar(linkedinId, buffer);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
