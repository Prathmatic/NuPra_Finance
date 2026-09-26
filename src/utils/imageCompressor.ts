/**
 * Compresses an image file or existing base64 data URL to a maximum dimension
 * (e.g., 128x128 for avatars) and returns an optimized JPEG data URL (~5-10 KB instead of 2-5 MB).
 */
export async function compressAvatarImage(
  input: File | string,
  maxDimension = 128,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    // If string input and not a large data URL, resolve immediately
    if (typeof input === 'string') {
      if (!input.startsWith('data:image/') || input.length < 5000) {
        return resolve(input);
      }
    } else if (!input || !input.type.startsWith('image/')) {
      return resolve('');
    }

    const processImage = (src: string) => {
      const img = new Image();
      img.onerror = () => resolve(typeof input === 'string' ? input : '');
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Scale proportionally so the largest dimension does not exceed maxDimension
          if (width > height) {
            if (width > maxDimension) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(src);
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch (err) {
          console.warn('Image compression fallback:', err);
          resolve(src);
        }
      };
      img.src = src;
    };

    if (typeof input === 'string') {
      processImage(input);
    } else {
      const reader = new FileReader();
      reader.onerror = () => resolve('');
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          processImage(reader.result);
        } else {
          resolve('');
        }
      };
      reader.readAsDataURL(input);
    }
  });
}
