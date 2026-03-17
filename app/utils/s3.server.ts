import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 / S3-compatible presigned URL utility.
 * Runs server-side only (.server.ts convention).
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
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

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
  const bucket = process.env.R2_BUCKET_NAME;
  const publicBase = process.env.R2_PUBLIC_URL;

  if (!bucket || !publicBase) {
    throw new Error(
      "Missing R2_BUCKET_NAME or R2_PUBLIC_URL env vars."
    );
  }

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
