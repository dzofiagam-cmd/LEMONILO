/**
 * @fileoverview Module untuk kompresi foto peserta ujian
 * @module modules/photo-compressor
 * @description
 * PhotoCompressor module bertanggung jawab untuk:
 * - Validasi file foto (format, size, magic bytes)
 * - Kompresi foto dari max 5MB menjadi ~500KB
 * - Resize foto dengan maintain aspect ratio
 * - Generate thumbnail preview
 * - Strip EXIF metadata untuk privacy
 * 
 * Target Performance:
 * - Input: max 5MB (JPEG/PNG/WebP)
 * - Output: max 500KB compressed JPEG
 * - Processing time: < 3 seconds
 * - Max dimension: 1200px
 * - JPEG quality: 85%
 * 
 * @requires utils/validation
 * @requires utils/logger
 * 
 * @author LEMON Olimpiade System
 * @version 1.0.0
 */

import { validatePhotoFile } from '../utils/validation.js';
import { logCompressionMetrics, error as logError } from '../utils/logger.js';

/**
 * Default compression options
 * @constant {Object}
 */
const DEFAULT_OPTIONS = {
  maxDimension: 1200,
  thumbnailMaxDimension: 480,
  quality: 0.85,
  maxOutputSize: 500 * 1024, // 500KB
  maxInputSize: 5 * 1024 * 1024, // 5MB
  outputFormat: 'image/jpeg'
};

/**
 * PhotoCompressor class untuk handle photo compression operations
 */
class PhotoCompressor {
  /**
   * Create a PhotoCompressor instance
   * @param {Object} [options] - Custom compression options
   */
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Compress photo file
   * @param {File} file - Input photo file
   * @param {Object} [customOptions] - Override default options for this compression
   * @returns {Promise<{blob: Blob, dataUrl: string, metadata: Object}>} Compressed photo blob, data URL, and metadata
   * @throws {Error} If validation or compression fails
   */
  async compress(file, customOptions = {}) {
    const startTime = performance.now();
    const options = { ...this.options, ...customOptions };
    
    // Validate file first
    const validation = await validatePhotoFile(file, options.maxInputSize);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    try {
      // Load image
      const image = await this._loadImage(file);
      
      // Calculate target dimensions
      const dimensions = this._calculateDimensions(
        image.width,
        image.height,
        options.maxDimension
      );
      
      // Compress image
      let blob = await this._compressToBlob(image, dimensions, options.quality);
      
      // If still too large, reduce quality further
      let quality = options.quality;
      while (blob.size > options.maxOutputSize && quality > 0.5) {
        quality -= 0.05;
        blob = await this._compressToBlob(image, dimensions, quality);
      }
      
      const duration = performance.now() - startTime;
      
      // Generate data URL for preview
      const dataUrl = await this.blobToDataURL(blob);
      
      // Calculate metrics
      const metadata = {
        originalSize: file.size,
        compressedSize: blob.size,
        compressionRatio: 1 - (blob.size / file.size),
        originalDimensions: { width: image.width, height: image.height },
        compressedDimensions: dimensions,
        duration: Math.round(duration),
        quality: quality,
        format: options.outputFormat
      };
      
      // Log metrics
      logCompressionMetrics(metadata);
      
      return { blob, dataUrl, metadata };
      
    } catch (err) {
      logError('Photo compression failed', err);
      throw new Error('Gagal mengkompresi foto. Coba lagi atau gunakan foto lain.');
    }
  }

  /**
   * Generate thumbnail preview
   * @param {File} file - Input photo file
   * @returns {Promise<Blob>} Thumbnail blob
   */
  async generateThumbnail(file) {
    const validation = await validatePhotoFile(file, this.options.maxInputSize);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    try {
      const image = await this._loadImage(file);
      const dimensions = this._calculateDimensions(
        image.width,
        image.height,
        this.options.thumbnailMaxDimension
      );
      
      return await this._compressToBlob(image, dimensions, 0.8);
    } catch (err) {
      logError('Thumbnail generation failed', err);
      throw new Error('Gagal membuat preview foto');
    }
  }

  /**
   * Load image file into HTMLImageElement
   * @private
   * @param {File} file - Input file
   * @returns {Promise<HTMLImageElement>} Loaded image
   */
  _loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Gagal memuat gambar'));
      };
      
      img.src = url;
    });
  }

  /**
   * Calculate target dimensions while maintaining aspect ratio
   * @private
   * @param {number} width - Original width
   * @param {number} height - Original height
   * @param {number} maxDimension - Maximum dimension (width or height)
   * @returns {{width: number, height: number}} Target dimensions
   */
  _calculateDimensions(width, height, maxDimension) {
    if (width <= maxDimension && height <= maxDimension) {
      return { width, height };
    }
    
    const aspectRatio = width / height;
    
    if (width > height) {
      return {
        width: maxDimension,
        height: Math.round(maxDimension / aspectRatio)
      };
    } else {
      return {
        width: Math.round(maxDimension * aspectRatio),
        height: maxDimension
      };
    }
  }

  /**
   * Compress image to blob using Canvas API
   * @private
   * @param {HTMLImageElement} image - Source image
   * @param {{width: number, height: number}} dimensions - Target dimensions
   * @param {number} quality - JPEG quality (0-1)
   * @returns {Promise<Blob>} Compressed blob
   */
  _compressToBlob(image, dimensions, quality) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      
      const ctx = canvas.getContext('2d');
      
      // Use better image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw resized image
      ctx.drawImage(image, 0, 0, dimensions.width, dimensions.height);
      
      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Gagal membuat blob dari canvas'));
          }
        },
        this.options.outputFormat,
        quality
      );
    });
  }

  /**
   * Validate photo file before compression
   * @param {File} file - File to validate
   * @returns {Promise<{valid: boolean, error: string|null}>} Validation result
   */
  async validateFile(file) {
    return await validatePhotoFile(file, this.options.maxInputSize);
  }

  /**
   * Convert blob to data URL for preview/display
   * @param {Blob} blob - Blob to convert
   * @returns {Promise<string>} Data URL string
   */
  blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Gagal membaca blob'));
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get compressor configuration
   * @returns {Object} Current options
   */
  getOptions() {
    return { ...this.options };
  }

  /**
   * Update compressor configuration
   * @param {Object} newOptions - New options to merge
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
  }
}

// Export class and constants
export { PhotoCompressor, DEFAULT_OPTIONS };
export default PhotoCompressor;
