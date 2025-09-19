// Pagination Module
export class Pagination {
    constructor() {
        this.container = null;
        this.currentPage = 1;
        this.totalPages = 1;
        this.onPageChange = null;
        this.maxVisiblePages = 4;
        this.init();
    }

    init() {
        this.container = document.getElementById('paginationContainer');
        if (!this.container) {
            console.error('❌ Pagination container not found');
        }
    }

    render(options) {
        const {
            currentPage = 1,
            totalPages = 1,
            onPageChange = null,
            maxVisiblePages = 4
        } = options;

        this.currentPage = currentPage;
        this.totalPages = totalPages;
        this.onPageChange = onPageChange;
        this.maxVisiblePages = maxVisiblePages;

        if (!this.container) {
            console.error('❌ Cannot render pagination: container not found');
            return;
        }

        if (totalPages <= 1) {
            this.container.innerHTML = '';
            return;
        }

        console.log(`📄 Rendering pagination: page ${currentPage} of ${totalPages}`);

        const paginationHTML = this.generatePaginationHTML();
        this.container.innerHTML = paginationHTML;

        // Setup click handlers
        this.setupClickHandlers();
    }

    generatePaginationHTML() {
        const pages = this.calculateVisiblePages();
        
        return `
            <nav class="flex items-center justify-between" aria-label="Pagination">
                <div class="flex-1 flex justify-between sm:hidden">
                    <!-- Mobile pagination -->
                    ${this.currentPage > 1 ? `
                        <button class="pagination-btn pagination-btn-prev" data-page="${this.currentPage - 1}">
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
                        Page ${this.currentPage} of ${this.totalPages}
                    </span>
                    
                    ${this.currentPage < this.totalPages ? `
                        <button class="pagination-btn pagination-btn-next" data-page="${this.currentPage + 1}">
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
                            ${this.currentPage > 1 ? `
                                <button class="pagination-btn pagination-btn-nav" data-page="1" title="First page">
                                    <i class="bi bi-chevron-double-left"></i>
                                </button>
                            ` : `
                                <span class="pagination-btn pagination-btn-disabled" title="First page">
                                    <i class="bi bi-chevron-double-left"></i>
                                </span>
                            `}
                            
                            <!-- Previous page -->
                            ${this.currentPage > 1 ? `
                                <button class="pagination-btn pagination-btn-nav" data-page="${this.currentPage - 1}" title="Previous page">
                                    <i class="bi bi-chevron-left"></i>
                                </button>
                            ` : `
                                <span class="pagination-btn pagination-btn-disabled" title="Previous page">
                                    <i class="bi bi-chevron-left"></i>
                                </span>
                            `}
                            
                            <!-- Page numbers -->
                            ${pages.map(page => {
                                if (page === this.currentPage) {
                                    return `<span class="pagination-btn pagination-btn-current">${page}</span>`;
                                }
                                
                                return `<button class="pagination-btn pagination-btn-page" data-page="${page}">${page}</button>`;
                            }).join('')}
                            
                            <!-- Next page -->
                            ${this.currentPage < this.totalPages ? `
                                <button class="pagination-btn pagination-btn-nav" data-page="${this.currentPage + 1}" title="Next page">
                                    <i class="bi bi-chevron-right"></i>
                                </button>
                            ` : `
                                <span class="pagination-btn pagination-btn-disabled" title="Next page">
                                    <i class="bi bi-chevron-right"></i>
                                </span>
                            `}
                            
                            <!-- Last page -->
                            ${this.currentPage < this.totalPages ? `
                                <button class="pagination-btn pagination-btn-nav" data-page="${this.totalPages}" title="Last page">
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
                            Showing page <span class="font-medium">${this.currentPage}</span> of <span class="font-medium">${this.totalPages}</span>
                        </div>
                    </div>
                </div>
            </nav>
        `;
    }

    calculateVisiblePages() {
        const pages = [];
        const current = this.currentPage;
        const total = this.totalPages;
        const maxVisible = this.maxVisiblePages;
        
        // If total pages is very small (≤4), show all pages
        if (total <= 4) {
            for (let i = 1; i <= total; i++) {
                pages.push(i);
            }
            return pages;
        }
        
        // Calculate the range around current page
        let rangeStart, rangeEnd;
        
        if (current <= 2) {
            // Near the beginning: show 1, 2, 3, 4
            rangeStart = 1;
            rangeEnd = 4;
        } else if (current >= total - 1) {
            // Near the end: show total-3, total-2, total-1, total
            rangeStart = total - 3;
            rangeEnd = total;
        } else {
            // In the middle: show current-1, current, current+1, current+2
            rangeStart = current - 1;
            rangeEnd = current + 2;
        }
        
        // Add the calculated range
        for (let i = rangeStart; i <= rangeEnd; i++) {
            if (i >= 1 && i <= total) {
                pages.push(i);
            }
        }
        
        return pages;
    }

    setupClickHandlers() {
        if (!this.container) return;

        const buttons = this.container.querySelectorAll('[data-page]');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(button.dataset.page);
                
                if (page && page !== this.currentPage && this.onPageChange) {
                    console.log(`📄 Navigating to page ${page}`);
                    this.onPageChange(page);
                }
            });
        });
    }

    // Navigate to specific page
    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) {
            return;
        }
        
        if (this.onPageChange) {
            this.onPageChange(page);
        }
    }

    // Navigate to first page
    goToFirst() {
        this.goToPage(1);
    }

    // Navigate to last page
    goToLast() {
        this.goToPage(this.totalPages);
    }

    // Navigate to previous page
    goToPrevious() {
        this.goToPage(this.currentPage - 1);
    }

    // Navigate to next page
    goToNext() {
        this.goToPage(this.currentPage + 1);
    }

    // Get pagination info
    getInfo() {
        return {
            currentPage: this.currentPage,
            totalPages: this.totalPages,
            hasNext: this.currentPage < this.totalPages,
            hasPrevious: this.currentPage > 1,
            isFirst: this.currentPage === 1,
            isLast: this.currentPage === this.totalPages
        };
    }

    // Clear pagination
    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    // Show/hide pagination
    show() {
        if (this.container) {
            this.container.classList.remove('hidden');
        }
    }

    hide() {
        if (this.container) {
            this.container.classList.add('hidden');
        }
    }

    // Enable keyboard navigation
    enableKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Only handle if no input is focused
            if (document.activeElement.tagName === 'INPUT' || 
                document.activeElement.tagName === 'SELECT' ||
                document.activeElement.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.goToPrevious();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.goToNext();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.goToFirst();
                    break;
                case 'End':
                    e.preventDefault();
                    this.goToLast();
                    break;
            }
        });
    }
}
