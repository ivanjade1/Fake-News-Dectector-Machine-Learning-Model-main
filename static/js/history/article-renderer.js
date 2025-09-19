// Article Rendering Module
export class ArticleRenderer {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        this.container = document.getElementById('articlesContainer');
        if (!this.container) {
            console.error('❌ Articles container not found');
        }
    }

    renderArticles(articles, options = {}) {
        if (!this.container) {
            console.error('❌ Cannot render articles: container not found');
            return;
        }

        if (!Array.isArray(articles)) {
            console.error('❌ renderArticles expects an array');
            return;
        }

        console.log(`🎨 Rendering ${articles.length} articles`, options);

        if (articles.length === 0) {
            this.container.innerHTML = '';
            return;
        }

        const articlesHTML = articles.map(article => this.renderArticle(article, options)).join('');
        this.container.innerHTML = articlesHTML;

        // Setup click handlers for article cards
        this.setupArticleClickHandlers();
    }

    renderArticle(article, options = {}) {
        if (!article) {
            return '';
        }

        const { showUserInfo = true, isAdmin = false } = options;

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
            cross_check_results = [],
            user = null,
            user_id = null
        } = article;

        const classificationClass = this.getClassificationClass(classification);
        const scoreColor = this.getScoreColor(classification_score);
        const inputTypeLabel = this.getInputTypeLabel(input_type);
        const formattedDate = this.formatDate(created_at);
        const breakdownCount = Array.isArray(breakdown) ? breakdown.length : 0;
        const crossCheckCount = Array.isArray(cross_check_results) ? cross_check_results.length : 0;
        
        // Debug log for user information
        if (user || user_id) {
            console.log(`👤 Article ${id} user info:`, { user, user_id });
        }
        
        // Check if breakdown exists
        const hasBreakdown = breakdown && Array.isArray(breakdown) && breakdown.length > 0;

        return `
            <div class="history-card article-card" data-article-id="${id}">
                <div class="article-header">
                    <div class="title-badge-section">
                        <div class="title-section">
                            <h3 class="article-title">${this.escapeHtml(title)}</h3>
                        </div>
                        <div class="classification-badge ${classificationClass}">
                            <span class="classification-text">${classification}</span>
                            <span class="classification-score">
                                ${Math.round(classification_score * 100)}%
                            </span>
                        </div>
                    </div>
                    <div class="summary-wrapper full-width">
                        <p class="article-summary">${this.escapeHtml(summary)}</p>
                    </div>
                </div>

                <div class="article-meta">
                    <div class="meta-row">
                        ${(showUserInfo && user) ? `
                            <div class="meta-item user-meta">
                                <i class="bi bi-person-circle"></i>
                                <span class="user-info" title="Scanned by: ${this.escapeHtml(user.email)}">
                                    ${this.escapeHtml(user.username)}
                                </span>
                            </div>
                        ` : (showUserInfo && user_id) ? `
                            <div class="meta-item user-meta">
                                <i class="bi bi-person-circle"></i>
                                <span class="user-info" title="User ID: ${user_id}">
                                    User #${user_id}
                                </span>
                            </div>
                        ` : ''}
                        <div class="meta-item">
                            <i class="bi bi-calendar-event"></i>
                            <span>${formattedDate}</span>
                        </div>
                        <div class="meta-item">
                            <i class="bi bi-tag"></i>
                            <span>${inputTypeLabel}</span>
                        </div>
                        ${original_url ? `
                            <div class="meta-item">
                                <i class="bi bi-link-45deg"></i>
                                <a href="${this.escapeHtml(original_url)}" target="_blank" rel="noopener" 
                                   class="url-link" onclick="event.stopPropagation()">
                                    ${this.getDomainFromUrl(original_url)}
                                </a>
                            </div>
                        ` : ''}
                    </div>
                </div>

                ${hasBreakdown ? `
                <div class="article-breakdown">
                    <div class="breakdown-header">
                        <i class="bi bi-graph-up"></i>
                        <span class="breakdown-title">Analysis Breakdown</span>
                        <button class="breakdown-toggle" data-article-id="${id}">
                            <i class="bi bi-chevron-down"></i> View Details
                        </button>
                    </div>
                    <div class="breakdown-summary">
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                            ${this.getBreakdownCount(breakdown)} analysis factors evaluated
                        </p>
                    </div>
                    <div class="breakdown-details" id="breakdown-details-${id}" style="display: none;">
                        ${this.generateDetailedBreakdown(breakdown)}
                    </div>
                </div>
                ` : ''}

                <div class="article-stats">
                    <div class="cross-check-section w-full">
                        <div class="cross-check-header cursor-pointer flex justify-center items-center p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg w-full" data-article-id="${id}">
                            <div class="flex items-center">
                                <i class="bi bi-search text-blue-600 mr-2"></i>
                                <span class="stat-label font-semibold text-blue-800">Cross-checks</span>
                                <span class="stat-value ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">${crossCheckCount} sources</span>
                                <span class="cross-check-icon text-lg font-bold text-blue-600 ml-3">+</span>
                            </div>
                        </div>
                        <div class="cross-check-details hidden p-4 bg-white border border-blue-200 border-t-0 rounded-b-lg w-full" id="cross-check-details-${id}">
                            ${this.generateCrossCheckDetails(cross_check_results)}
                        </div>
                    </div>
                </div>

                <div class="article-actions">
                    <div class="action-primary">
                        <button class="history-btn history-btn-primary view-details-btn" data-article-id="${id}">
                            <i class="bi bi-eye mr-2"></i>
                            View Details
                        </button>
                        ${isAdmin ? `
                            <button class="history-btn history-btn-danger delete-btn" data-article-id="${id}">
                                <i class="bi bi-trash mr-2"></i>
                                Delete
                            </button>
                        ` : ''}
                    </div>
                    <div class="action-secondary">
                        <button class="action-btn" onclick="event.stopPropagation(); window.historyManager?.modalHandler?.showArticle(${id})" 
                                title="Quick View">
                            <i class="bi bi-zoom-in"></i>
                        </button>
                        ${original_url ? `
                            <a href="${this.escapeHtml(original_url)}" target="_blank" rel="noopener" 
                               class="action-btn" onclick="event.stopPropagation()" title="Open Original">
                                <i class="bi bi-box-arrow-up-right"></i>
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    setupArticleClickHandlers() {
        // Remove general article card click handlers - modal should only open via buttons
        
        // View details button handlers
        const viewDetailsBtns = this.container.querySelectorAll('.view-details-btn');
        viewDetailsBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const articleId = btn.dataset.articleId;
                if (articleId && window.historyManager?.modalHandler) {
                    window.historyManager.modalHandler.showArticle(parseInt(articleId));
                }
            });
        });

        // Delete button handlers
        const deleteBtns = this.container.querySelectorAll('.delete-btn');
        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const articleId = btn.dataset.articleId;
                if (articleId && window.historyManager?.deleteHandler) {
                    window.historyManager.deleteHandler.showDeleteModal(parseInt(articleId));
                }
            });
        });

        // Breakdown toggle handlers
        const breakdownToggles = this.container.querySelectorAll('.breakdown-toggle');
        breakdownToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const articleId = toggle.dataset.articleId;
                const detailsDiv = document.getElementById(`breakdown-details-${articleId}`);
                const icon = toggle.querySelector('i');
                
                if (detailsDiv) {
                    if (detailsDiv.style.display === 'none') {
                        detailsDiv.style.display = 'block';
                        toggle.innerHTML = '<i class="bi bi-chevron-up"></i> Hide Details';
                        
                        // Always setup accordion handlers when showing content
                        this.setupAccordionHandlers(detailsDiv);
                    } else {
                        detailsDiv.style.display = 'none';
                        toggle.innerHTML = '<i class="bi bi-chevron-down"></i> View Details';
                        
                        // Reset all accordion states when hiding
                        this.resetAccordionStates(detailsDiv);
                    }
                }
            });
        });

        // Cross-check toggle handlers
        const crossCheckHeaders = this.container.querySelectorAll('.cross-check-header');
        crossCheckHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                const articleId = header.dataset.articleId;
                const detailsDiv = document.getElementById(`cross-check-details-${articleId}`);
                const icon = header.querySelector('.cross-check-icon');
                
                if (detailsDiv) {
                    if (detailsDiv.classList.contains('hidden')) {
                        detailsDiv.classList.remove('hidden');
                        if (icon) icon.textContent = '-';
                    } else {
                        detailsDiv.classList.add('hidden');
                        if (icon) icon.textContent = '+';
                    }
                }
            });
        });
    }

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
            const date = new Date(dateString);
            // Convert to Philippine time for accurate time calculations
            const philippineDate = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
            const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Manila"}));
            
            const diffMs = now - philippineDate;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor(diffMs / (1000 * 60));

            if (diffMinutes < 1) {
                return 'Just now';
            } else if (diffMinutes < 60) {
                return `${diffMinutes}m ago`;
            } else if (diffHours < 24) {
                return `${diffHours}h ago`;
            } else if (diffDays < 7) {
                return `${diffDays}d ago`;
            } else {
                return window.PhilippineTime.formatDateOnly(date);
            }
        } catch (error) {
            console.error('❌ Error formatting date:', error);
            return 'Invalid Date';
        }
    }

    getDomainFromUrl(url) {
        try {
            // Handle empty or null URLs
            if (!url || typeof url !== 'string' || url.trim() === '') {
                return 'Unknown Source';
            }
            
            // Clean the URL
            let cleanUrl = url.trim();
            
            // Add protocol if missing
            if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
                cleanUrl = 'https://' + cleanUrl;
            }
            
            const urlObj = new URL(cleanUrl);
            let hostname = urlObj.hostname.replace('www.', '');
            
            // Capitalize first letter for better display
            return hostname.charAt(0).toUpperCase() + hostname.slice(1);
        } catch (error) {
            // If URL parsing fails, try to extract domain manually
            if (url && typeof url === 'string') {
                const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\?\s]+)/);
                if (match && match[1]) {
                    let domain = match[1];
                    return domain.charAt(0).toUpperCase() + domain.slice(1);
                }
            }
            
            return 'Unknown Source';
        }
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) {
            return text || '';
        }
        return text.substring(0, maxLength).trim() + '...';
    }

    getCategoryInfo(category) {
        const categoryMap = {
            // Results page mapping
            'claimVerification': { label: 'Factual Verification', icon: 'bi-search', iconColor: 'text-blue-600' },
            'internalConsistency': { label: 'Internal Consistency', icon: 'bi-diagram-3', iconColor: 'text-green-600' },
            'sourceAssessment': { label: 'Source Assessment', icon: 'bi-shield-check', iconColor: 'text-purple-600' },
            'contentQuality': { label: 'Content Quality', icon: 'bi-star', iconColor: 'text-orange-600' },
            'analysisConclusion': { label: 'Analysis Conclusion', icon: 'bi-check-circle', iconColor: 'text-red-600' },
            
            // Alternative mappings for different data formats
            'factual_accuracy': { label: 'Factual Verification', icon: 'bi-search', iconColor: 'text-blue-600' },
            'source_credibility': { label: 'Source Assessment', icon: 'bi-shield-check', iconColor: 'text-purple-600' },
            'bias_detection': { label: 'Internal Consistency', icon: 'bi-diagram-3', iconColor: 'text-green-600' },
            'content_quality': { label: 'Content Quality', icon: 'bi-star', iconColor: 'text-orange-600' },
            'analysis_conclusion': { label: 'Analysis Conclusion', icon: 'bi-check-circle', iconColor: 'text-red-600' },
            'logical_consistency': { label: 'Internal Consistency', icon: 'bi-diagram-3', iconColor: 'text-green-600' },
            'emotional_language': { label: 'Content Quality', icon: 'bi-star', iconColor: 'text-orange-600' }
        };
        
        return categoryMap[category] || { label: category, icon: 'bi-question-circle', iconColor: 'text-gray-500' };
    }

    getBreakdownCount(breakdown) {
        if (Array.isArray(breakdown)) {
            // Always show 5 to represent the full analysis framework
            return 5;
        } else if (breakdown && typeof breakdown === 'object') {
            // Count non-empty fields in breakdown object
            let count = 0;
            if (breakdown.claim_verification) count++;
            if (breakdown.internal_consistency) count++;
            if (breakdown.source_assessment) count++;
            if (breakdown.content_quality) count++;
            if (breakdown.analysis_conclusion) count++;
            
            // Always show 5 to represent the full analysis framework
            return 5;
        }
        return 0;
    }

    generateDetailedBreakdown(breakdown) {
        // Handle array format (which is what we're actually getting)
        if (Array.isArray(breakdown) && breakdown.length > 0) {
            const detailedHTML = breakdown.map(item => {
                // The actual data structure has 'claim' field, not 'category'
                const claimType = item.claim || item.category || item.type || 'Unknown';
                const reasoning = item.reasoning || item.explanation || item.details || 'Analysis details not available.';
                
                // Map the claim type to our category system
                let category = 'Unknown';
                if (claimType.toLowerCase().includes('claim') || claimType.toLowerCase().includes('verification')) {
                    category = 'claimVerification';
                } else if (claimType.toLowerCase().includes('consistency')) {
                    category = 'internalConsistency';
                } else if (claimType.toLowerCase().includes('source')) {
                    category = 'sourceAssessment';
                } else if (claimType.toLowerCase().includes('quality')) {
                    category = 'contentQuality';
                } else if (claimType.toLowerCase().includes('conclusion')) {
                    category = 'analysisConclusion';
                }
                
                const categoryInfo = this.getCategoryInfo(category);
                
                return `
                    <div class="border border-gray-200 rounded-lg">
                        <div class="accordion-header bg-gray-50 hover:bg-gray-100 p-3 sm:p-4 cursor-pointer flex justify-between items-center">
                            <div class="flex items-center">
                                <i class="bi ${categoryInfo.icon} ${categoryInfo.iconColor} mr-2 sm:mr-3"></i>
                                <h4 class="font-semibold text-gray-800 text-sm sm:text-base">${categoryInfo.label}</h4>
                            </div>
                            <span class="accordion-icon text-lg sm:text-xl font-bold text-gray-500">+</span>
                        </div>
                        <div class="accordion-content hidden p-3 sm:p-4 bg-white">
                            <p class="text-gray-700 leading-relaxed text-sm sm:text-base text-justify">${reasoning}</p>
                        </div>
                    </div>
                `;
            }).join('');

            return detailedHTML;
        }

        // Handle the database object format (fallback)
        if (breakdown && typeof breakdown === 'object' && !Array.isArray(breakdown)) {
            // Convert database breakdown object to array format
            const breakdownArray = [];
            
            if (breakdown.claim_verification) {
                breakdownArray.push({
                    category: 'claimVerification',
                    reasoning: breakdown.claim_verification
                });
            }
            
            if (breakdown.internal_consistency) {
                breakdownArray.push({
                    category: 'internalConsistency',
                    reasoning: breakdown.internal_consistency
                });
            }
            
            if (breakdown.source_assessment) {
                breakdownArray.push({
                    category: 'sourceAssessment',
                    reasoning: breakdown.source_assessment
                });
            }
            
            if (breakdown.content_quality) {
                breakdownArray.push({
                    category: 'contentQuality',
                    reasoning: breakdown.content_quality
                });
            }
            
            if (breakdown.analysis_conclusion) {
                breakdownArray.push({
                    category: 'analysisConclusion',
                    reasoning: breakdown.analysis_conclusion
                });
            }
            
            return this.generateDetailedBreakdown(breakdownArray);
        }

        return '<p class="text-gray-500">No detailed analysis available.</p>';
    }

    generateCrossCheckDetails(crossCheckResults) {
        if (!Array.isArray(crossCheckResults) || crossCheckResults.length === 0) {
            return `
                <div class="text-center py-4">
                    <i class="bi bi-info-circle text-blue-400 text-2xl mb-2"></i>
                    <p class="text-gray-600 dark:text-gray-400">No cross-check sources found for this article.</p>
                </div>
            `;
        }

        // Calculate average similarity using correct database field name
        const avgSimilarity = crossCheckResults.reduce((sum, result) => {
            const similarity = result.similarity_score || 0;
            return sum + similarity;
        }, 0) / crossCheckResults.length;
        const confidenceLevel = avgSimilarity >= 90 ? 'Very High' : avgSimilarity >= 80 ? 'High' : avgSimilarity >= 70 ? 'Medium' : 'Low';

        const summaryHTML = `
            <div class="verification-summary bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div class="flex items-center mb-2">
                    <i class="bi bi-info-circle text-blue-600 mr-2"></i>
                    <h4 class="font-semibold text-blue-800">Verification Summary</h4>
                </div>
                <p class="text-blue-700 text-sm">
                    Found ${crossCheckResults.length} reports from verified sources, avg ${Math.round(avgSimilarity)}% (${confidenceLevel}).
                </p>
            </div>
        `;

        const sourcesHTML = crossCheckResults.map(result => {
            // Use actual database field names
            const url = result.match_url || '';
            const domain = result.source_name || this.getDomainFromUrl(url);
            const similarity = result.similarity_score || 0;
            const title = result.title || 'Untitled Source';
            const link = url || '#';

            console.log('Cross-check result:', { url, domain, similarity, title, link, result }); // Debug log

            return `
                <div class="match-card border border-gray-200 rounded-lg p-4 mb-3">
                    <div class="flex justify-between items-start mb-2">
                        <h5 class="font-semibold text-gray-800 dark:text-gray-200">${this.escapeHtml(domain)}</h5>
                        <span class="similarity-badge bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                            ${Math.round(similarity)}% similar
                        </span>
                    </div>
                    <p class="text-sm text-gray-700 dark:text-gray-300 mb-2">${this.escapeHtml(title)}</p>
                    ${link !== '#' ? `
                        <a href="${this.escapeHtml(link)}" target="_blank" rel="noopener" 
                           class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs inline-flex items-center"
                           onclick="event.stopPropagation()">
                            <i class="bi bi-external-link mr-1"></i>View Original
                        </a>
                    ` : `
                        <span class="text-gray-400 text-xs">
                            <i class="bi bi-link-slash mr-1"></i>No link available
                        </span>
                    `}
                </div>
            `;
        }).join('');

        return summaryHTML + sourcesHTML;
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

    // Render loading skeleton
    renderLoadingSkeleton() {
        if (!this.container) return;

        const skeletonHTML = Array(4).fill(0).map(() => `
            <div class="history-card animate-pulse">
                <div class="space-y-4">
                    <div class="flex justify-between items-start">
                        <div class="flex-1 space-y-2">
                            <div class="h-6 bg-gray-300 rounded w-3/4"></div>
                            <div class="h-4 bg-gray-300 rounded w-full"></div>
                            <div class="h-4 bg-gray-300 rounded w-2/3"></div>
                        </div>
                        <div class="h-8 w-20 bg-gray-300 rounded-full"></div>
                    </div>
                    <div class="flex justify-between">
                        <div class="h-4 bg-gray-300 rounded w-32"></div>
                        <div class="h-4 bg-gray-300 rounded w-24"></div>
                    </div>
                    <div class="flex justify-between">
                        <div class="h-8 bg-gray-300 rounded w-28"></div>
                        <div class="flex space-x-2">
                            <div class="h-8 w-8 bg-gray-300 rounded"></div>
                            <div class="h-8 w-8 bg-gray-300 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        this.container.innerHTML = skeletonHTML;
    }

    // Clear container
    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    // Setup accordion functionality for breakdown details
    setupAccordionHandlers(container = this.container) {
        const accordionHeaders = container.querySelectorAll('.accordion-header');
        accordionHeaders.forEach(header => {
            // Remove existing event listeners to prevent duplicates
            const newHeader = header.cloneNode(true);
            header.parentNode.replaceChild(newHeader, header);
            
            // Add fresh event listener
            newHeader.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent modal from opening
                const content = newHeader.nextElementSibling;
                const icon = newHeader.querySelector('.accordion-icon');
                
                if (content && content.classList.contains('hidden')) {
                    content.classList.remove('hidden');
                    if (icon) icon.textContent = '-';
                } else if (content) {
                    content.classList.add('hidden');
                    if (icon) icon.textContent = '+';
                }
            });
        });
    }

    // Reset accordion states to collapsed
    resetAccordionStates(container) {
        const accordionContents = container.querySelectorAll('.accordion-content');
        const accordionIcons = container.querySelectorAll('.accordion-icon');
        
        accordionContents.forEach(content => {
            content.classList.add('hidden');
        });
        
        accordionIcons.forEach(icon => {
            icon.textContent = '+';
        });
    }
}
