#!/bin/bash

# Favicon Generator Script for Gather Kitchen Nutrition Labels
# Requires: ImageMagick (install with: brew install imagemagick)

echo "🎨 Generating favicons from gather_icon.png..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Install it with:"
    echo "   brew install imagemagick"
    exit 1
fi

# Navigate to public directory
cd "$(dirname "$0")/../public" || exit 1

# Check if source file exists
if [ ! -f "gather_icon.png" ]; then
    echo "❌ gather_icon.png not found in public directory"
    exit 1
fi

echo "✅ Found gather_icon.png"

# Generate favicon.ico (multi-resolution)
echo "📐 Generating favicon.ico (16x16, 32x32, 48x48)..."
convert gather_icon.png -resize 16x16 favicon-16.png
convert gather_icon.png -resize 32x32 favicon-32.png
convert gather_icon.png -resize 48x48 favicon-48.png
convert favicon-16.png favicon-32.png favicon-48.png favicon.ico
rm favicon-16.png favicon-32.png favicon-48.png

# Generate PNG favicons
echo "📐 Generating favicon-16x16.png..."
convert gather_icon.png -resize 16x16 favicon-16x16.png

echo "📐 Generating favicon-32x32.png..."
convert gather_icon.png -resize 32x32 favicon-32x32.png

echo "📐 Generating apple-touch-icon.png (180x180)..."
convert gather_icon.png -resize 180x180 apple-touch-icon.png

# Generate Android Chrome icons
echo "📐 Generating android-chrome-192x192.png..."
convert gather_icon.png -resize 192x192 android-chrome-192x192.png

echo "📐 Generating android-chrome-512x512.png..."
convert gather_icon.png -resize 512x512 android-chrome-512x512.png

echo ""
echo "✅ All favicons generated successfully!"
echo ""
echo "Generated files:"
echo "  - favicon.ico (16x16, 32x32, 48x48)"
echo "  - favicon-16x16.png"
echo "  - favicon-32x32.png"
echo "  - apple-touch-icon.png (180x180)"
echo "  - android-chrome-192x192.png"
echo "  - android-chrome-512x512.png"
echo ""
echo "🚀 Run 'yarn dev' to see the new favicon in action!"
