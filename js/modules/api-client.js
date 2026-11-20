/**
 * @fileoverview Module untuk komunikasi dengan backend API (Google Apps Script)
 * @module modules/api-client
 * @description
 * APIClient module bertanggung jawab untuk:
 * - Upload foto ke server dengan retry mechanism
 * - Submit jawaban ujian dengan error handling
 * - Transparent error messages dalam Bahasa Indonesia
 * - Automatic retry dengan exponential backoff
 * - Proper CORS handling dengan credentials
 * 
 * Backend Infrastructure:
 * - Photo Storage: Google Sheets (Base64 strings)
 * - Answer Storage: Google Sheets (JSON data)
 * - API Layer: Google Apps Script Web App (doPost endpoint)
 * 
 * Error Handling:
 * - 4xx errors: User-friendly messages, no retry
 * - 5xx errors: Retry up to 3 times with backoff
 * - Network errors: Retry up to 3 times with backoff
 * - Timeout: 10 seconds for upload, 5 seconds for submit
 * 
 * @requires utils/logger
 * 
 * @author LEMON Olimpiade System
 * @version 1.0.0
 */

import { logApiCall, error as logError, warn as logWarn } from '../utils/logger.js';

/**
 * API configuration
 * @constant {Object}
 */
const API_CONFIG = {
  // Google Apps Script Web App URL (same endpoint for both actions)
  // TODO: Update with actual deployment ID from Task 6.1
  endpoint: 'https://script.google.com/macros/s/AKfycbzsANCgZ-OfJV2cFuMpZ4-2JbhnEFcU1hvAMqPnK6h5M3fYiFzDjA3QDytk0RJzopL7/exec',
  maxRetries: 3,
  uploadTimeout: 10000, // 10 seconds
  submitTimeout: 5000, // 5 seconds
  initialBackoffDelay: 2000 // 2 seconds
};

/**
 * HTTP error messages dalam Bahasa Indonesia
 * @constant {Object.<number, string>}
 */
const ERROR_MESSAGES = {
  400: 'Data yang dikirim tidak valid. Periksa kembali form Anda.',
  401: 'Sesi Anda telah berakhir. Silakan login kembali.',
  403: 'Anda tidak memiliki akses untuk melakukan aksi ini.',
  404: 'Server tidak ditemukan. Hubungi panitia.',
  408: 'Koneksi timeout. Periksa koneksi internet Anda.',
  413: 'File yang diunggah terlalu besar. Maksimal 1MB.',
  429: 'Terlalu banyak percobaan. Tunggu beberapa saat.',
  500: 'Server sedang bermasalah. Coba lagi dalam beberapa menit atau hubungi panitia.',
  503: 'Server sedang bermasalah. Coba lagi dalam beberapa menit atau hubungi panitia.'
};

/**
 * APIClient class untuk handle API operations
 */
class APIClient {
  /**
   * Create an APIClient instance
   * @param {Object} [config] - Custom configuration
   */
  constructor(config = {}) {
    this.config = { ...API_CONFIG, ...config };
  }

  /**
   * Upload photo to server (Google Apps Script)
   * @param {Blob} photoBlob - Compressed photo blob (max 1MB)
   * @param {Object} metadata - Photo metadata
   * @param {string} metadata.nama - Nama peserta
   * @param {string} metadata.lomba - Kategori lomba
   * @returns {Promise<{photoId: number, timestamp: string}>} Upload result with photoId (row number)
   * @throws {Error} If upload fails after all retries
   */
  async uploadPhoto(photoBlob, metadata) {
    // Validate blob size
    if (photoBlob.size > 1024 * 1024) {
      throw new Error('File yang diunggah terlalu besar. Maksimal 1MB.');
    }
    
    const startTime = performance.now();
    
    // Convert blob to Base64 for Google Sheets storage
    const base64Data = await this._blobToBase64(photoBlob);
    
    const payload = {
      action: 'uploadPhoto',
      photo: base64Data,
      nama: metadata.nama,
      lomba: metadata.lomba,
      size: photoBlob.size,
      timestamp: new Date().toISOString()
    };
    
    try {
      const result = await this._requestWithRetry(
        this.config.endpoint,
        payload,
        this.config.uploadTimeout
      );
      
      const duration = performance.now() - startTime;
      
      logApiCall({
        endpoint: 'uploadPhoto',
        method: 'POST',
        duration: Math.round(duration),
        statusCode: 200,
        requestSize: JSON.stringify(payload).length
      });
      
      // Return photoId (row number from Spreadsheet Foto) and timestamp
      return {
        photoId: result.data.photoId,
        timestamp: result.data.timestamp
      };
      
    } catch (error) {
      const duration = performance.now() - startTime;
      
      logApiCall({
        endpoint: 'uploadPhoto',
        method: 'POST',
        duration: Math.round(duration),
        statusCode: error.statusCode || 0
      });
      
      throw error;
    }
  }

  /**
   * Submit exam answers to server (Google Apps Script)
   * @param {Object} answerData - Complete answer payload
   * @param {string} answerData.lomba - Kategori lomba (IPA/IPS/MATEMATIKA)
   * @param {string} answerData.nama - Nama peserta
   * @param {string} answerData.sekolah - Nama sekolah
   * @param {string} answerData.mulai - ISO timestamp mulai ujian
   * @param {string} answerData.selesai - ISO timestamp selesai ujian
   * @param {number} answerData.photoId - Row number reference ke Spreadsheet Foto
   * @param {Object} answerData.jawaban - Map nomor soal -> jawaban (A-E)
   * @returns {Promise<{success: boolean, message: string}>} Submit result
   * @throws {Error} If submit fails
   */
  async submitAnswers(answerData) {
    const startTime = performance.now();
    
    const payload = {
      action: 'submitAnswers',
      lomba: answerData.lomba,
      nama: answerData.nama,
      sekolah: answerData.sekolah,
      mulai: answerData.mulai,
      selesai: answerData.selesai,
      photoId: answerData.photoId,
      jawaban: answerData.jawaban,
      timestamp: new Date().toISOString()
    };
    
    const payloadSize = JSON.stringify(payload).length;
    
    try {
      const result = await this._requestWithRetry(
        this.config.endpoint,
        payload,
        this.config.submitTimeout
      );
      
      const duration = performance.now() - startTime;
      
      logApiCall({
        endpoint: 'submitAnswers',
        method: 'POST',
        duration: Math.round(duration),
        statusCode: 200,
        requestSize: payloadSize
      });
      
      return {
        success: true,
        message: result.message || 'Jawaban berhasil dikirim'
      };
      
    } catch (error) {
      const duration = performance.now() - startTime;
      
      logApiCall({
        endpoint: 'submitAnswers',
        method: 'POST',
        duration: Math.round(duration),
        statusCode: error.statusCode || 0,
        requestSize: payloadSize
      });
      
      throw error;
    }
  }

  /**
   * Make API request with retry mechanism
   * @private
   * @param {string} endpoint - API endpoint URL
   * @param {Object} payload - Request payload
   * @param {number} timeout - Request timeout in ms
   * @returns {Promise<Object>} Response data
   */
  async _requestWithRetry(endpoint, payload, timeout) {
    let lastError = null;
    
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const result = await this._makeRequest(endpoint, payload, timeout);
        return result;
        
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors (4xx)
        if (error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }
        
        // Don't retry if no more attempts left
        if (attempt === this.config.maxRetries - 1) {
          break;
        }
        
        // Calculate backoff delay (exponential: 2^attempt * initial delay)
        const backoffDelay = this.config.initialBackoffDelay * Math.pow(2, attempt);
        
        logWarn(`Request failed, retrying in ${backoffDelay}ms (attempt ${attempt + 1}/${this.config.maxRetries})`);
        
        await this._sleep(backoffDelay);
      }
    }
    
    // All retries failed
    throw lastError;
  }

  /**
   * Make single API request to Google Apps Script
   * @private
   * @param {string} endpoint - API endpoint URL
   * @param {Object} payload - Request payload
   * @param {number} timeout - Request timeout in ms
   * @returns {Promise<Object>} Response data
   */
  async _makeRequest(endpoint, payload, timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        credentials: 'include',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Handle HTTP errors
      if (!response.ok) {
        const errorMessage = this._getErrorMessage(response.status);
        const error = new Error(errorMessage);
        error.statusCode = response.status;
        throw error;
      }
      
      const data = await response.json();
      
      // Check for application-level errors from Google Apps Script
      if (data.success === false || data.error) {
        const errorMessage = data.error || 'Server mengembalikan error';
        throw new Error(errorMessage);
      }
      
      return data;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle timeout
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Koneksi timeout. Periksa koneksi internet Anda.');
        timeoutError.statusCode = 408;
        throw timeoutError;
      }
      
      // Handle network errors
      if (error.message.includes('fetch') || error.message.includes('network')) {
        const networkError = new Error('Koneksi internet bermasalah. Periksa koneksi Anda.');
        networkError.isNetworkError = true;
        throw networkError;
      }
      
      throw error;
    }
  }

  /**
   * Get user-friendly error message for status code
   * @private
   * @param {number} statusCode - HTTP status code
   * @returns {string} Error message in Bahasa Indonesia
   */
  _getErrorMessage(statusCode) {
    // Check specific error messages
    if (ERROR_MESSAGES[statusCode]) {
      return ERROR_MESSAGES[statusCode];
    }
    
    // Generic 5xx error
    if (statusCode >= 500) {
      return ERROR_MESSAGES[500];
    }
    
    // Generic error
    return 'Terjadi kesalahan. Silakan coba lagi atau hubungi panitia.';
  }

  /**
   * Convert Blob to Base64 string
   * @private
   * @param {Blob} blob - Blob to convert
   * @returns {Promise<string>} Base64 string
   */
  _blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Sleep for specified duration
   * @private
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Store photo temporarily in IndexedDB when upload fails
   * @param {Blob} photoBlob - Photo blob to store
   * @param {Object} metadata - Photo metadata
   * @returns {Promise<string>} Temporary photo ID
   */
  async storePendingPhoto(photoBlob, metadata) {
    try {
      // Use StorageManager if available, otherwise use IndexedDB directly
      const tempId = `pending_${Date.now()}`;
      const photoData = {
        blob: photoBlob,
        metadata,
        timestamp: new Date().toISOString()
      };
      
      // Store in IndexedDB
      const db = await this._openPendingPhotoDB();
      await this._storePendingPhotoInDB(db, tempId, photoData);
      
      logWarn(`Photo stored temporarily with ID: ${tempId}`);
      return tempId;
      
    } catch (err) {
      logError('Failed to store pending photo', err);
      throw new Error('Gagal menyimpan foto sementara');
    }
  }

  /**
   * Open pending photos IndexedDB
   * @private
   * @returns {Promise<IDBDatabase>}
   */
  _openPendingPhotoDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('LEMON_PendingPhotos', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('photos')) {
          db.createObjectStore('photos');
        }
      };
    });
  }

  /**
   * Store pending photo in IndexedDB
   * @private
   * @param {IDBDatabase} db - Database instance
   * @param {string} id - Photo ID
   * @param {Object} data - Photo data
   */
  _storePendingPhotoInDB(db, id, data) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['photos'], 'readwrite');
      const store = transaction.objectStore('photos');
      const request = store.put(data, id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get API configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update API configuration
   * @param {Object} newConfig - New config to merge
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export class and constants
export { APIClient, API_CONFIG, ERROR_MESSAGES };
export default APIClient;
