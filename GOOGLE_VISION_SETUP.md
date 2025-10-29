# Google Cloud Vision API Setup Guide

## 🚀 Quick Setup (5 minutes)

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Note your **Project ID** (shown in project settings)

### 2. Enable Vision API
1. Go to [Vision API page](https://console.cloud.google.com/apis/library/vision.googleapis.com)
2. Click **"Enable"**

### 3. Create Service Account
1. Go to [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click **"Create Service Account"**
3. Name: `vision-api-service`
4. Role: `Cloud Vision API User`
5. Click **"Done"**

### 4. Download Key File
1. Click on your new service account
2. Go to **"Keys"** tab
3. Click **"Add Key"** → **"Create new key"**
4. Choose **JSON** format
5. Download the file and save as `service-account-key.json` in your project root

### 5. Configure Environment
Add to your `.env.local` file:
```bash
GOOGLE_CLOUD_PROJECT_ID=your-project-id-here
GOOGLE_CLOUD_KEY_FILE=./service-account-key.json
```

### 6. Test It
1. Start your dev server: `npm run dev`
2. Go to `/import/review`
3. Upload a nutrition label photo
4. See OCR results! 🎉

## 💰 Cost Information
- **First 1,000 images/month**: FREE
- **Additional images**: $1.50 per 1,000 images
- **Your usage**: < 1,000/month → **FREE**

## 🔧 Troubleshooting
- **"API has not been used"**: Wait 5-10 minutes after enabling
- **"Invalid credentials"**: Check your service account key file path
- **"Quota exceeded"**: You've hit the free tier limit (very unlikely)

That's it! Your photo OCR is now powered by Google's enterprise-grade Vision API. 📸✨</content>
<parameter name="filePath">/Users/samuelholley/Projects/gather_kitchen_nutrition_labels/GOOGLE_VISION_SETUP.md