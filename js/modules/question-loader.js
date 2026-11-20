/**
 * @fileoverview Module untuk memuat soal ujian dari file JSON eksternal
 * @module modules/question-loader
 * @description
 * QuestionLoader module bertanggung jawab untuk:
 * - Load questions dari /questions/{category}.json
 * - Cache questions di sessionStorage
 * - Fallback ke CDN jika primary source gagal
 * - Fallback ke embedded questions jika semua source gagal
 * - Validate question format (30 questions, required fields)
 * 
 * Performance Targets:
 * - Cached load: < 2 seconds
 * - Network load: < 5 seconds
 * - Use browser cache headers
 * 
 * @requires utils/logger
 * 
 * @author LEMON Olimpiade System
 * @version 1.0.0
 */

import { logQuestionLoad, error as logError, warn as logWarn } from '../utils/logger.js';

/**
 * Question loader configuration
 * @constant {Object}
 */
const LOADER_CONFIG = {
  primaryBasePath: '/questions/',
  cdnBasePath: 'https://cdn.example.com/lemon/questions/', // TODO: Update with actual CDN URL
  expectedQuestionCount: 30,
  cachePrefix: 'lemon_questions_',
  loadTimeout: 5000 // 5 seconds
};

/**
 * Valid question categories
 * @constant {string[]}
 */
const VALID_CATEGORIES = ['ipa', 'ips', 'matematika'];

/**
 * QuestionLoader class untuk handle question loading operations
 */
class QuestionLoader {
  /**
   * Create a QuestionLoader instance
   * @param {Object} [config] - Custom configuration
   */
  constructor(config = {}) {
    this.config = { ...LOADER_CONFIG, ...config };
    this.embeddedQuestions = {}; // Will be populated by setEmbeddedQuestions()
  }

  /**
   * Load questions for a specific category
   * @param {string} category - Category name (ipa/ips/matematika)
   * @returns {Promise<Array>} Array of 30 questions
   * @throws {Error} If loading fails completely
   */
  async loadQuestions(category) {
    const normalizedCategory = category.toLowerCase();
    const startTime = performance.now();
    
    // Validate category
    if (!VALID_CATEGORIES.includes(normalizedCategory)) {
      throw new Error(`Invalid category: ${category}`);
    }
    
    // Check cache first
    const cachedQuestions = this._getCachedQuestions(normalizedCategory);
    if (cachedQuestions) {
      const duration = performance.now() - startTime;
      logQuestionLoad({
        category: normalizedCategory,
        cacheHit: true,
        duration: Math.round(duration)
      });
      return cachedQuestions;
    }
    
    // Try loading from primary source
    try {
      const data = await this._loadFromPrimary(normalizedCategory);
      const duration = performance.now() - startTime;
      
      // Cache successful load (cache the full data object)
      this._cacheQuestions(normalizedCategory, data);
      
      logQuestionLoad({
        category: normalizedCategory,
        cacheHit: false,
        duration: Math.round(duration),
        size: JSON.stringify(data).length
      });
      
      return data.questions;
      
    } catch (primaryError) {
      logWarn(`Primary source failed for ${normalizedCategory}: ${primaryError.message}`);
      
      // Try CDN fallback
      try {
        const data = await this._loadFromCDN(normalizedCategory);
        const duration = performance.now() - startTime;
        
        // Cache successful load
        this._cacheQuestions(normalizedCategory, data);
        
        logQuestionLoad({
          category: normalizedCategory,
          cacheHit: false,
          duration: Math.round(duration),
          size: JSON.stringify(data).length
        });
        
        return data.questions;
        
      } catch (cdnError) {
        logWarn(`CDN fallback failed for ${normalizedCategory}: ${cdnError.message}`);
        
        // Use embedded fallback
        const embeddedQuestions = this._getEmbeddedQuestions(normalizedCategory);
        if (embeddedQuestions) {
          logWarn(`Using embedded fallback questions for ${normalizedCategory}`);
          return embeddedQuestions;
        }
        
        // All sources failed
        logError('All question sources failed', { category: normalizedCategory });
        throw new Error('Gagal memuat soal ujian. Hubungi panitia segera.');
      }
    }
  }

  /**
   * Load questions from primary source
   * @private
   * @param {string} category - Category name
   * @returns {Promise<Array>} Questions array
   */
  async _loadFromPrimary(category) {
    const url = `${this.config.primaryBasePath}${category}.json`;
    return await this._fetchQuestions(url);
  }

  /**
   * Load questions from CDN fallback
   * @private
   * @param {string} category - Category name
   * @returns {Promise<Array>} Questions array
   */
  async _loadFromCDN(category) {
    const url = `${this.config.cdnBasePath}${category}.json`;
    return await this._fetchQuestions(url);
  }

  /**
   * Fetch questions from URL with timeout
   * @private
   * @param {string} url - Question file URL
   * @returns {Promise<Object>} Question bank object with questions array
   */
  async _fetchQuestions(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.loadTimeout);
    
    try {
      const response = await fetch(url, {
        cache: 'force-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate question bank structure
      this._validateQuestionBank(data);
      
      return data;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Validate question bank structure
   * @private
   * @param {Object} data - Question bank data to validate
   * @throws {Error} If validation fails
   */
  _validateQuestionBank(data) {
    // Check if object with required top-level fields
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid question format: not an object');
    }
    
    // Validate category field
    if (!data.category || typeof data.category !== 'string') {
      throw new Error('Invalid question format: missing or invalid category');
    }
    
    // Validate questions array
    if (!Array.isArray(data.questions)) {
      throw new Error('Invalid question format: questions is not an array');
    }
    
    // Check count
    if (data.questions.length !== this.config.expectedQuestionCount) {
      throw new Error(
        `Invalid question count: expected ${this.config.expectedQuestionCount}, got ${data.questions.length}`
      );
    }
    
    // Validate each question
    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i];
      
      // Check required fields
      if (!q.n || !q.mapel || !q.q || !Array.isArray(q.o)) {
        throw new Error(`Invalid question format at index ${i}: missing required fields`);
      }
      
      // Check options count
      if (q.o.length !== 5) {
        throw new Error(`Invalid question format at index ${i}: expected 5 options, got ${q.o.length}`);
      }
    }
  }

  /**
   * Get cached questions from sessionStorage
   * @private
   * @param {string} category - Category name
   * @returns {Array|null} Cached questions array or null
   */
  _getCachedQuestions(category) {
    try {
      const key = `${this.config.cachePrefix}${category}`;
      const cached = sessionStorage.getItem(key);
      
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      
      // Check if cache contains valid question bank structure
      if (data.questionBank && data.questionBank.questions && Array.isArray(data.questionBank.questions)) {
        // Validate the cached data
        try {
          this._validateQuestionBank(data.questionBank);
          return data.questionBank.questions;
        } catch (validationError) {
          logWarn('Cached data validation failed, invalidating cache', validationError);
          sessionStorage.removeItem(key);
          return null;
        }
      }
      
      return null;
      
    } catch (err) {
      logError('Failed to read cache', err);
      return null;
    }
  }

  /**
   * Cache questions in sessionStorage
   * @private
   * @param {string} category - Category name
   * @param {Object} questionBank - Question bank object to cache
   */
  _cacheQuestions(category, questionBank) {
    try {
      const key = `${this.config.cachePrefix}${category}`;
      const data = {
        questionBank,
        timestamp: new Date().toISOString()
      };
      
      sessionStorage.setItem(key, JSON.stringify(data));
      
    } catch (err) {
      logWarn('Failed to cache questions', err);
      // Non-critical error, continue without caching
    }
  }

  /**
   * Get embedded fallback questions
   * @private
   * @param {string} category - Category name
   * @returns {Array|null} Embedded questions or null
   */
  _getEmbeddedQuestions(category) {
    return this.embeddedQuestions[category] || null;
  }

  /**
   * Set embedded fallback questions
   * @param {string} category - Category name
   * @param {Array} questions - Fallback questions array
   */
  setEmbeddedQuestions(category, questions) {
    try {
      // Validate as a question bank structure
      const questionBank = {
        category: category.toUpperCase(),
        version: 'embedded',
        questions: questions
      };
      this._validateQuestionBank(questionBank);
      this.embeddedQuestions[category.toLowerCase()] = questions;
    } catch (err) {
      logError(`Invalid embedded questions for ${category}`, err);
    }
  }

  /**
   * Clear cache for specific category or all categories
   * @param {string} [category] - Category to clear, or clear all if not provided
   */
  clearCache(category = null) {
    try {
      if (category) {
        const key = `${this.config.cachePrefix}${category.toLowerCase()}`;
        sessionStorage.removeItem(key);
      } else {
        // Clear all question caches
        for (const cat of VALID_CATEGORIES) {
          const key = `${this.config.cachePrefix}${cat}`;
          sessionStorage.removeItem(key);
        }
      }
    } catch (err) {
      logError('Failed to clear cache', err);
    }
  }

  /**
   * Preload questions for multiple categories
   * @param {string[]} categories - Categories to preload
   * @returns {Promise<Object>} Map of category -> questions array
   */
  async preloadQuestions(categories) {
    const results = {};
    
    await Promise.allSettled(
      categories.map(async (category) => {
        try {
          results[category] = await this.loadQuestions(category);
        } catch (err) {
          results[category] = null;
          logError(`Failed to preload ${category}`, err);
        }
      })
    );
    
    return results;
  }

  /**
   * Get loader configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update loader configuration
   * @param {Object} newConfig - New config to merge
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export class and constants
export { QuestionLoader, LOADER_CONFIG, VALID_CATEGORIES };
export default QuestionLoader;
