/**
 * LEMON Olimpiade 2026 - Google Apps Script API
 * 
 * This script provides a Web App API endpoint for:
 * 1. Uploading compressed photos to Spreadsheet Foto
 * 2. Submitting exam answers to Spreadsheet Jawaban
 * 
 * Deployment Instructions:
 * 1. Copy this code to Google Apps Script (script.google.com)
 * 2. Update SPREADSHEET_IDS below (if different)
 * 3. Deploy as Web App:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the Web App URL and update APIClient config
 * 
 * @version 1.0
 * @author LEMON Optimization Project
 */

// ==================== CONFIGURATION ====================

const CONFIG = {
  SPREADSHEET_FOTO_ID: '1TYg1rnuOProAPqToSouBtRQAYmy4gX_7wVZJvz62MRo',
  SPREADSHEET_JAWABAN_ID: '14eXYCrcplRrtALbj_StBLIaJ8LQeAlEsqopwqpAv5UU',
  
  // Column indexes (0-based)
  FOTO_COLS: {
    TIMESTAMP: 0,    // A
    NAMA: 1,         // B
    LOMBA: 2,        // C
    PHOTO_BASE64: 3, // D
    SIZE: 4,         // E
    STATUS: 5        // F
  },
  
  JAWABAN_COLS: {
    LOMBA: 0,        // A
    NAMA: 1,         // B
    SEKOLAH: 2,      // C
    MULAI: 3,        // D
    SELESAI: 4,      // E
    PHOTO_ID: 5,     // F
    JAWABAN: 6,      // G
    TERKIRIM: 7      // H
  },
  
  // Validation
  VALID_LOMBA: ['IPA', 'IPS', 'MATEMATIKA'],
  MAX_PHOTO_SIZE: 700000, // ~700KB in chars (Base64)
  MAX_QUESTIONS: 30
};

// ==================== MAIN HANDLER ====================

/**
 * Main entry point for POST requests
 * Handles both uploadPhoto and submitAnswers actions
 */
function doPost(e) {
  try {
    // Parse request body
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    
    Logger.log('Received request: action=' + action);
    
    // Route to appropriate handler
    if (action === 'uploadPhoto') {
      return handleUploadPhoto(params);
    } else if (action === 'submitAnswers') {
      return handleSubmitAnswers(params);
    } else {
      return createErrorResponse('Invalid action. Use "uploadPhoto" or "submitAnswers".');
    }
    
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    Logger.log('Stack trace: ' + error.stack);
    return createErrorResponse('Terjadi kesalahan pada server: ' + error.message);
  }
}

/**
 * Test endpoint for GET requests
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'OK',
    message: 'LEMON Olimpiade API is running',
    version: '1.0',
    endpoints: {
      uploadPhoto: 'POST with action=uploadPhoto',
      submitAnswers: 'POST with action=submitAnswers'
    }
  })).setMimeType(ContentService.MimeType.JSON);
}

// ==================== PHOTO UPLOAD HANDLER ====================

/**
 * Handle photo upload request
 * Validates data and appends to Spreadsheet Foto
 * 
 * @param {Object} params - Request parameters
 * @returns {ContentService.TextOutput} JSON response
 */
function handleUploadPhoto(params) {
  try {
    // Validate required fields
    const validation = validatePhotoUpload(params);
    if (!validation.valid) {
      return createErrorResponse(validation.error);
    }
    
    // Open spreadsheet
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_FOTO_ID);
    const sheet = spreadsheet.getSheets()[0];
    
    // Prepare row data
    const timestamp = new Date().toISOString();
    const rowData = [
      timestamp,                           // A: Timestamp
      params.nama,                         // B: Nama
      params.lomba,                        // C: Lomba
      params.photoBase64,                  // D: PhotoBase64
      parseInt(params.size),               // E: Size
      'uploaded'                           // F: Status
    ];
    
    // Append row
    sheet.appendRow(rowData);
    
    // Get photoId (row number of the newly added row)
    const photoId = sheet.getLastRow();
    
    Logger.log('Photo uploaded successfully: photoId=' + photoId + ', nama=' + params.nama + ', lomba=' + params.lomba);
    
    return createSuccessResponse({
      photoId: photoId,
      timestamp: timestamp
    });
    
  } catch (error) {
    Logger.log('Error in handleUploadPhoto: ' + error.toString());
    return createErrorResponse('Gagal mengunggah foto: ' + error.message);
  }
}

/**
 * Validate photo upload parameters
 */
function validatePhotoUpload(params) {
  // Check required fields
  if (!params.nama || params.nama.trim() === '') {
    return { valid: false, error: 'Nama tidak boleh kosong' };
  }
  
  if (!params.lomba || !CONFIG.VALID_LOMBA.includes(params.lomba)) {
    return { valid: false, error: 'Lomba harus salah satu dari: IPA, IPS, MATEMATIKA' };
  }
  
  if (!params.photoBase64 || params.photoBase64.length === 0) {
    return { valid: false, error: 'Foto tidak boleh kosong' };
  }
  
  if (params.photoBase64.length > CONFIG.MAX_PHOTO_SIZE) {
    return { valid: false, error: 'Ukuran foto terlalu besar (max 700KB dalam Base64)' };
  }
  
  if (!params.size || params.size <= 0) {
    return { valid: false, error: 'Ukuran file tidak valid' };
  }
  
  return { valid: true };
}

// ==================== ANSWER SUBMISSION HANDLER ====================

/**
 * Handle answer submission request
 * Validates data and appends to Spreadsheet Jawaban
 * 
 * @param {Object} params - Request parameters
 * @returns {ContentService.TextOutput} JSON response
 */
function handleSubmitAnswers(params) {
  try {
    // Validate required fields
    const validation = validateAnswerSubmission(params);
    if (!validation.valid) {
      return createErrorResponse(validation.error);
    }
    
    // Open spreadsheet
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_JAWABAN_ID);
    const sheet = spreadsheet.getSheets()[0];
    
    // Prepare row data
    const timestamp = new Date().toISOString();
    const jawabanJson = JSON.stringify(params.jawaban);
    
    const rowData = [
      params.lomba,                        // A: Lomba
      params.nama,                         // B: Nama
      params.sekolah,                      // C: Sekolah
      params.mulai,                        // D: Mulai
      params.selesai,                      // E: Selesai
      params.photoId || 0,                 // F: PhotoId
      jawabanJson,                         // G: Jawaban (JSON string)
      true                                 // H: Terkirim
    ];
    
    // Append row
    sheet.appendRow(rowData);
    
    // Get row number
    const rowNumber = sheet.getLastRow();
    
    Logger.log('Answers submitted successfully: row=' + rowNumber + ', nama=' + params.nama + ', lomba=' + params.lomba + ', photoId=' + params.photoId);
    
    return createSuccessResponse({
      rowNumber: rowNumber,
      timestamp: timestamp
    });
    
  } catch (error) {
    Logger.log('Error in handleSubmitAnswers: ' + error.toString());
    return createErrorResponse('Gagal mengirim jawaban: ' + error.message);
  }
}

/**
 * Validate answer submission parameters
 */
function validateAnswerSubmission(params) {
  // Check required fields
  if (!params.lomba || !CONFIG.VALID_LOMBA.includes(params.lomba)) {
    return { valid: false, error: 'Lomba harus salah satu dari: IPA, IPS, MATEMATIKA' };
  }
  
  if (!params.nama || params.nama.trim() === '') {
    return { valid: false, error: 'Nama tidak boleh kosong' };
  }
  
  if (!params.sekolah || params.sekolah.trim() === '') {
    return { valid: false, error: 'Sekolah tidak boleh kosong' };
  }
  
  if (!params.mulai || !isValidISO8601(params.mulai)) {
    return { valid: false, error: 'Waktu mulai tidak valid (harus ISO 8601)' };
  }
  
  if (!params.selesai || !isValidISO8601(params.selesai)) {
    return { valid: false, error: 'Waktu selesai tidak valid (harus ISO 8601)' };
  }
  
  if (new Date(params.selesai) <= new Date(params.mulai)) {
    return { valid: false, error: 'Waktu selesai harus lebih besar dari waktu mulai' };
  }
  
  if (!params.jawaban || typeof params.jawaban !== 'object') {
    return { valid: false, error: 'Jawaban harus berupa object' };
  }
  
  // Validate photoId if provided
  if (params.photoId && (typeof params.photoId !== 'number' || params.photoId <= 0)) {
    return { valid: false, error: 'PhotoId harus berupa angka positif' };
  }
  
  return { valid: true };
}

/**
 * Validate ISO 8601 date string
 */
function isValidISO8601(dateString) {
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch (e) {
    return false;
  }
}

// ==================== RESPONSE HELPERS ====================

/**
 * Create success response
 */
function createSuccessResponse(data) {
  const response = {
    success: true,
    data: data
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Create error response
 */
function createErrorResponse(message) {
  const response = {
    success: false,
    error: message
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== TEST FUNCTIONS ====================

/**
 * Test photo upload
 * Run this function from Apps Script editor to test
 */
function testUploadPhoto() {
  const testParams = {
    action: 'uploadPhoto',
    nama: 'Test Peserta',
    lomba: 'IPA',
    photoBase64: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUGBgYFBgYGBwkIBgcJBwYGCAsICQoKCgoKBggLDAsKDAkKCgr/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AN//Z',
    size: 485000,
    timestamp: new Date().toISOString()
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testParams)
    }
  };
  
  const result = doPost(mockEvent);
  Logger.log('Test upload result: ' + result.getContent());
}

/**
 * Test answer submission
 * Run this function from Apps Script editor to test
 */
function testSubmitAnswers() {
  const testParams = {
    action: 'submitAnswers',
    lomba: 'IPA',
    nama: 'Test Peserta',
    sekolah: 'SMA Test',
    mulai: '2025-02-15T14:30:00.000Z',
    selesai: '2025-02-15T15:30:00.000Z',
    photoId: 2,
    jawaban: {
      '1': 'A',
      '2': 'B',
      '3': 'C',
      '4': 'D',
      '5': 'E'
    }
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testParams)
    }
  };
  
  const result = doPost(mockEvent);
  Logger.log('Test submit result: ' + result.getContent());
}

/**
 * Test GET endpoint
 */
function testGetEndpoint() {
  const result = doGet();
  Logger.log('GET endpoint result: ' + result.getContent());
}
