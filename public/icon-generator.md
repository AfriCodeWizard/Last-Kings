# PWA Icon Generator Instructions

To create the app icons, you can use one of these methods:

## Method 1: Online Icon Generator (Easiest)
1. Go to https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator
2. Upload a square image (at least 512x512px) with your app logo
3. Download the generated icons
4. Place `icon-192x192.png` and `icon-512x512.png` in the `public` folder

## Method 2: Create Simple Icons Manually
If you don't have a logo, you can create simple colored squares:
- Create a 192x192px image with a gold (#D4AF37) background
- Create a 512x512px image with a gold (#D4AF37) background
- Add text "LK" or a crown icon in the center
- Save as PNG files

## Method 3: Use ImageMagick (Command Line)
If you have ImageMagick installed:
```bash
# Create a simple gold square icon
convert -size 192x192 xc:#D4AF37 -gravity center -pointsize 72 -fill black -annotate +0+0 "LK" public/icon-192x192.png
convert -size 512x512 xc:#D4AF37 -gravity center -pointsize 192 -fill black -annotate +0+0 "LK" public/icon-512x512.png
```

## Required Files
Place these files in the `public` folder:
- `icon-192x192.png` (192x192 pixels)
- `icon-512x512.png` (512x512 pixels)

The app will work without icons, but they're recommended for a better user experience.

