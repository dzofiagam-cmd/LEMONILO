/**
 * @fileoverview Module untuk manajemen localStorage dan IndexedDB
 * @module modules/storage-manager
 * @description
 * StorageManager module bertanggung jawab untuk:
 * - Monitor localStorage quota usage
 * - Automatic cleanup expired data
 * - Fallback ke IndexedDB saat localStorage penuh
 * - Store photo references instead of Base64 data
 * - Preserve active exam session data
 * 
 * Storage Strategy:
 * - Primary: localStorage (faster, simpler)
 * - Fallback: IndexedDB (larger capacity)
 * - Trigger migration at 95% quota
 * - Auto cleanup at 80% quota
 * 
 * @requires utils/logger
 * 
 * @author LEMON Olimpiade System
 * @version 1.0.0
 */

import { logStorageQuota, warn as logWarn, error as logError } from '../utils/logger.js';

/**
 * Storage thresholds
 * @constant {Object}
 */
const STORAGE_THRESHOLDS = {
  CLEANUP_TRIGGER: 80, // 80% - start cleanup
  MIGRATION_TRIGGER: 95, // 95% - migrate to IndexedDB
  EXAM_DATA_EXPIRY_DAYS: 7 // Clean data older than 7 days
};

/**
 * IndexedDB configuration
 * @constant {Object}
 */
const INDEXEDDB_CONFIG = {
  dbName: 'LEMON_Storage',
  version: 1,
  storeName: 'examData'
};

/**
 * StorageManager class untuk handle storage operations
 */
class StorageManager {
  /**
   * Create a StorageManager instance
   */
  constructor() {
    this.db = null;
    this.isIndexedDBAvailable = this._checkIndexedDBSupport();
  }

  /**
   * Initialize IndexedDB connection
   * @private
   * @returns {Promise<IDBDatabase>} Database instance
   */
  async _initIndexedDB() {
    if (this.db) return this.db;
    
    if (!this.isIndexedDBAvailable) {
      throw new Error('IndexedDB not supported');
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        INDEXEDDB_CONFIG.dbName,
        INDEXEDDB_CONFIG.version
      );
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(INDEXEDDB_CONFIG.storeName)) {
          db.createObjectStore(INDEXEDDB_CONFIG.storeName);
        }
      };
    });
  }

  /**
   * Check if IndexedDB is supported
   * @private
   * @returns {boolean} True if supported
   */
  _checkIndexedDBSupport() {
    return 'indexedDB' in window;
  }

  /**
   * Get current storage quota information
   * @returns {Promise<{used: number, total: number, percentage: number}>} Quota info
   */
  async getQuota() {
    try {
      // Try modern Storage API first
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const total = estimate.quota || 0;
        const percentage = total > 0 ? (used / total) * 100 : 0;
        
        const quota = { used, total, percentage };
        logStorageQuota(quota);
        return quota;
      }
      
      // Fallback: calculate localStorage size manually
      const used = this._calculateLocalStorageSize();
      const total = 5 * 1024 * 1024; // Assume 5MB default
      const percentage = (used / total) * 100;
      
      const quota = { used, total, percentage };
      logStorageQuota(quota);
      return quota;
      
    } catch (err) {
      logError('Failed to get storage quota', err);
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * Calculate localStorage size manually
   * @private
   * @returns {number} Size in bytes
   */
  _calculateLocalStorageSize() {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        // UTF-16 encoding: 2 bytes per character
        total += (key.length + localStorage[key].length) * 2;
      }
    }
    return total;
  }

  /**
   * Set item in storage (with automatic quota management)
   * @param {string} key - Storage key
   * @param {*} value - Value to store (will be JSON stringified)
   * @returns {Promise<{success: boolean, storage: string}>} Result
   */
  async setItem(key, value) {
    // Add timestamp if not present
    const valueWithTimestamp = typeof value === 'object' && value !== null
      ? { ...value, timestamp: value.timestamp || new Date().toISOString() }
      : value;
    
    const stringValue = JSON.stringify(valueWithTimestamp);
    
    // Check quota before attempting to save
    const quota = await this.getQuota();
    
    // Auto cleanup at 80% threshold
    if (quota.percentage >= STORAGE_THRESHOLDS.CLEANUP_TRIGGER) {
      logWarn(`Storage at ${quota.percentage.toFixed(1)}% - triggering cleanup`);
      await this.clearExpired();
    }
    
    // Auto migrate at 95% threshold
    if (quota.percentage >= STORAGE_THRESHOLDS.MIGRATION_TRIGGER) {
      logWarn(`Storage at ${quota.percentage.toFixed(1)}% - migrating to IndexedDB`);
      return await this._migrateToIndexedDB(key, valueWithTimestamp);
    }
    
    try {
      // Try localStorage first
      localStorage.setItem(key, stringValue);
      return { success: true, storage: 'localStorage' };
      
    } catch (error) {
      // QuotaExceededError
      if (error.name === 'QuotaExceededError') {
        logWarn('localStorage quota exceeded, attempting cleanup');
        
        // Try cleanup
        await this.clearExpired();
        
        try {
          localStorage.setItem(key, stringValue);
          return { success: true, storage: 'localStorage' };
        } catch (retryError) {
          // Still failing, migrate to IndexedDB
          logWarn('Cleanup insufficient, migrating to IndexedDB');
          return await this._migrateToIndexedDB(key, valueWithTimestamp);
        }
      }
      
      throw error;
    }
  }

  /**
   * Get item from storage
   * @param {string} key - Storage key
   * @returns {Promise<*>} Parsed value or null
   */
  async getItem(key) {
    try {
      // Check localStorage first
      const localValue = localStorage.getItem(key);
      if (localValue !== null) {
        const parsed = JSON.parse(localValue);
        
        // Check if migrated to IndexedDB
        if (parsed._storage === 'indexeddb') {
          return await this._getFromIndexedDB(key);
        }
        
        return parsed;
      }
      
      // Try IndexedDB
      return await this._getFromIndexedDB(key);
      
    } catch (err) {
      logError(`Failed to get item: ${key}`, err);
      return null;
    }
  }

  /**
   * Remove item from storage
   * @param {string} key - Storage key
   * @returns {Promise<boolean>} Success status
   */
  async removeItem(key) {
    try {
      localStorage.removeItem(key);
      
      // Also remove from IndexedDB if exists
      if (this.db) {
        await this._removeFromIndexedDB(key);
      }
      
      return true;
    } catch (err) {
      logError(`Failed to remove item: ${key}`, err);
      return false;
    }
  }

  /**
   * Cleanup expired exam data
   * @param {number} [daysOld] - Age threshold in days (defaults to 7)
   * @returns {Promise<number>} Number of items removed
   */
  async clearExpired(daysOld = STORAGE_THRESHOLDS.EXAM_DATA_EXPIRY_DAYS) {
    let removedCount = 0;
    let removedSize = 0;
    const now = Date.now();
    const expiryTime = daysOld * 24 * 60 * 60 * 1000;
    
    try {
      // Get all keys
      const keys = Object.keys(localStorage);
      
      for (const key of keys) {
        // Skip active exam session
        if (this._isActiveExamData(key)) {
          continue;
        }
        
        const value = localStorage.getItem(key);
        if (!value) continue;
        
        try {
          const parsed = JSON.parse(value);
          
          // Check timestamp
          if (parsed.timestamp || parsed.selesai?.waktu) {
            const timestamp = parsed.timestamp || parsed.selesai.waktu;
            const age = now - new Date(timestamp).getTime();
            if (age > expiryTime) {
              // Calculate size before removing (UTF-16: 2 bytes per char)
              const size = (key.length + value.length) * 2;
              localStorage.removeItem(key);
              removedCount++;
              removedSize += size;
            }
          }
        } catch (parseErr) {
          // Skip non-JSON items
        }
      }
      
      if (removedCount > 0) {
        logWarn(`Cleaned up ${removedCount} expired items (${(removedSize / 1024).toFixed(2)} KB freed)`);
      }
      
    } catch (err) {
      logError('Cleanup failed', err);
    }
    
    return removedCount;
  }

  /**
   * Cleanup expired exam data (alias for clearExpired)
   * @returns {Promise<number>} Number of items removed
   */
  async cleanup() {
    return this.clearExpired();
  }

  /**
   * Check if a key belongs to active exam session
   * @private
   * @param {string} key - Storage key
   * @returns {boolean} True if key is active exam data
   */
  _isActiveExamData(key) {
    // Active exam session keys that should never be cleared
    if (key.startsWith('exam_session_') || 
        key === 'currentExam' ||
        key === 'lemon2026_active_exam' ||
        key.startsWith('lemon2026_ujian_active_')) {
      return true;
    }
    
    // Check if this is today's exam data
    try {
      const value = localStorage.getItem(key);
      if (value) {
        const parsed = JSON.parse(value);
        if (parsed.mulai) {
          const startTime = new Date(parsed.mulai).getTime();
          const now = Date.now();
          const age = now - startTime;
          // Consider exam active if started within last 3 hours
          return age < (3 * 60 * 60 * 1000);
        }
      }
    } catch (err) {
      // If parsing fails, don't assume it's active
    }
    
    return false;
  }

  /**
   * Migrate data to IndexedDB
   * @private
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @returns {Promise<{success: boolean, storage: string}>} Result
   */
  async _migrateToIndexedDB(key, value) {
    try {
      await this._initIndexedDB();
      
      // Store in IndexedDB
      await this._setInIndexedDB(key, value);
      
      // Store reference in localStorage
      localStorage.setItem(key, JSON.stringify({ _storage: 'indexeddb' }));
      
      // Notify user
      this._notifyMigration();
      
      return { success: true, storage: 'indexeddb' };
      
    } catch (err) {
      logError('Migration to IndexedDB failed', err);
      return { success: false, storage: null };
    }
  }

  /**
   * Store item in IndexedDB
   * @private
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   */
  async _setInIndexedDB(key, value) {
    const db = await this._initIndexedDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([INDEXEDDB_CONFIG.storeName], 'readwrite');
      const store = transaction.objectStore(INDEXEDDB_CONFIG.storeName);
      const request = store.put(value, key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get item from IndexedDB
   * @private
   * @param {string} key - Storage key
   * @returns {Promise<*>} Stored value
   */
  async _getFromIndexedDB(key) {
    try {
      const db = await this._initIndexedDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([INDEXEDDB_CONFIG.storeName], 'readonly');
        const store = transaction.objectStore(INDEXEDDB_CONFIG.storeName);
        const request = store.get(key);
        
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      return null;
    }
  }

  /**
   * Remove item from IndexedDB
   * @private
   * @param {string} key - Storage key
   */
  async _removeFromIndexedDB(key) {
    try {
      const db = await this._initIndexedDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([INDEXEDDB_CONFIG.storeName], 'readwrite');
        const store = transaction.objectStore(INDEXEDDB_CONFIG.storeName);
        const request = store.delete(key);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      // Ignore errors
    }
  }

  /**
   * Notify user about storage migration
   * @private
   */
  _notifyMigration() {
    console.info('Penyimpanan browser penuh. Data akan dipindahkan ke penyimpanan alternatif.');
  }

  /**
   * Check if cleanup is needed
   * @returns {Promise<boolean>} True if cleanup needed
   */
  async needsCleanup() {
    const quota = await this.getQuota();
    return quota.percentage >= STORAGE_THRESHOLDS.CLEANUP_TRIGGER;
  }

  /**
   * Check if migration is needed
   * @returns {Promise<boolean>} True if migration needed
   */
  async needsMigration() {
    const quota = await this.getQuota();
    return quota.percentage >= STORAGE_THRESHOLDS.MIGRATION_TRIGGER;
  }

  /**
   * Save photo reference (photoId) instead of base64 data
   * @param {string} examKey - Exam data key
   * @param {string} photoId - Photo ID from server
   * @param {string} photoUrl - CDN URL for photo
   * @returns {Promise<boolean>} Success status
   */
  async savePhotoReference(examKey, photoId, photoUrl) {
    try {
      const examData = await this.getItem(examKey);
      
      if (!examData) {
        logError(`Exam data not found: ${examKey}`);
        return false;
      }
      
      // Update with photo reference, not base64 data
      examData.verifikasi = {
        photoId: photoId,
        photoUrl: photoUrl,
        timestamp: new Date().toISOString()
      };
      
      const result = await this.setItem(examKey, examData);
      return result.success;
      
    } catch (err) {
      logError('Failed to save photo reference', err);
      return false;
    }
  }

  /**
   * Get storage statistics
   * @returns {Promise<{itemCount: number, totalSize: number, largestItems: Array}>} Statistics
   */
  async getStatistics() {
    const stats = {
      itemCount: 0,
      totalSize: 0,
      largestItems: []
    };
    
    try {
      const items = [];
      
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const value = localStorage[key];
          const size = (key.length + value.length) * 2; // UTF-16
          
          items.push({ key, size });
          stats.itemCount++;
          stats.totalSize += size;
        }
      }
      
      // Sort by size descending
      items.sort((a, b) => b.size - a.size);
      stats.largestItems = items.slice(0, 10).map(item => ({
        key: item.key,
        size: item.size,
        sizeKB: (item.size / 1024).toFixed(2)
      }));
      
      return stats;
      
    } catch (err) {
      logError('Failed to get statistics', err);
      return stats;
    }
  }
}

// Export class and constants
export { StorageManager, STORAGE_THRESHOLDS, INDEXEDDB_CONFIG };
export default StorageManager;
