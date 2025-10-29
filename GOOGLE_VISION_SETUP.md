# Google Cloud Vision API Setup Guide

## 🚀 Quick Setup (5 minutes)

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Note your **Project ID** (shown in project settings)

### 2. Enable Vision API
1. Go to [Vision API page](https://console.cloud.google.com/apis/library/vision.googleapis.com)
2. Click **"Enable"**

### 3. Create Service Account (Updated Instructions)
1. Go to [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click **"Create Service Account"**
3. Name: `vision-api-service`
4. **Role Selection (Try this order):**
   
   **Option A: Search for the exact role**
   - Click **"Select a role"** dropdown
   - Type: `Cloud Vision API User` (exactly)
   - If it appears, select it ✅
   
   **Option B: Use "Cloud Vision AI Service Agent"**
   - Search for: `Cloud Vision`
   - Select: **"Cloud Vision AI Service Agent"** (this should work)
   
   **Option C: Use Editor role temporarily**
   - Select: **"Editor"** (broader permissions, works for testing)
   
5. **Grant users access to this service account (Optional - Skip this!)**
   - This section is for allowing human users to "act as" this service account
   - **For our use case: Leave blank and click "Done"** ✅
   - Our app will use the JSON key file directly, no human access needed
   - *Only add users here if you want developers to be able to use this service account for testing*

6. Click **"Done"**

### 3b. Fix Role After Creation (If needed)
If the Vision API still doesn't work:
1. Go to **"IAM"** in the left sidebar (not Service Accounts)
2. Find your service account email (ends with `@your-project.iam.gserviceaccount.com`)
3. Click the pencil icon to edit permissions
4. Click **"Add another role"**
5. Search for: `vision`
6. Look for: **"Cloud Vision API User"** or **"roles/cloudVision.apiUser"**
7. If not found, your project might need the Vision API enabled first

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

### Role Not Found Issues
**"Cloud Vision API User role not showing up"**
- **Solution 1:** Use **"Cloud Vision AI Service Agent"** instead
- **Solution 2:** Use **"Editor"** role temporarily for testing
- **Solution 3:** Enable Vision API first, then create service account
- **Solution 4:** Go to IAM → Add role to existing service account

**"API has not been used"**
- Wait 5-10 minutes after enabling Vision API
- Check that billing is enabled on your project

**"Invalid credentials"**
- Verify `GOOGLE_CLOUD_KEY_FILE` path is correct
- Check that JSON key file wasn't corrupted during download
- Ensure `GOOGLE_CLOUD_PROJECT_ID` matches exactly

**"Quota exceeded"**
- You've hit the free tier limit (very unlikely for testing)
- Check your billing/quota in Google Cloud console

**"What is 'Grant users access to this service account'?"**
- This is optional - **skip it for our use case**
- It's for allowing human users to impersonate the service account
- Our app uses the JSON key file directly, so no human access needed
- Only add users if you want developers to test with this service account

That's it! Your photo OCR is now powered by Google's enterprise-grade Vision API. 📸✨</content>
<parameter name="filePath">/Users/samuelholley/Projects/gather_kitchen_nutrition_labels/GOOGLE_VISION_SETUP.md