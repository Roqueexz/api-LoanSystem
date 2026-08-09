// src/middleware/upload.ts
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Destination directory – relative to the backend project root
const uploadDir = path.resolve(__dirname, '../../interface-LoanSystem/public/uploads');

// Ensure the directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(png|jpe?g|webp)$/i;
    if (!allowed.test(file.originalname)) {
      return cb(new Error('Apenas imagens PNG, JPG ou WebP são permitidas.'));
    }
    cb(null, true);
  },
});

// Helper to process image with sharp – resize to max 800×800 and convert to WebP
export async function processImage(filePath: string): Promise<string> {
  const sharp = (await import('sharp')).default;
  const outputPath = filePath.replace(/\.[^.]+$/, '.webp');
  await sharp(filePath)
    .rotate()
    .resize({ width: 800, height: 800, fit: 'inside' })
    .toFormat('webp')
    .toFile(outputPath);
  // Remove original uploaded file
  await fs.promises.unlink(filePath);
  return outputPath;
}
