/**
 * Create a simple favicon.ico from PNG
 * Note: This creates a PNG-based ICO file which works in modern browsers
 */

const fs = require('fs')
const path = require('path')

const sharp = require('sharp')

const publicDir = path.join(__dirname, '../public')
const sourceFile = path.join(publicDir, 'gather_icon.png')
const outputFile = path.join(publicDir, 'favicon.ico')

async function createFaviconICO() {
  console.log('\n🎨 Creating favicon.ico...')
  
  // Create a 32x32 PNG and save as .ico
  // Modern browsers support PNG-based ICO files
  await sharp(sourceFile)
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    })
    .toFile(outputFile)
  
  console.log('✅ favicon.ico created (32x32 PNG format)')
  console.log('   Modern browsers will display this correctly\n')
}

createFaviconICO().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
