/**
 * Utility for client-side image compression and WebP conversion.
 * Reduces raw camera photos (5-15MB) into lightweight WebP images (~100-300KB)
 * following GIMS storage optimization standards.
 */

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: "image/webp" | "image/jpeg";
}

/**
 * Compresses an image file to WebP format using HTML5 Canvas.
 */
export async function compressImageToWebP(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<File> {
  // If file is not an image (e.g., PDF document), return original file directly
  if (!file.type.startsWith("image/")) {
    return file;
  }

  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    outputFormat = "image/webp",
  } = options;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio preserving scaling
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file); // Fallback if 2d context unavailable
          return;
        }

        // Draw image with smooth scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            // Create new File with .webp extension
            const originalNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
            const newFileName = `${originalNameWithoutExt}.webp`;

            const optimizedFile = new File([blob], newFileName, {
              type: outputFormat,
              lastModified: Date.now(),
            });

            // If for some reason optimized file is larger than original, return original
            if (optimizedFile.size >= file.size && file.type === "image/webp") {
              resolve(file);
            } else {
              resolve(optimizedFile);
            }
          },
          outputFormat,
          quality
        );
      };

      img.onerror = () => resolve(file);
    };

    reader.onerror = () => resolve(file);
  });
}

/**
 * Generates an ultra-low 24px blur base64 thumbnail string for instant preview placeholder.
 */
export async function generateBlurThumbnail(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 24;
        canvas.height = Math.max(1, Math.round((24 * img.height) / img.width));

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/webp", 0.3));
      };

      img.onerror = () => resolve(null);
    };

    reader.onerror = () => resolve(null);
  });
}
