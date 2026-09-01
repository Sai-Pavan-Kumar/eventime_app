import { supabase } from './supabase';

/**
 * Uploads an image from React Native local file URI to Supabase Storage.
 * Returns the public URL of the uploaded image.
 */
export async function uploadEventPoster(
  localUri: string,
  folder: string = 'events'
): Promise<string> {
  if (!localUri || !localUri.startsWith('file://')) {
    return localUri;
  }

  const fileExt = localUri.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${folder}/poster_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
  const contentType = fileExt === 'png' ? 'image/png' : fileExt === 'webp' ? 'image/webp' : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', {
    uri: localUri,
    name: fileName,
    type: contentType,
  } as any);

  const { data, error } = await supabase.storage
    .from('events')
    .upload(fileName, formData, {
      contentType,
      upsert: false,
    });

  if (error) {
    console.error('[Storage] Upload error:', error);
    // If upload fails, fallback to localUri so form submission doesn't hard-crash
    return localUri;
  }

  const { data: publicUrlData } = supabase.storage
    .from('events')
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}
