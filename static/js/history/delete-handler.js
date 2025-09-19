// Delete Handler Module
export class DeleteHandler {
    constructor() {
        this.modal = null;
        this.modalContent = null;
        this.closeButton = null;
        this.isOpen = false;
        this.currentArticleId = null;
        
        // Defer initialization to ensure DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.modal = document.getElementById('deleteModal');
        this.modalContent = document.getElementById('deleteModalContent');
        this.closeButton = document.getElementById('closeDeleteModal');
        
        if (!this.modal || !this.modalContent || !this.closeButton) {
            console.error('❌ Delete modal elements not found', {
                modal: !!this.modal,
                modalContent: !!this.modalContent,
                closeButton: !!this.closeButton
            });
            return;
        }

        console.log('🗑️ Delete handler initialized');
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
            // Check if the click is outside the modal content
            const modalCard = this.modal.querySelector('.modal-card');
            if (modalCard && !modalCard.contains(e.target)) {
                this.closeModal();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeModal();
            }
        });

        console.log('🎯 Delete modal event listeners setup');
    }

    async showDeleteModal(articleId) {
        console.log(`🗑️ Opening delete modal for article ${articleId}`);
        
        try {
            this.currentArticleId = articleId;
            
            // Get article data to determine what to show
            let article = null;
            
            // First try to find in current articles list
            if (window.historyManager?.articles) {
                article = window.historyManager.articles.find(a => a.id === articleId);
            }

            if (!article) {
                throw new Error('Article not found');
            }

            // Get current filter state to determine delete options
            const showDuplicates = window.historyManager?.searchFilter?.getState()?.showDuplicates ?? true;

            if (showDuplicates) {
                // Show All Articles mode: offer simple choice
                this.renderSimpleDeleteOptions(article);
            } else {
                // Hide Duplicates mode: need to get all users who have this article
                await this.renderAdvancedDeleteOptions(article);
            }

            this.openModal();

        } catch (error) {
            console.error('❌ Error showing delete modal:', error);
            this.showErrorModal('Failed to load delete options. Please try again.');
        }
    }

    renderSimpleDeleteOptions(article) {
        const { title = 'Untitled Article' } = article;
        
        this.modalContent.innerHTML = `
            <div class="delete-modal-content">
                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                        "${this.escapeHtml(title)}"
                    </p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        Choose how you want to delete this article:
                    </p>
                </div>

                <div class="space-y-4 mb-6">
                    <button class="delete-option-btn w-full p-4 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            data-delete-type="single">
                        <div class="flex items-start gap-3">
                            <div class="flex-1 min-w-0">
                                <h3 class="font-semibold text-gray-800 dark:text-white">Delete for this user only</h3>
                                <p class="text-sm text-gray-600 dark:text-gray-400">Remove only this specific user's entry</p>
                            </div>
                            <i class="bi bi-person-dash text-orange-500 text-xl flex-shrink-0 mt-0.5"></i>
                        </div>
                    </button>

                    <button class="delete-option-btn w-full p-4 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            data-delete-type="all">
                        <div class="flex items-start gap-3">
                            <div class="flex-1 min-w-0">
                                <h3 class="font-semibold text-gray-800 dark:text-white">Delete for all users</h3>
                                <p class="text-sm text-gray-600 dark:text-gray-400">Remove this article for every user who has it</p>
                            </div>
                            <i class="bi bi-people-fill text-red-500 text-xl flex-shrink-0 mt-0.5"></i>
                        </div>
                    </button>
                </div>

                <div class="flex justify-end gap-3">
                    <button class="btn-secondary" id="cancelDelete">Cancel</button>
                </div>
            </div>
        `;

        this.setupDeleteOptionHandlers();
    }

    async renderAdvancedDeleteOptions(article) {
        const { title = 'Untitled Article' } = article;
        
        // Show loading state first
        this.modalContent.innerHTML = `
            <div class="delete-modal-content">
                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">Delete Article</h2>
                    <p class="text-gray-600 dark:text-gray-400 mb-4">
                        "${this.escapeHtml(title)}"
                    </p>
                </div>
                <div class="text-center py-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p class="text-gray-600 dark:text-gray-400 mt-2">Loading duplicate information...</p>
                </div>
            </div>
        `;

        try {
            // Get duplicate information from API
            const duplicateInfo = await this.getDuplicateInfo(article.id);
            
            this.modalContent.innerHTML = `
                <div class="delete-modal-content">
                    <div class="mb-6">
                        <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">Delete Article</h2>
                        <p class="text-gray-600 dark:text-gray-400 mb-4">
                            "${this.escapeHtml(title)}"
                        </p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                            This article exists for ${duplicateInfo.users.length} user(s). Choose deletion option:
                        </p>
                    </div>

                    <div class="space-y-4 mb-6">
                        ${duplicateInfo.users.map(user => `
                            <button class="delete-option-btn w-full p-3 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    data-delete-type="user" data-user-id="${user.id}">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <h4 class="font-medium text-gray-800 dark:text-white">${this.escapeHtml(user.username)}</h4>
                                        <p class="text-xs text-gray-500">${this.escapeHtml(user.email)}</p>
                                    </div>
                                    <i class="bi bi-person-dash text-orange-500"></i>
                                </div>
                            </button>
                        `).join('')}

                        <div class="border-t border-gray-300 dark:border-gray-600 pt-4">
                            <button class="delete-option-btn w-full p-4 text-left border border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    data-delete-type="all">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <h3 class="font-semibold text-red-700 dark:text-red-400">Delete for all users</h3>
                                        <p class="text-sm text-red-600 dark:text-red-500">Remove this article completely from the system</p>
                                    </div>
                                    <i class="bi bi-people-fill text-red-500 text-xl"></i>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div class="flex justify-end gap-3">
                        <button class="btn-secondary" id="cancelDelete">Cancel</button>
                    </div>
                </div>
            `;

            this.setupDeleteOptionHandlers();

        } catch (error) {
            console.error('❌ Error loading duplicate info:', error);
            this.modalContent.innerHTML = `
                <div class="delete-modal-content">
                    <div class="text-center py-8">
                        <i class="bi bi-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                        <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-2">Error Loading Data</h3>
                        <p class="text-gray-600 dark:text-gray-400 mb-4">
                            Failed to load article information. Please try again.
                        </p>
                        <button class="btn-secondary" id="cancelDelete">Close</button>
                    </div>
                </div>
            `;
            
            // Setup cancel handler
            const cancelBtn = this.modalContent.querySelector('#cancelDelete');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => this.closeModal());
            }
        }
    }

    setupDeleteOptionHandlers() {
        // Delete option buttons
        const deleteOptionBtns = this.modalContent.querySelectorAll('.delete-option-btn');
        deleteOptionBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const deleteType = btn.dataset.deleteType;
                const userId = btn.dataset.userId;

                // Show confirmation popup
                const confirmMessage = this.getConfirmationMessage(deleteType, btn);
                const confirmed = confirm(confirmMessage);
                
                if (!confirmed) {
                    console.log('🚫 Delete operation cancelled by user');
                    return;
                }

                try {
                    // Show loading in the modal
                    this.showDeletingMessage();
                    
                    await this.performDelete(deleteType, userId);
                    
                    // Simply refresh the page
                    window.location.reload();

                } catch (error) {
                    console.error('❌ Error deleting article:', error);
                    this.showErrorModal('Failed to delete article. Please try again.');
                }
            });
        });

        // Cancel button
        const cancelBtn = this.modalContent.querySelector('#cancelDelete');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }
    }

    async performDelete(deleteType, userId = null) {
        const articleId = this.currentArticleId;
        
        if (deleteType === 'all') {
            // Delete for all users
            await this.deleteForAllUsers(articleId);
        } else if (deleteType === 'user' && userId) {
            // Delete for specific user
            await this.deleteForUser(articleId, userId);
        } else if (deleteType === 'single') {
            // Delete for the current article's user (from the article context)
            const article = window.historyManager.articles.find(a => a.id === articleId);
            if (article && article.user_id) {
                await this.deleteForUser(articleId, article.user_id);
            } else {
                throw new Error('Cannot determine user for deletion');
            }
        } else {
            throw new Error('Invalid delete type');
        }
    }

    async deleteForUser(articleId, userId) {
        // API call to delete article for specific user
        const response = await fetch(`/api/articles/${articleId}/delete-for-user`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id: userId })
        });

        if (!response.ok) {
            throw new Error('Failed to delete article for user');
        }

        console.log(`✅ Deleted article ${articleId} for user ${userId}`);
    }

    async deleteForAllUsers(articleId) {
        // API call to delete article for all users
        const response = await fetch(`/api/articles/${articleId}/delete-all`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete article for all users');
        }

        console.log(`✅ Deleted article ${articleId} for all users`);
    }

    async getDuplicateInfo(articleId) {
        try {
            const response = await fetch(`/api/articles/${articleId}/duplicates`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(`Failed to get duplicate information: ${errorMessage}`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Error in getDuplicateInfo:', error);
            throw error;
        }
    }

    openModal() {
        if (this.modal) {
            this.modal.classList.remove('hidden');
            this.isOpen = true;
            document.body.classList.add('modal-open');
        }
    }

    closeModal() {
        if (this.modal) {
            this.modal.classList.add('hidden');
            this.isOpen = false;
            document.body.classList.remove('modal-open');
            this.currentArticleId = null;
        }
    }

    getConfirmationMessage(deleteType, buttonElement) {
        let message = '';
        
        if (deleteType === 'all') {
            message = '⚠️ Are you sure you want to DELETE THIS ARTICLE FOR ALL USERS?\n\n';
            message += 'This action will permanently remove this article from the system for everyone and cannot be undone.\n\n';
            message += 'Click OK to proceed with deletion or Cancel to abort.';
        } else if (deleteType === 'user') {
            const username = buttonElement.querySelector('.font-semibold')?.textContent || 'this user';
            message = `⚠️ Are you sure you want to delete this article for ${username}?\n\n`;
            message += 'This action will permanently remove this article from the selected user\'s history and cannot be undone.\n\n';
            message += 'Click OK to proceed with deletion or Cancel to abort.';
        } else if (deleteType === 'single') {
            message = '⚠️ Are you sure you want to delete this article?\n\n';
            message += 'This action will permanently remove this article from your history and cannot be undone.\n\n';
            message += 'Click OK to proceed with deletion or Cancel to abort.';
        } else {
            message = '⚠️ Are you sure you want to delete this article?\n\n';
            message += 'This action cannot be undone.\n\n';
            message += 'Click OK to proceed with deletion or Cancel to abort.';
        }
        
        return message;
    }

    showDeletingMessage() {
        if (!this.modalContent) return;

        this.modalContent.innerHTML = `
            <div class="delete-modal-content">
                <div class="text-center py-8">
                    <div class="loading-spinner mx-auto mb-4"></div>
                    <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-2">Deleting Article...</h3>
                    <p class="text-gray-600 dark:text-gray-400">Please wait while we process your request.</p>
                </div>
            </div>
        `;
    }

    showErrorModal(message) {
        if (!this.modalContent) return;

        this.modalContent.innerHTML = `
            <div class="delete-modal-content">
                <div class="text-center py-8">
                    <i class="bi bi-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                    <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-2">Error</h3>
                    <p class="text-gray-600 dark:text-gray-400 mb-4">${message}</p>
                    <button class="btn-secondary" onclick="window.historyManager?.deleteHandler?.closeModal()">Close</button>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
