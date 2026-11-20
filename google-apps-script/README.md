# Google Apps Script Deployment Package

## Files Ready for Deployment

✅ **Code.gs** - Complete API code (copy to script.google.com)  
✅ **DEPLOYMENT_GUIDE.md** - Step-by-step instructions  
✅ **README.md** - This overview file

---

## Quick Start Guide (5 Steps)

### Step 1: Open Google Apps Script
Go to: https://script.google.com

### Step 2: Create New Project  
- Click "New project"
- Rename to: "LEMON Olimpiade API"

### Step 3: Copy Code
- Open `Code.gs` from this folder
- Copy ALL code (Ctrl+A, Ctrl+C)
- Paste into Apps Script editor
- Save (Ctrl+S)

### Step 4: Deploy as Web App
- Click Deploy → New deployment
- Select type: Web app
- Settings:
  - Execute as: **Me**
  - Who has access: **Anyone**
- Click Deploy
- **Copy the Web App URL**

### Step 5: Update Frontend
- Open: `d:\Lemon\js\modules\api-client.js`
- Find: `const API_CONFIG = { endpoint: '' }`
- Paste your Web App URL into endpoint
- Save file

**Done! Test from beranda-ipa.html**

---

## What's Included

### Code.gs (~10 KB)
Complete Google Apps Script with:
- Photo upload endpoint
- Answer submission endpoint
- Input validation
- Error handling  
- 3 test functions
- Comprehensive logging

### Configuration
Pre-configured with:
- Spreadsheet Foto ID: 1TYg1rnuOProAPqToSouBtRQAYmy4gX_7wVZJvz62MRo
- Spreadsheet Jawaban ID: 14eXYCrcplRrtALbj_StBLIaJ8LQeAlEsqopwqpAv5UU
- Valid categories: IPA, IPS, MATEMATIKA
- Max photo size: 700KB (Base64)

---

## API Endpoints

Once deployed:

**POST /exec** (Upload Photo)
- Request: `{ action: 'uploadPhoto', nama, lomba, photoBase64, size }`
- Response: `{ success: true, data: { photoId, timestamp } }`

**POST /exec** (Submit Answers)
- Request: `{ action: 'submitAnswers', lomba, nama, sekolah, mulai, selesai, photoId, jawaban }`
- Response: `{ success: true, data: { rowNumber, timestamp } }`

**GET /exec** (Health Check)  
- Response: `{ status: 'OK', message: 'LEMON Olimpiade API is running', ... }`

---

## Testing

### Test Functions in Code.gs

Run these from Apps Script editor (after pasting code):

1. **testUploadPhoto()** - Uploads mock photo, returns photoId
2. **testSubmitAnswers()** - Submits mock answers with photoId=2  
3. **testGetEndpoint()** - Tests GET endpoint

Check Execution log for results.

### Test from Browser

After deployment, test from browser console (F12):

`javascript
fetch('YOUR_WEB_APP_URL', {
  method: 'POST',
  body: JSON.stringify({
    action: 'uploadPhoto',
    nama: 'Test',
    lomba: 'IPA',
    photoBase64: '/9j/...',
    size: 1000
  })
}).then(r => r.json()).then(console.log);
`

---

## Architecture

`
Frontend (Browser)
    ↓
api-client.js
    ↓
Google Apps Script (Code.gs)
    ↓
Google Sheets
    ├── Spreadsheet Foto
    └── Spreadsheet Jawaban
`

---

## Documentation

**Full Deployment Guide:** DEPLOYMENT_GUIDE.md (in this folder)  
**Schema Documentation:** ../SPREADSHEET_SCHEMA.md  
**Requirements:** ../.kiro/specs/lemon-optimization/requirements.md

---

## Support

**Common Issues:**
- Authorization errors → See DEPLOYMENT_GUIDE.md Step 4
- 404 errors → Verify URL ends with `/exec`
- CORS errors → Ensure "Who has access: Anyone"

**Need Help?** Check DEPLOYMENT_GUIDE.md troubleshooting section.

---

## Next Steps

After deployment:
1. ✅ Run test functions in Apps Script
2. ✅ Update api-client.js with Web App URL  
3. ✅ Test from browser console
4. ✅ Test photo upload from beranda-ipa.html
5. ✅ Clean up test data from spreadsheets
6. ✅ Ready for production!

---

**Version:** 1.0  
**Created:** 2025-02-15  
**Part of:** LEMON Optimization Project
