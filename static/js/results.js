// Global variables for results page
let analysisData = null;

// Function to get shortened source name from URL
function getShortenedSourceName(url) {
    if (!url || typeof url !== 'string') return null;
    
    try {
        const domain = new URL(url).hostname.replace('www.', '');
        
        // Map domains to shortened names
        const sourceMap = {
            'cnn.com': 'CNN',
            'edition.cnn.com': 'CNN',
            'bbc.com': 'BBC',
            'reuters.com': 'Reuters',
            'rappler.com': 'Rappler',
            'abs-cbn.com': 'ABS-CBN',
            'news.abs-cbn.com': 'ABS-CBN',
            'inquirer.net': 'Inquirer',
            'newsinfo.inquirer.net': 'Inquirer',
            'gmanetwork.com': 'GMA',
            'gma.news': 'GMA',
            'mb.com.ph': 'Manila Bulletin',
            'philstar.com': 'PhilStar',
            'manilatimes.net': 'Manila Times',
            'theguardian.com': 'The Guardian',
            'pna.gov.ph': 'PNA',
            'politiko.com.ph': 'Politiko',
            'malaya.com.ph': 'Malaya',
            'msn.com': 'MSN',
            'apnews.com': 'AP News'
        };
        
        return sourceMap[domain] || domain.split('.')[0].toUpperCase();
    } catch (error) {
        console.error('Error parsing URL:', error);
        return null;
    }
}

// Function to populate source information
function populateSourceInfo(data) {
    const sourceLink = document.getElementById('sourceLink');
    
    if (data.inputMethod === 'link' && data.originalData && data.originalData.url) {
        // For URL inputs, create clickable shortened link
        const shortenedName = getShortenedSourceName(data.originalData.url);
        if (shortenedName) {
            sourceLink.innerHTML = `<a href="${data.originalData.url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 hover:underline font-medium">${shortenedName}</a>`;
        } else {
            sourceLink.innerHTML = `<a href="${data.originalData.url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 hover:underline font-medium">External Source</a>`;
        }
    } else {
        // For snippet inputs, show "User Provided Text"
        sourceLink.innerHTML = `<span class="text-gray-600 font-medium bg-gray-100 px-2 py-1 rounded text-xs">User Provided Text</span>`;
    }
}

// Function to show error message
function showErrorMessage(message) {
    document.body.innerHTML = `
        <div class="min-h-screen gradient-bg flex items-center justify-center">
            <div class="max-w-md mx-auto bg-white rounded-xl p-8 shadow-xl">
                <div class="text-center">
                    <i class="bi bi-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                    <h2 class="text-xl font-semibold text-gray-800 mb-4">Error Loading Results</h2>
                    <p class="text-gray-600 mb-6">${message}</p>
                    <a href="/" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                        Return to Detector
                    </a>
                </div>
            </div>
        </div>
    `;
}

// Function to get factuality color based on score
function getFactualityColor(score) {
    if (score >= 90) return { bg: 'bg-green-600', text: 'text-green-600', border: 'border-green-500' };
    if (score >= 75) return { bg: 'bg-green-500', text: 'text-green-500', border: 'border-green-400' };
    if (score >= 51) return { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-400' };
    if (score >= 26) return { bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-400' };
    return { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-400' };
}

// Function to display results
function displayResults(data) {
    try {
        const results = data.results;
        console.log('Displaying results:', results);

        // Display extracted content
        if (results.extracted_content) {
            const extractedContent = document.getElementById('extractedContent');
            extractedContent.classList.remove('hidden');
            
            document.getElementById('extractedTitle').textContent = results.extracted_content.title || 'No title available';
            document.getElementById('extractedPreview').textContent = results.extracted_content.content_preview || 'No preview available';
            
            // Populate source information
            populateSourceInfo(data);
        }

        // Display content summary if available
        if (results.content_summary) {
            const summarySection = document.getElementById('contentSummarySection');
            const summaryText = document.getElementById('contentSummaryText');
            const summaryWordCount = document.getElementById('contentSummaryWordCount');
            
            summarySection.classList.remove('hidden');
            summaryText.textContent = results.content_summary.summary || 'No summary available';
            summaryWordCount.textContent = `${results.content_summary.word_count || 0} words`;
        }

        // Display main prediction results
        const predictionCard = document.getElementById('predictionCard');
        const predictionIcon = document.getElementById('predictionIcon');
        const predictionIconSymbol = document.getElementById('predictionIconSymbol');
        const predictionText = document.getElementById('predictionText');
        const factualityLevel = document.getElementById('factualityLevel');
        const factualityScore = document.getElementById('factualityScore');
        const factualityDescription = document.getElementById('factualityDescription');
        const scoreBar = document.getElementById('scoreBar');

        // Set prediction values
        const score = results.factuality_score || 50;
        const colors = getFactualityColor(score);
        
        // Apply score-based color to the numerical score display
        factualityScore.textContent = `${score}%`;
        factualityScore.className = `text-4xl font-bold mb-2 ${colors.text}`;
        
        predictionText.textContent = results.prediction || 'Unknown';
        factualityLevel.textContent = results.factuality_level || 'Unknown';
        factualityDescription.textContent = results.factuality_description || 'No description available';

        // Set colors and icons based on prediction with consistent Real/Fake colors
        if (results.prediction === 'Real') {
            predictionCard.className = predictionCard.className.replace('border-l-8', 'border-l-8 border-green-500');
            predictionIcon.className = 'inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 bg-green-100';
            predictionIconSymbol.className = 'text-4xl bi bi-check-circle-fill text-green-600';
            predictionText.className = 'text-3xl font-bold mb-2 text-green-600';
        } else if (results.prediction === 'Fake') {
            predictionCard.className = predictionCard.className.replace('border-l-8', 'border-l-8 border-red-500');
            predictionIcon.className = 'inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 bg-red-100';
            predictionIconSymbol.className = 'text-4xl bi bi-x-circle-fill text-red-600';
            predictionText.className = 'text-3xl font-bold mb-2 text-red-600';
        } else {
            predictionCard.className = predictionCard.className.replace('border-l-8', 'border-l-8 border-gray-500');
            predictionIcon.className = 'inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 bg-gray-100';
            predictionIconSymbol.className = 'text-4xl bi bi-question-circle-fill text-gray-600';
            predictionText.className = 'text-3xl font-bold mb-2 text-gray-600';
        }

        // Set score bar with matching colors
        scoreBar.style.width = `${score}%`;
        scoreBar.className = `h-3 rounded-full transition-all duration-1000 ${colors.bg}`;

        // Update factuality scale elements with matching colors
        const currentScoreValue = document.getElementById('currentScoreValue');
        const currentScoreCategory = document.getElementById('currentScoreCategory');
        const scoreColorDot = document.getElementById('scoreColorDot');
        const scoreIndicator = document.getElementById('scoreIndicator');
        const scoreTooltip = document.getElementById('scoreTooltip');

        // Apply consistent colors to current score value - remove black background
        currentScoreValue.textContent = `${score}%`;
        currentScoreValue.className = `font-bold text-2xl ${colors.text}`;
        
        // Make classification text match the score color
        currentScoreCategory.textContent = results.factuality_level || 'Unknown';
        currentScoreCategory.className = `font-semibold mx-1 ${colors.text}`;
        
        scoreColorDot.className = `w-3 h-3 rounded-full mr-3 ${colors.bg}`;
        scoreTooltip.textContent = `${score}%`;
        
        // Calculate position based on the 6-section partition
        // Sections: 0-25%, 26-50%, 51-74%, 75-89%, 90-100% (5 divisions)
        // Each section takes up 1/5 of the total width (20%)
        let position;
        
        if (score <= 25) {
            // First section: 0-25%
            position = (score / 25) * 20; // Map 0-25 to 0-20%
        } else if (score <= 50) {
            // Second section: 26-50%
            position = 20 + ((score - 25) / 25) * 20; // Map 26-50 to 20-40%
        } else if (score <= 74) {
            // Third section: 51-74%
            position = 40 + ((score - 51) / 24) * 20; // Map 51-74 to 40-60%
        } else if (score <= 89) {
            // Fourth section: 75-89%
            position = 60 + ((score - 75) / 15) * 20; // Map 75-89 to 60-80%
        } else {
            // Fifth section: 90-100%
            position = 80 + ((score - 90) / 10) * 20; // Map 90-100 to 80-100%
        }
        
        scoreIndicator.style.left = `${position}%`;

        // Also update the tooltip color to match the score - black background with white text
        const tooltipElement = document.getElementById('scoreTooltip');
        if (tooltipElement) {
            // Black background with white text for tooltip
            tooltipElement.className = `bg-black text-white px-2 py-1 rounded text-xs font-bold`;
        }

        // Display factuality breakdown if available
        if (results.factuality_breakdown) {
            const factualityBreakdown = document.getElementById('factualityBreakdown');
            factualityBreakdown.classList.remove('hidden');
            
            // Populate breakdown sections
            const breakdown = results.factuality_breakdown;
            document.getElementById('claimVerification').textContent = breakdown.claim_verification || 'No analysis available';
            document.getElementById('internalConsistency').textContent = breakdown.internal_consistency || 'No analysis available';
            document.getElementById('sourceAssessment').textContent = breakdown.source_assessment || 'No analysis available';
            document.getElementById('contentQuality').textContent = breakdown.content_quality || 'No analysis available';
            document.getElementById('analysisConclusion').textContent = breakdown.conclusion || 'No conclusion available';
        }

        // Display cross-check information if available
        if (results.cross_check && results.cross_check.status !== 'error') {
            const crossCheckSection = document.getElementById('crossCheckSection');
            crossCheckSection.classList.remove('hidden');
            
            const crossCheckBadge = document.getElementById('crossCheckBadge');
            const crossCheckSummaryText = document.getElementById('crossCheckSummaryText');
            const crossCheckMatches = document.getElementById('crossCheckMatches');
            
            // Set badge color based on confidence
            const confidence = results.cross_check.confidence;
            let badgeClass = 'bg-gray-100 text-gray-800';
            if (confidence === 'Very High') badgeClass = 'bg-green-100 text-green-800';
            else if (confidence === 'High') badgeClass = 'bg-blue-100 text-blue-800';
            else if (confidence === 'Medium') badgeClass = 'bg-yellow-100 text-yellow-800';
            else if (confidence === 'Low') badgeClass = 'bg-orange-100 text-orange-800';
            
            crossCheckBadge.className = `ml-auto px-3 py-1 rounded-full text-sm font-medium ${badgeClass}`;
            crossCheckBadge.innerHTML = `<i class="bi bi-shield-check mr-1"></i>${confidence} Confidence`;
            
            // Set summary text
            crossCheckSummaryText.textContent = results.cross_check.summary || 'Cross-check verification completed.';
            
            // Display matches
            if (results.cross_check.matches && results.cross_check.matches.length > 0) {
                crossCheckMatches.innerHTML = results.cross_check.matches.map(match => `
                    <div class="border border-gray-200 rounded-lg p-4">
                        <div class="flex justify-between items-start mb-2">
                            <h5 class="font-semibold text-gray-800">${match.source}</h5>
                            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">${match.similarity}% similar</span>
                        </div>
                        <p class="text-sm text-gray-700 mb-2">${match.title}</p>
                        <a href="${match.link}" target="_blank" class="text-blue-600 hover:text-blue-800 text-xs">
                            <i class="bi bi-external-link mr-1"></i>View Original
                        </a>
                    </div>
                `).join('');
            } else {
                crossCheckMatches.innerHTML = '<p class="text-gray-600 text-center py-4">No matching sources found.</p>';
            }
            
            // Update technical details
            document.getElementById('searchedCount').textContent = results.cross_check.total_searched || 0;
            document.getElementById('matchedCount').textContent = results.cross_check.matches ? results.cross_check.matches.length : 0;
            
            if (results.cross_check.matches && results.cross_check.matches.length > 0) {
                const avgSim = results.cross_check.matches.reduce((sum, match) => sum + match.similarity, 0) / results.cross_check.matches.length;
                document.getElementById('avgSimilarity').textContent = `${Math.round(avgSim)}%`;
            } else {
                document.getElementById('avgSimilarity').textContent = '0%';
            }
        }

        // Setup feedback functionality
        setupFeedbackHandlers(data);
        
        // Setup accordion functionality
        setupAccordionHandlers();
        
        // Setup other interactive elements
        setupInteractiveElements();
        
        console.log('Results display completed successfully');
        
    } catch (error) {
        console.error('Error displaying results:', error);
        showErrorMessage('Error displaying analysis results. Please try analyzing the content again.');
    }
}

// Setup feedback handlers
function setupFeedbackHandlers(data) {
    console.log('Setting up feedback handlers...');
    
    const correctBtn = document.getElementById('correctBtn');
    const inaccurateBtn = document.getElementById('inaccurateBtn');
    const feedbackForm = document.getElementById('feedbackForm');
    const feedbackSuccess = document.getElementById('feedbackSuccess');
    const submitFeedback = document.getElementById('submitFeedback');
    const cancelFeedback = document.getElementById('cancelFeedback');
    const suggestedScore = document.getElementById('suggestedScore');
    const suggestedScoreValue = document.getElementById('suggestedScoreValue');
    const suggestedScoreDescription = document.getElementById('suggestedScoreDescription');
    const feedbackComment = document.getElementById('feedbackComment');
    
    let selectedFeedbackType = null;
    
    // Function to get factuality description based on score
    function getFactualityDescription(score) {
        if (score >= 90) return 'Very High';
        if (score >= 75) return 'High';
        if (score >= 51) return 'Mostly Factual';
        if (score >= 26) return 'Low';
        return 'Very Low';
    }
    
    // Function to update suggested score display with proper colors and position
    // Function to update suggested score display with proper colors and position
    function updateSuggestedScoreDisplay(score) {
        const colors = getFactualityColor(score);
        suggestedScoreValue.textContent = score;

        // styling
        suggestedScoreValue.className =
            `font-bold text-base sm:text-lg px-3 py-2 bg-white border border-gray-300 rounded-lg w-16 shadow-lg text-center ${colors.text}`;
        suggestedScoreDescription.textContent = getFactualityDescription(score);
        suggestedScoreDescription.className = `text-xs font-medium mt-1 ${colors.text}`;

        // --- keep the score box centered under the thumb and inside the form ---
        const wrapper = document.getElementById('scoreWrapper');      // relative container
        const slider  = document.getElementById('suggestedScore');    // range input
        const box     = document.getElementById('scoreBoxContainer'); // floating number+label
        if (!wrapper || !slider || !box) return;

        const sliderRect  = slider.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();

        // Estimate thumb size (CSS var if present, else fallback)
        const cs = getComputedStyle(slider);
        let thumbSize = parseFloat(cs.getPropertyValue('--thumb-size'));
        if (!thumbSize || Number.isNaN(thumbSize)) thumbSize = 16;

        // Track start/end = where the thumb center can travel
        const trackStart = sliderRect.left + thumbSize / 2;
        const trackEnd   = sliderRect.right - thumbSize / 2;

        // Desired X under the thumb (page coords)
        const p = Math.min(Math.max(score, 0), 100) / 100;           // 0..1
        const thumbX = trackStart + (trackEnd - trackStart) * p;

        // Convert to wrapper-local X
        const relX = thumbX - wrapperRect.left;

        // Clamp to BOTH the track and wrapper so the box never escapes
        const halfBox = box.offsetWidth ? box.offsetWidth / 2 : 24;
        const trackLeftInWrapper  = trackStart - wrapperRect.left;
        const trackRightInWrapper = trackEnd   - wrapperRect.left;

        const minX = Math.max(trackLeftInWrapper, halfBox);
        const maxX = Math.min(trackRightInWrapper, wrapperRect.width - halfBox);

        const clampedX = Math.min(Math.max(relX, minX), maxX);

        box.style.left = `${clampedX}px`;
        box.style.transform = 'translateX(-50%)';
        }




    // Keep the floating box aligned on resize
    window.addEventListener('resize', () => {
        const el = document.getElementById('suggestedScore');
        if (el) updateSuggestedScoreDisplay(parseInt(el.value, 10));
        });


    
    // Function to check if feedback can be submitted
    function checkSubmitButtonState() {
        if (submitFeedback) {
            const canSubmit = selectedFeedbackType !== null;
            submitFeedback.disabled = !canSubmit;
            if (canSubmit) {
                submitFeedback.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                submitFeedback.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }
    }
    
    // Initially disable submit button since no feedback type is selected
    checkSubmitButtonState();
    
    // Handle correct assessment button
    if (correctBtn) {
        correctBtn.addEventListener('click', () => {
            selectedFeedbackType = 'correct';
            console.log('User clicked: Accurate Assessment');
            
            // Submit feedback immediately for correct assessment
            submitUserFeedback(analysisData, 'correct', analysisData.results.factuality_score, '');
        });
    }
    
    // Handle inaccurate assessment button
    if (inaccurateBtn) {
        inaccurateBtn.addEventListener('click', () => {
            selectedFeedbackType = 'inaccurate';
            console.log('User clicked: Inaccurate Assessment');
            
            // Show feedback form for inaccurate assessment
            feedbackForm.classList.remove('hidden');
            
            // Set default suggested score (opposite of current prediction)
            const currentScore = data.results.factuality_score || 50;
            let defaultScore;
            if (currentScore >= 51) {
                // If currently "Real", suggest "Fake" score
                defaultScore = 25;
            } else {
                // If currently "Fake", suggest "Real" score
                defaultScore = 75;
            }
            
            suggestedScore.value = defaultScore;
            updateSuggestedScoreDisplay(defaultScore);
            
            // Enable submit button since user selected inaccurate
            checkSubmitButtonState();
        });
    }
    
    // Handle score slider changes with real-time response
    if (suggestedScore) {
        // Use both input and change events for maximum responsiveness
        const handleSliderChange = (e) => {
            const score = parseInt(e.target.value);
            updateSuggestedScoreDisplay(score);
        };
        
        suggestedScore.addEventListener('input', handleSliderChange);
        suggestedScore.addEventListener('change', handleSliderChange);
        
        // Also handle mouse move while dragging for ultra-smooth response
        let isDragging = false;
        suggestedScore.addEventListener('mousedown', () => { isDragging = true; });
        suggestedScore.addEventListener('mouseup', () => { isDragging = false; });
        suggestedScore.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const score = parseInt(e.target.value);
                updateSuggestedScoreDisplay(score);
            }
        });
    }
    
    // Handle submit feedback button
    if (submitFeedback) {
        submitFeedback.addEventListener('click', () => {
            // Double-check that feedback type is selected
            if (selectedFeedbackType === null) {
                alert('Please select whether the assessment is accurate or inaccurate before submitting feedback.');
                return;
            }
            
            const score = parseInt(suggestedScore.value);
            const comment = feedbackComment.value.trim();
            
            console.log('Submitting feedback:', { type: selectedFeedbackType, score, comment });
            
            submitUserFeedback(data, selectedFeedbackType, score, comment);
        });
    }
    
    // Handle cancel feedback button
    if (cancelFeedback) {
        cancelFeedback.addEventListener('click', () => {
            feedbackForm.classList.add('hidden');
            feedbackComment.value = '';
            selectedFeedbackType = null;
            checkSubmitButtonState();
        });
    }
    
    // Function to submit feedback to the server
    async function submitUserFeedback(analysisData, feedbackType, suggestedScore, comment) {
        try {
            // Disable buttons to prevent double submission
            if (correctBtn) correctBtn.disabled = true;
            if (inaccurateBtn) inaccurateBtn.disabled = true;
            if (submitFeedback) submitFeedback.disabled = true;
            
            // Determine actual label based on feedback
            let actualLabel;
            if (feedbackType === 'correct') {
                // User agrees with the assessment
                actualLabel = analysisData.results.prediction;
            } else {
                // User disagrees, determine actual label from suggested score
                if (suggestedScore >= 51) {
                    actualLabel = 'Real';
                } else {
                    actualLabel = 'Fake';
                }
            }
            
            // Extract title from ALL possible sources in order of preference
            let title = null;
            
            console.log('🔍 TITLE EXTRACTION DEBUG:');
            console.log('analysisData.originalData:', analysisData.originalData);
            console.log('analysisData.results.generated_title:', analysisData.results.generated_title);
            console.log('analysisData.results.manual_title:', analysisData.results.manual_title);
            console.log('analysisData.results.extracted_content:', analysisData.results.extracted_content);
            
            // Priority 1: Manual title from original data
            if (analysisData.originalData && analysisData.originalData.title) {
                title = analysisData.originalData.title;
                console.log('✅ Using manual title from originalData:', title);
            }
            // Priority 2: Generated title from results
            else if (analysisData.results.generated_title) {
                title = analysisData.results.generated_title;
                console.log('✅ Using generated title from results:', title);
            }
            // Priority 3: Manual title from results
            else if (analysisData.results.manual_title) {
                title = analysisData.results.manual_title;
                console.log('✅ Using manual title from results:', title);
            }
            // Priority 4: Extracted content title
            else if (analysisData.results.extracted_content && analysisData.results.extracted_content.title) {
                title = analysisData.results.extracted_content.title;
                console.log('✅ Using extracted content title:', title);
            }
            // Priority 5: Check if URL input method, try to get title from URL extraction
            else if (analysisData.inputMethod === 'link' && analysisData.results.extracted_content) {
                title = analysisData.results.extracted_content.title || null;
                console.log('✅ Using URL extracted title:', title);
            }
            else {
                console.log('❌ No title found from any source');
            }
            
            // Extract summary from content summary
            let summary = null;
            console.log('🔍 SUMMARY EXTRACTION DEBUG:');
            console.log('analysisData.results.content_summary:', analysisData.results.content_summary);
            
            if (analysisData.results.content_summary && analysisData.results.content_summary.summary) {
                summary = analysisData.results.content_summary.summary;
                console.log('✅ Using content summary:', summary);
            } else {
                console.log('❌ No summary found');
            }
            
            // Get content preview - prioritize content_preview, then extracted_content
            let contentText = '';
            if (analysisData.results.content_preview) {
                contentText = analysisData.results.content_preview;
            } else if (analysisData.results.extracted_content && analysisData.results.extracted_content.content_preview) {
                contentText = analysisData.results.extracted_content.content_preview;
            }
            
            // Prepare feedback data with all fields
            const feedbackData = {
                text: contentText,
                predicted_label: analysisData.results.prediction,
                actual_label: actualLabel,
                confidence: analysisData.results.confidence || 0.5,
                comment: comment,
                link: analysisData.inputMethod === 'link' ? analysisData.originalData.url : null,
                factuality_score: suggestedScore,
                title: title,
                summary: summary
            };
            
            console.log('📤 FINAL FEEDBACK DATA BEING SENT:');
            console.log('feedbackData:', feedbackData);
            console.log('Title in payload:', feedbackData.title);
            console.log('Summary in payload:', feedbackData.summary);
            console.log('Factuality score in payload:', feedbackData.factuality_score);
            console.log('Link in payload:', feedbackData.link);
            
            const response = await fetch('/submit-feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(feedbackData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Feedback submitted successfully:', result);
            
            // Debug: Check if elements exist
            console.log('feedbackForm element:', feedbackForm);
            console.log('feedbackSuccess element:', feedbackSuccess);
            
            // Show success message
            // --- Ensure we have a single, visible success banner ---
            const section   = document.getElementById('feedbackSection');
            const formEl    = document.getElementById('feedbackForm');
            let successEl   = document.getElementById('feedbackSuccess');

            // If it doesn't exist, create it at the end of #feedbackSection
            if (!successEl && section) {
            section.insertAdjacentHTML(
                'beforeend',
                `<div id="feedbackSuccess" class="bg-green-100 border border-green-300 rounded-lg p-3 sm:p-4">
                <div class="flex items-center text-green-800">
                    <i class="bi bi-check-circle-fill text-xl sm:text-2xl mr-3"></i>
                    <div>
                    <p class="font-semibold text-sm sm:text-base">Thank you for your feedback!</p>
                    <p class="text-xs sm:text-sm">Your input will help improve our AI model.</p>
                    </div>
                </div>
                </div>`
            );
            successEl = document.getElementById('feedbackSuccess');
            }

            // If the banner is trapped under any .hidden ancestor (e.g., the form), move it out
            if (successEl) {
            const hiddenAncestor = successEl.closest('.hidden');
            if (hiddenAncestor && section) {
                section.appendChild(successEl); // re-parent under visible container
            }
            }

            // Hide the form (it’s the hidden ancestor)
            if (formEl) formEl.classList.add('hidden');

            // Force-show the banner
            if (successEl) {
            successEl.classList.remove('hidden', 'invisible', 'opacity-0');
            successEl.removeAttribute('hidden');
            successEl.style.removeProperty('display');
            successEl.style.removeProperty('visibility');
            (section || successEl).scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            // Hide the choice buttons
            if (correctBtn)    correctBtn.style.display = 'none';
            if (inaccurateBtn) inaccurateBtn.style.display = 'none';


            
        } catch (error) {
            console.error('❌ Error submitting feedback:', error);
            alert(`Error submitting feedback: ${error.message}`);
            
            // Re-enable buttons on error
            if (correctBtn) correctBtn.disabled = false;
            if (inaccurateBtn) inaccurateBtn.disabled = false;
            if (submitFeedback) submitFeedback.disabled = false;
        }
    }
}

// Setup accordion handlers
function setupAccordionHandlers() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const icon = header.querySelector('.accordion-icon');
            
            if (content.classList.contains('hidden')) {
                content.classList.remove('hidden');
                icon.textContent = '-';
            } else {
                content.classList.add('hidden');
                icon.textContent = '+';
            }
        });
    });
}

// Setup interactive elements
function setupInteractiveElements() {
    // Toggle score info
    const toggleScoreInfo = document.getElementById('toggleScoreInfo');
    const scoreDetails = document.getElementById('scoreDetails');
    
    if (toggleScoreInfo && scoreDetails) {
        toggleScoreInfo.addEventListener('click', () => {
            if (scoreDetails.classList.contains('hidden')) {
                scoreDetails.classList.remove('hidden');
                toggleScoreInfo.innerHTML = '<i class="bi bi-chevron-up"></i> Hide Details';
            } else {
                scoreDetails.classList.add('hidden');
                toggleScoreInfo.innerHTML = '<i class="bi bi-chevron-down"></i> Show Details';
            }
        });
    }
    
    // Toggle cross-check details
    const toggleCrossCheck = document.getElementById('toggleCrossCheck');
    const crossCheckDetails = document.getElementById('crossCheckDetails');
    
    if (toggleCrossCheck && crossCheckDetails) {
        toggleCrossCheck.addEventListener('click', () => {
            if (crossCheckDetails.classList.contains('hidden')) {
                crossCheckDetails.classList.remove('hidden');
                toggleCrossCheck.innerHTML = '<i class="bi bi-chevron-up mr-1"></i>Hide Technical Details';
            } else {
                crossCheckDetails.classList.add('hidden');
                toggleCrossCheck.innerHTML = '<i class="bi bi-chevron-down mr-1"></i>Show Technical Details';
            }
        });
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Results page loaded, checking for analysis data...');
    
    // Get analysis results from localStorage
    const analysisDataString = localStorage.getItem('analysisResults');
    console.log('Raw analysis data from localStorage:', analysisDataString);
    
    if (!analysisDataString) {
        console.error('No analysis data found in localStorage');
        showErrorMessage('No analysis data found. Please return to the detector and run an analysis.');
        return;
    }

    try {
        analysisData = JSON.parse(analysisDataString);
        console.log('Parsed analysis data:', analysisData);
        
        if (!analysisData.results) {
            console.error('No results found in analysis data');
            showErrorMessage('Invalid analysis data. Please return to the detector and run an analysis.');
            return;
        }
        
        displayResults(analysisData);
        
    } catch (error) {
        console.error('Error parsing analysis data:', error);
        showErrorMessage('Error loading analysis results. Please return to the detector and run an analysis.');
    }
});

