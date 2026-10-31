// Client-side image compression: resize and re-encode until the file is under ~500 KB,
// so uploads stay fast and Supabase's free 1 GB storage lasts a long time.
const MAX_BYTES = 500 * 1024;

export async function compressImage(file: File, maxDim = 1600): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  let quality = 0.82;
  for (let i = 0; i < 8; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
    if (blob && blob.size <= MAX_BYTES) return blob;
    if (quality > 0.55) quality -= 0.12;
    else scale *= 0.8;
  }
  throw new Error('Could not shrink this image under 500 KB. Try a smaller screenshot.');
}
