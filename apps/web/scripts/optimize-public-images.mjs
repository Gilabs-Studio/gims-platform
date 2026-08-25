import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.resolve(__dirname, "../public");
const THUMBS_DIR = path.resolve(__dirname, "../public/thumbs");
const MANIFEST_JSON_PATH = path.resolve(__dirname, "../src/lib/image-thumbnails.json");
const MANIFEST_TS_PATH = path.resolve(__dirname, "../src/lib/image-thumbnails.ts");

const SUPPORTED_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function getAllImageFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relPath = path.relative(PUBLIC_DIR, fullPath);

    // Skip thumbs directory itself
    if (relPath.startsWith("thumbs") || file.startsWith(".")) {
      continue;
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllImageFiles(fullPath, fileList);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (SUPPORTED_EXTS.has(ext)) {
        fileList.push(fullPath);
      }
    }
  }

  return fileList;
}

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function runOptimization() {
  console.log("🚀 Starting image optimization & thumbnail generation...");
  const images = getAllImageFiles(PUBLIC_DIR);
  console.log(`Found ${images.length} images in public directory.`);

  ensureDirSync(THUMBS_DIR);

  const manifest = {};
  let totalOrigBytes = 0;
  let totalOptimizedBytes = 0;
  let totalThumbBytes = 0;

  for (let i = 0; i < images.length; i++) {
    const fullPath = images[i];
    const relPath = path.relative(PUBLIC_DIR, fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const basePath = fullPath.slice(0, -ext.length);
    const relBasePath = relPath.slice(0, -ext.length);
    const webpFullPath = `${basePath}.webp`;
    const webpRelPath = `/${relBasePath}.webp`.replace(/\\/g, "/");
    const origWebPath = `/${relPath}`.replace(/\\/g, "/");

    const origStat = fs.statSync(fullPath);
    totalOrigBytes += origStat.size;

    // 1. HD WebP Conversion / Re-optimization
    if (ext !== ".webp" && !fs.existsSync(webpFullPath)) {
      try {
        execSync(`convert "${fullPath}" -quality 85 -define webp:method=6 "${webpFullPath}"`, {
          stdio: "pipe",
        });
      } catch (err) {
        console.error(`❌ Failed to convert ${relPath} to WebP:`, err.message);
      }
    } else if (ext === ".webp") {
      // Re-compress existing WebP to temporary location to check if size improves
      const tmpWebp = `${fullPath}.tmp.webp`;
      try {
        execSync(`convert "${fullPath}" -quality 85 -define webp:method=6 "${tmpWebp}"`, {
          stdio: "pipe",
        });
        if (fs.existsSync(tmpWebp)) {
          const newSize = fs.statSync(tmpWebp).size;
          if (newSize < origStat.size) {
            fs.renameSync(tmpWebp, fullPath);
          } else {
            fs.unlinkSync(tmpWebp);
          }
        }
      } catch {
        if (fs.existsSync(tmpWebp)) fs.unlinkSync(tmpWebp);
      }
    }

    // 2. Generate PNG optimized fallback if PNG is huge (> 500KB)
    if (ext === ".png" && origStat.size > 500 * 1024) {
      try {
        execSync(`convert "${fullPath}" -strip -quality 85 "${fullPath}"`, { stdio: "pipe" });
      } catch {
        // ignore
      }
    }

    // Measure HD WebP size
    const hdPath = fs.existsSync(webpFullPath) ? webpFullPath : fullPath;
    const hdStat = fs.statSync(hdPath);
    totalOptimizedBytes += hdStat.size;

    // 3. Generate Ultra-Low Thumbnail (24px wide WebP)
    const thumbFullPath = path.join(THUMBS_DIR, `${relBasePath}.webp`);
    ensureDirSync(path.dirname(thumbFullPath));

    try {
      execSync(`convert "${fullPath}" -resize 24x -quality 25 -define webp:method=6 "${thumbFullPath}"`, {
        stdio: "pipe",
      });
      const thumbBuf = fs.readFileSync(thumbFullPath);
      totalThumbBytes += thumbBuf.length;
      const base64Data = `data:image/webp;base64,${thumbBuf.toString("base64")}`;

      manifest[origWebPath] = base64Data;
      manifest[webpRelPath] = base64Data;
    } catch (err) {
      console.error(`❌ Failed to create thumbnail for ${relPath}:`, err.message);
    }

    if ((i + 1) % 20 === 0 || i + 1 === images.length) {
      console.log(`[${i + 1}/${images.length}] Processed assets...`);
    }
  }

  // 4. Write manifest JSON & TS helper
  fs.writeFileSync(MANIFEST_JSON_PATH, JSON.stringify(manifest, null, 2), "utf8");

  const tsContent = `// Auto-generated image thumbnail manifest
import thumbnails from "./image-thumbnails.json";

export const IMAGE_THUMBNAILS: Record<string, string> = thumbnails;

export function getImageThumbnail(src: string): string | undefined {
  if (!src) return undefined;
  const key = src.startsWith("/") ? src : \`/\${src}\`;
  return IMAGE_THUMBNAILS[key] || IMAGE_THUMBNAILS[decodeURIComponent(key)];
}
`;

  fs.writeFileSync(MANIFEST_TS_PATH, tsContent, "utf8");

  console.log("\n✅ Image Optimization Completed Successfully!");
  console.log(`- Total Original Size: ${(totalOrigBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`- Total HD Optimized Size: ${(totalOptimizedBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`- Total Thumbnails Size: ${(totalThumbBytes / 1024).toFixed(2)} KB`);
  console.log(
    `- Overall Payload Reduction: ${(((totalOrigBytes - totalOptimizedBytes) / totalOrigBytes) * 100).toFixed(1)}%`
  );
  console.log(`- Manifest saved to: ${MANIFEST_TS_PATH}`);
}

runOptimization().catch((err) => {
  console.error("Fatal error during image optimization:", err);
  process.exit(1);
});
