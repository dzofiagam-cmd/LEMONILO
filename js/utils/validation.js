/**
 * @fileoverview Utility functions untuk validasi input dan data
 * @module utils/validation
 * @description
 * Module ini menyediakan fungsi-fungsi validasi untuk:
 * - Validasi file foto (MIME type, magic bytes, size)
 * - Validasi format data (UUID, timestamps)
 * - Validasi input peserta (nama, lomba)
 * 
 * @author LEMON Olimpiade System
 * @version 1.0.0
 */

/**
 * MIME types yang diperbolehkan untuk upload foto
 * @constant {string[]}
 */
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Magic bytes untuk validasi file format
 * @constant {Object.<string, number[]>}
 */
const MAGIC_BYTES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46]
};

/**
 * Validasi MIME type file
 * @param {File} file - File object dari input
 * @returns {boolean} True jika MIME type valid
 */
function validateMimeType(file) {
  return ALLOWED_MIME_TYPES.includes(file.type);
}

/**
 * Validasi magic bytes dari file untuk memastikan file benar-benar gambar
 * @param {File} file - File object dari input
 * @returns {Promise<boolean>} Promise yang resolve ke true jika magic bytes valid
 */
async function validateMagicBytes(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arr = new Uint8Array(e.target.result).subarray(0, 4);
      const magicBytes = MAGIC_BYTES[file.type];
      
      if (!magicBytes) {
        resolve(false);
        return;
      }
      
      const isValid = magicBytes.every((byte, index) => arr[index] === byte);
      resolve(isValid);
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsArrayBuffer(file.slice(0, 4));
  });
}

/**
 * Validasi ukuran file
 * @param {File} file - File object dari input
 * @param {number} maxSizeBytes - Ukuran maksimal dalam bytes
 * @returns {boolean} True jika ukuran valid
 */
function validateFileSize(file, maxSizeBytes) {
  return file.size <= maxSizeBytes;
}

/**
 * Validasi format UUID
 * @param {string} uuid - String UUID untuk divalidasi
 * @returns {boolean} True jika format UUID valid
 */
function validateUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validasi format timestamp ISO 8601
 * @param {string} timestamp - String timestamp untuk divalidasi
 * @returns {boolean} True jika format valid
 */
function validateTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date instanceof Date && !isNaN(date);
}

/**
 * Validasi nama peserta (tidak boleh kosong, min 3 karakter)
 * @param {string} nama - Nama peserta
 * @returns {boolean} True jika nama valid
 */
function validateNama(nama) {
  return typeof nama === 'string' && nama.trim().length >= 3;
}

/**
 * Validasi kategori lomba
 * @param {string} lomba - Kategori lomba (IPA/IPS/MATEMATIKA)
 * @returns {boolean} True jika kategori valid
 */
function validateLomba(lomba) {
  const validLomba = ['IPA', 'IPS', 'MATEMATIKA'];
  return validLomba.includes(lomba?.toUpperCase());
}

/**
 * Validasi complete file photo sebelum upload
 * @param {File} file - File object dari input
 * @param {number} maxSize - Ukuran maksimal dalam bytes (default: 5MB)
 * @returns {Promise<{valid: boolean, error: string|null}>} Result validasi
 */
async function validatePhotoFile(file, maxSize = 5 * 1024 * 1024) {
  // Check if file exists
  if (!file) {
    return { valid: false, error: 'File tidak ditemukan' };
  }
  
  // Check MIME type
  if (!validateMimeType(file)) {
    return { 
      valid: false, 
      error: 'Format file tidak didukung. Gunakan foto JPG, JPEG, atau PNG.' 
    };
  }
  
  // Check file size
  if (!validateFileSize(file, maxSize)) {
    return { 
      valid: false, 
      error: `Ukuran file melebihi ${maxSize / (1024 * 1024)} MB. Pilih foto yang lebih kecil.` 
    };
  }
  
  // Check magic bytes
  try {
    const validMagicBytes = await validateMagicBytes(file);
    if (!validMagicBytes) {
      return { valid: false, error: 'File bukan gambar valid' };
    }
  } catch (error) {
    return { valid: false, error: 'Gagal memvalidasi file' };
  }
  
  return { valid: true, error: null };
}

// Export functions
export {
  ALLOWED_MIME_TYPES,
  MAGIC_BYTES,
  validateMimeType,
  validateMagicBytes,
  validateFileSize,
  validateUUID,
  validateTimestamp,
  validateNama,
  validateLomba,
  validatePhotoFile
};
