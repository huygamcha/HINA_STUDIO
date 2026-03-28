import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import path from "path";
import { v4 as uuidv4 } from "uuid";

/**
 * Cloudflare R2 / S3-compatible upload utility.
 * Runs server-side only (.server.ts convention).
 *
 * Pattern adapted from ReservationSystem's CloudflareService:
 * - Server-side WebP conversion via sharp
 * - Direct upload via PutObjectCommand
 * - Image deletion via DeleteObjectCommand
 * - Presigned URL generation for client-side uploads
 */

function getS3Client() {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing R2 credentials. Check R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY env vars."
    );
  }

  return new S3Client({
    region: "auto",
    endpoint,
    // For R2, path-style (true) is often more reliable than virtual-hosted style
    // especially when using account-specific endpoints. 
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

function getBucketConfig() {
  const bucket = process.env.R2_BUCKET_NAME;
  const publicBase = process.env.R2_PUBLIC_URL;

  if (!bucket || !publicBase) {
    throw new Error("Missing R2_BUCKET_NAME or R2_PUBLIC_URL env vars.");
  }

  return { bucket, publicBase: publicBase.replace(/\/$/, "") };
}

// ─── Server-side Direct Upload (from ReservationSystem pattern) ─────────────

/**
 * Upload an image directly from the server to R2.
 * Converts to WebP using sharp (quality 75) before uploading.
 *
 * This mirrors ReservationSystem's CloudflareService.uploadImage():
 * 1. Read the file buffer
 * 2. Convert to WebP via sharp
 * 3. Upload via PutObjectCommand
 * 4. Return the public URL
 */
export async function uploadImageToR2(
  buffer: Buffer,
  originalFilename: string,
  folder: string = "albums"
): Promise<string | undefined> {
  if (!buffer || buffer.length === 0) return undefined;

  try {
    console.log(
      `Processing image: ${originalFilename}, size: ${buffer.length} bytes`
    );

    // 1. Convert to WebP with sharp (same as ReservationSystem)
    const webpBuffer = await sharp(buffer).webp({ quality: 75 }).toBuffer();

    // 2. Build unique file key
    const { name } = path.parse(originalFilename);
    const fileKey = `${folder}/${name}-${uuidv4()}.webp`;

    // 3. Upload to R2
    const client = getS3Client();
    const { bucket, publicBase } = getBucketConfig();

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileKey,
      Body: webpBuffer,
      ContentType: "image/webp",
    });

    await client.send(command);

    // 4. Return public URL
    return `${publicBase}/${fileKey}`;
  } catch (error: any) {
    console.error("R2 upload error:", error);
    throw new Error(`Failed to upload image to R2: ${error.message}`);
  }
}

/**
 * Upload multiple images to R2 in parallel.
 * Each image is converted to WebP server-side using sharp.
 */
export async function uploadMultipleImagesToR2(
  files: { buffer: Buffer; filename: string }[],
  folder: string = "albums"
): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    const url = await uploadImageToR2(file.buffer, file.filename, folder);
    if (url) urls.push(url);
  }

  return urls;
}

// ─── Delete Image (from ReservationSystem pattern) ──────────────────────────

/**
 * Delete an image from R2 by its public URL.
 * Mirrors ReservationSystem's CloudflareService.deleteImage().
 */
export async function deleteImageFromR2(
  url: string | null | undefined
): Promise<void> {
  if (!url) return;

  try {
    const { bucket, publicBase } = getBucketConfig();

    // Extract key from URL
    let key: string;

    if (publicBase && url.startsWith(publicBase)) {
      key = url.replace(publicBase + "/", "");
    } else {
      // Fallback: parse from URL path
      const urlObj = new URL(url);
      key = urlObj.pathname.startsWith("/")
        ? urlObj.pathname.substring(1)
        : urlObj.pathname;

      // Remove bucket prefix if present
      if (key.startsWith(bucket + "/")) {
        key = key.replace(bucket + "/", "");
      }
    }

    console.log(`Deleting image from R2: key=${key}`);
    const client = getS3Client();

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await client.send(command);
  } catch (error) {
    console.error("R2 delete error:", error);
    // Don't throw — matches ReservationSystem's behavior
    // (cleanup failure shouldn't break the main operation)
  }
}

// ─── Presigned URL (existing pattern, kept for client-side uploads) ─────────

/**
 * Generate a presigned PUT URL for direct browser-to-R2 upload.
 * The client can PUT the file directly to avoid server memory limits.
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 600 // 10 minutes
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const client = getS3Client();
  const { bucket, publicBase } = getBucketConfig();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn });
  const publicUrl = `${publicBase}/${key}`;

  return { uploadUrl, publicUrl };
}

/**
 * Build a unique object key for an uploaded image.
 * Format: albums/{albumId}/{timestamp}-{sanitisedFilename}
 */
export function buildObjectKey(
  albumId: string,
  originalFilename: string
): string {
  const sanitised = originalFilename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .toLowerCase();
  const timestamp = Date.now();
  return `albums/${albumId}/${timestamp}-${sanitised}`;
}
