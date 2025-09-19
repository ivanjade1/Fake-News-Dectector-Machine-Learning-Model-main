// Admin Feedback JavaScript Module
// Handles feedback management, filtering, and detailed viewing

class AdminFeedback {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 6;
        this.searchTerm = '';
        this.typeFilter = 'all'; // Using for rating filter
        this.sortBy = 'date';
        this.sortOrder = 'desc';
        this.init();
    }

    async init() {
        console.log('Initializing Admin Feedback...');
        await this.loadFeedbackStatistics();
        await this.loadFeedback();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.searchTerm = e.target.value;
                this.currentPage = 1;
                this.loadFeedback();
            }, 300));
        }

        // Filter toggle button
        const filterToggle = document.getElementById('filterToggle');
        if (filterToggle) {
            filterToggle.addEventListener('click', () => {
                const filtersPanel = document.getElementById('filtersPanel');
                if (filtersPanel) {
                    filtersPanel.classList.toggle('hidden');
                    const icon = filterToggle.querySelector('i');
                    if (icon) {
                        icon.classList.toggle('bi-sliders');
                        icon.classList.toggle('bi-sliders2');
                    }
                }
            });
        }

        // Clear filters button
        const clearFilters = document.getElementById('clearFilters');
        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                this.searchTerm = '';
                this.typeFilter = 'all';
                this.sortBy = 'date';
                this.sortOrder = 'desc';
                this.currentPage = 1;
                
                // Reset form elements
                if (searchInput) searchInput.value = '';
                const ratingFilter = document.getElementById('ratingFilter');
                if (ratingFilter) ratingFilter.value = '';
                const sortSelect = document.getElementById('sortSelect');
                if (sortSelect) sortSelect.value = 'date-desc';
                
                // Remove active state from quick filter chips
                document.querySelectorAll('.quick-filter-chip').forEach(chip => {
                    chip.classList.remove('bg-orange-100', 'text-orange-800', 'border-orange-200');
                    chip.classList.add('bg-gray-100', 'text-gray-700', 'border-gray-200');
                });
                
                this.loadFeedback();
            });
        }

        // Quick filter chips
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-filter-chip')) {
                const filter = e.target.getAttribute('data-filter');
                const value = e.target.getAttribute('data-value');
                
                // Remove active state from all chips of the same filter type
                document.querySelectorAll(`[data-filter="${filter}"]`).forEach(chip => {
                    chip.classList.remove('bg-orange-100', 'text-orange-800', 'border-orange-200');
                    chip.classList.add('bg-gray-100', 'text-gray-700', 'border-gray-200');
                });
                
                // Add active state to clicked chip
                e.target.classList.remove('bg-gray-100', 'text-gray-700', 'border-gray-200');
                e.target.classList.add('bg-orange-100', 'text-orange-800', 'border-orange-200');
                
                if (filter === 'rating') {
                    this.typeFilter = value; // Using typeFilter for rating
                    const ratingFilter = document.getElementById('ratingFilter');
                    if (ratingFilter) ratingFilter.value = value;
                }
                
                this.currentPage = 1;
                this.loadFeedback();
            }
        });

        // Filter dropdowns
        const ratingFilter = document.getElementById('ratingFilter');
        if (ratingFilter) {
            ratingFilter.addEventListener('change', (e) => {
                this.typeFilter = e.target.value; // Using typeFilter for rating
                this.currentPage = 1;
                this.loadFeedback();
            });
        }

        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                this.sortBy = sortBy;
                this.sortOrder = sortOrder;
                this.currentPage = 1;
                this.loadFeedback();
            });
        }

        // Modal close functionality
        const detailModal = document.getElementById('feedbackDetailModal');
        if (detailModal) {
            detailModal.addEventListener('click', (e) => {
                if (e.target === detailModal) {
                    this.closeFeedbackDetail();
                }
            });
        }
    }

    async loadFeedback() {
        try {
            this.showLoading();
            
            const params = new URLSearchParams({
                page: this.currentPage,
                per_page: this.itemsPerPage,
                search: this.searchTerm,
                type: this.typeFilter,
                sort_by: this.sortBy,
                sort_order: this.sortOrder
            });

            const response = await fetch(`/admin/api/feedback?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                this.displayFeedback(data.feedback);
                this.displayPagination(data.pagination);
                this.updateResultsInfo(data.pagination);
                this.showFeedbackContainer();
            } else {
                throw new Error(data.error || 'Failed to load feedback');
            }
        } catch (error) {
            console.error('Error loading feedback:', error);
            this.showError('Failed to load feedback: ' + error.message);
        }
    }

    displayFeedback(feedbackItems) {
        const container = document.getElementById('feedbackContainer');
        if (!container) return;

        if (feedbackItems.length === 0) {
            container.innerHTML = `
                <div class="results-card text-center py-12">
                    <div class="text-neutral-400 dark:text-neutral-500 text-lg mb-2">
                        <i class="bi bi-chat-dots text-4xl"></i>
                    </div>
                    <h3 class="text-lg font-medium text-neutral-600 dark:text-neutral-400 mb-2">No feedback found</h3>
                    <p class="text-sm text-neutral-500 dark:text-neutral-500">
                        ${this.searchTerm ? 'Try adjusting your search term.' : 'No user feedback has been submitted yet.'}
                    </p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                ${feedbackItems.map(feedback => `
                    <div class="results-card hover:border-orange-200 dark:hover:border-orange-800 transition-colors cursor-pointer" onclick="adminFeedback.showFeedbackDetail(${feedback.id})">
                        <div class="flex flex-col gap-3 mb-3">
                            <div class="flex items-start justify-between gap-3">
                                <div class="flex items-center gap-3 flex-1 min-w-0">
                                    <div class="user-avatar bg-gradient-to-r from-orange-500 to-orange-400 text-white w-10 h-10 rounded-full flex items-center justify-center font-semibold flex-shrink-0">
                                        ${feedback.username ? feedback.username.charAt(0).toUpperCase() : 'A'}
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <div class="font-semibold text-neutral-800 dark:text-neutral-200 truncate">${feedback.username || 'Anonymous'}</div>
                                        <div class="text-sm text-neutral-600 dark:text-neutral-400">${feedback.date}</div>
                                    </div>
                                </div>
                                <div class="flex flex-col items-end gap-1 flex-shrink-0">
                                    <div class="flex items-center gap-1">
                                        ${this.renderStars(feedback.rating)}
                                    </div>
                                    <span class="text-xs text-neutral-500">${feedback.rating}/5</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <p class="text-sm text-neutral-700 dark:text-neutral-300 line-clamp-3">
                                ${feedback.message}
                            </p>
                        </div>
                        
                        <div class="flex items-center justify-end text-xs text-neutral-500">
                            <span class="text-neutral-500 dark:text-neutral-400">
                                ID: ${feedback.id}
                            </span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        let starsHTML = '';

        for (let i = 0; i < fullStars; i++) {
            starsHTML += '<i class="bi bi-star-fill text-yellow-400"></i>';
        }

        if (hasHalfStar) {
            starsHTML += '<i class="bi bi-star-half text-yellow-400"></i>';
        }

        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += '<i class="bi bi-star text-neutral-300 dark:text-neutral-600"></i>';
        }

        return starsHTML;
    }

    displayPagination(pagination) {
        const container = document.getElementById('paginationContainer');
        if (!container || pagination.pages <= 1) {
            if (container) container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        
        const maxVisiblePages = 4;
        const currentPage = pagination.page;
        const totalPages = pagination.pages;
        
        // Calculate visible page range
        let startPage, endPage;
        if (totalPages <= maxVisiblePages) {
            startPage = 1;
            endPage = totalPages;
        } else if (currentPage <= 2) {
            startPage = 1;
            endPage = maxVisiblePages;
        } else if (currentPage >= totalPages - 1) {
            startPage = totalPages - maxVisiblePages + 1;
            endPage = totalPages;
        } else {
            startPage = currentPage - 1;
            endPage = currentPage + 2;
        }
        
        let paginationHTML = `
            <nav class="flex items-center justify-between" aria-label="Pagination">
                <div class="flex-1 flex justify-between sm:hidden">
                    <!-- Mobile pagination -->
                    ${currentPage > 1 ? `
                        <button onclick="adminFeedback.goToPage(${currentPage - 1})" class="pagination-btn pagination-btn-prev">
                            <i class="bi bi-chevron-left mr-2"></i>
                            Previous
                        </button>
                    ` : `
                        <span class="pagination-btn pagination-btn-disabled">
                            <i class="bi bi-chevron-left mr-2"></i>
                            Previous
                        </span>
                    `}
                    
                    <span class="pagination-info">
                        Page ${currentPage} of ${totalPages}
                    </span>
                    
                    ${currentPage < totalPages ? `
                        <button onclick="adminFeedback.goToPage(${currentPage + 1})" class="pagination-btn pagination-btn-next">
                            Next
                            <i class="bi bi-chevron-right ml-2"></i>
                        </button>
                    ` : `
                        <span class="pagination-btn pagination-btn-disabled">
                            Next
                            <i class="bi bi-chevron-right ml-2"></i>
                        </span>
                    `}
                </div>
                
                <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-center">
                    <div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">
                        <!-- Desktop pagination controls -->
                        <div class="pagination-controls">
                            <!-- First page -->
                            ${currentPage > 1 ? `
                                <button onclick="adminFeedback.goToPage(1)" class="pagination-btn pagination-btn-nav" title="First page">
                                    <i class="bi bi-chevron-double-left"></i>
                                </button>
                            ` : `
                                <span class="pagination-btn pagination-btn-disabled" title="First page">
                                    <i class="bi bi-chevron-double-left"></i>
                                </span>
                            `}
                            
                            <!-- Previous page -->
                            ${currentPage > 1 ? `
                                <button onclick="adminFeedback.goToPage(${currentPage - 1})" class="pagination-btn pagination-btn-nav" title="Previous page">
                                    <i class="bi bi-chevron-left"></i>
                                </button>
                            ` : `
                                <span class="pagination-btn pagination-btn-disabled" title="Previous page">
                                    <i class="bi bi-chevron-left"></i>
                                </span>
                            `}
                            
                            <!-- Page numbers -->`;
        
        for (let i = startPage; i <= endPage; i++) {
            if (i === currentPage) {
                paginationHTML += `<span class="pagination-btn pagination-btn-current">${i}</span>`;
            } else {
                paginationHTML += `<button onclick="adminFeedback.goToPage(${i})" class="pagination-btn pagination-btn-page">${i}</button>`;
            }
        }
        
        paginationHTML += `
                            <!-- Next page -->
                            ${currentPage < totalPages ? `
                                <button onclick="adminFeedback.goToPage(${currentPage + 1})" class="pagination-btn pagination-btn-nav" title="Next page">
                                    <i class="bi bi-chevron-right"></i>
                                </button>
                            ` : `
                                <span class="pagination-btn pagination-btn-disabled" title="Next page">
                                    <i class="bi bi-chevron-right"></i>
                                </span>
                            `}
                            
                            <!-- Last page -->
                            ${currentPage < totalPages ? `
                                <button onclick="adminFeedback.goToPage(${totalPages})" class="pagination-btn pagination-btn-nav" title="Last page">
                                    <i class="bi bi-chevron-double-right"></i>
                                </button>
                            ` : `
                                <span class="pagination-btn pagination-btn-disabled" title="Last page">
                                    <i class="bi bi-chevron-double-right"></i>
                                </span>
                            `}
                        </div>
                        
                        <!-- Desktop pagination info - below controls -->
                        <div class="pagination-info">
                            Showing page <span class="font-medium">${currentPage}</span> of <span class="font-medium">${totalPages}</span>
                        </div>
                    </div>
                </div>
            </nav>
        `;
        
        container.innerHTML = paginationHTML;
    }

    updateResultsInfo(pagination) {
        const container = document.getElementById('resultsCount');
        if (!container) return;

        const start = ((pagination.page - 1) * pagination.per_page) + 1;
        const end = Math.min(pagination.page * pagination.per_page, pagination.total);
        
        let resultsText = `Showing ${start}-${end} of ${pagination.total} feedback items`;
        
        // Add filter information if filters are active
        const activeFilters = [];
        if (this.searchTerm) activeFilters.push(`search: "${this.searchTerm}"`);
        if (this.typeFilter && this.typeFilter !== 'all') activeFilters.push(`rating: ${this.typeFilter} stars`);
        
        if (activeFilters.length > 0) {
            resultsText += ` (filtered by ${activeFilters.join(', ')})`;
        }
        
        container.textContent = resultsText;
    }

    async showFeedbackDetail(feedbackId) {
        try {
            const response = await fetch(`/admin/api/feedback/${feedbackId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                this.displayFeedbackDetail(data.feedback);
            } else {
                throw new Error(data.error || 'Failed to load feedback details');
            }
        } catch (error) {
            console.error('Error loading feedback detail:', error);
            alert('Failed to load feedback details: ' + error.message);
        }
    }

    displayFeedbackDetail(feedback) {
        const modal = document.getElementById('feedbackDetailModal');
        const content = document.getElementById('feedbackDetailContent');
        
        if (!modal || !content) {
            console.error('Modal elements not found');
            return;
        }
        
        content.innerHTML = `
            <div class="space-y-6">
                <!-- User Info -->
                <div class="flex items-start gap-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                    <div class="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-400 text-white rounded-full flex items-center justify-center font-semibold text-lg">
                        ${feedback.username ? feedback.username.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-200">${feedback.username || 'Anonymous'}</h3>
                        <p class="text-sm text-neutral-600 dark:text-neutral-400">Submitted on ${feedback.date}</p>
                        <div class="mt-2 flex items-center gap-3">
                            <div class="flex">${this.renderStars(feedback.rating)}</div>
                            <span class="text-sm text-neutral-600 dark:text-neutral-400">${feedback.rating}/5 stars</span>
                        </div>
                    </div>
                </div>

                <!-- Feedback Content -->
                <div class="space-y-4">
                    <div>
                        <h4 class="font-semibold text-neutral-800 dark:text-neutral-200 mb-2">Feedback Message</h4>
                        <div class="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                            <p class="text-neutral-700 dark:text-neutral-300 leading-relaxed">${feedback.message}</p>
                        </div>
                    </div>

                    ${feedback.rating ? `
                        <div>
                            <h4 class="font-semibold text-neutral-800 dark:text-neutral-200 mb-2">Rating</h4>
                            <div class="flex items-center gap-2">
                                <div class="flex">${this.renderStars(feedback.rating)}</div>
                                <span class="text-sm text-neutral-600 dark:text-neutral-400">${feedback.rating} out of 5 stars</span>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Technical Details -->
                    <div>
                        <h4 class="font-semibold text-neutral-800 dark:text-neutral-200 mb-2">Details</h4>
                        <div class="grid grid-cols-2 gap-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                            <div>
                                <span class="text-xs text-neutral-500 dark:text-neutral-400">Feedback ID</span>
                                <p class="font-mono text-sm">${feedback.id}</p>
                            </div>
                            <div>
                                <span class="text-xs text-neutral-500 dark:text-neutral-400">User ID</span>
                                <p class="font-mono text-sm">${feedback.user_id || 'N/A'}</p>
                            </div>
                            <div>
                                <span class="text-xs text-neutral-500 dark:text-neutral-400">Submission Date</span>
                                <p class="text-sm">${feedback.created_at}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex flex-wrap gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                        <button onclick="adminFeedback.deleteFeedback(${feedback.id})" 
                                class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                        <button onclick="adminFeedback.closeFeedbackDetail()" 
                                class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2">
                            <i class="bi bi-x"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
    }

    closeFeedbackDetail() {
        document.getElementById('feedbackDetailModal').classList.add('hidden');
    }

    async deleteFeedback(feedbackId) {
        if (!confirm('Are you sure you want to delete this feedback? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/admin/api/feedback/${feedbackId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();
            if (data.success) {
                this.showSuccessMessage(data.message);
                this.closeFeedbackDetail();
                await this.loadFeedback();
            } else {
                this.showErrorMessage(data.error || 'Failed to delete feedback');
            }
        } catch (error) {
            console.error('Error deleting feedback:', error);
            this.showErrorMessage('Failed to delete feedback: ' + error.message);
        }
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadFeedback();
    }

    async loadFeedbackStatistics() {
        try {
            const response = await fetch('/admin/api/feedback/statistics');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                this.displayStatistics(data.statistics);
            } else {
                console.error('Failed to load statistics:', data.error);
            }
        } catch (error) {
            console.error('Error loading feedback statistics:', error);
            // Don't show error to user for statistics - just log it
        }
    }

    displayStatistics(stats) {
        // Update total feedback
        const totalElement = document.getElementById('totalFeedbackStat');
        if (totalElement) {
            totalElement.textContent = stats.total_feedback || 0;
        }

        // Update average rating
        const avgRatingElement = document.getElementById('averageRating');
        if (avgRatingElement) {
            const avgRating = stats.average_rating || 0;
            avgRatingElement.textContent = parseFloat(avgRating).toFixed(1);
        }

        // Update rating distribution
        if (stats.rating_distribution) {
            for (let rating = 1; rating <= 5; rating++) {
                const count = stats.rating_distribution[rating] || 0;
                const percentage = stats.total_feedback > 0 ? (count / stats.total_feedback) * 100 : 0;
                
                const countElement = document.getElementById(`rating${rating}Count`);
                const barElement = document.getElementById(`rating${rating}Bar`);
                
                if (countElement) {
                    countElement.textContent = count;
                }
                
                if (barElement) {
                    barElement.style.width = `${percentage}%`;
                }
            }
        }
    }

    showLoading() {
        document.getElementById('loadingState').classList.remove('hidden');
        document.getElementById('feedbackContainer').classList.add('hidden');
        document.getElementById('errorState').classList.add('hidden');
    }

    showFeedbackContainer() {
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('feedbackContainer').classList.remove('hidden');
        document.getElementById('errorState').classList.add('hidden');
    }

    showError(message) {
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('feedbackContainer').classList.add('hidden');
        document.getElementById('errorState').classList.remove('hidden');
        document.getElementById('errorMessage').textContent = message;
    }

    showSuccessMessage(message) {
        // Simple toast-like message (you can enhance this)
        alert(message); // Replace with better notification system if desired
    }

    showErrorMessage(message) {
        // Simple toast-like message (you can enhance this)
        alert(message); // Replace with better notification system if desired
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Global functions
window.refreshFeedback = async function() {
    if (window.adminFeedback) {
        await window.adminFeedback.loadFeedback();
    }
};

window.exportFeedbackData = function() {
    alert('Export functionality would be implemented here');
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminFeedback = new AdminFeedback();
});

export { AdminFeedback };
