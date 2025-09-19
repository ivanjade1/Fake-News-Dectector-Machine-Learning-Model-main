// History Page Main Module
import { HistoryAPI } from './api.js';
import { SearchFilter } from './search-filter.js';
import { ArticleRenderer } from './article-renderer.js';
import { Pagination } from './pagination.js';
import { ModalHandler } from './modal.js';
import { DeleteHandler } from './delete-handler.js';

class HistoryManager {
    constructor() {
        this.api = new HistoryAPI();
        this.searchFilter = new SearchFilter();
        this.articleRenderer = new ArticleRenderer();
        this.pagination = new Pagination();
        this.modalHandler = new ModalHandler();
        this.deleteHandler = new DeleteHandler();
        
        this.currentPage = 1;
        this.articlesPerPage = 4;
        this.totalArticles = 0;
        this.articles = [];
        this.filteredArticles = [];
        this.lastFilterState = null; // Track filter state changes
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing History Manager');
        
        // Show loading state
        this.showLoading();
        
        try {
            // Wait for DOM to be ready
            await new Promise(resolve => {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', resolve);
                } else {
                    resolve();
                }
            });
            
            // Wait for SearchFilter to be fully initialized
            await this.searchFilter.waitForInit();
            console.log('🔧 SearchFilter initialization confirmed');
            
            // Load articles with initial filter state
            await this.loadArticlesWithFilters();
            
            // Initialize lastFilterState with current state
            this.lastFilterState = { ...this.searchFilter.getState() };
            console.log('🔧 Initial filter state set:', this.lastFilterState);
            
            // Setup SearchFilter callback to trigger our filtering logic
            this.searchFilter.onChange((filterState) => {
                this.handleFilterChange(filterState);
            });
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initial render
            this.renderCurrentPage();
            
            console.log('✅ History Manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize History Manager:', error);
            this.showError('Failed to load analysis history. Please refresh the page.');
        }
    }

    async loadArticles() {
        try {
            const response = await this.api.getArticles();
            this.articles = response.articles || [];
            this.totalArticles = this.articles.length;
            this.filteredArticles = [...this.articles];
            this.isAdmin = response.is_admin || false; // Store admin status from API response
            
            console.log(`📊 Loaded ${this.totalArticles} articles`);
            return this.articles;
        } catch (error) {
            console.error('❌ Error loading articles:', error);
            throw error;
        }
    }

    async loadArticlesWithFilters() {
        try {
            const filterState = this.searchFilter.getState();
            
            // Safety check for filterState
            if (!filterState || typeof filterState.showDuplicates === 'undefined') {
                console.warn('⚠️ FilterState invalid, using defaults:', filterState);
                const apiOptions = {
                    showDuplicates: true,
                    sortBy: 'created_at',
                    sortOrder: 'desc'
                };
                console.log('🌐 Making API call with default options:', apiOptions);
                const response = await this.api.getArticles(apiOptions);
                this.articles = response.articles || [];
                this.totalArticles = this.articles.length;
                this.filteredArticles = [...this.articles];
                this.isAdmin = response.is_admin || false; // Store admin status from API response
                return this.articles;
            }
            
            const apiOptions = {
                showDuplicates: filterState.showDuplicates,
                // Add other server-side filters if needed
                sortBy: this.mapSortOrder(filterState.sortOrder),
                sortOrder: filterState.sortOrder.includes('oldest') ? 'asc' : 'desc'
            };
            
            console.log('🌐 Making API call with options:', apiOptions);
            console.log('📋 Full filter state:', filterState);
            
            const response = await this.api.getArticles(apiOptions);
            this.articles = response.articles || [];
            this.totalArticles = this.articles.length;
            this.filteredArticles = [...this.articles];
            this.isAdmin = response.is_admin || false; // Store admin status from API response
            
            console.log(`📊 Loaded ${this.totalArticles} articles with server-side filters. Response:`, response);
            return this.articles;
        } catch (error) {
            console.error('❌ Error loading articles with filters:', error);
            throw error;
        }
    }

    async handleFilterChange(filterState) {
        console.log('🔍 Filter change detected:', filterState);
        console.log('🔍 Previous filter state:', this.lastFilterState);
        
        // Check if we need to reload from server (for showDuplicates changes)
        const duplicatesChanged = !this.lastFilterState || this.lastFilterState.showDuplicates !== filterState.showDuplicates;
        
        if (duplicatesChanged) {
            console.log(`🔄 Show duplicates filter changed from ${this.lastFilterState?.showDuplicates} to ${filterState.showDuplicates}, reloading from server...`);
            await this.loadArticlesWithFilters();
        }
        
        // Store current filter state for next comparison
        this.lastFilterState = { ...filterState };
        
        // Apply client-side filters
        this.applyFilters();
    }

    mapSortOrder(sortOrder) {
        switch(sortOrder) {
            case 'newest': return 'created_at';
            case 'oldest': return 'created_at';
            case 'title': return 'title';
            case 'score': return 'factuality_score';
            default: return 'created_at';
        }
    }

    setupEventListeners() {
        // SearchFilter class handles all search and filter events
        // Modal handler sets up its own events in init()
        
        console.log('🎯 Event listeners setup complete');
    }

    applyFilters() {
        // Get filter state from SearchFilter class
        const filterState = this.searchFilter.getState();
        const searchTerm = filterState.searchTerm.toLowerCase();
        const classification = filterState.classification;
        const inputType = filterState.inputType;
        const sortOrder = filterState.sortOrder;

        // Apply search and filters
        this.filteredArticles = this.articles.filter(article => {
            // Search filter
            const searchMatch = !searchTerm || 
                article.title?.toLowerCase().includes(searchTerm) ||
                article.summary?.toLowerCase().includes(searchTerm) ||
                article.breakdown?.some(item => 
                    item.claim?.toLowerCase().includes(searchTerm) ||
                    item.verdict?.toLowerCase().includes(searchTerm) ||
                    item.reasoning?.toLowerCase().includes(searchTerm)
                );

            // Classification filter
            const classificationMatch = !classification || 
                article.classification?.toLowerCase() === classification.toLowerCase();

            // Input type filter
            const inputTypeMatch = !inputType || article.input_type === inputType;

            return searchMatch && classificationMatch && inputTypeMatch;
        });

        // Apply sorting
        this.sortArticles(sortOrder);

        // Reset to first page
        this.currentPage = 1;
        
        // Update results count
        this.updateResultsCount();
        
        // Render
        this.renderCurrentPage();
        
        console.log(`📊 Filtered to ${this.filteredArticles.length} articles (search: "${searchTerm}", classification: "${classification}", inputType: "${inputType}", sort: "${sortOrder}")`);
    }

    sortArticles(sortOrder) {
        switch (sortOrder) {
            case 'newest':
                this.filteredArticles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'oldest':
                this.filteredArticles.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
            case 'score_high':
                this.filteredArticles.sort((a, b) => (b.classification_score || 0) - (a.classification_score || 0));
                break;
            case 'score_low':
                this.filteredArticles.sort((a, b) => (a.classification_score || 0) - (b.classification_score || 0));
                break;
            default:
                // Default to newest
                this.filteredArticles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
    }

    renderCurrentPage() {
        const startIndex = (this.currentPage - 1) * this.articlesPerPage;
        const endIndex = startIndex + this.articlesPerPage;
        const pageArticles = this.filteredArticles.slice(startIndex, endIndex);

        // Hide loading state
        this.hideLoading();
        
        // Update results count
        this.updateResultsCount();

        if (this.filteredArticles.length === 0) {
            this.showEmptyState();
            this.hidePagination();
        } else {
            this.showArticles();
            
            // Only show user info in admin history (when user is admin)
            // Additionally, when showing duplicates, show user info to identify who scanned each article
            const filterState = this.searchFilter.getState();
            const showUserInfo = this.isAdmin && filterState.showDuplicates;
            
            this.articleRenderer.renderArticles(pageArticles, { showUserInfo, isAdmin: this.isAdmin });
            this.renderPagination();
        }
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredArticles.length / this.articlesPerPage);
        
        if (totalPages <= 1) {
            this.hidePagination();
            return;
        }

        this.pagination.render({
            currentPage: this.currentPage,
            totalPages: totalPages,
            onPageChange: (page) => {
                this.currentPage = page;
                this.renderCurrentPage();
                this.scrollToTop();
            }
        });

        this.showPagination();
    }

    updateResultsCount() {
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            const total = this.filteredArticles.length;
            const start = Math.min((this.currentPage - 1) * this.articlesPerPage + 1, total);
            const end = Math.min(this.currentPage * this.articlesPerPage, total);
            
            if (total === 0) {
                resultsCount.textContent = 'No results found';
            } else {
                resultsCount.textContent = `Showing ${start}-${end} of ${total} articles`;
            }
        }
    }

    showLoading() {
        const loadingState = document.getElementById('loadingState');
        const articlesContainer = document.getElementById('articlesContainer');
        const emptyState = document.getElementById('emptyState');
        
        if (loadingState) loadingState.classList.remove('hidden');
        if (articlesContainer) articlesContainer.classList.add('hidden');
        if (emptyState) emptyState.classList.add('hidden');
    }

    hideLoading() {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) loadingState.classList.add('hidden');
    }

    showEmptyState() {
        const emptyState = document.getElementById('emptyState');
        const articlesContainer = document.getElementById('articlesContainer');
        
        if (emptyState) emptyState.classList.remove('hidden');
        if (articlesContainer) articlesContainer.classList.add('hidden');
    }

    showArticles() {
        const articlesContainer = document.getElementById('articlesContainer');
        const emptyState = document.getElementById('emptyState');
        
        if (articlesContainer) articlesContainer.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
    }

    showPagination() {
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) paginationContainer.classList.remove('hidden');
    }

    hidePagination() {
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) paginationContainer.classList.add('hidden');
    }

    showError(message) {
        console.error('💥 Error:', message);
        
        this.hideLoading();
        
        const articlesContainer = document.getElementById('articlesContainer');
        if (articlesContainer) {
            articlesContainer.innerHTML = `
                <div class="history-card p-8 text-center">
                    <i class="bi bi-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                    <h3 class="text-xl font-semibold mb-2 text-red-600">Error Loading History</h3>
                    <p class="text-gray-600 dark:text-gray-400 mb-4">${message}</p>
                    <button onclick="location.reload()" class="history-btn history-btn-primary">
                        <i class="bi bi-arrow-clockwise mr-2"></i>
                        Retry
                    </button>
                </div>
            `;
            articlesContainer.classList.remove('hidden');
        }
    }

    scrollToTop() {
        const articlesContainer = document.getElementById('articlesContainer');
        if (articlesContainer) {
            articlesContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Utility function for debouncing search input
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.historyManager = new HistoryManager();
});

// Export for testing
export { HistoryManager };
