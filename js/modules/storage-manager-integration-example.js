/**
 * @fileoverview Integration example for StorageManager in exam pages
 * @description Shows how to use StorageManager in beranda-*.html and ujian-*.html
 */

import { StorageManager } from './storage-manager.js';

// ============================================================================
// EXAMPLE 1: Initialize and Check Quota on Page Load
// ============================================================================

// In beranda-[LOMBA].html - On page load
async function initializeExamPage() {
  const storage = new StorageManager();
  
  // Check storage quota
  const quota = await storage.getQuota();
  console.log(`Storage: ${quota.percentage.toFixed(1)}% used`);
  
  // Show warning if storage is getting full
  if (quota.percentage > 80) {
    const cleaned = await storage.clearExpired();
    console.log(`Storage high - cleaned ${cleaned} old items`);
    
    // Show notification to user
    if (quota.percentage > 90) {
      alert('Penyimpanan browser hampir penuh. Data lama telah dibersihkan.');
    }
  }
  
  return storage;
}

// ============================================================================
// EXAMPLE 2: Save Photo Reference After Upload
// ============================================================================

// After photo compression and upload to server
async function handlePhotoUpload(photoBlob, metadata) {
  const storage = new StorageManager();
  
  try {
    // 1. Compress photo (using PhotoCompressor - see other module)
    const compressed = await PhotoCompressor.compress(photoBlob);
    
    // 2. Upload to server (using APIClient - see other module)
    const response = await fetch(CONFIG.photoUploadUrl, {
      method: 'POST',
      body: createFormData(compressed.blob, metadata),
      credentials: 'include'
    });
    
    const { photoId, url } = await response.json();
    
    // 3. Save photo REFERENCE (not base64!)
    const examKey = `lemon2026_ujian_${metadata.lomba}_${Date.now()}`;
    
    // Create initial exam data
    await storage.setItem(examKey, {
      nama: metadata.nama,
      lomba: metadata.lomba,
      mulai: new Date().toISOString(),
      jawaban: {}
    });
    
    // Save photo reference
    await storage.savePhotoReference(examKey, photoId, url);
    
    console.log('✓ Photo reference saved:', photoId);
    
    // Store exam key for later use
    sessionStorage.setItem('currentExamKey', examKey);
    
    return { success: true, photoId, url };
    
  } catch (error) {
    console.error('Photo upload failed:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// EXAMPLE 3: Save Exam Answers Periodically
// ============================================================================

// During exam - save answers every 30 seconds
let autoSaveInterval;

function startAutoSave(examKey) {
  const storage = new StorageManager();
  
  autoSaveInterval = setInterval(async () => {
    try {
      // Get current exam data
      const examData = await storage.getItem(examKey);
      
      if (!examData) {
        console.error('Exam data not found');
        return;
      }
      
      // Update answers from form
      examData.jawaban = collectAnswersFromForm();
      examData.lastSaved = new Date().toISOString();
      
      // Save (will auto-cleanup if needed)
      const result = await storage.setItem(examKey, examData);
      
      if (result.storage === 'indexeddb') {
        console.log('⚠️ Data migrated to IndexedDB due to storage limits');
      }
      
      console.log('✓ Answers auto-saved');
      
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, 30000); // Every 30 seconds
}

function stopAutoSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    console.log('Auto-save stopped');
  }
}

// Helper function to collect answers from form
function collectAnswersFromForm() {
  const answers = {};
  for (let i = 1; i <= 30; i++) {
    const selected = document.querySelector(`input[name="jawaban_${i}"]:checked`);
    answers[i] = selected ? selected.value : '';
  }
  return answers;
}

// ============================================================================
// EXAMPLE 4: Submit Exam with Photo Reference
// ============================================================================

// When user clicks "Submit" button
async function submitExam(examKey) {
  const storage = new StorageManager();
  
  try {
    // Get exam data
    const examData = await storage.getItem(examKey);
    
    if (!examData) {
      throw new Error('Exam data not found');
    }
    
    // Build submit payload WITH photo reference (not base64!)
    const payload = {
      lomba: examData.lomba,
      nama: examData.nama,
      sekolah: examData.sekolah || '',
      mulai: examData.mulai,
      selesai: new Date().toISOString(),
      
      // Photo reference - NOT base64 data!
      photoId: examData.verifikasi?.photoId,
      photoUrl: examData.verifikasi?.photoUrl,
      
      // Answers
      jawaban: examData.jawaban,
      
      // Metadata
      pindahTab: examData.pindahTab || 0,
      pelanggaran: examData.pelanggaran || 0
    };
    
    // Submit to server
    const response = await fetch(CONFIG.submitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    // Mark as submitted
    examData.terkirim = true;
    examData.submittedAt = new Date().toISOString();
    await storage.setItem(examKey, examData);
    
    console.log('✓ Exam submitted successfully');
    console.log('Payload size:', JSON.stringify(payload).length, 'bytes');
    // Should be ~50KB instead of 6.7MB!
    
    return { success: true };
    
  } catch (error) {
    console.error('Submit failed:', error);
    
    // Mark as failed for retry
    const examData = await storage.getItem(examKey);
    if (examData) {
      examData.terkirim = false;
      examData.submitError = error.message;
      await storage.setItem(examKey, examData);
    }
    
    return { success: false, error: error.message };
  }
}

// ============================================================================
// EXAMPLE 5: Restore Exam State After Refresh
// ============================================================================

// On page load - restore exam if user refreshed during exam
async function restoreExamState() {
  const storage = new StorageManager();
  const examKey = sessionStorage.getItem('currentExamKey');
  
  if (!examKey) {
    console.log('No active exam to restore');
    return null;
  }
  
  try {
    // Retrieve exam data
    const examData = await storage.getItem(examKey);
    
    if (!examData) {
      console.log('Exam data not found');
      return null;
    }
    
    // Check if exam already submitted
    if (examData.terkirim) {
      console.log('Exam already submitted');
      return null;
    }
    
    // Restore answers to form
    for (let i = 1; i <= 30; i++) {
      const answer = examData.jawaban[i];
      if (answer) {
        const radio = document.querySelector(
          `input[name="jawaban_${i}"][value="${answer}"]`
        );
        if (radio) radio.checked = true;
      }
    }
    
    // Restore timer
    const startTime = new Date(examData.mulai).getTime();
    const elapsed = Date.now() - startTime;
    const remaining = (120 * 60 * 1000) - elapsed; // 120 minutes
    
    if (remaining > 0) {
      startTimer(remaining);
      console.log('✓ Exam state restored');
      return examData;
    } else {
      console.log('Exam time expired');
      await autoSubmitExpiredExam(examKey);
      return null;
    }
    
  } catch (error) {
    console.error('Failed to restore exam state:', error);
    return null;
  }
}

// ============================================================================
// EXAMPLE 6: Monitor Storage During Exam
// ============================================================================

// Periodic storage monitoring (every 5 minutes)
function startStorageMonitoring() {
  const storage = new StorageManager();
  
  setInterval(async () => {
    const quota = await storage.getQuota();
    const stats = await storage.getStatistics();
    
    console.log('Storage Monitor:', {
      usage: `${quota.percentage.toFixed(1)}%`,
      items: stats.itemCount,
      size: `${(stats.totalSize / 1024).toFixed(2)} KB`
    });
    
    // Alert if critical
    if (quota.percentage > 95) {
      console.warn('⚠️ Storage critical! Migration may occur soon.');
    }
    
    // Check if cleanup is needed
    if (await storage.needsCleanup()) {
      console.log('Running background cleanup...');
      await storage.clearExpired();
    }
    
  }, 5 * 60 * 1000); // Every 5 minutes
}

// ============================================================================
// EXAMPLE 7: Manual Cleanup for Admin/Testing
// ============================================================================

// Admin function to clear old exam data
async function adminCleanup(daysOld = 7) {
  const storage = new StorageManager();
  
  console.log(`Clearing data older than ${daysOld} days...`);
  
  // Get stats before
  const statsBefore = await storage.getStatistics();
  console.log('Before:', {
    items: statsBefore.itemCount,
    size: `${(statsBefore.totalSize / 1024).toFixed(2)} KB`
  });
  
  // Clear expired
  const removed = await storage.clearExpired(daysOld);
  
  // Get stats after
  const statsAfter = await storage.getStatistics();
  console.log('After:', {
    items: statsAfter.itemCount,
    size: `${(statsAfter.totalSize / 1024).toFixed(2)} KB`
  });
  
  const freed = statsBefore.totalSize - statsAfter.totalSize;
  console.log(`✓ Removed ${removed} items, freed ${(freed / 1024).toFixed(2)} KB`);
  
  return { removed, freed };
}

// ============================================================================
// EXAMPLE 8: Error Recovery
// ============================================================================

// Handle QuotaExceededError gracefully
async function handleStorageError(error, key, value) {
  if (error.name !== 'QuotaExceededError') {
    throw error; // Re-throw if not quota error
  }
  
  const storage = new StorageManager();
  
  console.warn('Storage quota exceeded, attempting recovery...');
  
  // Try aggressive cleanup
  await storage.clearExpired(3); // Clear data older than 3 days
  
  // Try again
  try {
    const result = await storage.setItem(key, value);
    console.log('✓ Recovery successful, data saved to:', result.storage);
    return result;
  } catch (retryError) {
    console.error('Recovery failed, data will be lost!');
    
    // Last resort: alert user
    alert(
      'Penyimpanan browser penuh dan tidak dapat dibersihkan. ' +
      'Silakan tutup tab/window lain dan coba lagi.'
    );
    
    throw retryError;
  }
}

// ============================================================================
// EXPORT FOR USE IN HTML PAGES
// ============================================================================

export {
  initializeExamPage,
  handlePhotoUpload,
  startAutoSave,
  stopAutoSave,
  submitExam,
  restoreExamState,
  startStorageMonitoring,
  adminCleanup,
  handleStorageError
};

// ============================================================================
// USAGE IN HTML
// ============================================================================

/*

In beranda-[LOMBA].html:

<script type="module">
  import { initializeExamPage, handlePhotoUpload } from './js/modules/storage-manager-integration-example.js';
  
  // On page load
  let storage;
  window.addEventListener('DOMContentLoaded', async () => {
    storage = await initializeExamPage();
  });
  
  // On photo upload
  document.getElementById('photo-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const result = await handlePhotoUpload(file, {
      nama: document.getElementById('nama').value,
      lomba: 'IPA'
    });
    
    if (result.success) {
      console.log('Photo uploaded:', result.photoId);
    }
  });
</script>

In ujian-[LOMBA].html:

<script type="module">
  import { restoreExamState, startAutoSave, submitExam, startStorageMonitoring } from './js/modules/storage-manager-integration-example.js';
  
  const examKey = sessionStorage.getItem('currentExamKey');
  
  // On page load
  window.addEventListener('DOMContentLoaded', async () => {
    // Restore state if page was refreshed
    await restoreExamState();
    
    // Start auto-save
    startAutoSave(examKey);
    
    // Start monitoring
    startStorageMonitoring();
  });
  
  // On submit
  document.getElementById('btn-submit').addEventListener('click', async () => {
    const result = await submitExam(examKey);
    if (result.success) {
      window.location.href = 'terimakasih.html';
    }
  });
</script>

*/
