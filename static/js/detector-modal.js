// Detector Analysis Modal Handler
class AnalysisModal {
    constructor() {
        this.modal = null;
        this.modalTitle = null;
        this.modalContent = null;
        this.modalFooter = null;
        this.closeButton = null;
        this.isOpen = false;
        this.justOpened = false; // Flag to prevent immediate closure
        this.currentModalType = null; // Track what type of modal is showing
        
        // Defer initialization to ensure DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.modal = document.getElementById('analysisModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalContent = document.getElementById('analysisModalContent');
        this.modalFooter = document.getElementById('analysisModalFooter');
        this.closeButton = document.getElementById('closeAnalysisModal');
        
        if (!this.modal || !this.modalTitle || !this.modalContent || !this.modalFooter || !this.closeButton) {
            console.error('❌ Analysis modal elements not found');
            return;
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        if (!this.modal || !this.closeButton) return;

        console.log('🔍 Setting up event listeners');

        // Close button
        this.closeButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.closeModal(true); // User-initiated
        });

        // Close on backdrop click
        this.modal.addEventListener('click', (e) => {
            // Prevent immediate closure when modal just opened
            if (this.justOpened) {
                return;
            }
            
            const modalCard = this.modal.querySelector('.modal-card');
            if (modalCard && !modalCard.contains(e.target)) {
                this.closeModal(true); // User-initiated
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeModal(true); // User-initiated
            }
        });

        console.log('✅ Event listeners setup complete');
    }

    showLoading() {
        this.currentModalType = 'loading';
        this.modalTitle.innerHTML = `Analyzing Content`;
        this.modalContent.innerHTML = `
            <div class="results-card">
                <div class="text-center">
                    <div class="mx-auto mb-6" style="width: 4rem; height: 4rem; display: flex; align-items: center; justify-content: center;">
                        <div class="loading-spinner"></div>
                    </div>
                    <h3 class="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-3">
                        Processing Your Request
                    </h3>
                    <p class="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
                        Our AI is analyzing the content for factual accuracy and cross-referencing with reliable sources...
                    </p>
                    <div class="flex items-center justify-center space-x-2 mb-4">
                        <div class="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                        <div class="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                        <div class="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                    </div>
                    <p class="text-sm text-neutral-600 dark:text-neutral-400 text-center font-medium">
                        This may take a few seconds...
                    </p>
                </div>
            </div>
        `;
        
        // Add cancel button footer for loading state
        this.modalFooter.innerHTML = `
            <div class="flex justify-center">
                <button onclick="analysisModal.confirmCancelAnalysis()" class="action-btn action-btn-secondary">
                    <i class="bi bi-x-circle mr-2"></i>
                    Cancel Analysis
                </button>
            </div>
        `;
        
        this.showCloseButton();
        this.showFooter();
        this.openModal();
    }

    showError(title, message, showRetryButton = true) {
        this.currentModalType = 'error';
        this.modalTitle.innerHTML = `${title || 'Analysis Error'}`;
        this.modalContent.innerHTML = `
            <div class="results-card">
                <div class="text-center">
                    <div class="results-icon bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 mx-auto mb-6" style="width: 4rem; height: 4rem; font-size: 2rem;">
                        <i class="bi bi-exclamation-triangle"></i>
                    </div>
                    <h3 class="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-3">
                        ${title || 'Oops! Something went wrong'}
                    </h3>
                    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 backdrop-filter backdrop-blur-sm">
                        <div class="flex items-center justify-center mb-4">
                            <i class="bi bi-info-circle text-red-600 dark:text-red-400 mr-2"></i>
                            <span class="text-sm font-medium text-red-700 dark:text-red-300">Error Details</span>
                        </div>
                        <p class="text-red-700 dark:text-red-300 text-sm leading-relaxed">
                            ${this.escapeHtml(message)}
                        </p>
                    </div>
                </div>
            </div>
        `;

        if (showRetryButton) {
            this.modalFooter.innerHTML = `
                <div class="flex justify-center space-x-3">
                    <button onclick="analysisModal.forceCloseModal()" class="action-btn action-btn-secondary">
                        <i class="bi bi-x-circle mr-2"></i>
                        Cancel
                    </button>
                    <button onclick="analysisModal.retry()" class="action-btn action-btn-primary">
                        <i class="bi bi-arrow-clockwise mr-2"></i>
                        Try Again
                    </button>
                </div>
            `;
            this.showFooter();
        } else {
            this.hideFooter();
        }

        this.showCloseButton();
        this.openModal();
    }

    showNotPhilippineNews() {
        this.currentModalType = 'non-political';
        this.modalTitle.innerHTML = `Content Not Supported`;
        this.modalContent.innerHTML = `
            <div class="results-card">
                <div class="text-center">
                    <div class="results-icon bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 mx-auto mb-6" style="width: 4rem; height: 4rem; font-size: 2rem;">
                        <i class="bi bi-geo-alt"></i>
                    </div>
                    <h3 class="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-3">
                        Geographic Limitation
                    </h3>
                    <div class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6 backdrop-filter backdrop-blur-sm">
                        <div class="flex items-center justify-center mb-4">
                            <i class="bi bi-info-circle text-orange-600 dark:text-orange-400 mr-2"></i>
                            <span class="text-sm font-medium text-orange-700 dark:text-orange-300">Specialized Service</span>
                        </div>
                        <p class="text-orange-700 dark:text-orange-300 text-sm leading-relaxed">
                            This content does not appear to be Philippine political news. Our fact-checking system is specifically designed and optimized for Philippine political content to ensure maximum accuracy.
                        </p>
                        <div class="mt-4 p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                            <p class="text-xs text-orange-600 dark:text-orange-400">
                                <i class="bi bi-lightbulb mr-1"></i>
                                Try submitting Philippine political news, government announcements, or local political developments.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.modalFooter.innerHTML = `
            <div class="flex justify-center">
                <button onclick="window.analysisModal.forceCloseModal(); return false;" class="action-btn action-btn-primary">
                    <i class="bi bi-check mr-2"></i>
                    Understood
                </button>
            </div>
        `;
        
        this.showCloseButton();
        this.showFooter();
        this.openModal();
    }

    showSuccess(message) {
        this.currentModalType = 'success';
        this.modalTitle.innerHTML = `Analysis Complete`;
        this.modalContent.innerHTML = `
            <div class="results-card">
                <div class="text-center">
                    <div class="results-icon bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 mx-auto mb-6" style="width: 4rem; height: 4rem; font-size: 2rem;">
                        <i class="bi bi-check-circle"></i>
                    </div>
                    <h3 class="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-3">
                        Analysis Successful
                    </h3>
                    <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 backdrop-filter backdrop-blur-sm">
                        <div class="flex items-center justify-center mb-4">
                            <i class="bi bi-shield-check text-green-600 dark:text-green-400 mr-2"></i>
                            <span class="text-sm font-medium text-green-700 dark:text-green-300">Verification Complete</span>
                        </div>
                        <p class="text-green-700 dark:text-green-300 text-sm leading-relaxed">
                            ${this.escapeHtml(message)}
                        </p>
                        <div class="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <p class="text-xs text-green-600 dark:text-green-400">
                                <i class="bi bi-info-circle mr-1"></i>
                                Your analysis results are now available below.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.modalFooter.innerHTML = `
            <div class="flex justify-center">
                <button onclick="analysisModal.forceCloseModal()" class="action-btn action-btn-primary">
                    <i class="bi bi-eye mr-2"></i>
                    View Results
                </button>
            </div>
        `;

        this.showCloseButton();
        this.showFooter();
        this.openModal();
    }

    confirmCancelAnalysis() {
        // Show JavaScript confirmation dialog
        const confirmed = confirm(
            "Are you sure you want to cancel the analysis?\n\n" +
            "This will stop the current analysis process and return you to the main page."
        );
        
        if (confirmed) {
            this.cancelAnalysis();
        }
    }

    cancelAnalysis() {
        // Cancel the analysis and close modal
        if (window.cancelAnalysis && typeof window.cancelAnalysis === 'function') {
            window.cancelAnalysis(false); // Don't show message since we're handling it here
        }
        this.forceCloseModal();
    }

    forceCloseModal() {
        // Close modal without any confirmation
        if (this.modal) {
            this.modal.classList.add('hidden');
            
            // Clear any inline styles that might have been set
            this.modal.style.display = '';
            this.modal.style.visibility = '';
            this.modal.style.opacity = '';
            this.modal.style.zIndex = '';
            
            this.isOpen = false;
            this.currentModalType = null; // Reset modal type
            document.body.style.overflow = '';
        }
    }

    openModal() {
        if (this.modal) {
            this.modal.classList.remove('hidden');
            
            this.isOpen = true;
            this.justOpened = true; // Prevent immediate backdrop clicks
            document.body.style.overflow = 'hidden';
            
            // Clear the justOpened flag after a short delay
            setTimeout(() => {
                this.justOpened = false;
            }, 200);
        }
    }

    closeModal(userInitiated = true) {
        // If we're closing a loading modal and it's user-initiated, show confirmation first
        if (this.currentModalType === 'loading' && userInitiated) {
            this.confirmCancelAnalysis();
            return;
        }
        
        // Force close for all other cases
        this.forceCloseModal();
    }

    showCloseButton() {
        if (this.closeButton) {
            this.closeButton.classList.remove('hidden');
        }
    }

    hideCloseButton() {
        if (this.closeButton) {
            this.closeButton.classList.add('hidden');
        }
    }

    showFooter() {
        if (this.modalFooter) {
            this.modalFooter.classList.remove('hidden');
        }
    }

    hideFooter() {
        if (this.modalFooter) {
            this.modalFooter.classList.add('hidden');
        }
    }

    retry() {
        this.forceCloseModal();
        // Trigger retry by calling the analyze function again
        if (window.analyze && typeof window.analyze === 'function') {
            window.analyze();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the analysis modal when the script loads
const analysisModal = new AnalysisModal();

// Make it globally available
window.analysisModal = analysisModal;
