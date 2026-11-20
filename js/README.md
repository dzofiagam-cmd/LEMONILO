# LEMON Olimpiade - JavaScript Modules

This directory contains the optimized JavaScript modules for the LEMON Olimpiade exam system.

## Project Structure

```
js/
├── modules/          # Core optimization modules
│   ├── api-client.js          # API communication with Google Apps Script backend
│   ├── photo-compressor.js    # Photo compression (5MB → 500KB)
│   ├── question-loader.js     # External question loading with caching
│   └── storage-manager.js     # localStorage + IndexedDB management
│
└── utils/            # Shared utility functions
    ├── logger.js              # Performance monitoring & logging
    └── validation.js          # Input validation & file checking

questions/            # External question JSON files
                      # - ipa.json
                      # - ips.json
                      # - matematika.json

fonts/                # Self-hosted font files (WOFF2)
                      # - Baloo 2 (700, 800)
                      # - Nunito (400, 600, 700, 800)
                      # - Amiri (400, 700)
```

## Module Overview

### Core Modules (`modules/`)

#### **api-client.js**
Handles all API communication with Google Apps Script backend.

**Features:**
- Upload photos to Google Sheets (Base64 storage)
- Submit exam answers with retry mechanism
- Transparent error messages in Bahasa Indonesia
- Automatic retry with exponential backoff (3 attempts)
- Proper CORS handling with credentials

**Key Methods:**
- `uploadPhoto(photoBlob, metadata)` - Upload compressed photo
- `submitAnswers(answerData)` - Submit exam answers
- `storePendingPhoto(photoBlob, metadata)` - Temporary storage on failure

**Backend Integration:**
- Photo Spreadsheet: `1TYg1rnuOProAPqToSouBtRQAYmy4gX_7wVZJvz62MRo`
- Answer Spreadsheet: `14eXYCrcplRrtALbj_StBLIaJ8LQeAlEsqopwqpAv5UU`
- API Layer: Google Apps Script Web App (doPost endpoint)

---

#### **photo-compressor.js**
Compresses participant photos for efficient upload.

**Features:**
- Compress photos from max 5MB to ~500KB
- Maintain aspect ratio during resize
- Max dimension: 1200px
- JPEG quality: 85%
- Generate thumbnails (480px) for preview
- Strip EXIF metadata for privacy
- Support JPEG, PNG, WebP formats

**Key Methods:**
- `compress(file, options)` - Compress photo file
- `generateThumbnail(file)` - Create preview thumbnail

**Performance:**
- Processing time: < 3 seconds
- Target output: max 500KB
- Compression ratio: ~92% reduction

---

#### **question-loader.js**
Loads exam questions from external JSON files with intelligent caching.

**Features:**
- Load questions from `/questions/{category}.json`
- Cache in sessionStorage for current session
- CDN fallback if primary source fails
- Embedded fallback if all sources fail
- Validate question format (30 questions, required fields)

**Key Methods:**
- `loadQuestions(category)` - Load questions for category
- `preloadQuestions(categories)` - Preload multiple categories
- `setEmbeddedQuestions(category, questions)` - Set fallback data
- `clearCache(category)` - Clear cached questions

**Performance:**
- Cached load: < 2 seconds
- Network load: < 5 seconds
- Browser cache headers for efficiency

---

#### **storage-manager.js**
Manages localStorage quota with automatic IndexedDB fallback.

**Features:**
- Monitor localStorage quota usage
- Automatic cleanup of expired data (7 days)
- Migrate to IndexedDB at 95% quota
- Trigger cleanup at 80% quota
- Store photo references instead of Base64
- Preserve active exam session data

**Key Methods:**
- `setItem(key, value)` - Store with quota management
- `getItem(key)` - Retrieve from storage
- `removeItem(key)` - Remove from storage
- `getQuota()` - Check quota usage
- `cleanup()` - Remove expired data

**Storage Strategy:**
- Primary: localStorage (faster, simpler)
- Fallback: IndexedDB (larger capacity)
- Automatic migration on quota exceeded

---

### Utility Modules (`utils/`)

#### **logger.js**
Performance monitoring and logging system.

**Features:**
- Log compression metrics (size, ratio, duration)
- Log storage quota usage
- Log API request/response times
- Log question loading metrics
- Calculate bandwidth usage per session
- Timestamp all logs (ISO 8601)

**Key Methods:**
- `info(message, data)` - Info log
- `warn(message, data)` - Warning log
- `error(message, error)` - Error log
- `logCompressionMetrics(metrics)` - Log photo compression
- `logStorageQuota(quota)` - Log storage usage
- `logApiCall(metrics)` - Log API performance
- `getBandwidthSummary()` - Get session bandwidth

**Performance Thresholds:**
- Photo compression: 3 seconds
- Question load: 5 seconds
- API request: 10 seconds
- Storage quota: 80%

---

#### **validation.js**
Input validation and file checking utilities.

**Features:**
- Validate file MIME types (JPEG, PNG, WebP)
- Check file magic bytes for security
- Validate file size limits
- Validate UUIDs and timestamps
- Validate participant data (nama, lomba)

**Key Methods:**
- `validatePhotoFile(file, maxSize)` - Complete photo validation
- `validateMimeType(file)` - Check MIME type
- `validateMagicBytes(file)` - Verify file format
- `validateFileSize(file, maxSize)` - Check size limit
- `validateNama(nama)` - Validate participant name
- `validateLomba(lomba)` - Validate exam category

**Security:**
- Magic bytes validation prevents fake extensions
- MIME type verification
- Size limit enforcement

---

## Usage Examples

### Photo Compression
```javascript
import PhotoCompressor from './modules/photo-compressor.js';

const compressor = new PhotoCompressor();
const { blob, metadata } = await compressor.compress(file);

console.log(`Compressed from ${metadata.originalSize} to ${metadata.compressedSize}`);
console.log(`Compression ratio: ${(metadata.compressionRatio * 100).toFixed(1)}%`);
```

### API Upload
```javascript
import APIClient from './modules/api-client.js';

const apiClient = new APIClient();

// Upload photo
const { photoId, photoUrl } = await apiClient.uploadPhoto(blob, {
  nama: 'John Doe',
  lomba: 'IPA'
});

// Submit answers
await apiClient.submitAnswers({
  nama: 'John Doe',
  lomba: 'IPA',
  photoId: photoId,
  photoUrl: photoUrl,
  jawaban: { /* answer data */ }
});
```

### Question Loading
```javascript
import QuestionLoader from './modules/question-loader.js';

const loader = new QuestionLoader();
const questions = await loader.loadQuestions('ipa');

console.log(`Loaded ${questions.length} questions`);
```

### Storage Management
```javascript
import StorageManager from './modules/storage-manager.js';

const storage = new StorageManager();

// Check quota
const quota = await storage.getQuota();
console.log(`Storage usage: ${quota.percentage.toFixed(1)}%`);

// Store data
await storage.setItem('exam_data', { /* data */ });

// Retrieve data
const data = await storage.getItem('exam_data');
```

---

## Performance Targets

| Metric | Target | Current Baseline |
|--------|--------|------------------|
| Photo Size | 500KB | 6.7MB |
| Bandwidth per Session | 21.7MB | 280MB |
| Compression Time | < 3s | N/A |
| Question Load (cached) | < 2s | N/A |
| Question Load (network) | < 5s | N/A |
| API Upload | < 10s | N/A |
| First Contentful Paint | < 400ms | 550ms |
| Time to Interactive | < 300ms | 550ms |

**Overall Target:** 92.3% bandwidth reduction (280MB → 21.7MB)

---

## Error Handling

All modules implement comprehensive error handling with user-friendly messages in Bahasa Indonesia:

**HTTP Status Codes:**
- `400` - "Data yang dikirim tidak valid. Periksa kembali form Anda."
- `401` - "Sesi Anda telah berakhir. Silakan login kembali."
- `403` - "Anda tidak memiliki akses untuk melakukan aksi ini."
- `404` - "Server tidak ditemukan. Hubungi panitia."
- `408` - "Koneksi timeout. Periksa koneksi internet Anda."
- `413` - "File yang diunggah terlalu besar. Maksimal 1MB."
- `429` - "Terlalu banyak percobaan. Tunggu beberapa saat."
- `5xx` - "Server sedang bermasalah. Coba lagi dalam beberapa menit atau hubungi panitia."

**Retry Strategy:**
- Client errors (4xx): No retry
- Server errors (5xx): Retry up to 3 times
- Network errors: Retry up to 3 times
- Exponential backoff: 2^n * 2 seconds

---

## Browser Compatibility

**Supported Browsers:**
- Chrome 90+
- Firefox 88+
- Edge 90+

**Required APIs:**
- Canvas API (photo compression)
- Fetch API (network requests)
- IndexedDB (fallback storage)
- Storage API (quota checking)

**Polyfills:** None required for target browsers

---

## Development Guidelines

### Module Dependencies
- All modules use ES6 modules (`import`/`export`)
- Utility modules have no dependencies
- Core modules depend only on utility modules
- No external dependencies (vanilla JavaScript)

### Code Style
- JSDoc documentation for all public methods
- Descriptive parameter names
- Error messages in Bahasa Indonesia
- Performance logging for critical operations
- Comprehensive error handling

### Testing Checklist
- [ ] Photo compression works for JPEG/PNG/WebP
- [ ] Compression reduces size to < 500KB
- [ ] Storage quota monitoring works
- [ ] IndexedDB fallback activates at 95%
- [ ] Question loading caches properly
- [ ] API retry mechanism works
- [ ] Error messages display correctly
- [ ] Browser compatibility verified

---

## Configuration

### API Endpoints
Update in `modules/api-client.js`:
```javascript
const API_CONFIG = {
  photoUploadEndpoint: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  answerSubmitEndpoint: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  // ...
};
```

### CDN Fallback
Update in `modules/question-loader.js`:
```javascript
const LOADER_CONFIG = {
  cdnBasePath: 'https://cdn.example.com/lemon/questions/',
  // ...
};
```

---

## Next Steps

1. **Task 2:** Implement PhotoCompressor module functionality
2. **Task 3:** Implement StorageManager module functionality
3. **Task 4:** Implement QuestionLoader module functionality
4. **Task 5:** Implement APIClient module functionality
5. **Task 6:** Integrate modules into existing HTML pages
6. **Task 7:** Self-host fonts and update CSS
7. **Task 8:** Create external question JSON files
8. **Task 9:** Testing and optimization
9. **Task 10:** Deploy and monitor

---

## License

Internal use only - LEMON Olimpiade System

## Version History

- **v1.0.0** (2024-11-19) - Initial project structure setup
  - Created module stubs with JSDoc documentation
  - Setup utility functions for validation and logging
  - Defined folder structure for questions and fonts
