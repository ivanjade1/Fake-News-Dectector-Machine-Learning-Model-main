// Global variables
let selectedTitleMethod = null;
let selectedInputMethod = null;
let modelReady = false;

// DOM Elements
const modelStatus        = document.getElementById('modelStatus');
const feedbackStats      = document.getElementById('feedbackStats');
const analyzeBtn         = document.getElementById('analyzeBtn');
const resetBtn           = document.getElementById('resetBtn');
const loading            = document.getElementById('loading');
const error              = document.getElementById('error');
const errorMessage       = document.getElementById('errorMessage');
const nonPoliticalResult = document.getElementById('nonPoliticalResult');

// Method buttons
const autoTitleBtn       = document.getElementById('autoTitleBtn');
const manualTitleBtn     = document.getElementById('manualTitleBtn');
const articleLinkBtn     = document.getElementById('articleLinkBtn');
const articleSnippetBtn  = document.getElementById('articleSnippetBtn');

// Input sections
const manualTitleInput    = document.getElementById('manualTitleInput');
const articleLinkInput    = document.getElementById('articleLinkInput');
const articleSnippetInput = document.getElementById('articleSnippetInput');
const actionButtons       = document.getElementById('actionButtons');

// Input fields
const newsTitle  = document.getElementById('newsTitle');
const articleUrl = document.getElementById('articleUrl');
const newsText   = document.getElementById('newsText');

// Character counters
const titleCount = document.getElementById('titleCount');
const textCount  = document.getElementById('textCount');

// --- Model status check ---
async function checkModelStatus() {
    try {
        console.log('Checking model status…');
        const res = await fetch('/model-status', { method:'GET', headers:{'Content-Type':'application/json'} });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const data = await res.json();
        
        console.log('Model status response:', data); // Debug log
        
        modelReady = data.is_trained;

        if (modelReady) {
            modelStatus.innerHTML = `
                <div class="flex items-center justify-center">
                  <i class="bi bi-check-circle-fill text-green-600 dark:text-green-400 mr-2"></i>
                  <span class="text-green-700 dark:text-green-300 font-medium">
                    Model Ready
                  </span>
                </div>`;
            modelStatus.className = 'rounded-2xl border border-green-200 bg-green-50/70 p-4 ring-1 ring-green-200/50 text-center dark:border-green-600/20 dark:bg-green-900/20 dark:ring-green-600/20';
            
            // Update analyze button state when model becomes ready
            checkFormCompletion();
        } else {
            modelStatus.innerHTML = `
                <div class="flex items-center justify-center">
                  <i class="bi bi-hourglass-split spin text-blue-600 dark:text-blue-400 mr-2"></i>
                  <span class="text-neutral-700 dark:text-neutral-300">
                    Model is training… Please wait.
                  </span>
                </div>`;
            modelStatus.className = 'rounded-2xl border border-blue-200 bg-blue-50/70 p-4 ring-1 ring-blue-200/50 text-center dark:border-blue-600/20 dark:bg-blue-900/20 dark:ring-blue-600/20';
            
            // Continue checking if not ready
            setTimeout(checkModelStatus, 3000);
        }

        // Always update feedback stats if available
        if (data.feedback) {
            updateFeedbackStats(data.feedback);
        }
        
        return modelReady;
    } catch (err) {
        console.error('Error checking model status:', err);
        modelStatus.innerHTML = `
            <div class="flex items-center justify-center">
              <i class="bi bi-exclamation-triangle text-red-600 dark:text-red-400 mr-2"></i>
              <span class="text-red-700 dark:text-red-300">
                Error checking model status. Retrying…
              </span>
            </div>`;
        modelStatus.className = 'rounded-2xl border border-red-200 bg-red-50/70 p-4 ring-1 ring-red-200/50 text-center dark:border-red-600/20 dark:bg-red-900/20 dark:ring-red-600/20';
        setTimeout(checkModelStatus, 5000);
        return false;
    }
}

// --- Feedback stats ---
function updateFeedbackStats(stats) {
    if (!stats) return;
    
    // Check if elements exist (they won't for regular users)
    const totalFeedbackEl = document.getElementById('totalFeedback');
    const usedFeedbackEl = document.getElementById('usedFeedback');
    const pendingFeedbackEl = document.getElementById('pendingFeedback');
    
    if (totalFeedbackEl) totalFeedbackEl.textContent = stats.total_feedback || 0;
    if (usedFeedbackEl) usedFeedbackEl.textContent = stats.used_for_training || 0;
    if (pendingFeedbackEl) pendingFeedbackEl.textContent = stats.pending_training || 0;

    const retrainBtn = document.getElementById('retrainBtn');
    const retrainInfo = document.getElementById('retrainInfo');
    
    // Show retrain button and info if there's pending feedback
    if (stats.can_retrain && stats.pending_training > 0) {
        if (retrainBtn) retrainBtn.classList.remove('hidden');
        if (retrainInfo) retrainInfo.classList.remove('hidden');
    } else {
        if (retrainBtn) retrainBtn.classList.add('hidden');
        if (retrainInfo) retrainInfo.classList.add('hidden');
    }

    // Only show feedback stats section if it exists and has data
    if (feedbackStats && stats.total_feedback > 0) {
        feedbackStats.classList.remove('hidden');
    }
}

// Add this function after updateFeedbackStats
function forceShowRetrainButton() {
  console.log('🔧 FORCE SHOWING RETRAIN BUTTON...');

  const retrainBtn = document.getElementById('retrainBtn');
  const retrainInfo = document.getElementById('retrainInfo');
  const feedbackStatsSection = document.getElementById('feedbackStats');

  if (feedbackStatsSection) {
    feedbackStatsSection.classList.remove('hidden');
    console.log('  Feedback stats section shown');
  }

  if (retrainBtn) {
    retrainBtn.classList.remove('hidden');
    retrainBtn.style.display = 'inline-block';
    retrainBtn.style.visibility = 'visible';
    console.log('  Retrain button forced visible');
  }

  if (retrainInfo) {
    retrainInfo.classList.remove('hidden');
    retrainInfo.style.display = 'block';
    retrainInfo.style.visibility = 'visible';
    console.log('  Retrain info forced visible');
  }
}

// --- Manual retraining function ---
async function triggerManualRetrain() {
  try {
    // Single confirmation dialog
    const proceed = confirm(
      "Are you sure you want to retrain the model with the pending feedback entries?\n\n" +
      "This process may take a few minutes and will update the model with new training data.\n\n" +
      "Click 'OK' to proceed with retraining."
    );

    if (proceed) {
      performRetraining();
    }

  } catch (error) {
    console.error('Error in manual retrain trigger:', error);
    alert('An error occurred while initiating retraining. Please try again.');
  }
}

async function performRetraining() {
  const retrainBtn = document.getElementById('retrainBtn');
  
  // Return early if button doesn't exist (for regular users)
  if (!retrainBtn) return;
  
  const originalText = retrainBtn.innerHTML;

  try {
    // Disable button and show loading
    retrainBtn.disabled = true;
    retrainBtn.innerHTML = '<i class="bi bi-hourglass-split spin mr-1"></i>Retraining...';
    retrainBtn.classList.add('opacity-50', 'cursor-not-allowed');

    console.log('🔄 Starting manual model retraining...');

    const response = await fetch('/trigger-retrain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Manual retraining completed successfully:', result);

      // Show success message with details
      let successMessage = result.message;
      if (result.details) {
        const details = result.details;
        successMessage += `\n\nDetails:\n` +
          `• Feedback entries used: ${details.feedback_used}\n` +
          `• Total training samples: ${details.total_samples}\n` +
          `• Accuracy improvement: ${(details.old_accuracy * 100).toFixed(1)}% → ${(details.new_accuracy * 100).toFixed(1)}%`;
      }

      alert('Model Retraining Completed!\n\n' + successMessage);

      // Refresh model status and feedback stats
      await checkModelStatus();

    } else {
      console.error('❌ Manual retraining failed:', result.message);
      alert('Retraining Failed!\n\n' + result.message);
    }

  } catch (error) {
    console.error('❌ Error during manual retraining:', error);
    alert('An error occurred during retraining:\n\n' + error.message);
  } finally {
    // Re-enable button
    retrainBtn.disabled = false;
    retrainBtn.innerHTML = originalText;
    retrainBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }
}

// --- Method selection ---
function selectTitleMethod(method) {
  // Handle double-click to deselect
  if (selectedTitleMethod === method) {
    selectedTitleMethod = null;
    autoTitleBtn.classList.remove('selected');
    manualTitleBtn.classList.remove('selected');
    manualTitleInput.classList.add('hidden');
  } else {
    selectedTitleMethod = method;
    // Reset both cards
    autoTitleBtn.classList.remove('selected');
    manualTitleBtn.classList.remove('selected');
    
    // Apply selected state
    if (method === 'automatic') {
      autoTitleBtn.classList.add('selected');
      manualTitleInput.classList.add('hidden');
    } else {
      manualTitleBtn.classList.add('selected');
      manualTitleInput.classList.remove('hidden');
    }
  }
  updateSelectedDisplay();
  checkFormCompletion();
}

function selectInputMethod(method) {
  // Handle double-click to deselect
  if (selectedInputMethod === method) {
    selectedInputMethod = null;
    articleLinkBtn.classList.remove('selected');
    articleSnippetBtn.classList.remove('selected');
    articleLinkInput.classList.add('hidden');
    articleSnippetInput.classList.add('hidden');
  } else {
    selectedInputMethod = method;
    // Reset both cards
    articleLinkBtn.classList.remove('selected');
    articleSnippetBtn.classList.remove('selected');
    articleLinkInput.classList.add('hidden');
    articleSnippetInput.classList.add('hidden');

    // Apply selected state
    if (method === 'link') {
      articleLinkBtn.classList.add('selected');
      articleLinkInput.classList.remove('hidden');
    } else {
      articleSnippetBtn.classList.add('selected');
      articleSnippetInput.classList.remove('hidden');
    }
  }
  updateSelectedDisplay();
  checkFormCompletion();
}

function updateSelectedDisplay() {
  document.getElementById('selectedTitleMethod').textContent =
    selectedTitleMethod
      ? (selectedTitleMethod === 'automatic' ? 'Automatic (AI)' : 'Manual')
      : '-';
  document.getElementById('selectedInputMethod').textContent =
    selectedInputMethod
      ? (selectedInputMethod === 'link' ? 'Article Link' : 'Article Snippet')
      : '-';
}

// --- Form logic ---
function checkFormCompletion() {
  const both = selectedTitleMethod && selectedInputMethod;
  let hasInput = false;

  if (selectedInputMethod === 'link') {
    hasInput = !!articleUrl.value.trim();
  } else if (selectedInputMethod === 'snippet') {
    hasInput = !!newsText.value.trim();
  }
  if (selectedTitleMethod === 'manual') {
    hasInput = hasInput && !!newsTitle.value.trim();
  }

  if (both) {
    actionButtons.classList.remove('hidden');
    // Update button state based on both input and model readiness
    const shouldEnable = hasInput && modelReady;
    analyzeBtn.disabled = !shouldEnable;

    if (shouldEnable) {
      analyzeBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      analyzeBtn.innerHTML = '<i class="bi bi-search mr-2"></i>Analyze News';
    } else {
      analyzeBtn.classList.add('opacity-50', 'cursor-not-allowed');
      if (!modelReady) {
        analyzeBtn.innerHTML = '<i class="bi bi-hourglass-split mr-2"></i>Model Training...';
      } else {
        analyzeBtn.innerHTML = '<i class="bi bi-search mr-2"></i>Analyze News';
      }
    }
  } else {
    actionButtons.classList.add('hidden');
  }
}

function updateCharacterCount(input, counter, label = 'characters') {
  counter.textContent = `${input.value.length} ${label}`;
}

// --- Analyze / Reset ---
// Global variables for analysis control
let currentAnalysisController = null;
let currentAnalysisId = null; // Track analysis session

// Function to cancel current analysis
function cancelCurrentAnalysis(showMessage = false) {
  if (currentAnalysisController) {
    console.log('Cancelling current analysis...');
    
    // Cancel the fetch request
    currentAnalysisController.abort();
    currentAnalysisController = null;
    
    // Also send cancellation request to backend if we have an analysis ID
    if (currentAnalysisId) {
      fetch('/cancel-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis_id: currentAnalysisId })
      }).catch(err => console.log('Cancellation request failed:', err));
      
      currentAnalysisId = null;
    }
    
    if (showMessage) {
      // Show a brief message that analysis was cancelled
      setTimeout(() => {
        if (window.analysisModal) {
          window.analysisModal.showError('Analysis Cancelled', 'The analysis was stopped at your request.', false);
        }
      }, 100);
    }
    
    return true;
  }
  return false;
}

async function analyzeContent() {
  // Cancel any existing analysis
  if (currentAnalysisController) {
    currentAnalysisController.abort();
  }

  // Create new abort controller for this analysis
  currentAnalysisController = new AbortController();
  
  // Generate unique analysis ID for this session
  currentAnalysisId = 'analysis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  console.log('Starting analysis with ID:', currentAnalysisId);

  // Double-check model readiness before proceeding
  if (!modelReady) {
    showError('Model is not ready yet. Please wait for training to complete.');
    return;
  }

  // Check model status one more time before analysis
  try {
    const statusResponse = await fetch('/model-status');
    const statusData = await statusResponse.json();
    if (!statusData.is_trained) {
      showError('Model is still training. Please wait a moment and try again.');
      return;
    }
  } catch (error) {
    console.error('Error checking model status before analysis:', error);
    showError('Unable to verify model status. Please try again.');
    return;
  }

  let url = '', text = '', title = '';

  if (selectedInputMethod === 'link') {
    url = articleUrl.value.trim();
    if (!url) { showError('Please enter a valid article URL.'); return; }
    try { new URL(url); }
    catch { showError('Please enter a valid URL format.'); return; }
  } else {
    text = newsText.value.trim();
    if (!text) { showError('Please enter article text.'); return; }
    if (text.length < 50) { showError('Please enter at least 50 characters of article text.'); return; }
  }

  if (selectedTitleMethod === 'manual') {
    title = newsTitle.value.trim();
    if (!title) { showError('Please enter a title for the article.'); return; }
  }

  showLoading();

  const payload = {
    titleMethod: selectedTitleMethod,
    inputMethod: selectedInputMethod,
    analysis_id: currentAnalysisId  // Include analysis ID
  };
  if (selectedInputMethod === 'link') payload.url = url;
  else payload.text = text;
  if (selectedTitleMethod === 'manual') payload.title = title;

  try {
    console.log('Sending payload to /predict:', payload);
    const res = await fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: currentAnalysisController.signal
    });

    console.log('Response status:', res.status);

    if (!res.ok) {
      const err = await res.json();
      console.error('API Error Response:', err);
      
      // Handle cancellation responses differently
      if (err.cancelled) {
        console.log('Analysis was successfully cancelled');
        currentAnalysisController = null;
        currentAnalysisId = null;
        return; // Don't show error for intentional cancellation
      }
      
      throw new Error(err.error || `${res.status}: ${res.statusText}`);
    }
    const results = await res.json();
    console.log('Analysis Results received:', results);

    // Check if content is not Philippine political - show result on detector page
    if (results.analysis_stopped && results.prediction === 'Not Philippine Political Content') {
      console.log('Non-political content detected, showing on detector page');
      showNonPoliticalResult(results);
      // Clean up the controller since analysis is complete
      currentAnalysisController = null;
      return;
    }

    // For political content, proceed to results page
    console.log('Philippine political content detected, preparing for redirect...');

    const analysisData = {
      results,
      titleMethod: selectedTitleMethod,
      inputMethod: selectedInputMethod,
      originalData: { url, text, title },
      timestamp: new Date().toISOString()
    };

    console.log('Storing analysis data in localStorage:', analysisData);

    // Clear any existing data first
    localStorage.removeItem('analysisResults');

    // Store new data
    localStorage.setItem('analysisResults', JSON.stringify(analysisData));

    // Verify storage
    const storedData = localStorage.getItem('analysisResults');
    console.log('Verification - data stored in localStorage:', storedData !== null);
    console.log('Stored data length:', storedData ? storedData.length : 0);

    // Hide loading before redirect
    hideLoading();
    
    // Clean up the controller since analysis is complete
    currentAnalysisController = null;

    // Try different redirect approaches
    console.log('Attempting redirect to /results...');

    // Method 1: Direct assignment
    try {
      window.location.href = '/results';
      console.log('Redirect initiated with window.location.href');
    } catch (redirectError) {
      console.error('Redirect error:', redirectError);

      // Method 2: Using window.location.assign as fallback
      try {
        window.location.assign('/results');
        console.log('Redirect initiated with window.location.assign');
      } catch (assignError) {
        console.error('Assign redirect error:', assignError);

        // Method 3: Manual navigation as last resort
        showError('Analysis complete but unable to redirect. Please click the link below to view results.');
        const errorDiv = document.getElementById('error');
        const errorMsg = document.getElementById('errorMessage');
        errorMsg.innerHTML = `
          Analysis completed successfully!<br>
          <a href="/results" class="text-blue-600 dark:text-blue-400 underline mt-2 inline-block">Click here to view results</a>
        `;
      }
    }

  } catch (err) {
    console.error('Analysis error:', err);
    
    // Check if the error is due to abort
    if (err.name === 'AbortError') {
      console.log('Analysis was cancelled by user');
      // Don't show error message for intentional cancellation
      hideLoading();
    } else {
      showError(`Analysis failed: ${err.message}`);
      hideLoading();
    }
    
    // Clean up the controller
    currentAnalysisController = null;
  }
}

// --- Handle non-political content display ---
function showNonPoliticalResult(results) {
  // Use the analysis modal to show non-political content message
  if (window.analysisModal) {
    window.analysisModal.showNotPhilippineNews();
  } else {
    // Fallback to old method
    hideError();
    hideLoading(true); // Keep modal open for fallback method

    // Show non-political result section
    nonPoliticalResult.classList.remove('hidden');

    // Populate title
    const titleElement = document.getElementById('nonPoliticalTitle');
    if (results.extracted_content && results.extracted_content.title) {
      titleElement.textContent = results.extracted_content.title;
    }

    // Populate content preview
    const previewElement = document.getElementById('nonPoliticalPreview');
    if (results.content_preview) {
      previewElement.textContent = results.content_preview;
    }

    // Populate classification details
    if (results.content_classification) {
      const safeContentElement = document.getElementById('nonPoliticalSafeContent');
      const confidenceElement  = document.getElementById('nonPoliticalConfidence');
      const reasonElement      = document.getElementById('nonPoliticalReason');

      // Safe content status
      if (results.content_classification.is_safe_content) {
        safeContentElement.textContent = 'True';
        safeContentElement.className = 'bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium';
      } else {
        safeContentElement.textContent = 'False';
        safeContentElement.className = 'bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium';
      }

      // Confidence
      const confidence = results.content_classification.confidence;
      if (confidence !== undefined && confidence !== null) {
        confidenceElement.textContent = `${(confidence * 100).toFixed(1)}%`;
      }

      // Reason
      if (results.content_classification.reason) {
        reasonElement.textContent = results.content_classification.reason;
      }
    }

    // Scroll to the result
    nonPoliticalResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function resetForm() {
  selectedTitleMethod = null;
  selectedInputMethod = null;

  // Remove selected class from all method cards
  autoTitleBtn.classList.remove('selected');
  manualTitleBtn.classList.remove('selected');
  articleLinkBtn.classList.remove('selected');
  articleSnippetBtn.classList.remove('selected');

  newsTitle.value  = '';
  articleUrl.value = '';
  newsText.value   = '';

  manualTitleInput.classList.add('hidden');
  articleLinkInput.classList.add('hidden');
  articleSnippetInput.classList.add('hidden');
  actionButtons.classList.add('hidden');
  nonPoliticalResult.classList.add('hidden'); // Hide non-political result

  // Hide learn more content if it was shown
  const learnMoreContent = document.getElementById('learnMoreContent');
  if (learnMoreContent) {
    learnMoreContent.classList.add('hidden');
  }

  hideError();
  hideLoading();

  updateSelectedDisplay();
  updateCharacterCount(newsTitle, titleCount);
  updateCharacterCount(newsText, textCount);
}

// --- Utilities ---
function showLoading() {
  // Use the analysis modal instead of the old loading spinner
  if (window.analysisModal) {
    window.analysisModal.showLoading();
  } else {
    // Fallback to old method if modal not available
    loading.classList.remove('hidden');
    analyzeBtn.disabled = true;
    analyzeBtn.classList.add('opacity-50','cursor-not-allowed');
    hideError();
  }
}
function hideLoading(keepModalOpen = false) {
  // Close the modal when loading is complete, unless we want to keep it open
  if (window.analysisModal && !keepModalOpen) {
    // Check if modal is currently showing loading state
    if (window.analysisModal.currentModalType === 'loading') {
      window.analysisModal.forceCloseModal(); // Force close since analysis is completing normally
    }
  } else if (!window.analysisModal) {
    // Fallback to old method
    loading.classList.add('hidden');
    analyzeBtn.disabled = false;
    analyzeBtn.classList.remove('opacity-50','cursor-not-allowed');
  }
}
function showError(msg) {
  // Use the analysis modal for errors
  if (window.analysisModal) {
    window.analysisModal.showError('Analysis Error', msg, true);
  } else {
    // Fallback to old method
    errorMessage.textContent = msg;
    error.classList.remove('hidden');
    hideLoading();
  }
}
function hideError() {
  // Close modal or hide old error display
  if (window.analysisModal) {
    window.analysisModal.forceCloseModal(); // Force close since we're programmatically hiding error
  } else {
    error.classList.add('hidden');
  }
}

// --- Handle "Try Again" and "Learn More" buttons ---
function handleTryAgain() {
  resetForm();
  // Scroll back to the top of the form
  const container = document.querySelector('.max-w-4xl');
  if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleLearnMore() {
  const learnMoreContent = document.getElementById('learnMoreContent');
  const learnMoreBtn = document.getElementById('learnMoreBtn');

  if (!learnMoreContent || !learnMoreBtn) return;

  if (learnMoreContent.classList.contains('hidden')) {
    learnMoreContent.classList.remove('hidden');
    learnMoreBtn.innerHTML = '<i class="bi bi-chevron-up mr-2"></i>Hide Details';
  } else {
    learnMoreContent.classList.add('hidden');
    learnMoreBtn.innerHTML = '<i class="bi bi-info-circle mr-2"></i>Learn More';
  }
}

// --- Feedback modal and CRUD ---
async function showFeedbackModal() {
  const modal = document.getElementById('feedbackModal');
  if (modal) {
    modal.classList.remove('hidden');
  }
  await loadFeedbackEntries();
}

async function loadFeedbackEntries() {
  const list = document.getElementById('feedbackList');
  list.innerHTML = `
    <div class="text-center text-neutral-500 dark:text-neutral-400 py-8">
      <i class="bi bi-hourglass-split spin text-2xl mb-2"></i>
      <p>Loading feedback entries…</p>
    </div>`;
  try {
    const res = await fetch('/get-feedback');
    if (!res.ok) throw new Error('Failed to load feedback');
    const data = await res.json();
    displayFeedbackEntries(data.feedback_entries || []);
    document.getElementById('modalTotalFeedback').textContent = data.feedback_stats?.total_feedback || 0;
  } catch (err) {
    console.error(err);
    list.innerHTML = `
      <div class="text-center text-red-500 py-8">
        <i class="bi bi-exclamation-circle text-2xl mb-2"></i>
        <p>Error loading feedback entries</p>
      </div>`;
  }
}

function displayFeedbackEntries(entries) {
  const list = document.getElementById('feedbackList');
  if (!entries.length) {
    list.innerHTML = `
      <div class="text-center text-neutral-500 dark:text-neutral-400 py-8">
        <i class="bi bi-inbox text-3xl mb-2"></i>
        <p>No feedback entries yet</p>
        <p class="text-sm mt-1">Feedback from users will appear here</p>
      </div>`;
    return;
  }

  const pill = (label, type) => {
    const base = 'px-2 py-1 rounded text-xs';
    if (type === 'Real')  return `bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 ${base}`;
    if (type === 'Fake')  return `bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 ${base}`;
    return `bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 ${base}`;
  };

  list.innerHTML = entries.map((e, index) => `
    <div class="border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-lg p-4 mb-3">
      <div class="flex justify-between items-start mb-2">
        <div class="flex items-center space-x-2">
          <span class="bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-2 py-1 rounded text-xs font-bold">
            #${index + 1}
          </span>
          <span class="${pill('Predicted', e.predicted_label)}">Predicted: ${e.predicted_label}</span>
          <span class="${pill('Actual', e.actual_label)}">Actual: ${e.actual_label}</span>
          ${e.used_for_training
            ? '<span class="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-xs">Used for Training</span>'
            : '<span class="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-2 py-1 rounded text-xs">Pending</span>'}
        </div>
        <button onclick="deleteFeedbackEntry(${e.id})" class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm">
          <i class="bi bi-trash"></i>
        </button>
      </div>
      ${e.title && e.title !== null && e.title.trim() !== '' ? `<h4 class="font-semibold text-neutral-800 dark:text-neutral-200 text-sm mb-1">${e.title}</h4>` : ''}
      ${e.summary && e.summary !== null && e.summary.trim() !== '' ? `<p class="text-neutral-600 dark:text-neutral-400 text-xs mb-2 italic">${e.summary}</p>` : ''}
      ${e.user_comment ? `<p class="text-neutral-600 dark:text-neutral-400 text-xs italic">"${e.user_comment}"</p>` : ''}
      <div class="flex justify-between items-center mt-2">
        <span class="text-xs text-neutral-500 dark:text-neutral-400">${new Date(e.timestamp).toLocaleString()}</span>
        <div class="flex items-center space-x-2">
          ${e.factuality_score !== null && e.factuality_score !== undefined ? `<span class="text-xs text-neutral-500 dark:text-neutral-400">Score: ${e.factuality_score}%</span>` : ''}
        </div>
      </div>
      ${e.link ? `<div class="mt-2"><a href="${e.link}" target="_blank" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs"><i class="bi bi-link-45deg mr-1"></i>Source</a></div>` : ''}
    </div>
  `).join('');
}

async function deleteFeedbackEntry(id) {
  if (!confirm('Are you sure you want to delete this feedback entry?')) return;
  try {
    console.log(`Deleting feedback entry with ID: ${id}`);
    const res = await fetch(`/delete-feedback/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete feedback');
    await res.json();

    // Reload feedback entries to get fresh data with correct IDs
    await loadFeedbackEntries();
    console.log('Feedback entry deleted and lists refreshed');
    // Also refresh top-level stats
    await checkModelStatus();
  } catch (err) {
    console.error('Error deleting feedback entry:', err);
    alert('Failed to delete feedback entry.');
  }
}

// --- Event wiring + init ---
function setupEventListeners() {
  if (autoTitleBtn)      autoTitleBtn.addEventListener('click', () => selectTitleMethod('automatic'));
  if (manualTitleBtn)    manualTitleBtn.addEventListener('click', () => selectTitleMethod('manual'));
  if (articleLinkBtn)    articleLinkBtn.addEventListener('click', () => selectInputMethod('link'));
  if (articleSnippetBtn) articleSnippetBtn.addEventListener('click', () => selectInputMethod('snippet'));

  if (analyzeBtn) analyzeBtn.addEventListener('click', analyzeContent);
  if (resetBtn)   resetBtn.addEventListener('click', resetForm);

  if (newsTitle) {
    newsTitle.addEventListener('input', () => {
      updateCharacterCount(newsTitle, titleCount);
      checkFormCompletion();
    });
  }

  if (articleUrl) {
    articleUrl.addEventListener('input', checkFormCompletion);
  }

  if (newsText) {
    newsText.addEventListener('input', () => {
      updateCharacterCount(newsText, textCount);
      checkFormCompletion();
    });
  }

  // Non-political result action buttons
  const tryAgainBtn  = document.getElementById('tryAgainBtn');
  const learnMoreBtn = document.getElementById('learnMoreBtn');

  if (tryAgainBtn)  tryAgainBtn.addEventListener('click', handleTryAgain);
  if (learnMoreBtn) learnMoreBtn.addEventListener('click', toggleLearnMore);

  // Feedback modal controls
  const manageFeedbackBtn = document.getElementById('manageFeedbackBtn');
  const retrainBtn        = document.getElementById('retrainBtn');
  const feedbackModal     = document.getElementById('feedbackModal');
  const closeFeedbackModal= document.getElementById('closeFeedbackModal');
  const refreshFeedback   = document.getElementById('refreshFeedback');

  if (manageFeedbackBtn) manageFeedbackBtn.addEventListener('click', showFeedbackModal);
  if (retrainBtn)        retrainBtn.addEventListener('click', triggerManualRetrain);
  if (closeFeedbackModal) closeFeedbackModal.addEventListener('click', () => feedbackModal.classList.add('hidden'));
  if (refreshFeedback)   refreshFeedback.addEventListener('click', loadFeedbackEntries);

  if (feedbackModal) {
    feedbackModal.addEventListener('click', e => {
      if (e.target === feedbackModal) feedbackModal.classList.add('hidden');
    });
  }
}

function initialize() {
  setupEventListeners();
  checkModelStatus();
  updateSelectedDisplay();
  updateCharacterCount(newsTitle, titleCount);
  updateCharacterCount(newsText, textCount);
}

document.addEventListener('DOMContentLoaded', initialize);

// Make analyze function globally available for modal retry functionality
window.analyze = analyzeContent;
window.cancelAnalysis = cancelCurrentAnalysis;

// Cancel analysis on page unload/refresh
window.addEventListener('beforeunload', () => {
  if (cancelCurrentAnalysis()) {
    console.log('Analysis cancelled due to page unload');
  }
});

// Cancel analysis on page visibility change (tab switch, minimize, etc.)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && currentAnalysisController) {
    console.log('Page hidden, keeping analysis running...');
    // Optionally, you could cancel here too with: cancelCurrentAnalysis();
  }
});
