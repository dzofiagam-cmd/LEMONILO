/**
 * @fileoverview Utility untuk logging dan monitoring performance
 * @module utils/logger
 * @description
 * Module ini menyediakan fungsi-fungsi logging untuk:
 * - Performance metrics (compression, upload, load times)
 * - Storage quota monitoring
 * - Error tracking dan debugging
 * - Bandwidth usage calculation
 * 
 * Semua logs menggunakan format timestamp ISO 8601 dan dapat di-filter by level
 * 
 * @author LEMON Olimpiade System
 * @version 1.0.0
 */

/**
 * Log levels untuk categorization
 * @enum {string}
 */
const LogLevel = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
  METRIC: 'METRIC'
};

/**
 * Performance thresholds untuk warning triggers
 * @constant {Object}
 */
const PERFORMANCE_THRESHOLDS = {
  photoCompression: 3000, // 3 seconds
  questionLoad: 5000, // 5 seconds
  apiRequest: 10000, // 10 seconds
  storageQuota: 80 // 80% usage
};

/**
 * Session storage untuk accumulating metrics
 * @type {Object}
 */
const sessionMetrics = {
  bandwidthUsage: {
    photoUpload: 0,
    questionLoad: 0,
    fontLoad: 0,
    submitPayload: 0,
    total: 0
  },
  compressionStats: [],
  apiCalls: [],
  storageUsage: []
};

/**
 * Format log message dengan timestamp dan level
 * @private
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} [data] - Additional data to log
 * @returns {string} Formatted log string
 */
function formatLogMessage(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  
  if (data) {
    return `${prefix} ${message}`;
  }
  return `${prefix} ${message}`;
}

/**
 * Log info message
 * @param {string} message - Message to log
 * @param {Object} [data] - Additional data
 */
function info(message, data = null) {
  console.log(formatLogMessage(LogLevel.INFO, message), data || '');
}

/**
 * Log warning message
 * @param {string} message - Message to log
 * @param {Object} [data] - Additional data
 */
function warn(message, data = null) {
  console.warn(formatLogMessage(LogLevel.WARN, message), data || '');
}

/**
 * Log error message
 * @param {string} message - Message to log
 * @param {Error|Object} [error] - Error object or additional data
 */
function error(message, error = null) {
  console.error(formatLogMessage(LogLevel.ERROR, message), error || '');
}

/**
 * Log debug message (only in development)
 * @param {string} message - Message to log
 * @param {Object} [data] - Additional data
 */
function debug(message, data = null) {
  if (process?.env?.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
    console.debug(formatLogMessage(LogLevel.DEBUG, message), data || '');
  }
}

/**
 * Log photo compression metrics
 * @param {Object} metrics - Compression metrics
 * @param {number} metrics.originalSize - Original file size in bytes
 * @param {number} metrics.compressedSize - Compressed file size in bytes
 * @param {number} metrics.compressionRatio - Compression ratio (0-1)
 * @param {number} metrics.duration - Compression duration in ms
 */
function logCompressionMetrics(metrics) {
  const { originalSize, compressedSize, compressionRatio, duration } = metrics;
  
  info(`Photo Compression: ${(originalSize / 1024).toFixed(2)} KB → ${(compressedSize / 1024).toFixed(2)} KB (${(compressionRatio * 100).toFixed(1)}% reduction) in ${duration}ms`);
  
  sessionMetrics.compressionStats.push({
    timestamp: new Date().toISOString(),
    ...metrics
  });
  
  // Track bandwidth
  sessionMetrics.bandwidthUsage.photoUpload += compressedSize;
  sessionMetrics.bandwidthUsage.total += compressedSize;
  
  // Warn if compression took too long
  if (duration > PERFORMANCE_THRESHOLDS.photoCompression) {
    warn(`Photo compression exceeded threshold: ${duration}ms > ${PERFORMANCE_THRESHOLDS.photoCompression}ms`);
  }
}

/**
 * Log storage quota metrics
 * @param {Object} quota - Storage quota info
 * @param {number} quota.used - Used bytes
 * @param {number} quota.total - Total bytes
 * @param {number} quota.percentage - Usage percentage
 */
function logStorageQuota(quota) {
  const { used, total, percentage } = quota;
  
  info(`Storage Quota: ${(used / (1024 * 1024)).toFixed(2)} MB / ${(total / (1024 * 1024)).toFixed(2)} MB (${percentage.toFixed(1)}%)`);
  
  sessionMetrics.storageUsage.push({
    timestamp: new Date().toISOString(),
    ...quota
  });
  
  // Warn if quota is high
  if (percentage > PERFORMANCE_THRESHOLDS.storageQuota) {
    warn(`Storage quota exceeded threshold: ${percentage.toFixed(1)}% > ${PERFORMANCE_THRESHOLDS.storageQuota}%`);
  }
}

/**
 * Log question loading metrics
 * @param {Object} metrics - Loading metrics
 * @param {string} metrics.category - Question category (IPA/IPS/MATEMATIKA)
 * @param {boolean} metrics.cacheHit - Whether loaded from cache
 * @param {number} metrics.duration - Load duration in ms
 * @param {number} [metrics.size] - Data size in bytes
 */
function logQuestionLoad(metrics) {
  const { category, cacheHit, duration, size } = metrics;
  const source = cacheHit ? 'cache' : 'network';
  
  info(`Question Load [${category}]: ${source} in ${duration}ms${size ? ` (${(size / 1024).toFixed(2)} KB)` : ''}`);
  
  // Track bandwidth for network loads
  if (!cacheHit && size) {
    sessionMetrics.bandwidthUsage.questionLoad += size;
    sessionMetrics.bandwidthUsage.total += size;
  }
  
  // Warn if load took too long
  if (duration > PERFORMANCE_THRESHOLDS.questionLoad) {
    warn(`Question load exceeded threshold: ${duration}ms > ${PERFORMANCE_THRESHOLDS.questionLoad}ms`);
  }
}

/**
 * Log API request/response metrics
 * @param {Object} metrics - API metrics
 * @param {string} metrics.endpoint - API endpoint
 * @param {string} metrics.method - HTTP method
 * @param {number} metrics.duration - Request duration in ms
 * @param {number} metrics.statusCode - HTTP status code
 * @param {number} [metrics.requestSize] - Request size in bytes
 * @param {number} [metrics.responseSize] - Response size in bytes
 */
function logApiCall(metrics) {
  const { endpoint, method, duration, statusCode, requestSize, responseSize } = metrics;
  
  info(`API Call [${method} ${endpoint}]: ${statusCode} in ${duration}ms`);
  
  sessionMetrics.apiCalls.push({
    timestamp: new Date().toISOString(),
    ...metrics
  });
  
  // Track bandwidth
  if (requestSize) {
    sessionMetrics.bandwidthUsage.submitPayload += requestSize;
    sessionMetrics.bandwidthUsage.total += requestSize;
  }
  
  // Warn if request took too long
  if (duration > PERFORMANCE_THRESHOLDS.apiRequest) {
    warn(`API request exceeded threshold: ${duration}ms > ${PERFORMANCE_THRESHOLDS.apiRequest}ms`);
  }
}

/**
 * Log font loading metrics
 * @param {Object} metrics - Font metrics
 * @param {string} metrics.fontFamily - Font family name
 * @param {string} metrics.source - Source (local/google)
 * @param {boolean} metrics.success - Whether load succeeded
 * @param {number} metrics.duration - Load duration in ms
 * @param {number} [metrics.size] - Font file size in bytes
 */
function logFontLoad(metrics) {
  const { fontFamily, source, success, duration, size } = metrics;
  const status = success ? 'SUCCESS' : 'FAILED';
  
  info(`Font Load [${fontFamily}]: ${status} from ${source} in ${duration}ms${size ? ` (${(size / 1024).toFixed(2)} KB)` : ''}`);
  
  // Track bandwidth for successful loads
  if (success && size) {
    sessionMetrics.bandwidthUsage.fontLoad += size;
    sessionMetrics.bandwidthUsage.total += size;
  }
}

/**
 * Get session bandwidth summary
 * @returns {Object} Bandwidth usage breakdown
 */
function getBandwidthSummary() {
  const summary = {
    ...sessionMetrics.bandwidthUsage,
    totalMB: (sessionMetrics.bandwidthUsage.total / (1024 * 1024)).toFixed(2)
  };
  
  info('Bandwidth Summary:', summary);
  return summary;
}

/**
 * Get all session metrics
 * @returns {Object} Complete session metrics
 */
function getSessionMetrics() {
  return {
    ...sessionMetrics,
    bandwidthSummary: getBandwidthSummary()
  };
}

/**
 * Clear session metrics (useful for testing)
 */
function clearMetrics() {
  sessionMetrics.bandwidthUsage = {
    photoUpload: 0,
    questionLoad: 0,
    fontLoad: 0,
    submitPayload: 0,
    total: 0
  };
  sessionMetrics.compressionStats = [];
  sessionMetrics.apiCalls = [];
  sessionMetrics.storageUsage = [];
  
  info('Session metrics cleared');
}

// Export functions and constants
export {
  LogLevel,
  PERFORMANCE_THRESHOLDS,
  info,
  warn,
  error,
  debug,
  logCompressionMetrics,
  logStorageQuota,
  logQuestionLoad,
  logApiCall,
  logFontLoad,
  getBandwidthSummary,
  getSessionMetrics,
  clearMetrics
};
