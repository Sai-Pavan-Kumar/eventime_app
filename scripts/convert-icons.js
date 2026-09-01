const sharp = require('sharp');
const path = require('path');

async function convert() {
  const assetsDir = path.resolve(__dirname, '../assets');
  const source = path.join(assetsDir, 'icon-512.webp');

  await sharp(source).png().toFile(path.join(assetsDir, 'icon.png'));
  console.log('Created assets/icon.png');

  await sharp(source).png().toFile(path.join(assetsDir, 'splash-icon.png'));
  console.log('Created assets/splash-icon.png');

  await sharp(source).png().toFile(path.join(assetsDir, 'adaptive-icon.png'));
  console.log('Created assets/adaptive-icon.png');

  await sharp(path.join(assetsDir, 'icon-192.webp'))
    .png()
    .toFile(path.join(assetsDir, 'favicon.png'));
  console.log('Created assets/favicon.png');
}

convert().catch(console.error);
