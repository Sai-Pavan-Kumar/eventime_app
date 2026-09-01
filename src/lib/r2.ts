import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const accountId =
  process.env.EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID ||
  process.env.CLOUDFLARE_ACCOUNT_ID ||
  '';
const accessKeyId =
  process.env.EXPO_PUBLIC_R2_ACCESS_KEY_ID ||
  process.env.R2_ACCESS_KEY_ID ||
  '';
const secretAccessKey =
  process.env.EXPO_PUBLIC_R2_SECRET_ACCESS_KEY ||
  process.env.R2_SECRET_ACCESS_KEY ||
  '';
const bucketName =
  process.env.EXPO_PUBLIC_R2_BUCKET_NAME ||
  process.env.R2_BUCKET_NAME ||
  'eventime';
const publicUrlBase =
  process.env.EXPO_PUBLIC_R2_PUBLIC_URL ||
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
  '';

let s3Client: S3Client | null = null;

if (accountId && accessKeyId && secretAccessKey) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Uploads an image file from a local URI (file://...) to Cloudflare R2
 * and returns the public CDN URL.
 */
export async function uploadImageToR2(
  localUri: string,
  prefix: string = 'events'
): Promise<string> {
  if (!s3Client) {
    console.warn('[R2] Cloudflare R2 credentials not fully configured. Using original URI as fallback.');
    return localUri;
  }

  const fileExt = localUri.split('.').pop()?.toLowerCase() || 'webp';
  const fileName = `${prefix}/poster_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
  const contentType = fileExt === 'png' ? 'image/png' : fileExt === 'webp' ? 'image/webp' : 'image/jpeg';

  // Read file as blob/arrayBuffer from local URI
  const response = await fetch(localUri);
  const blob = await response.blob();
  const arrayBuffer = await new Response(blob).arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Return public CDN URL matching the website
  if (publicUrlBase) {
    const cleanBase = publicUrlBase.replace(/\/$/, '');
    return `${cleanBase}/${fileName}`;
  }

  return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${fileName}`;
}
