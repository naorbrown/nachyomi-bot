/**
 * Convert SVG avatar to PNG
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function convertSvgToPng() {
  const svgPath = join(__dirname, '../assets/bot-avatar-final.svg');
  const pngPath = join(__dirname, '../assets/bot-avatar-final.png');

  const svgBuffer = readFileSync(svgPath);

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(pngPath);

  console.log(`Converted SVG to PNG: ${pngPath}`);
}

convertSvgToPng().catch(console.error);
