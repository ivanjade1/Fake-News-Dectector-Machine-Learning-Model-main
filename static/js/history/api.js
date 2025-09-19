// History API Service
export class HistoryAPI {
    constructor() {
        this.baseUrl = '';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    async getArticles(options = {}) {
        const {
            page = 1,
            limit = 50,
            search = '',
            classification = '',
            inputType = '',
            sortBy = 'created_at',
            sortOrder = 'desc',
            showDuplicates = true
        } = options;

        const cacheKey = `articles_${JSON.stringify(options)}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('📦 Returning cached articles data');
                return cached.data;
            }
        }

        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search,
                classification,
                input_type: inputType,
                sort_by: sortBy,
                sort_order: sortOrder,
                show_duplicates: showDuplicates.toString()
            });

            // Remove empty parameters (but keep show_duplicates even if false)
            for (const [key, value] of params.entries()) {
                if (!value && key !== 'show_duplicates') {
                    params.delete(key);
                }
            }

            const url = `/api/history?${params.toString()}`;
            console.log(`🌐 Fetching articles from: ${url}`);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });

            console.log(`✅ Successfully fetched ${data.articles?.length || 0} articles`);
            return data;

        } catch (error) {
            console.error('❌ Error fetching articles:', error);
            
            // Return mock data for development if API fails
            if (error.message.includes('Failed to fetch') || error.message.includes('404')) {
                console.log('🔧 API not available, returning mock data for development');
                return this.getMockData();
            }
            
            throw error;
        }
    }

    async getArticleDetails(articleId) {
        const cacheKey = `article_${articleId}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log(`📦 Returning cached article ${articleId} details`);
                return cached.data;
            }
        }

        try {
            const url = `/api/history/${articleId}`;
            console.log(`🌐 Fetching article details from: ${url}`);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });

            console.log(`✅ Successfully fetched details for article ${articleId}`);
            return data;

        } catch (error) {
            console.error(`❌ Error fetching article ${articleId} details:`, error);
            throw error;
        }
    }

    // Mock data for development/testing
    getMockData() {
        return {
            articles: [
                {
                    id: 1,
                    title: "Breaking: Local Scientists Discover Revolutionary Energy Source",
                    summary: "Researchers at the university claim to have developed a new form of clean energy that could revolutionize the power industry.",
                    classification: "Real",
                    classification_score: 0.85,
                    input_type: "url",
                    original_url: "https://example.com/news/energy-discovery",
                    created_at: "2024-01-15T10:30:00Z",
                    breakdown: [
                        {
                            claim: "Scientists discovered a new energy source",
                            verdict: "Likely True",
                            reasoning: "Research papers and university announcements confirm this discovery"
                        }
                    ],
                    cross_check_results: [
                        {
                            source_name: "Science Daily",
                            title: "University Researchers Announce Energy Breakthrough",
                            summary: "Confirms the discovery with additional technical details",
                            similarity_score: 0.92,
                            match_url: "https://sciencedaily.com/energy-breakthrough"
                        }
                    ]
                },
                {
                    id: 2,
                    title: "Celebrity Spotted with Mysterious Object, Experts Baffled",
                    summary: "Photos show famous actor holding an unidentified device, sparking wild speculation across social media platforms.",
                    classification: "Fake",
                    classification_score: 0.78,
                    input_type: "snippet",
                    original_url: null,
                    created_at: "2024-01-14T15:45:00Z",
                    breakdown: [
                        {
                            claim: "Celebrity was photographed with mysterious device",
                            verdict: "False",
                            reasoning: "Images appear to be digitally manipulated"
                        }
                    ],
                    cross_check_results: []
                },
                {
                    id: 3,
                    title: "Government Announces New Healthcare Initiative",
                    summary: "Officials reveal plans for expanded healthcare coverage that will affect millions of citizens nationwide.",
                    classification: "Real",
                    classification_score: 0.65,
                    input_type: "url",
                    original_url: "https://example.com/government/healthcare",
                    created_at: "2024-01-13T09:20:00Z",
                    breakdown: [
                        {
                            claim: "Government announced healthcare initiative",
                            verdict: "Partially True",
                            reasoning: "Initiative exists but details are exaggerated"
                        }
                    ],
                    cross_check_results: [
                        {
                            source_name: "Government Press Release",
                            title: "Healthcare Coverage Expansion Plans",
                            summary: "Official announcement with more conservative details",
                            similarity_score: 0.75,
                            match_url: "https://gov.example.com/press/healthcare"
                        }
                    ]
                }
            ],
            pagination: {
                current_page: 1,
                total_pages: 1,
                total_articles: 3,
                articles_per_page: 4
            }
        };
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
        console.log('🗑️ API cache cleared');
    }

    // Get cache stats
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}
