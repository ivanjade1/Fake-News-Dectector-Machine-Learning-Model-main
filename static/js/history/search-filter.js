// Search and Filter Management
export class SearchFilter {
    constructor() {
        this.searchTerm = '';
        this.filters = {
            classification: '',
            inputType: '',
            sortOrder: 'newest',
            showDuplicates: true
        };
        this.callbacks = [];
        this.filtersVisible = false;
        this.isInitialized = false;
        this.initializeUI();
    }

    // Initialize UI event listeners
    initializeUI() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    // Setup all event listeners
    setupEventListeners() {
        // Filter toggle button
        const filterToggle = document.getElementById('filterToggle');
        if (filterToggle) {
            filterToggle.addEventListener('click', () => this.toggleFilters());
        }

        // Clear filters button
        const clearFilters = document.getElementById('clearFilters');
        if (clearFilters) {
            clearFilters.addEventListener('click', () => this.reset());
        }

        // Quick filter chips - using event delegation for better reliability
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-filter-chip')) {
                this.handleQuickFilter(e.target);
            }
        });

        // Search input with debounce
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.setSearchTerm(e.target.value);
                }, 300);
            });
        }

        // Filter dropdowns
        const classificationFilter = document.getElementById('classificationFilter');
        const inputTypeFilter = document.getElementById('inputTypeFilter');
        const sortOrder = document.getElementById('sortOrder');
        const duplicateFilter = document.getElementById('duplicateFilter');

        if (classificationFilter) {
            classificationFilter.addEventListener('change', (e) => {
                this.setFilter('classification', e.target.value);
            });
        }

        if (inputTypeFilter) {
            inputTypeFilter.addEventListener('change', (e) => {
                this.setFilter('inputType', e.target.value);
            });
        }

        if (sortOrder) {
            sortOrder.addEventListener('change', (e) => {
                this.setFilter('sortOrder', e.target.value);
            });
        }

        if (duplicateFilter) {
            // Force initial state to match our default (show duplicates = true)
            duplicateFilter.value = this.filters.showDuplicates ? 'true' : 'false';
            console.log(`🔧 Set duplicate filter dropdown to: ${duplicateFilter.value} (showDuplicates=${this.filters.showDuplicates})`);
            
            duplicateFilter.addEventListener('change', (e) => {
                console.log(`🔄 Duplicate filter changed to: ${e.target.value} (boolean: ${e.target.value === 'true'})`);
                this.setFilter('showDuplicates', e.target.value === 'true');
            });
        }
        
        // Mark as initialized
        this.isInitialized = true;
        console.log('✅ SearchFilter initialization complete');
    }

    // Toggle filters panel visibility
    toggleFilters() {
        const filtersPanel = document.getElementById('filtersPanel');
        const filterToggle = document.getElementById('filterToggle');
        
        if (filtersPanel && filterToggle) {
            this.filtersVisible = !this.filtersVisible;
            
            if (this.filtersVisible) {
                filtersPanel.classList.remove('hidden');
                filterToggle.classList.add('active');
                filterToggle.querySelector('i').classList.add('rotate-180');
            } else {
                filtersPanel.classList.add('hidden');
                filterToggle.classList.remove('active');
                filterToggle.querySelector('i').classList.remove('rotate-180');
            }
        }
    }

    // Handle quick filter chip clicks
    handleQuickFilter(chip) {
        const filterType = chip.dataset.filter;
        const filterValue = chip.dataset.value;
        
        // Map filter types to actual filter names
        const filterMapping = {
            'classification': 'classification',
            'inputType': 'inputType'
        };
        
        const actualFilterName = filterMapping[filterType];
        if (actualFilterName) {
            // Toggle the filter
            if (this.filters[actualFilterName] === filterValue) {
                this.setFilter(actualFilterName, '');
            } else {
                this.setFilter(actualFilterName, filterValue);
            }
        }
    }

    // Register callback for filter changes
    onChange(callback) {
        this.callbacks.push(callback);
    }

    // Trigger all callbacks
    triggerChange() {
        this.callbacks.forEach(callback => {
            try {
                callback(this.getState());
            } catch (error) {
                console.error('❌ Error in filter callback:', error);
            }
        });
    }

    // Set search term
    setSearchTerm(term) {
        this.searchTerm = term.trim();
        this.triggerChange();
    }

    // Set filter value
    setFilter(filterName, value) {
        if (this.filters.hasOwnProperty(filterName)) {
            this.filters[filterName] = value;
            this.triggerChange();
        } else {
            console.warn(`⚠️ Unknown filter: ${filterName}`);
        }
    }

    // Get current state
    getState() {
        // Safety check to ensure filters is initialized
        if (!this.filters) {
            console.warn('⚠️ getState() called before filters initialized, using defaults');
            return {
                searchTerm: this.searchTerm || '',
                classification: '',
                inputType: '',
                sortOrder: 'newest',
                showDuplicates: true
            };
        }
        
        return {
            searchTerm: this.searchTerm,
            ...this.filters
        };
    }

    // Wait for initialization to complete
    async waitForInit() {
        if (this.isInitialized) {
            return Promise.resolve();
        }
        
        return new Promise(resolve => {
            const check = () => {
                if (this.isInitialized) {
                    resolve();
                } else {
                    setTimeout(check, 10);
                }
            };
            check();
        });
    }

    // Reset all filters
    reset() {
        console.log('🔄 Resetting all filters');
        this.searchTerm = '';
        this.filters = {
            classification: '',
            inputType: '',
            sortOrder: 'newest',
            showDuplicates: true
        };
        this.updateUI();
        this.triggerChange();
    }

    // Update UI elements to match current state
    updateUI() {
        // Update search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = this.searchTerm;
        }

        // Update filter dropdowns
        const classificationFilter = document.getElementById('classificationFilter');
        if (classificationFilter) {
            classificationFilter.value = this.filters.classification;
        }

        const inputTypeFilter = document.getElementById('inputTypeFilter');
        if (inputTypeFilter) {
            inputTypeFilter.value = this.filters.inputType;
        }

        const sortOrder = document.getElementById('sortOrder');
        if (sortOrder) {
            sortOrder.value = this.filters.sortOrder;
        }

        const duplicateFilter = document.getElementById('duplicateFilter');
        if (duplicateFilter) {
            duplicateFilter.value = this.filters.showDuplicates ? 'true' : 'false';
        }

        // Update quick filter chips
        this.updateQuickFilterChips();
    }

    // Update quick filter chip states
    updateQuickFilterChips() {
        const chips = document.querySelectorAll('.quick-filter-chip');
        chips.forEach(chip => {
            const filterType = chip.dataset.filter;
            const filterValue = chip.dataset.value;
            
            if (filterType === 'classification' && this.filters.classification === filterValue) {
                chip.classList.add('active');
            } else if (filterType === 'inputType' && this.filters.inputType === filterValue) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
    }
}
