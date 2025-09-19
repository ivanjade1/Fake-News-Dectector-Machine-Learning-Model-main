// Modal Handler Module
export class ModalHandler {
    constructor() {
        this.modal = null;
        this.modalContent = null;
        this.modalFooter = null;
        this.closeButton = null;
        this.isOpen = false;
        this.currentArticle = null;
        
        // Defer initialization to ensure DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.modal = document.getElementById('articleModal');
        this.modalContent = document.getElementById('modalContent');
        this.modalFooter = document.getElementById('modalFooter');
        this.closeButton = document.getElementById('closeModal');
        
        if (!this.modal || !this.modalContent || !this.modalFooter || !this.closeButton) {
            console.error('❌ Modal elements not found', {
                modal: !!this.modal,
                modalContent: !!this.modalContent,
                modalFooter: !!this.modalFooter,
                closeButton: !!this.closeButton
            });
            return;
        }

        console.log('🔧 Modal handler initialized');
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (!this.modal || !this.closeButton) return;

        // Close button
        this.closeButton.addEventListener('click', () => {
            this.closeModal();
        });

        // Close on backdrop click
        this.modal.addEventListener('click', (e) => {
            console.log('🖱️ Modal clicked', { target: e.target, modal: this.modal });
            
            // Check if the click is outside the modal content
            const modalCard = this.modal.querySelector('.modal-card');
            if (modalCard && !modalCard.contains(e.target)) {
                console.log('🔒 Closing modal - backdrop click');
                this.closeModal();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeModal();
            }
        });

        console.log('🎯 Modal event listeners setup');
    }

    async showArticle(articleId) {
        console.log(`🔍 Opening modal for article ${articleId}`);
        
        try {
            // Show loading state
            this.showLoadingModal();
            this.openModal();

            // Get current filter state to determine if we should show user info
            // Only show user info for admins and when duplicates are being shown
            const isAdmin = window.historyManager?.isAdmin ?? false;
            const showDuplicates = window.historyManager?.searchFilter?.getState()?.showDuplicates ?? true;
            const showUserInfo = isAdmin && showDuplicates;

            // Get article data
            let article = null;
            
            // First try to find in current articles list
            if (window.historyManager?.articles) {
                article = window.historyManager.articles.find(a => a.id === articleId);
            }

            // If not found, fetch from API
            if (!article && window.historyManager?.api) {
                const response = await window.historyManager.api.getArticleDetails(articleId);
                article = response.article;
            }

            if (!article) {
                throw new Error('Article not found');
            }

            this.currentArticle = article;
            this.renderArticleDetails(article, showUserInfo);

        } catch (error) {
            console.error('❌ Error showing article:', error);
            this.showErrorModal('Failed to load article details. Please try again.');
        }
    }

    renderArticleDetails(article, showUserInfo = true) {
        if (!this.modalContent || !article) return;

        const {
            id,
            title = 'Untitled Article',
            summary = 'No summary available',
            classification = 'Unknown',
            classification_score = 0,
            input_type = 'unknown',
            original_url = null,
            created_at = null,
            breakdown = [],
            cross_check_results = []
        } = article;

        const classificationClass = this.getClassificationClass(classification);
        const scoreColor = this.getScoreColor(classification_score);
        const formattedDate = this.formatDate(created_at);
        const inputTypeLabel = this.getInputTypeLabel(input_type);

        this.modalContent.innerHTML = `
            <div class="article-modal-content">
                <!-- Article Header -->
                <div class="results-card mb-6">
                    <div class="flex justify-between items-start gap-4">
                        <div class="flex-1">
                            <h1 class="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                                ${this.escapeHtml(title)}
                            </h1>
                            <div class="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                ${showUserInfo ? (article.user ? `
                                    <span class="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded border border-blue-200 dark:border-blue-700">
                                        <i class="bi bi-person-circle text-blue-600 dark:text-blue-400"></i>
                                        <span class="text-blue-700 dark:text-blue-300 font-medium" title="Scanned by: ${this.escapeHtml(article.user.email)}">
                                            ${this.escapeHtml(article.user.username)}
                                        </span>
                                    </span>
                                ` : article.user_id ? `
                                    <span class="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded border border-blue-200 dark:border-blue-700">
                                        <i class="bi bi-person-circle text-blue-600 dark:text-blue-400"></i>
                                        <span class="text-blue-700 dark:text-blue-300 font-medium" title="User ID: ${article.user_id}">
                                            User #${article.user_id}
                                        </span>
                                    </span>
                                ` : '') : ''}
                                <span class="flex items-center gap-1">
                                    <i class="bi bi-calendar-event"></i>
                                    ${formattedDate}
                                </span>
                                <span class="flex items-center gap-1">
                                    <i class="bi bi-tag"></i>
                                    ${inputTypeLabel}
                                </span>
                                ${original_url ? `
                                    <a href="${this.escapeHtml(original_url)}" target="_blank" rel="noopener" 
                                       class="flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400">
                                        <i class="bi bi-link-45deg"></i>
                                        View Original
                                    </a>
                                ` : ''}
                            </div>
                        </div>
                        <div class="classification-badge ${classificationClass}">
                            <span class="classification-text">${classification}</span>
                            <span class="classification-score">
                                ${Math.round(classification_score * 100)}%
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Summary Section -->
                <div class="results-card mb-6">
                    <h2 class="text-xl font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                        <i class="bi bi-file-text"></i>
                        Summary
                    </h2>
                    <div class="summary-wrapper">
                        <p class="article-summary">
                            ${this.escapeHtml(summary)}
                        </p>
                    </div>
                </div>

                <!-- Factuality Scale Breakdown -->
                <div class="results-card mb-6">
                    <div class="flex flex-col sm:flex-row sm:items-center mb-6 gap-3">
                        <div class="flex items-center gap-3">
                            <div class="results-icon bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">
                                <i class="bi bi-speedometer2"></i>
                            </div>
                            <h3 class="text-xl font-semibold text-gray-800 dark:text-white">Factuality Scale Breakdown</h3>
                        </div>
                    </div>
                    <div class="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 mb-6 border border-blue-200 dark:border-blue-700">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div class="flex items-center">
                                <div class="w-3 h-3 rounded-full mr-3" style="background-color: ${this.getScoreColorHex(classification_score)}"></div>
                                <span class="font-semibold text-gray-800 dark:text-gray-200 text-sm sm:text-base">Your Article's Score:</span>
                            </div>
                            <button onclick="window.historyManager?.modalHandler?.toggleScoreInfo()" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm self-start sm:self-auto">
                                <i class="bi bi-chevron-down"></i> Show Details
                            </button>
                        </div>
                        <div class="mt-3">
                            <p class="text-base sm:text-lg">
                                <span class="font-bold text-xl sm:text-2xl" style="color: ${this.getScoreColorHex(classification_score)}">${Math.round(classification_score * 100)}%</span>
                                <span class="text-gray-600 dark:text-gray-400">falls under</span>
                                <span class="font-semibold mx-1" style="color: ${this.getScoreColorHex(classification_score)}">${this.getClassificationFromScore(classification_score)}</span>
                                <span class="text-gray-600 dark:text-gray-400">classification</span>
                            </p>
                        </div>
                        <div id="modalScoreDetails" class="hidden mt-4 pt-4 border-t border-blue-200 dark:border-blue-600">
                            <div class="text-sm text-gray-700 dark:text-gray-300">
                                <p class="mb-2"><strong>Classification Rules:</strong></p>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div class="flex items-center p-2 bg-red-50 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-700">
                                        <span class="font-semibold text-red-700 dark:text-red-300">Fake: 0-50%</span>
                                    </div>
                                    <div class="flex items-center p-2 bg-green-50 dark:bg-green-900/30 rounded border border-green-200 dark:border-green-700">
                                        <span class="font-semibold text-green-700 dark:text-green-300">Real: 51-100%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="relative mb-4 lg:mb-6">
                        <div class="flex h-6 sm:h-8 rounded-full overflow-hidden shadow-inner">
                            <div class="flex-1 bg-gradient-to-r from-red-500 to-red-400 flex items-center justify-center">
                                <span class="text-white text-xs font-bold hidden sm:inline">0-25%</span>
                                <span class="text-white text-xs font-bold sm:hidden">0-25</span>
                            </div>
                            <div class="flex-1 bg-gradient-to-r from-orange-500 to-orange-400 flex items-center justify-center">
                                <span class="text-white text-xs font-bold hidden sm:inline">26-50%</span>
                                <span class="text-white text-xs font-bold sm:hidden">26-50</span>
                            </div>
                            <div class="flex-1 bg-gradient-to-r from-blue-500 to-blue-400 flex items-center justify-center">
                                <span class="text-white text-xs font-bold hidden sm:inline">51-74%</span>
                                <span class="text-white text-xs font-bold sm:hidden">51-74</span>
                            </div>
                            <div class="flex-1 bg-gradient-to-r from-green-500 to-green-400 flex items-center justify-center">
                                <span class="text-white text-xs font-bold hidden sm:inline">75-89%</span>
                                <span class="text-white text-xs font-bold sm:hidden">75-89</span>
                            </div>
                            <div class="flex-1 bg-gradient-to-r from-green-600 to-green-500 flex items-center justify-center">
                                <span class="text-white text-xs font-bold hidden sm:inline">90-100%</span>
                                <span class="text-white text-xs font-bold sm:hidden">90-100</span>
                            </div>
                        </div>
                        <div class="absolute -top-2 w-3 h-10 sm:w-4 sm:h-12 bg-gray-800 dark:bg-gray-200 border-2 sm:border-4 border-white dark:border-gray-800 rounded-full shadow-lg transform -translate-x-1/2 transition-all duration-1000" style="left: ${this.calculateScorePosition(classification_score)}%;">
                            <div class="absolute -top-6 sm:-top-8 left-1/2 transform -translate-x-1/2">
                                <div class="bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 px-1 sm:px-2 py-1 rounded text-xs font-bold">${Math.round(classification_score * 100)}%</div>
                            </div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 text-center">
                        <div class="p-2 sm:p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
                            <div class="font-bold text-red-700 dark:text-red-300 text-xs sm:text-sm">Very Low</div>
                            <div class="text-xs text-red-600 dark:text-red-400 mt-1">False/Fabricated</div>
                        </div>
                        <div class="p-2 sm:p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-700">
                            <div class="font-bold text-orange-700 dark:text-orange-300 text-xs sm:text-sm">Low</div>
                            <div class="text-xs text-orange-600 dark:text-orange-400 mt-1">Misleading</div>
                        </div>
                        <div class="p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                            <div class="font-bold text-blue-700 dark:text-blue-300 text-xs sm:text-sm">Mostly Factual</div>
                            <div class="text-xs text-blue-600 dark:text-blue-400 mt-1">Generally Reliable</div>
                        </div>
                        <div class="p-2 sm:p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                            <div class="font-bold text-green-700 dark:text-green-300 text-xs sm:text-sm">High</div>
                            <div class="text-xs text-green-600 dark:text-green-400 mt-1">Minor Concerns</div>
                        </div>
                        <div class="p-2 sm:p-3 bg-green-100 dark:bg-green-900/40 rounded-lg border border-green-300 dark:border-green-600">
                            <div class="font-bold text-green-800 dark:text-green-200 text-xs sm:text-sm">Very High</div>
                            <div class="text-xs text-green-700 dark:text-green-300 mt-1">Highly Factual</div>
                        </div>
                    </div>
                </div>

                <!-- Breakdown Section -->
                ${breakdown && breakdown.length > 0 ? `
                    <div class="results-card mb-6">
                        <h2 class="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <i class="bi bi-list-check"></i>
                            Detailed Analysis
                            <span class="text-sm font-normal text-gray-500">(5 analysis factors)</span>
                        </h2>
                        <div class="space-y-4">
                            ${breakdown.map((item, index) => this.renderBreakdownItem(item, index)).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Cross-Check Results Section -->
                ${cross_check_results && cross_check_results.length > 0 ? `
                    <div class="results-card mb-6">
                        <h2 class="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                            <i class="bi bi-search"></i>
                            Cross-Reference Results
                            <span class="text-sm font-normal text-gray-500">(${cross_check_results.length} sources)</span>
                        </h2>
                        <div class="space-y-4">
                            ${cross_check_results.map((result, index) => this.renderCrossCheckResult(result, index)).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Populate footer with action button
        this.modalFooter.innerHTML = original_url ? `
            <div class="flex justify-center">
                <a href="${this.escapeHtml(original_url)}" target="_blank" rel="noopener" 
                   class="history-btn history-btn-primary">
                    <i class="bi bi-box-arrow-up-right mr-2"></i>
                    View Original Article
                </a>
            </div>
        ` : '';
    }

    renderBreakdownItem(item, index) {
        const {
            claim = 'No claim specified',
            reasoning = 'No reasoning provided'
        } = item;

        return `
            <div class="results-card transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10">
                <div class="mb-3">
                    <h3 class="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                        <span class="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-sm font-bold flex items-center justify-center">
                            ${index + 1}
                        </span>
                        ${this.escapeHtml(claim)}
                    </h3>
                </div>
                <div>
                    <p class="text-gray-700 dark:text-gray-300 text-justify">${this.escapeHtml(reasoning)}</p>
                </div>
            </div>
        `;
    }

    renderCrossCheckResult(result, index) {
        const {
            source_name = 'Unknown Source',
            title = 'No title available',
            summary = 'No summary available',
            similarity_score = 0,
            match_url = null
        } = result;

        return `
            <div class="results-card transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10">
                <div class="flex justify-between items-start gap-4 mb-3">
                    <div class="flex-1">
                        <h3 class="font-semibold text-gray-800 dark:text-white mb-1 flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-sm font-bold flex items-center justify-center">
                                ${index + 1}
                            </span>
                            ${this.escapeHtml(source_name)}
                        </h3>
                        <h4 class="text-gray-700 dark:text-gray-300">
                            ${this.escapeHtml(title)}
                        </h4>
                    </div>
                    <div class="text-right">
                        <span class="similarity-badge bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                            ${Math.round(similarity_score)}% similar
                        </span>
                    </div>
                </div>
                <p class="text-gray-700 dark:text-gray-300 mb-3">
                    ${this.escapeHtml(summary)}
                </p>
                ${match_url ? `
                    <a href="${this.escapeHtml(match_url)}" target="_blank" rel="noopener" 
                       class="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm">
                        <i class="bi bi-link-45deg"></i>
                        View Source
                    </a>
                ` : ''}
            </div>
        `;
    }

    showLoadingModal() {
        if (!this.modalContent) return;
        
        this.modalContent.innerHTML = `
            <div class="flex items-center justify-center py-12">
                <div class="loading-spinner"></div>
                <span class="ml-3 text-gray-600 dark:text-gray-400">Loading article details...</span>
            </div>
        `;
    }

    showErrorModal(message) {
        if (!this.modalContent) return;
        
        this.modalContent.innerHTML = `
            <div class="text-center py-12">
                <i class="bi bi-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                <h3 class="text-xl font-semibold mb-2 text-red-600">Error</h3>
                <p class="text-gray-600 dark:text-gray-400 mb-6">${this.escapeHtml(message)}</p>
                <button onclick="window.historyManager?.modalHandler?.closeModal()" 
                        class="history-btn history-btn-primary">
                    <i class="bi bi-x-circle mr-2"></i>
                    Close
                </button>
            </div>
        `;
    }

    openModal() {
        if (!this.modal) return;
        
        this.modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        this.isOpen = true;
        
        // Focus management
        this.modal.focus();
    }

    closeModal() {
        if (!this.modal) return;
        
        this.modal.classList.add('hidden');
        document.body.style.overflow = '';
        this.isOpen = false;
        this.currentArticle = null;
        
        console.log('🔒 Modal closed');
    }

    // Utility methods
    getClassificationClass(classification) {
        switch (classification?.toLowerCase()) {
            case 'real': return 'classification-real';
            case 'fake': return 'classification-fake';
            default: return 'classification-unknown';
        }
    }

    getScoreColor(score) {
        if (score >= 0.8) return '#10b981'; // green
        if (score >= 0.6) return '#f59e0b'; // yellow
        if (score >= 0.4) return '#f97316'; // orange
        return '#ef4444'; // red
    }

    getInputTypeLabel(inputType) {
        switch (inputType) {
            case 'url': return 'URL Analysis';
            case 'snippet': return 'Text Snippet';
            default: return 'Unknown Type';
        }
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown Date';
        
        try {
            // Use Philippine timezone formatting
            return window.PhilippineTime.formatDateTime(dateString);
        } catch (error) {
            return 'Invalid Date';
        }
    }

    toggleScoreInfo() {
        const scoreDetails = document.getElementById('modalScoreDetails');
        const toggleBtn = scoreDetails?.parentElement.querySelector('button[onclick*="toggleScoreInfo"]');
        
        if (scoreDetails && toggleBtn) {
            const isHidden = scoreDetails.classList.contains('hidden');
            
            if (isHidden) {
                scoreDetails.classList.remove('hidden');
                toggleBtn.innerHTML = '<i class="bi bi-chevron-up"></i> Hide Details';
            } else {
                scoreDetails.classList.add('hidden');
                toggleBtn.innerHTML = '<i class="bi bi-chevron-down"></i> Show Details';
            }
        }
    }

    escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') {
            return '';
        }
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Helper methods for factuality scale
    getScoreColorHex(score) {
        const scorePercent = Math.round(score * 100);
        if (scorePercent >= 90) return '#16a34a'; // green-600
        if (scorePercent >= 75) return '#22c55e'; // green-500
        if (scorePercent >= 51) return '#3b82f6'; // blue-500
        if (scorePercent >= 26) return '#f97316'; // orange-500
        return '#ef4444'; // red-500
    }

    getClassificationFromScore(score) {
        const scorePercent = Math.round(score * 100);
        if (scorePercent >= 51) return 'Real';
        return 'Fake';
    }

    calculateScorePosition(score) {
        const scorePercent = Math.round(score * 100);
        
        // Calculate position based on the 6-section partition
        // Sections: 0-25%, 26-50%, 51-74%, 75-89%, 90-100% (5 divisions)
        // Each section takes up 1/5 of the total width (20%)
        let position;
        
        if (scorePercent <= 25) {
            // First section: 0-25%
            position = (scorePercent / 25) * 20; // Map 0-25 to 0-20%
        } else if (scorePercent <= 50) {
            // Second section: 26-50%
            position = 20 + ((scorePercent - 25) / 25) * 20; // Map 26-50 to 20-40%
        } else if (scorePercent <= 74) {
            // Third section: 51-74%
            position = 40 + ((scorePercent - 51) / 24) * 20; // Map 51-74 to 40-60%
        } else if (scorePercent <= 89) {
            // Fourth section: 75-89%
            position = 60 + ((scorePercent - 75) / 15) * 20; // Map 75-89 to 60-80%
        } else {
            // Fifth section: 90-100%
            position = 80 + ((scorePercent - 90) / 10) * 20; // Map 90-100 to 80-100%
        }
        
        return position;
    }
}
