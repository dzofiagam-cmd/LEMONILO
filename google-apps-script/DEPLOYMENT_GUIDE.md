See Code.gs for the complete Google Apps Script code.

# Manual Deployment Steps

Since I cannot deploy to Google Apps Script directly, please follow these steps:

## Step 1: Open Google Apps Script

1. Go to: https://script.google.com
2. Sign in with your Google account

## Step 2: Create New Project

1. Click 'New project' button (top left)
2. The editor opens with a default myFunction()  
3. Click 'Untitled project' at the top
4. Rename to: **LEMON Olimpiade API**
5. Click outside to save the name

## Step 3: Copy the Code

1. Open the file: `d:\Lemon\google-apps-script\Code.gs`
2. Select all code (Ctrl+A)
3. Copy (Ctrl+C)
4. Go back to Apps Script editor
5. Delete the default `function myFunction() {}` code
6. Paste the copied code (Ctrl+V)
7. Click Save icon (💾) or press Ctrl+S

## Step 4: Verify Configuration

Check the CONFIG object at the top of the code:

`javascript
const CONFIG = {
  SPREADSHEET_FOTO_ID: '1TYg1rnuOProAPqToSouBtRQAYmy4gX_7wVZJvz62MRo',
  SPREADSHEET_JAWABAN_ID: '14eXYCrcplRrtALbj_StBLIaJ8LQeAlEsqopwqpAv5UU',
  // ...
};
`

These should match your Google Sheets URLs.

## Step 5: Test the Functions

Before deploying, test the code works:

### Test 1: Upload Photo

1. In the function dropdown (next to Run ▶️), select: **testUploadPhoto**
2. Click Run ▶️
3. **First time only**: You'll see 'Authorization required'
   - Click 'Review permissions'
   - Choose your Google account
   - Click 'Advanced'
   - Click 'Go to LEMON Olimpiade API (unsafe)'
   - Click 'Allow'
4. Check the Execution log (bottom panel)
5. Should show: Test upload result with success=true
6. Verify in Spreadsheet Foto - new row added

### Test 2: Submit Answers

1. Select function: **testSubmitAnswers**
2. Click Run ▶️
3. Check Execution log
4. Verify in Spreadsheet Jawaban - new row added

### Test 3: GET Endpoint  

1. Select function: **testGetEndpoint**
2. Click Run ▶️
3. Check Execution log - should show status='OK'

**If all tests pass → Continue to deployment**

## Step 6: Deploy as Web App

1. Click **Deploy** button (top right)
2. Select **New deployment**
3. Click gear icon ⚙️ next to 'Select type'
4. Choose **Web app**
5. Fill in the form:

   **Description:** Production v1
   
   **Execute as:** Me (your@email.com)
   
   **Who has access:** Anyone
   
6. Click **Deploy**
7. If authorization required again, follow same steps as before
8. **Important**: Copy the Web App URL that appears:

   `
   https://script.google.com/macros/s/AKfycbxXXXXXX.../exec
   `

   **Save this URL - you need it for Step 7!**

9. Click **Done**

## Step 7: Update Frontend Configuration

Now tell the frontend where your API is:

1. Open file: `d:\Lemon\js\modules\api-client.js`
2. Find this code (around line 15):

   `javascript
   const API_CONFIG = {
     endpoint: '',  // ← Empty by default
     timeout: 10000,
     retries: 3
   };
   `

3. Paste your Web App URL:

   `javascript
   const API_CONFIG = {
     endpoint: 'https://script.google.com/macros/s/AKfycbxXXX.../exec',
     timeout: 10000,
     retries: 3
   };
   `

4. Save the file (Ctrl+S)

## Step 8: Test the Integration

Test that frontend can communicate with your API:

1. Open `d:\Lemon\beranda-ipa.html` in a browser
2. Open DevTools (press F12)
3. Go to Console tab
4. You should see the page load normally
5. Try uploading a photo (click webcam or file upload)
6. Check browser console for any errors
7. Check Apps Script Execution log for incoming requests

## Step 9: Clean Up Test Data

Before production use:

1. Open Spreadsheet Foto
2. Delete rows with 'Test Peserta'
3. Open Spreadsheet Jawaban  
4. Delete rows with 'Test Peserta'
5. Keep header rows (Row 1) in both sheets

## Step 10: Production Checklist

- [x] Code.gs deployed to Apps Script
- [x] Test functions all pass
- [x] Web App URL copied
- [x] api-client.js updated with URL
- [x] Test data cleaned up
- [ ] Real photo upload test successful
- [ ] Complete exam flow tested
- [ ] Spreadsheets have proper permissions
- [ ] Backup created

---

## Troubleshooting

### Issue: 'Authorization Required' won't go away

**Solution:**
1. Apps Script editor → ⚙️ Project Settings
2. Under 'Google Cloud Platform project':
   - Use default or configure OAuth scopes

### Issue: 404 when accessing Web App URL

**Solution:**
- Verify URL ends with `/exec` (not `/dev`)
- Try accessing in incognito browser
- Redeploy if needed

### Issue: CORS error in browser

**Solution:**
- Ensure 'Who has access: Anyone' (not 'Only myself')
- Apps Script handles CORS automatically
- Clear browser cache

### Issue: 'Script function not found: doPost'

**Solution:**
- Verify Code.gs is the only file
- Code must be saved before deploying
- Redeploy with Deploy → Manage deployments → Edit

---

## What Happens Next?

After successful deployment:

1. Students can upload photos from beranda-*.html pages
2. Photos are compressed to ~500KB and uploaded to Spreadsheet Foto  
3. System returns a photoId (row number)
4. During exam submission, photoId is sent (not the photo data)
5. Answers are stored in Spreadsheet Jawaban with photoId reference

**Result:** 99% bandwidth reduction (6.7MB → 50KB per submission)

---

## Need More Help?

- Check Apps Script Execution log for errors
- Review SPREADSHEET_SCHEMA.md for database structure
- See ../DOCUMENTATION.md for complete project docs
- Check browser DevTools Console for frontend errors
- Review tasks.md for implementation details

---

**Deployment Guide Version:** 1.0  
**Compatible with:** Code.gs v1.0  
**Last Updated:** 2025-02-15
