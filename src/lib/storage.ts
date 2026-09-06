import { supabase } from './supabase';
import { withTimeout } from './api-resilience';

/**
 * Uploads an image from React Native local file URI to Cloudflare R2 via Web API presigned URL.
 * This is exactly matching the web app parity for bill savings.
 */
export async function uploadEventPoster(
  localUri: string,
  folder: string = 'events'
): Promise<string> {
  if (!localUri || !localUri.startsWith('file://')) {
    return localUri;
  }

  try {
    const fileExt = localUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${folder}/poster_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const contentType = fileExt === 'png' ? 'image/png' : fileExt === 'webp' ? 'image/webp' : 'image/jpeg';
    
    // Get file info (size)
    const fileRes = await withTimeout(
      fetch(localUri),
      10000,
      'Could not read local poster file. Please try selecting the image again.'
    );
    const blob = await fileRes.blob();
    const fileSize = blob.size;

    // Enforce 2MB upload limit to conserve mobile data and guarantee fast uploads on 2G/3G
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    if (fileSize > MAX_FILE_SIZE) {
      const sizeMb = (fileSize / (1024 * 1024)).toFixed(1);
      throw new Error(`Poster size (${sizeMb}MB) exceeds the 2MB limit. Please choose a smaller or compressed image.`);
    }

    // Get current auth session to pass to the Next.js API
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated. Please sign in to upload images.');

    // Supabase sets the cookie based on the project URL host
    // The project URL is https://pgqcdygsbafladcczubn.supabase.co
    const projectId = 'pgqcdygsbafladcczubn';
    const cookieName = `sb-${projectId}-auth-token`;
    // The format that @supabase/ssr expects for the cookie value
    const cookieValue = encodeURIComponent(
      JSON.stringify(['access_token', 'refresh_token', session.access_token, session.refresh_token])
    );

    // 1. Get Presigned URL from Web API (with 20s timeout guard)
    const presignRes = await withTimeout(
      fetch('https://eventime.thesurfboard.in/api/upload/presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `${cookieName}=${cookieValue}`,
        },
        body: JSON.stringify({
          fileName,
          contentType,
          fileSize,
        }),
      }),
      20000,
      'Upload server timed out. Please check your internet connection and try again.'
    );

    if (!presignRes.ok) {
      const err = await presignRes.text();
      throw new Error(`Failed to get presigned upload URL: ${err || presignRes.statusText}`);
    }

    const { uploadUrl, publicUrl } = await presignRes.json();

    // 2. Upload to Cloudflare R2 (with 25s timeout guard)
    const uploadRes = await withTimeout(
      fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: blob,
      }),
      25000,
      'Poster upload timed out. Your connection may be too slow. Please retry.'
    );

    if (!uploadRes.ok) {
      throw new Error('Cloud storage upload failed. Please check your network connection and try again.');
    }

    return publicUrl;
  } catch (error: any) {
    console.error('[Storage] Upload error:', error);
    // Never return local file:// URI to prevent corrupting remote database with unreachable phone paths
    throw new Error(error?.message || 'Could not upload poster image. Please check your internet connection.');
  }
}
