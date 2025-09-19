// Admin Dashboard JavaScript Module
// Handles dashboard statistics, user management, and system monitoring

class AdminDashboard {
    constructor() {
        this.currentPage = 1;
        this.usersPerPage = 5; // Changed from 10 to 5 records per page
        this.searchTerm = '';
        this.passwordResetSearchTerm = '';
        this.allUsers = []; // Store all users for client-side pagination
        this.filteredUsers = []; // Store filtered users
        
        // Password reset pagination properties
        this.passwordResetCurrentPage = 1;
        this.passwordResetPerPage = 5; // Same as users for consistency
        this.allPasswordResetRequests = []; // Store all password reset requests
        this.filteredPasswordResetRequests = []; // Store filtered password reset requests
        
        this.init();
    }

    async init() {
        console.log('Initializing Admin Dashboard...');
        await this.loadDashboardStats();
        await this.loadUsers();
        await this.loadPasswordResetRequests();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // User search functionality
        const searchInput = document.getElementById('userSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.searchTerm = e.target.value;
                this.currentPage = 1;
                this.applyFiltersAndPagination(); // Use client-side filtering instead of API call
            }, 300));
        }

        // Password reset search functionality
        const passwordResetSearchInput = document.getElementById('passwordResetSearchInput');
        if (passwordResetSearchInput) {
            passwordResetSearchInput.addEventListener('input', this.debounce((e) => {
                this.passwordResetSearchTerm = e.target.value;
                this.passwordResetCurrentPage = 1;
                this.applyPasswordResetFiltersAndPagination(); // Use client-side filtering instead of API call
            }, 300));
        }

        // System info modal
        const systemInfoModal = document.getElementById('systemInfoModal');
        if (systemInfoModal) {
            systemInfoModal.addEventListener('click', (e) => {
                if (e.target === systemInfoModal) {
                    this.closeSystemInfo();
                }
            });
        }
    }

    async loadDashboardStats() {
        try {
            this.showLoading();
            
            const response = await fetch('/admin/api/dashboard-stats');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.success) {
                this.displayStats(data.stats);
                this.showStatsContainer();
            } else {
                throw new Error(data.error || 'Failed to load dashboard stats');
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            this.showError('Failed to load dashboard statistics: ' + error.message);
        }
    }

    displayStats(stats) {
        // Update key metrics
        document.getElementById('totalUsers').textContent = stats.users.total || 0;
        document.getElementById('recentUsers').textContent = `+${stats.users.recent || 0} this month`;
        document.getElementById('activeUsersCount').textContent = stats.users.active || 0;

        document.getElementById('totalArticles').textContent = stats.articles.total || 0;
        document.getElementById('recentArticles').textContent = `+${stats.articles.recent || 0} this week`;

        document.getElementById('totalGameSessions').textContent = stats.games.total_sessions || 0;
        document.getElementById('avgScore').textContent = Math.round(stats.games.avg_score) || '0';

        document.getElementById('totalFeedback').textContent = stats.feedback.total || 0;
        document.getElementById('recentFeedback').textContent = `+${stats.feedback.recent || 0} this week`;

        // Update article classification breakdown
        const total = stats.articles.total || 0;
        document.getElementById('realArticles').textContent = stats.articles.real || 0;
        document.getElementById('fakeArticles').textContent = stats.articles.fake || 0;
        
        if (total > 0) {
            const realPercent = Math.round(((stats.articles.real || 0) / total) * 100);
            const fakePercent = Math.round(((stats.articles.fake || 0) / total) * 100);
            document.getElementById('realPercent').textContent = `(${realPercent}%)`;
            document.getElementById('fakePercent').textContent = `(${fakePercent}%)`;
        }

        // Update activity chart
        this.renderActivityChart(stats.daily_activity || []);
    }

    renderActivityChart(dailyActivity) {
        const chartContainer = document.getElementById('activityChart');
        if (!chartContainer) return;

        const maxCount = Math.max(...dailyActivity.map(day => day.articles), 1);
        
        chartContainer.innerHTML = dailyActivity.map(day => {
            const height = (day.articles / maxCount) * 100;
            const date = window.PhilippineTime.formatShortDate(day.date);
            
            return `
                <div class="flex-1 flex flex-col items-center">
                    <div class="activity-bar" 
                         style="height: ${Math.max(height, 4)}%" 
                         data-count="${day.articles}"
                         title="${date}: ${day.articles} articles">
                    </div>
                    <div class="activity-label mt-2">${date.split(' ')[0]}</div>
                </div>
            `;
        }).join('');
    }

    async loadUsers() {
        try {
            // Load all users at once (no pagination parameters)
            const response = await fetch('/admin/api/users?all=true');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                // Store all users for client-side pagination and filtering
                this.allUsers = data.users || [];
                this.applyFiltersAndPagination();
            } else {
                throw new Error(data.error || 'Failed to load users');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Failed to load users: ' + error.message);
        }
    }

    applyFiltersAndPagination() {
        // Filter users based on search term
        this.filteredUsers = this.allUsers.filter(user => {
            if (!this.searchTerm) return true;
            
            const searchLower = this.searchTerm.toLowerCase();
            return (
                user.username.toLowerCase().includes(searchLower) ||
                user.email.toLowerCase().includes(searchLower) ||
                user.role.toLowerCase().includes(searchLower) ||
                user.status.toLowerCase().includes(searchLower)
            );
        });

        // Calculate pagination
        const totalUsers = this.filteredUsers.length;
        const totalPages = Math.ceil(totalUsers / this.usersPerPage);
        
        // Ensure current page is valid
        if (this.currentPage > totalPages && totalPages > 0) {
            this.currentPage = totalPages;
        }
        if (this.currentPage < 1) {
            this.currentPage = 1;
        }

        // Get users for current page
        const startIndex = (this.currentPage - 1) * this.usersPerPage;
        const endIndex = startIndex + this.usersPerPage;
        const usersForPage = this.filteredUsers.slice(startIndex, endIndex);

        // Display users and pagination
        this.displayUsers(usersForPage);
        
        // Create pagination object similar to server response
        const paginationInfo = {
            page: this.currentPage,
            pages: totalPages,
            per_page: this.usersPerPage,
            total: totalUsers,
            has_prev: this.currentPage > 1,
            has_next: this.currentPage < totalPages
        };
        
        this.displayUsersPagination(paginationInfo);
    }

    displayUsers(users) {
        const tbody = document.getElementById('usersTableBody');
        const container = document.getElementById('usersTableContainer');
        const table = container?.querySelector('.admin-table');
        const mobileGrid = document.getElementById('mobileUsersGrid');
        
        if (!tbody || !container) return;

        // Clear existing user rows (keep template)
        const existingRows = tbody.querySelectorAll('tr:not(#userRowTemplate)');
        existingRows.forEach(row => row.remove());
        
        // Clear mobile grid
        if (mobileGrid) {
            mobileGrid.innerHTML = '';
            mobileGrid.style.display = 'none';
        }

        // Remove existing empty state
        const existingEmptyState = container.querySelector('.empty-state');
        if (existingEmptyState) existingEmptyState.remove();

        // Check if users array is empty
        if (!users || users.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state text-center py-12';
            emptyState.innerHTML = `
                <i class="bi bi-people text-4xl text-neutral-400 dark:text-neutral-600 mb-4"></i>
                <h3 class="text-lg font-semibold text-neutral-600 dark:text-neutral-400 mb-2">No users found</h3>
                <p class="text-sm text-neutral-500 dark:text-neutral-500">
                    ${this.searchTerm ? 'Try adjusting your search criteria.' : 'Users will appear here once they register.'}
                </p>
            `;
            container.appendChild(emptyState);
            if (table) table.style.display = 'none';
            return;
        }

        // Show the table if users exist
        if (table) table.style.display = 'table';

        // Get the template row
        const template = document.getElementById('userRowTemplate');
        if (!template) {
            console.error('User row template not found');
            return;
        }

        // Generate table rows using template
        users.forEach(user => {
            const row = template.cloneNode(true);
            row.id = `user-row-${user.id}`;
            row.style.display = '';
            row.classList.remove('user-row-template');

            // Populate user data
            this.populateUserRow(row, user);
            
            tbody.appendChild(row);
        });

        // Generate mobile cards using template
        if (mobileGrid) {
            const mobileTemplate = document.getElementById('mobileUserCardTemplate');
            if (mobileTemplate) {
                // Remove any inline display style to let CSS handle it
                mobileGrid.style.display = '';
                
                users.forEach(user => {
                    const card = mobileTemplate.cloneNode(true);
                    card.id = `mobile-user-card-${user.id}`;
                    card.style.display = '';
                    
                    // Populate mobile card data
                    this.populateMobileCard(card, user);
                    
                    mobileGrid.appendChild(card);
                });
            }
        }
    }

    populateUserRow(row, user) {
        // Avatar
        const avatar = row.querySelector('[data-field="avatar"]');
        if (avatar) avatar.textContent = user.username.charAt(0).toUpperCase();

        // Username
        const username = row.querySelector('[data-field="username"]');
        if (username) username.textContent = user.username;

        // Email
        const email = row.querySelector('[data-field="email"]');
        if (email) email.textContent = user.email;

        // Role
        const role = row.querySelector('[data-field="role"]');
        if (role) {
            role.textContent = user.role;
            role.className = `role-badge ${user.role}`;
        }

        // Status
        const statusBadge = row.querySelector('[data-field="status"]');
        const statusIndicator = row.querySelector('[data-field="status-indicator"]');
        const statusText = row.querySelector('[data-field="status-text"]');
        
        if (statusBadge) {
            statusBadge.className = `status-badge ${user.is_active ? 'active' : 'inactive'}`;
        }
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${user.is_active ? 'active' : 'inactive'}`;
        }
        if (statusText) {
            statusText.textContent = user.is_active ? 'Active' : 'Inactive';
        }

        // Joined date
        const joined = row.querySelector('[data-field="joined"]');
        if (joined) joined.textContent = window.PhilippineTime.formatDateOnly(user.created_at);

        // Action buttons
        const roleBtn = row.querySelector('[data-field="role-btn"]');
        const statusBtn = row.querySelector('[data-field="status-btn"]');
        const statusIcon = row.querySelector('[data-field="status-icon"]');

        if (roleBtn) {
            roleBtn.onclick = () => this.toggleUserRole(user.id);
        }
        
        if (statusBtn) {
            statusBtn.onclick = () => this.toggleUserStatus(user.id);
            statusBtn.className = `table-action-btn ${user.is_active ? 'danger' : 'success'}`;
            statusBtn.title = `${user.is_active ? 'Deactivate' : 'Activate'} User`;
        }
        
        if (statusIcon) {
            statusIcon.className = `bi bi-${user.is_active ? 'person-dash' : 'person-check'}`;
        }
    }

    populateMobileCard(card, user) {
        // Avatar
        const avatar = card.querySelector('[data-field="avatar"]');
        if (avatar) avatar.textContent = user.username.charAt(0).toUpperCase();

        // Username
        const username = card.querySelector('[data-field="username"]');
        if (username) username.textContent = user.username;

        // Email
        const email = card.querySelector('[data-field="email"]');
        if (email) email.textContent = user.email;

        // Role
        const role = card.querySelector('[data-field="role"]');
        if (role) {
            role.textContent = user.role;
            role.className = `role-badge ${user.role}`;
        }

        // Status
        const statusBadge = card.querySelector('[data-field="status"]');
        const statusIndicator = card.querySelector('[data-field="status-indicator"]');
        const statusText = card.querySelector('[data-field="status-text"]');
        
        if (statusBadge) {
            statusBadge.className = `status-badge ${user.is_active ? 'active' : 'inactive'}`;
        }
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${user.is_active ? 'active' : 'inactive'}`;
        }
        if (statusText) {
            statusText.textContent = user.is_active ? 'Active' : 'Inactive';
        }

        // Joined date
        const joined = card.querySelector('[data-field="joined"]');
        if (joined) joined.textContent = window.PhilippineTime.formatDateOnly(user.created_at);

        // Action buttons
        const roleBtn = card.querySelector('[data-field="role-btn"]');
        const statusBtn = card.querySelector('[data-field="status-btn"]');
        const statusIcon = card.querySelector('[data-field="status-icon"]');
        const statusActionText = card.querySelector('[data-field="status-action-text"]');

        if (roleBtn) {
            roleBtn.onclick = () => this.toggleUserRole(user.id);
        }
        
        if (statusBtn) {
            statusBtn.onclick = () => this.toggleUserStatus(user.id);
            statusBtn.className = `table-action-btn ${user.is_active ? 'danger' : 'success'}`;
            statusBtn.title = `${user.is_active ? 'Deactivate' : 'Activate'} User`;
        }
        
        if (statusIcon) {
            statusIcon.className = `bi bi-${user.is_active ? 'person-dash' : 'person-check'} mr-1`;
        }
        
        if (statusActionText) {
            statusActionText.textContent = user.is_active ? 'Deactivate' : 'Activate';
        }
    }

    displayUsersPagination(pagination) {
        const container = document.getElementById('usersPagination');
        if (!container || !pagination || pagination.pages <= 1 || pagination.total === 0) {
            if (container) container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        
        const currentPage = pagination.page;
        const totalPages = pagination.pages;
        const maxVisiblePages = 4;
        
        // Calculate visible pages
        const pages = this.calculateVisiblePages(currentPage, totalPages, maxVisiblePages);
        
        const paginationHTML = `
            <nav class="flex items-center justify-center" aria-label="Pagination">
                <div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">
                    <!-- Desktop pagination controls -->
                    <div class="pagination-controls">
                        <!-- First page -->
                        ${currentPage > 1 ? `
                            <button class="pagination-btn pagination-btn-nav" onclick="adminDashboard.goToPage(1)" title="First page">
                                <i class="bi bi-chevron-double-left"></i>
                            </button>
                        ` : `
                            <span class="pagination-btn pagination-btn-disabled" title="First page">
                                <i class="bi bi-chevron-double-left"></i>
                            </span>
                        `}
                        
                        <!-- Previous page -->
                        ${currentPage > 1 ? `
                            <button class="pagination-btn pagination-btn-nav" onclick="adminDashboard.goToPage(${currentPage - 1})" title="Previous page">
                                <i class="bi bi-chevron-left"></i>
                            </button>
                        ` : `
                            <span class="pagination-btn pagination-btn-disabled" title="Previous page">
                                <i class="bi bi-chevron-left"></i>
                            </span>
                        `}
                        
                        <!-- Page numbers -->
                        ${pages.map(page => {
                            if (page === currentPage) {
                                return `<span class="pagination-btn pagination-btn-current">${page}</span>`;
                            }
                            
                            return `<button class="pagination-btn pagination-btn-page" onclick="adminDashboard.goToPage(${page})">${page}</button>`;
                        }).join('')}
                        
                        <!-- Next page -->
                        ${currentPage < totalPages ? `
                            <button class="pagination-btn pagination-btn-nav" onclick="adminDashboard.goToPage(${currentPage + 1})" title="Next page">
                                <i class="bi bi-chevron-right"></i>
                            </button>
                        ` : `
                            <span class="pagination-btn pagination-btn-disabled" title="Next page">
                                <i class="bi bi-chevron-right"></i>
                            </span>
                        `}
                        
                        <!-- Last page -->
                        ${currentPage < totalPages ? `
                            <button class="pagination-btn pagination-btn-nav" onclick="adminDashboard.goToPage(${totalPages})" title="Last page">
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
            </nav>
        `;
        
        container.innerHTML = paginationHTML;
    }

    calculateVisiblePages(currentPage, totalPages, maxVisible) {
        const pages = [];
        const current = currentPage;
        const total = totalPages;
        
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

    async toggleUserRole(userId) {
        if (!confirm('Are you sure you want to change this user\'s role?')) {
            return;
        }

        try {
            const response = await fetch(`/admin/api/users/${userId}/toggle-role`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();
            if (data.success) {
                this.showSuccessMessage(data.message);
                await this.loadUsers();
            } else {
                this.showErrorMessage(data.error || 'Failed to toggle user role');
            }
        } catch (error) {
            console.error('Error toggling user role:', error);
            this.showErrorMessage('Failed to toggle user role: ' + error.message);
        }
    }

    async toggleUserStatus(userId) {
        if (!confirm('Are you sure you want to change this user\'s status?')) {
            return;
        }

        try {
            const response = await fetch(`/admin/api/users/${userId}/toggle-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();
            if (data.success) {
                this.showSuccessMessage(data.message);
                await this.loadUsers();
            } else {
                this.showErrorMessage(data.error || 'Failed to toggle user status');
            }
        } catch (error) {
            console.error('Error toggling user status:', error);
            this.showErrorMessage('Failed to toggle user status: ' + error.message);
        }
    }

    goToPage(page) {
        this.currentPage = page;
        this.applyFiltersAndPagination(); // Use client-side pagination instead of API call
    }

    // Password Reset Management Methods
    async loadPasswordResetRequests() {
        try {
            // Load all password reset requests at once (no pagination parameters)
            const response = await fetch('/admin/api/password-reset-requests?all=true');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                // Store all password reset requests for client-side pagination and filtering
                this.allPasswordResetRequests = data.requests || [];
                this.applyPasswordResetFiltersAndPagination();
            } else {
                throw new Error(data.error || 'Failed to load password reset requests');
            }
        } catch (error) {
            console.error('Error loading password reset requests:', error);
            this.displayPasswordResetRequests([]); // Show empty state
        }
    }

    applyPasswordResetFiltersAndPagination() {
        // Filter password reset requests based on search term
        this.filteredPasswordResetRequests = this.allPasswordResetRequests.filter(request => {
            if (!this.passwordResetSearchTerm) return true;
            
            const searchLower = this.passwordResetSearchTerm.toLowerCase();
            return (
                request.username.toLowerCase().includes(searchLower) ||
                request.email.toLowerCase().includes(searchLower) ||
                request.status.toLowerCase().includes(searchLower)
            );
        });

        // Calculate pagination
        const totalRequests = this.filteredPasswordResetRequests.length;
        const totalPages = Math.ceil(totalRequests / this.passwordResetPerPage);
        
        // Ensure current page is valid
        if (this.passwordResetCurrentPage > totalPages && totalPages > 0) {
            this.passwordResetCurrentPage = totalPages;
        }
        if (this.passwordResetCurrentPage < 1) {
            this.passwordResetCurrentPage = 1;
        }

        // Get requests for current page
        const startIndex = (this.passwordResetCurrentPage - 1) * this.passwordResetPerPage;
        const endIndex = startIndex + this.passwordResetPerPage;
        const requestsForPage = this.filteredPasswordResetRequests.slice(startIndex, endIndex);

        // Display requests and pagination
        this.displayPasswordResetRequests(requestsForPage);
        
        // Create pagination object similar to server response
        const paginationInfo = {
            page: this.passwordResetCurrentPage,
            pages: totalPages,
            per_page: this.passwordResetPerPage,
            total: totalRequests,
            has_prev: this.passwordResetCurrentPage > 1,
            has_next: this.passwordResetCurrentPage < totalPages
        };
        
        this.displayPasswordResetPagination(paginationInfo);
        this.updatePasswordResetCount(totalRequests);
    }

    displayPasswordResetRequests(requests) {
        const tbody = document.getElementById('passwordResetTableBody');
        const table = document.querySelector('#passwordResetTableContainer table');
        const container = document.getElementById('passwordResetTableContainer');
        const mobileGrid = document.getElementById('mobileResetGrid');
        
        if (!tbody || !container) return;

        // Clear existing content
        tbody.innerHTML = '';
        
        // Clear mobile grid
        if (mobileGrid) {
            mobileGrid.innerHTML = '';
        }
        
        // Remove existing empty state
        const existingEmptyState = container.querySelector('.empty-state');
        if (existingEmptyState) existingEmptyState.remove();
        
        // Show empty state if no requests
        if (!requests || requests.length === 0) {
            // Hide the table
            if (table) table.style.display = 'none';
            
            // Show empty state
            const emptyStateDiv = document.createElement('div');
            emptyStateDiv.className = 'empty-state text-center py-12';
            emptyStateDiv.innerHTML = `
                <div class="results-icon bg-gray-100 dark:bg-gray-800/50 text-gray-400 mx-auto mb-4">
                    <i class="bi bi-key"></i>
                </div>
                <h3 class="text-lg font-semibold text-neutral-600 dark:text-neutral-400 mb-2">No password reset requests found</h3>
                <p class="text-sm text-neutral-500 dark:text-neutral-500">Try adjusting your search criteria or check back later.</p>
            `;
            container.appendChild(emptyStateDiv);
            return;
        }

        // Show the table if requests exist
        if (table) table.style.display = 'table';

        // Generate table rows for desktop
        tbody.innerHTML = requests.map(request => `
            <tr>
                <td class="user-cell">
                    <div class="flex items-center gap-3">
                        <div class="user-avatar bg-gradient-to-r from-purple-500 to-purple-400 text-white w-10 h-10 rounded-full flex items-center justify-center font-semibold">
                            ${request.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="font-medium text-neutral-800 dark:text-neutral-200">${request.username}</div>
                            <div class="text-sm text-neutral-500">ID: ${request.user_id}</div>
                        </div>
                    </div>
                </td>
                <td class="email-cell">
                    <span class="text-neutral-600 dark:text-neutral-400">${request.email}</span>
                </td>
                <td class="status-cell">
                    <span class="status-badge status-${request.status.toLowerCase()}">
                        <span class="status-indicator ${request.status.toLowerCase()}"></span>
                        ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                </td>
                <td class="date-cell">
                    <div class="text-neutral-600 dark:text-neutral-400">
                        ${window.PhilippineTime.formatDateOnly(request.requested_at)}
                    </div>
                    <div class="text-xs text-neutral-500">
                        ${window.PhilippineTime.formatTimeOnly(request.requested_at)}
                    </div>
                </td>
                <td class="actions-cell">
                    <div class="flex gap-2">
                        <button onclick="approvePasswordReset(${request.id})" 
                                class="table-action-btn success ${request.status === 'approved' || request.status === 'denied' ? 'disabled' : ''}" 
                                ${request.status === 'approved' || request.status === 'denied' ? 'disabled' : ''}
                                title="${request.status === 'approved' || request.status === 'denied' ? 'Request has been finalized' : 'Approve Request'}">
                            <i class="bi bi-check-circle"></i>
                        </button>
                        <button onclick="denyPasswordReset(${request.id})" 
                                class="table-action-btn danger ${request.status === 'approved' || request.status === 'denied' ? 'disabled' : ''}" 
                                ${request.status === 'approved' || request.status === 'denied' ? 'disabled' : ''}
                                title="${request.status === 'approved' || request.status === 'denied' ? 'Request has been finalized' : 'Deny Request'}">
                            <i class="bi bi-x-circle"></i>
                        </button>
                        <button onclick="deletePasswordReset(${request.id})" 
                                class="table-action-btn warning" 
                                title="Delete Request">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Generate mobile cards using template
        if (mobileGrid) {
            const mobileTemplate = document.getElementById('mobileResetCardTemplate');
            if (mobileTemplate) {
                // Remove any inline display style to let CSS handle it
                mobileGrid.style.display = '';
                
                requests.forEach(request => {
                    const card = mobileTemplate.cloneNode(true);
                    card.id = `mobile-reset-card-${request.id}`;
                    card.style.display = '';
                    
                    // Populate mobile card data
                    this.populateResetMobileCard(card, request);
                    
                    mobileGrid.appendChild(card);
                });
            }
        }
    }

    populateResetMobileCard(card, request) {
        // Avatar
        const avatar = card.querySelector('[data-field="avatar"]');
        if (avatar) avatar.textContent = request.username.charAt(0).toUpperCase();

        // Username
        const username = card.querySelector('[data-field="username"]');
        if (username) username.textContent = request.username;

        // Email
        const email = card.querySelector('[data-field="email"]');
        if (email) email.textContent = request.email;

        // Status
        const statusBadge = card.querySelector('[data-field="status"]');
        const statusIndicator = card.querySelector('[data-field="status-indicator"]');
        const statusText = card.querySelector('[data-field="status-text"]');
        
        if (statusBadge) {
            statusBadge.className = `status-badge status-${request.status.toLowerCase()}`;
        }
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${request.status.toLowerCase()}`;
        }
        if (statusText) {
            statusText.textContent = request.status.charAt(0).toUpperCase() + request.status.slice(1);
        }

        // Requested date
        const requested = card.querySelector('[data-field="requested"]');
        if (requested) {
            requested.innerHTML = `
                ${window.PhilippineTime.formatDateOnly(request.requested_at)}<br>
                <span class="text-xs">${window.PhilippineTime.formatTimeOnly(request.requested_at)}</span>
            `;
        }

        // Action buttons
        const approveBtn = card.querySelector('[data-field="approve-btn"]');
        const denyBtn = card.querySelector('[data-field="deny-btn"]');
        const deleteBtn = card.querySelector('[data-field="delete-btn"]');

        // Check if request has been finalized (approved or denied)
        const isFinalized = request.status === 'approved' || request.status === 'denied';

        if (approveBtn) {
            approveBtn.onclick = () => approvePasswordReset(request.id);
            if (isFinalized) {
                approveBtn.classList.add('disabled');
                approveBtn.disabled = true;
                approveBtn.title = 'Request has been finalized';
            } else {
                approveBtn.classList.remove('disabled');
                approveBtn.disabled = false;
                approveBtn.title = 'Approve Request';
            }
        }
        
        if (denyBtn) {
            denyBtn.onclick = () => denyPasswordReset(request.id);
            if (isFinalized) {
                denyBtn.classList.add('disabled');
                denyBtn.disabled = true;
                denyBtn.title = 'Request has been finalized';
            } else {
                denyBtn.classList.remove('disabled');
                denyBtn.disabled = false;
                denyBtn.title = 'Deny Request';
            }
        }

        if (deleteBtn) {
            deleteBtn.onclick = () => deletePasswordReset(request.id);
            deleteBtn.title = 'Delete Request';
        }
    }

    updatePasswordResetCount(count) {
        const countElement = document.getElementById('pendingRequestsCount');
        if (countElement) {
            countElement.textContent = count;
        }
    }

    displayPasswordResetPagination(pagination) {
        const container = document.getElementById('passwordResetPagination');
        if (!container || !pagination || pagination.pages <= 1 || pagination.total === 0) {
            if (container) container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        
        const currentPage = pagination.page;
        const totalPages = pagination.pages;
        const maxVisiblePages = 4;
        
        // Calculate visible pages
        const pages = this.calculateVisiblePages(currentPage, totalPages, maxVisiblePages);
        
        const paginationHTML = `
            <nav class="flex items-center justify-center" aria-label="Pagination">
                <div style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">
                    <!-- Desktop pagination controls -->
                    <div class="pagination-controls">
                        <!-- First page -->
                        ${currentPage > 1 ? `
                            <button class="pagination-btn pagination-btn-nav" onclick="adminDashboard.goToPasswordResetPage(1)" title="First page">
                                <i class="bi bi-chevron-double-left"></i>
                            </button>
                        ` : `
                            <span class="pagination-btn pagination-btn-disabled" title="First page">
                                <i class="bi bi-chevron-double-left"></i>
                            </span>
                        `}
                        
                        <!-- Previous page -->
                        ${currentPage > 1 ? `
                            <button class="pagination-btn pagination-btn-nav" onclick="adminDashboard.goToPasswordResetPage(${currentPage - 1})" title="Previous page">
                                <i class="bi bi-chevron-left"></i>
                            </button>
                        ` : `
                            <span class="pagination-btn pagination-btn-disabled" title="Previous page">
                                <i class="bi bi-chevron-left"></i>
                            </span>
                        `}
                        
                        <!-- Page numbers -->
                        ${pages.map(page => {
                            if (page === currentPage) {
                                return `<span class="pagination-btn pagination-btn-current">${page}</span>`;
                            }
                            
                            return `<button class="pagination-btn pagination-btn-page" onclick="adminDashboard.goToPasswordResetPage(${page})">${page}</button>`;
                        }).join('')}
                        
                        <!-- Next page -->
                        ${currentPage < totalPages ? `
                            <button class="pagination-btn pagination-btn-nav" onclick="adminDashboard.goToPasswordResetPage(${currentPage + 1})" title="Next page">
                                <i class="bi bi-chevron-right"></i>
                            </button>
                        ` : `
                            <span class="pagination-btn pagination-btn-disabled" title="Next page">
                                <i class="bi bi-chevron-right"></i>
                            </span>
                        `}
                        
                        <!-- Last page -->
                        ${currentPage < totalPages ? `
                            <button class="pagination-btn pagination-btn-nav" onclick="adminDashboard.goToPasswordResetPage(${totalPages})" title="Last page">
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
            </nav>
        `;
        
        container.innerHTML = paginationHTML;
    }

    goToPasswordResetPage(page) {
        this.passwordResetCurrentPage = page;
        this.applyPasswordResetFiltersAndPagination(); // Use client-side pagination instead of API call
    }

    showLoading() {
        document.getElementById('loadingState').classList.remove('hidden');
        document.getElementById('statsContainer').classList.add('hidden');
        document.getElementById('errorState').classList.add('hidden');
    }

    showStatsContainer() {
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('statsContainer').classList.remove('hidden');
        document.getElementById('errorState').classList.add('hidden');
    }

    showError(message) {
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('statsContainer').classList.add('hidden');
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
window.refreshStats = async function() {
    if (window.adminDashboard) {
        await window.adminDashboard.loadDashboardStats();
        await window.adminDashboard.loadUsers();
    }
};

window.showSystemInfo = function() {
    const modal = document.getElementById('systemInfoModal');
    const content = document.getElementById('systemInfoContent');
    
    content.innerHTML = `
        <div class="space-y-4">
            <div class="results-card">
                <h3 class="font-semibold mb-2">System Status</h3>
                <p class="text-sm text-neutral-600 dark:text-neutral-400">All systems operational</p>
            </div>
            <div class="results-card">
                <h3 class="font-semibold mb-2">Version Information</h3>
                <p class="text-sm text-neutral-600 dark:text-neutral-400">TruthGuard v1.0.0</p>
            </div>
            <div class="results-card">
                <h3 class="font-semibold mb-2">Server Information</h3>
                <p class="text-sm text-neutral-600 dark:text-neutral-400">Flask Application Server</p>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
};

// PDF Export Function
window.exportDashboardToPDF = async function() {
    try {
        // Show loading state
        const exportBtn = document.querySelector('button[onclick="exportDashboardToPDF()"]');
        const originalText = exportBtn.innerHTML;
        exportBtn.innerHTML = '<i class="bi bi-hourglass-split mr-2"></i>Generating...';
        exportBtn.disabled = true;

        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Define page dimensions and margins
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const leftMargin = 20;
        const rightMargin = 20;
        const topMargin = 20;
        const bottomMargin = 20;
        const usableWidth = pageWidth - leftMargin - rightMargin;
        const usableHeight = pageHeight - topMargin - bottomMargin;
        
        // Set up document
        const currentDate = window.PhilippineTime.formatDateTime(new Date());
        
        let yPosition = topMargin;
        
        // Title and header
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('TruthGuard Admin Dashboard Report', leftMargin, yPosition + 10);
        yPosition += 25;
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(`Generated on: ${currentDate}`, leftMargin, yPosition);
        yPosition += 10;
        
        // Add a line separator
        doc.line(leftMargin, yPosition, pageWidth - rightMargin, yPosition);
        yPosition += 15;
        
        // System Overview Section
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('System Overview', leftMargin, yPosition);
        yPosition += 15;
        
        // Get current stats from the dashboard
        const totalUsers = document.getElementById('totalUsers')?.textContent || '0';
        const totalArticles = document.getElementById('totalArticles')?.textContent || '0';
        const totalGameSessions = document.getElementById('totalGameSessions')?.textContent || '0';
        const totalFeedback = document.getElementById('totalFeedback')?.textContent || '0';
        const avgScore = document.getElementById('avgScore')?.textContent || '0';
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(`Total Users: ${totalUsers}`, leftMargin + 10, yPosition);
        yPosition += 10;
        doc.text(`Articles Analyzed: ${totalArticles}`, leftMargin + 10, yPosition);
        yPosition += 10;
        doc.text(`Game Sessions: ${totalGameSessions}`, leftMargin + 10, yPosition);
        yPosition += 10;
        doc.text(`Feedback Items: ${totalFeedback}`, leftMargin + 10, yPosition);
        yPosition += 10;
        doc.text(`Average XP Score: ${avgScore}`, leftMargin + 10, yPosition);
        yPosition += 20;
        
        // Article Classification Section
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Article Classification Breakdown', leftMargin, yPosition);
        yPosition += 15;
        
        const realNews = document.getElementById('realArticles')?.textContent || '0';
        const fakeNews = document.getElementById('fakeArticles')?.textContent || '0';
        const realPercent = document.getElementById('realPercent')?.textContent || '(0%)';
        const fakePercent = document.getElementById('fakePercent')?.textContent || '(0%)';
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(`Real News: ${realNews} ${realPercent}`, leftMargin + 10, yPosition);
        yPosition += 10;
        doc.text(`Fake News: ${fakeNews} ${fakePercent}`, leftMargin + 10, yPosition);
        yPosition += 20;
        
        // Check if we need a new page before continuing
        if (yPosition > pageHeight - bottomMargin - 60) {
            doc.addPage();
            yPosition = topMargin;
        }
        
        // User Activity Section
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Recent Activity', leftMargin, yPosition);
        yPosition += 15;
        
        const recentUsers = document.getElementById('recentUsers')?.textContent || '+0 this month';
        const recentArticles = document.getElementById('recentArticles')?.textContent || '+0 this week';
        const recentFeedback = document.getElementById('recentFeedback')?.textContent || '+0 this week';
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(`New Users: ${recentUsers}`, leftMargin + 10, yPosition);
        yPosition += 10;
        doc.text(`New Articles: ${recentArticles}`, leftMargin + 10, yPosition);
        yPosition += 10;
        doc.text(`New Feedback: ${recentFeedback}`, leftMargin + 10, yPosition);
        yPosition += 20;
        
        // Check if we need a new page before system information
        if (yPosition > pageHeight - bottomMargin - 60) {
            doc.addPage();
            yPosition = topMargin;
        }
        
        // System Status Section
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('System Information', leftMargin, yPosition);
        yPosition += 15;
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text('Application: TruthGuard Admin Dashboard', leftMargin + 10, yPosition);
        yPosition += 10;
        doc.text('Version: 1.0.0', leftMargin + 10, yPosition);
        yPosition += 10;
        doc.text('Status: All systems operational', leftMargin + 10, yPosition);
        yPosition += 10;
        doc.text('Server: Flask Application Server', leftMargin + 10, yPosition);
        
        // Footer - place at bottom of last page
        const footerY = pageHeight - bottomMargin - 10;
        doc.setFontSize(10);
        doc.setFont(undefined, 'italic');
        doc.text('This report was automatically generated by TruthGuard Admin Dashboard', leftMargin, footerY);
        doc.text(`Report ID: ${Date.now()}`, leftMargin, footerY + 5);
        
        // Save the PDF
        const fileName = `TruthGuard_Dashboard_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        // Reset button state
        exportBtn.innerHTML = originalText;
        exportBtn.disabled = false;
        
        // Show success message
        alert('Dashboard report exported successfully!');
        
    } catch (error) {
        console.error('Error exporting PDF:', error);
        alert('Failed to export PDF report. Please try again.');
        
        // Reset button state
        const exportBtn = document.querySelector('button[onclick="exportDashboardToPDF()"]');
        if (exportBtn) {
            exportBtn.innerHTML = '<i class="bi bi-file-earmark-pdf mr-2"></i>Export';
            exportBtn.disabled = false;
        }
    }
};

window.closeSystemInfo = function() {
    document.getElementById('systemInfoModal').classList.add('hidden');
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});

export { AdminDashboard };
