/**
 * Favicon Generator - Node.js version
 * Uses sharp library to generate all favicon sizes
 */

const fs = require('fs')
const path = require('path')

// Check if sharp is available, if not, use a simple copy approach
let sharp
try {
  sharp = require('sharp')
  console.log('✅ Using sharp for high-quality favicon generation')
} catch (err) {
  console.log('⚠️  sharp not available, using simple PNG copies')
  console.log('   Install sharp for better quality: yarn add -D sharp')
}

const publicDir = path.join(__dirname, '../public')
const sourceFile = path.join(publicDir, 'gather_icon.png')

console.log('\n🎨 Generating Gather Kitchen favicons...\n')

// Check if source exists
if (!fs.existsSync(sourceFile)) {
  console.error('❌ gather_icon.png not found in public directory')
  process.exit(1)
}

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
]

async function generateFavicons() {
  if (sharp) {
    // Use sharp for high-quality resizing
    for (const { name, size } of sizes) {
      const outputPath = path.join(publicDir, name)
      await sharp(sourceFile)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .toFile(outputPath)
      console.log(`✅ ${name} (${size}x${size})`)
    }
  } else {
    // Fallback: just copy the original for now
    console.log('⚠️  Creating copies (install sharp for proper resizing)')
    for (const { name } of sizes) {
      const outputPath = path.join(publicDir, name)
      fs.copyFileSync(sourceFile, outputPath)
      console.log(`📋 ${name} (copied)`)
    }
  }
  
  // Create favicon.ico note
  console.log('\n📝 Note: For favicon.ico, use an online converter or:')
  console.log('   - Visit: https://favicon.io/favicon-converter/')
  console.log('   - Upload: public/gather_icon.png')
  console.log('   - Download: favicon.ico')
  console.log('   - Place in: public/favicon.ico')
  
  console.log('\n✅ Favicon generation complete!')
  console.log('🚀 Run `yarn dev` to see your new branding!\n')
}

generateFavicons().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
