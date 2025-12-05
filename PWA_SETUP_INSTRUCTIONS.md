# PWA Setup Instructions - Step by Step

## ✅ Completed Steps

1. ✅ Created `public/manifest.json` - Defines app metadata
2. ✅ Updated `app/layout.tsx` - Added PWA metadata and mobile viewport settings
3. ✅ Installed `next-pwa` package - Handles service worker generation
4. ✅ Updated `next.config.js` - Configured PWA support

## 📱 Next Steps to Complete PWA Setup

### Step 1: Create App Icons

You need to create two icon files in the `public` folder:

**Option A: Use Online Generator (Recommended)**
1. Go to https://realfavicongenerator.net/
2. Upload a square logo/image (at least 512x512px)
3. Download the generated icons
4. Rename and place in `public/`:
   - `icon-192x192.png`
   - `icon-512x512.png`

**Option B: Create Simple Icons**
1. Use any image editor (Canva, Photoshop, GIMP)
2. Create a 192x192px image with gold background (#D4AF37)
3. Add "LK" text or crown icon in center
4. Save as `icon-192x192.png`
5. Repeat for 512x512px → `icon-512x512.png`

**Option C: Use the SVG Template**
- I've created `public/icon.svg` as a template
- Convert it to PNG at 192x192 and 512x512 sizes
- Use an online SVG to PNG converter or image editor

### Step 2: Build the App

After creating the icons, build the production version:

```bash
npm run build
```

This will generate the service worker files needed for PWA functionality.

### Step 3: Test Locally

```bash
npm start
```

Then test on your phone:
1. Make sure your phone and computer are on the same network
2. Find your computer's IP address (e.g., `ipconfig` on Windows)
3. On your phone, visit: `http://YOUR_IP:3000`
4. You should see an "Add to Home Screen" prompt

### Step 4: Install on Your Phone

**For Android:**
1. Open the app in Chrome
2. Tap the menu (3 dots) → "Add to Home screen" or "Install app"
3. The app will install and appear like a native app

**For iOS (iPhone/iPad):**
1. Open the app in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Customize the name if needed
5. Tap "Add"

### Step 5: Deploy to Production

For the PWA to work fully, you need to:
1. Deploy to a hosting service (Vercel, Netlify, etc.)
2. Use HTTPS (required for PWA)
3. Access the app via HTTPS URL
4. Install on your phone from the production URL

## 🎯 Features Enabled

- ✅ **Standalone Display**: No browser address bar (full-screen app)
- ✅ **Offline Support**: Service worker caches pages for offline use
- ✅ **App Icons**: Custom icons on home screen
- ✅ **Splash Screen**: Custom splash screen when opening
- ✅ **Install Prompt**: Users can install the app
- ✅ **Mobile Optimized**: Viewport settings for mobile devices

## 🔧 Configuration Details

- **Display Mode**: `standalone` - Full app experience, no browser UI
- **Theme Color**: Gold (#D4AF37) - Matches your brand
- **Background Color**: Black (#000000) - Matches your app theme
- **Orientation**: Portrait-primary - Optimized for phone use

## 📝 Notes

- The service worker is disabled in development mode
- Icons are required for the best experience
- HTTPS is required for PWA features to work
- The app will work without icons, but they're recommended

