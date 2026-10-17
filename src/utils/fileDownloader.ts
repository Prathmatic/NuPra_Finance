import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function stringToBase64(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    // Fallback using Blob for non-latin characters
    return '';
  }
}

export interface ExportFileOptions {
  fileName: string;
  data: Blob | string;
  mimeType: string;
  title: string;
  text?: string;
}

export interface ExportFileResult {
  success: boolean;
  method: 'native' | 'share' | 'download' | 'clipboard';
  message: string;
  uri?: string;
}

/**
 * Universally downloads, saves, or shares files across Android (Capacitor),
 * mobile browsers, and desktop environments.
 */
export async function exportFile(options: ExportFileOptions): Promise<ExportFileResult> {
  const { fileName, data, mimeType, title, text } = options;

  // 1. Native Mobile Platform (Android via Capacitor)
  if (Capacitor.isNativePlatform()) {
    try {
      let base64 = '';
      if (typeof data === 'string') {
        base64 = stringToBase64(data);
        if (!base64) {
          const blob = new Blob([data], { type: mimeType });
          base64 = await blobToBase64(blob);
        }
      } else {
        base64 = await blobToBase64(data);
      }

      // Write to Cache so the native Share Sheet can access it securely via FileProvider
      const cacheResult = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
      });

      // Also save to Documents so user has a permanent copy on their phone
      try {
        await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Documents,
        });
      } catch (docErr) {
        console.warn('Documents directory write warning:', docErr);
      }

      // Trigger Android's native system Share & Save Sheet
      await Share.share({
        title: title || fileName,
        text: text || `NuPra Finance: ${fileName}`,
        url: cacheResult.uri,
        dialogTitle: `Save or Open ${fileName}`,
      });

      return {
        success: true,
        method: 'native',
        message: 'Statement ready in Android system dialog! 📲',
        uri: cacheResult.uri,
      };
    } catch (nativeErr: any) {
      if (
        nativeErr?.name === 'AbortError' || 
        nativeErr?.message?.includes('canceled') || 
        nativeErr?.message?.includes('closed')
      ) {
        return { success: true, method: 'native', message: 'Share sheet closed' };
      }
      console.warn('Native Capacitor export failed, trying Web fallback:', nativeErr);
    }
  }

  // 2. Mobile Browser: Web Share API with File
  try {
    const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
    if (nav && typeof nav.canShare === 'function' && typeof nav.share === 'function') {
      const blob = typeof data === 'string' ? new Blob([data], { type: mimeType }) : data;
      const file = new File([blob], fileName, { type: mimeType });
      if (nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          title: title || fileName,
          text: text,
        });
        return {
          success: true,
          method: 'share',
          message: 'Statement shared successfully! 🚀',
        };
      }
    }
  } catch (shareErr: any) {
    if (shareErr?.name === 'AbortError') {
      return { success: true, method: 'share', message: 'Share sheet closed' };
    }
    console.warn('Web Share failed, falling back to direct download:', shareErr);
  }

  // 3. Desktop / Browser direct download via <a> tag
  try {
    const blob = typeof data === 'string' ? new Blob([data], { type: mimeType }) : data;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    return {
      success: true,
      method: 'download',
      message: 'Download started! Check your Downloads folder. 📥',
    };
  } catch (downloadErr) {
    console.warn('Direct browser download failed:', downloadErr);
  }

  // 4. Clipboard fallback for text/csv data
  if (typeof data === 'string') {
    try {
      await navigator.clipboard.writeText(data);
      return {
        success: true,
        method: 'clipboard',
        message: 'Statement copied to clipboard! 📋',
      };
    } catch {}
  }

  return {
    success: false,
    method: 'download',
    message: 'Could not export file in this environment.',
  };
}
