/**
 * Stage 4: Claim Cross-Check Game
 */

class Stage4Game {
    constructor() {
        console.log('Stage4Game initialized');
        
        // Core game state
        this.gameData = null;
        this.currentRound = 0;
        this.totalRounds = 10; // Based on JSON structure
        this.totalXP = 0;
        this.gameStartTime = null;
        this.roundStartTime = null;
        this.gameActive = false;
        this.roundActive = false;
        this.selectedVerification = null;
        this.hintUsed = false;
        
        // Timer settings
        this.maxRoundTime = 60; // 60 seconds per round
        this.currentTime = this.maxRoundTime;
        this.timerInterval = null;
        
        // Statistics - matching Stage 3 pattern
        this.correctAnswers = 0;
        this.totalAnswers = 0;
        this.answers = [];
        this.stats = {
            correct: 0,
            incorrect: 0,
            timeouts: 0,
            speedBonuses: 0,
            lightningBonuses: 0,
            hintsUsed: 0,
            totalResponseTime: 0
        };
        
        // Bind methods
        this.handleVerificationSelect = this.handleVerificationSelect.bind(this);
        this.updateTimer = this.updateTimer.bind(this);
        this.nextRound = this.nextRound.bind(this);
        this.showHint = this.showHint.bind(this);
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadGameData();
            this.initializeStats();
            this.setupEventListeners();
            this.showInstructions();
        } catch (error) {
            console.error('Failed to initialize Stage 4:', error);
            this.showError('Failed to load game data. Please refresh the page.');
        }
    }
    
    initializeStats() {
        // Reset ALL local counters to zero
        this.correctAnswers = 0;
        this.totalAnswers = 0;
        this.totalXP = 0;
        this.currentRound = 0;
        
        // Initialize display-only stats component
        if (window.stageStatsNew) {
            window.stageStatsNew.setRound(0, this.totalRounds);
            window.stageStatsNew.setXP(0);
        }
        
        // Manually set accuracy to 0% at start
        this.updateAccuracyDisplay();
    }
    
    updateAccuracyDisplay() {
        const accuracy = this.totalAnswers === 0 ? 0 : Math.round((this.correctAnswers / this.totalAnswers) * 100);
        const accuracyEl = document.getElementById('current-accuracy');
        if (accuracyEl) {
            accuracyEl.textContent = `${accuracy}%`;
        }
    }
    
    updateGameStats() {
        // Update display-only stats component
        if (window.stageStatsNew) {
            window.stageStatsNew.setRound(this.currentRound, this.totalRounds);
            window.stageStatsNew.setXP(this.totalXP);
        }
        
        // Update accuracy display manually
        this.updateAccuracyDisplay();
    }
    
    async loadGameData() {
        try {
            const response = await fetch('/game/api/stage4/data');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            this.gameData = await response.json();
            console.log('Stage 4 data loaded:', this.gameData);
            
            // Randomize the data after loading
            this.randomizeGameData();
        } catch (error) {
            console.error('Error loading Stage 4 data:', error);
            throw error;
        }
    }

    // Randomize both question order and reference positions like Stage 3
    randomizeGameData() {
        // First shuffle the order of questions
        this.shuffleArray(this.gameData);
        
        // Then randomize the position of reference sources within each question
        this.gameData.forEach(question => {
            if (question.references && Array.isArray(question.references)) {
                this.shuffleArray(question.references);
            }
        });
    }

    // Fisher-Yates shuffle algorithm to randomize array order
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
    setupEventListeners() {
        // Start game button
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startGame());
        }
        
        // Verification buttons
        const verificationBtns = document.querySelectorAll('.verification-btn');
        verificationBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const verification = btn.dataset.choice;
                this.handleVerificationSelect(verification);
            });
        });
        
        // Hint button
        const hintBtn = document.getElementById('hint-button');
        if (hintBtn) {
            hintBtn.addEventListener('click', () => this.showHint());
        }
        
        // Submit button
        const submitBtn = document.getElementById('submit-button');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitAnswer());
        }
        
        // Navigation buttons - using event delegation since they may not exist initially
        document.addEventListener('click', (e) => {
            if (e.target.id === 'next-round-btn') {
                this.nextRound();
            } else if (e.target.id === 'play-again-btn') {
                this.resetGame();
            } else if (e.target.id === 'back-to-game-btn') {
                window.location.href = '/game';
            }
        });
    }
    
    showInstructions() {
        this.showScreen('instructions');
    }
    
    startGame() {
        console.log('Starting Stage 4 game');
        this.gameStartTime = Date.now();
        this.currentRound = 0;
        this.totalXP = 0;
        this.gameActive = true;
        
        // Reset ALL local counters to zero - matching Stage 3
        this.correctAnswers = 0;
        this.totalAnswers = 0;
        this.answers = [];
        
        // Reset stats
        this.stats = {
            correct: 0,
            incorrect: 0,
            timeouts: 0,
            speedBonuses: 0,
            lightningBonuses: 0,
            hintsUsed: 0,
            totalResponseTime: 0
        };
        
        // Initialize stats display
        this.updateGameStats();
        
        this.showScreen('game');
        this.nextRound();
    }
    
    nextRound() {
        if (this.currentRound >= this.totalRounds) {
            this.endGame();
            return;
        }
        
        this.currentRound++;
        this.selectedVerification = null;
        this.hintUsed = false;
        this.roundActive = true;
        this.roundStartTime = Date.now();
        this.currentTime = this.maxRoundTime;
        
        // Update total rounds based on loaded data
        if (this.gameData && this.gameData.length) {
            this.totalRounds = Math.min(this.gameData.length, 10);
        }
        
        console.log(`Starting round ${this.currentRound}/${this.totalRounds}`);
        
        this.loadCurrentRound();
        this.startTimer();
        this.hideHint();
        this.updateUI();
        this.updateGameStats(); // Add stats update
        
        // Switch to game screen for the new round
        this.showScreen('game');
    }
    
    loadCurrentRound() {
        if (!this.gameData || !Array.isArray(this.gameData) || this.currentRound > this.gameData.length) {
            console.error('Invalid round data');
            return;
        }
        
        const roundData = this.gameData[this.currentRound - 1];
        console.log('Loading round data:', roundData);
        
        // Update claim display
        this.updateClaimDisplay(roundData);
        
        // Update reference sources
        this.updateReferenceSources(roundData.references);
        
        // Reset verification selection
        this.clearVerificationSelection();
        
        // Enable interactions
        this.enableVerificationButtons();
        
        // Reset submit button
        this.updateSubmitButton();
    }
    
    updateClaimDisplay(roundData) {
        // Update claim text
        const claimText = document.getElementById('claim-text');
        if (claimText) {
            claimText.textContent = roundData.claim_text;
        }
        
        // Update claim metadata
        const claimMetadata = document.getElementById('claim-metadata');
        if (claimMetadata && roundData.claim_metadata) {
            // Update metadata display
            claimMetadata.innerHTML = `
                <span><i class="bi bi-tag"></i> ${roundData.claim_metadata.topic || 'Unknown Topic'}</span>
                <span><i class="bi bi-calendar"></i> ${roundData.claim_metadata.date_hint || 'Unknown Date'}</span>
            `;
        }
    }
    
    updateReferenceSources(sources) {
        const referencesGrid = document.querySelector('.references-grid');
        if (!referencesGrid || !sources) return;
        
        referencesGrid.innerHTML = '';
        
        sources.forEach((source, index) => {
            const referenceCard = document.createElement('div');
            referenceCard.className = 'reference-card results-card';
            referenceCard.innerHTML = `
                <div class="reference-header">
                    <div class="reference-source">${source.source}</div>
                    <div class="reference-date">${source.publish_date}</div>
                </div>
                <h5 class="reference-title">${source.title}</h5>
                <p class="reference-snippet">${source.snippet}</p>
                <a href="${source.url}" target="_blank" class="reference-url">
                    <i class="bi bi-box-arrow-up-right"></i>
                    View Source
                </a>
            `;
            referencesGrid.appendChild(referenceCard);
        });
    }
    
    handleVerificationSelect(verification) {
        if (!this.roundActive) return;
        
        console.log('Verification selected:', verification);
        this.selectedVerification = verification;
        this.updateVerificationSelection();
        
        // Enable submit button but don't auto-submit
        this.updateSubmitButton();
    }
    
    updateVerificationSelection() {
        const verificationBtns = document.querySelectorAll('.verification-btn');
        verificationBtns.forEach(btn => {
            btn.classList.remove('selected');
            if (btn.dataset.choice === this.selectedVerification) {
                btn.classList.add('selected');
            }
        });
    }
    
    updateSubmitButton() {
        const submitBtn = document.getElementById('submit-button');
        if (submitBtn) {
            submitBtn.disabled = this.selectedVerification === null;
        }
    }
    
    clearVerificationSelection() {
        const verificationBtns = document.querySelectorAll('.verification-btn');
        verificationBtns.forEach(btn => {
            btn.classList.remove('selected');
        });
    }
    
    enableVerificationButtons() {
        const verificationBtns = document.querySelectorAll('.verification-btn');
        verificationBtns.forEach(btn => {
            btn.style.pointerEvents = 'auto';
            btn.style.opacity = '1';
        });
    }
    
    disableVerificationButtons() {
        const verificationBtns = document.querySelectorAll('.verification-btn');
        verificationBtns.forEach(btn => {
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.6';
        });
        
        // Also disable submit button
        const submitBtn = document.getElementById('submit-button');
        if (submitBtn) {
            submitBtn.disabled = true;
        }
    }
    
    submitAnswer() {
        if (!this.roundActive) return;
        
        this.roundActive = false;
        this.stopTimer();
        this.disableVerificationButtons();
        
        const responseTime = (Date.now() - this.roundStartTime) / 1000;
        const roundData = this.gameData[this.currentRound - 1];
        
        // Check if it's a timeout (no selection made)
        const isTimeout = this.selectedVerification === null;
        
        console.log('Submitting answer:', {
            selected: this.selectedVerification,
            correct: roundData.correct_answer,
            responseTime: responseTime,
            isTimeout: isTimeout
        });
        
        // Check if answer is correct (only if not timeout)
        const isCorrect = !isTimeout && this.selectedVerification === roundData.correct_answer;
        
        // Calculate XP
        const xpData = this.calculateXP(isCorrect, isTimeout, responseTime);
        this.totalXP += xpData.totalXP;
        
        // Update statistics
        this.updateStats(isCorrect, isTimeout, responseTime, xpData);
        
        // Show feedback
        this.showFeedback(isCorrect, isTimeout, xpData, responseTime, roundData);
    }
    
    calculateXP(isCorrect, isTimeout, responseTime) {
        const xpData = {
            baseXP: 0,
            speedBonus: 0,
            lightningBonus: 0,
            attemptBonus: 0,
            timeoutBonus: 0,
            totalXP: 0,
            bonuses: []
        };
        
        if (isCorrect) {
            // Base XP for correct answer
            xpData.baseXP = 40;
            xpData.bonuses.push('Correct Answer: +40 XP');
            
            // Speed bonuses (always applied, like Stage 3 - separate conditions, not if-else)
            if (responseTime < 16) { // Speed bonus (under 16 seconds)
                xpData.speedBonus = 15;
                xpData.bonuses.push('Speed Bonus (<16s): +15 XP');
            }
            
            if (responseTime < 8) { // Lightning bonus (under 8 seconds)
                xpData.lightningBonus = 25;
                xpData.bonuses.push('Lightning Bonus (<8s): +25 XP');
            }
            
            // Calculate total before applying limits
            xpData.totalXP = xpData.baseXP + xpData.speedBonus + xpData.lightningBonus;
            
            // Apply maximum XP limit based on hint usage (like Stage 3)
            const maxXP = this.hintUsed ? 70 : 80;
            xpData.totalXP = Math.min(xpData.totalXP, maxXP);
            
            // Add hint usage message if hint was used
            if (this.hintUsed) {
                xpData.bonuses.push('Hint Used: Maximum reduced to 70 XP');
            }
        } else if (isTimeout) {
            // Timeout - give 5 XP
            xpData.timeoutBonus = 5;
            xpData.bonuses.push('Timeout: +5 XP');
            xpData.totalXP = 5;
        } else {
            // Incorrect answer - give 5 XP
            xpData.attemptBonus = 5;
            xpData.bonuses.push('Attempt: +5 XP');
            xpData.totalXP = 5;
        }
        
        return xpData;
    }
    
    updateStats(isCorrect, isTimeout, responseTime, xpData) {
        // Track stats like Stage 3
        this.totalAnswers++;
        const actuallyCorrect = isCorrect && !isTimeout;
        if (actuallyCorrect) {
            this.correctAnswers++;
        }
        
        // Store detailed answer
        this.answers.push({
            round: this.currentRound,
            selected: this.selectedVerification,
            correct: this.gameData[this.currentRound - 1].correct_answer,
            isCorrect: actuallyCorrect,
            isTimeout: isTimeout,
            timeUsed: responseTime,
            hintsUsed: this.hintUsed ? 1 : 0,
            xp: xpData.totalXP
        });
        
        // Update detailed stats
        if (isTimeout) {
            this.stats.timeouts++;
        } else if (isCorrect) {
            this.stats.correct++;
            this.stats.totalResponseTime += responseTime;
            
            if (xpData.speedBonus > 0) this.stats.speedBonuses++;
            if (xpData.lightningBonus > 0) this.stats.lightningBonuses++;
        } else {
            this.stats.incorrect++;
            this.stats.totalResponseTime += responseTime;
        }
        
        if (this.hintUsed) {
            this.stats.hintsUsed++;
        }
        
        // Update display-only stats component
        if (window.stageStatsNew) {
            window.stageStatsNew.setRound(this.currentRound, this.totalRounds);
            window.stageStatsNew.setXP(this.totalXP);
            window.stageStatsNew.showXPGain(xpData.totalXP);
        }
        
        // Update accuracy display manually
        this.updateAccuracyDisplay();
    }
    
    showFeedback(isCorrect, isTimeout, xpData, responseTime, roundData) {
        // Update feedback header
        const feedbackHeader = document.querySelector('.feedback-header h3');
        const feedbackContainer = document.querySelector('.feedback-container');
        
        if (isTimeout) {
            if (feedbackHeader) feedbackHeader.textContent = 'Time\'s Up!';
            if (feedbackContainer) {
                feedbackContainer.className = 'results-card feedback-container timeout';
            }
        } else if (isCorrect) {
            if (feedbackHeader) feedbackHeader.textContent = 'Correct!';
            if (feedbackContainer) {
                feedbackContainer.className = 'results-card feedback-container correct';
            }
        } else {
            if (feedbackHeader) feedbackHeader.textContent = 'Incorrect';
            if (feedbackContainer) {
                feedbackContainer.className = 'results-card feedback-container incorrect';
            }
        }
        
        // Update XP display
        const xpBadge = document.querySelector('.xp-badge');
        if (xpBadge) {
            xpBadge.textContent = `+${xpData.totalXP} XP`;
        }
        
        // Update XP breakdown
        const xpBreakdown = document.querySelector('.xp-breakdown');
        if (xpBreakdown && xpData.bonuses.length > 0) {
            xpBreakdown.innerHTML = xpData.bonuses.map(bonus => 
                `<div class="bonus-item">${bonus}</div>`
            ).join('');
            xpBreakdown.style.display = 'block';
        } else if (xpBreakdown) {
            xpBreakdown.style.display = 'none';
        }
        
        // Update response time
        const responseTimeEl = document.querySelector('.time-value');
        if (responseTimeEl) {
            if (isTimeout) {
                responseTimeEl.textContent = '60 seconds';
            } else {
                responseTimeEl.textContent = `${responseTime.toFixed(1)} seconds`;
            }
        }
        
        const responseTimeContainer = document.querySelector('.response-time');
        if (responseTimeContainer) {
            responseTimeContainer.style.display = 'flex'; // Always show response time
        }
        
        // Update feedback content based on correct answer
        const verifiedFeedback = document.getElementById('verified-feedback');
        const falseFeedback = document.getElementById('false-feedback');
        const verifiedExplanation = document.getElementById('verified-explanation');
        const falseExplanation = document.getElementById('false-explanation');
        
        // Display the claim being verified
        const claimTextFeedback = document.getElementById('claim-text-feedback');
        if (claimTextFeedback) {
            claimTextFeedback.textContent = `"${roundData.claim_text}"`;
        }
        
        // Display source analysis
        const sourceAnalysisContent = document.getElementById('source-analysis-content');
        if (sourceAnalysisContent && roundData.references) {
            let analysisHTML = '';
            roundData.references.forEach(ref => {
                const verdictClass = ref.verdict === 'supports' ? 'supports' : 'refutes';
                const verdictText = ref.verdict === 'supports' ? 'SUPPORTS the claim' : 'REFUTES the claim';
                analysisHTML += `
                    <div class="source-item ${verdictClass}">
                        <div class="source-name">${ref.source}</div>
                        <div class="source-verdict ${verdictClass}">${verdictText}</div>
                        <div class="source-snippet">"${ref.snippet}"</div>
                    </div>
                `;
            });
            sourceAnalysisContent.innerHTML = analysisHTML;
        }
        
        // Update learning point
        const learningText = document.getElementById('learning-text');
        if (learningText && roundData.lesson) {
            learningText.textContent = roundData.lesson;
        }
        
        // Update continue button text
        const nextRoundBtn = document.getElementById('next-round-btn');
        if (nextRoundBtn) {
            const isLastRound = this.currentRound >= this.totalRounds;
            nextRoundBtn.textContent = isLastRound ? 'View Results' : 'Continue';
        }
        
        this.showScreen('feedback');
    }
    
    showHint() {
        if (!this.roundActive || this.hintUsed) return;
        
        this.hintUsed = true;
        console.log('Hint used for round', this.currentRound);
        
        const roundData = this.gameData[this.currentRound - 1];
        const hintContainer = document.querySelector('.hint-container');
        const hintText = document.getElementById('hint-text');
        
        if (hintContainer && hintText && roundData.lesson) {
            hintText.textContent = roundData.lesson;
            hintText.style.display = 'block';
            hintContainer.style.display = 'block';
        }
        
        // Disable hint button
        const hintBtn = document.getElementById('hint-button');
        if (hintBtn) {
            hintBtn.disabled = true;
            const hintSpan = hintBtn.querySelector('.hint-text');
            if (hintSpan) {
                hintSpan.textContent = 'Hint Used';
            }
        }
    }
    
    hideHint() {
        const hintContainer = document.querySelector('.hint-container');
        const hintText = document.getElementById('hint-text');
        if (hintContainer) {
            hintContainer.style.display = 'none';
        }
        if (hintText) {
            hintText.style.display = 'none';
        }
        
        // Reset hint button
        const hintBtn = document.getElementById('hint-button');
        if (hintBtn) {
            hintBtn.disabled = false;
            const hintSpan = hintBtn.querySelector('.hint-text');
            if (hintSpan) {
                hintSpan.textContent = 'Hint';
            }
        }
    }
    
    startTimer() {
        this.currentTime = this.maxRoundTime;
        this.updateTimerDisplay();
        
        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 1000);
    }
    
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }
    
    updateTimer() {
        this.currentTime--;
        this.updateTimerDisplay();
        
        if (this.currentTime <= 0) {
            this.handleTimeout();
        }
    }
    
    updateTimerDisplay() {
        const timerEl = document.querySelector('.timer');
        if (!timerEl) return;
        
        timerEl.textContent = this.currentTime;
        
        // Update timer styling based on remaining time
        timerEl.className = 'timer';
        if (this.currentTime <= 10) {
            timerEl.classList.add('danger');
        } else if (this.currentTime <= 20) {
            timerEl.classList.add('warning');
        }
    }
    
    handleTimeout() {
        console.log('Round timed out');
        this.stopTimer();
        
        if (this.selectedVerification !== null) {
            // User made a selection before timeout - submit their answer
            this.submitAnswer();
        } else {
            // No selection made - submit as timeout
            this.selectedVerification = null;
            this.submitAnswer();
        }
    }
    
    updateUI() {
        // Update round counter
        const currentRoundEl = document.querySelector('.current-round');
        if (currentRoundEl) {
            currentRoundEl.textContent = this.currentRound;
        }
        
        const totalRoundsEl = document.querySelector('.total-rounds');
        if (totalRoundsEl) {
            totalRoundsEl.textContent = this.totalRounds;
        }
        
        // Update progress in various places
        this.updateProgressDisplays();
    }
    
    updateProgressDisplays() {
        // Update any progress bars or indicators
        const progressEls = document.querySelectorAll('[data-progress]');
        progressEls.forEach(el => {
            const progress = (this.currentRound / this.totalRounds) * 100;
            if (el.style) {
                el.style.width = `${progress}%`;
            }
        });
    }
    
    endGame() {
        console.log('Game completed');
        this.gameActive = false;
        this.showComplete();
        
        // NOTE: Game stats are submitted via /game/api/complete-game in showComplete()
        // Removed duplicate submitGameStats() call that was causing double counting
    }
    
    showComplete() {
        // Calculate final statistics
        const totalTime = (Date.now() - this.gameStartTime) / 1000;
        const averageTime = this.stats.totalResponseTime / Math.max(this.stats.correct + this.stats.incorrect, 1);
        const accuracy = ((this.stats.correct / this.totalRounds) * 100).toFixed(1);
        
        // Update completion statistics
        const statsElements = {
            'final-xp': this.totalXP,
            'final-total': this.totalRounds,
            'final-correct': this.stats.correct,
            'final-accuracy': `${accuracy}%`
        };
        
        Object.entries(statsElements).forEach(([className, value]) => {
            const element = document.querySelector(`.${className}`);
            if (element) {
                element.textContent = value;
            }
        });
        
        this.showScreen('complete');
        
        // Save game results to database
        this.saveGameResults();
        
        // Add replay button event listener
        const replayBtn = document.getElementById('replay-btn');
        if (replayBtn) {
            replayBtn.addEventListener('click', () => {
                this.resetGame();
            });
        }
    }
    
    async saveGameResults() {
        // Save completed game results to database
        try {
            const gameData = {
                stage: 4,
                total_xp: this.totalXP,
                correct_answers: this.stats.correct,
                total_rounds: this.totalRounds,
                accuracy: Math.round((this.stats.correct / this.totalRounds) * 100)
            };
            
            const response = await fetch('/game/api/complete-game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(gameData)
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log('Game results saved successfully:', result);
                    if (result.stats) {
                        console.log('Updated user stats:', result.stats);
                    }
                } else {
                    console.error('Error saving game results:', result.error);
                }
            } else {
                console.error('Failed to save game results. Status:', response.status);
            }
        } catch (error) {
            console.error('Error saving game results:', error);
        }
    }

    // REMOVED: submitGameStats() method - was causing duplicate game counting
    // Only using /game/api/complete-game endpoint now for proper stats tracking
    
    resetGame() {
        console.log('Resetting game');
        this.stopTimer();
        this.currentRound = 0;
        this.totalXP = 0;
        this.gameActive = false;
        this.roundActive = false;
        this.selectedVerification = null;
        this.hintUsed = false;
        
        // Reset UI
        this.hideHint();
        this.clearVerificationSelection();
        this.showInstructions();
    }
    
    showScreen(screenName) {
        console.log('Showing screen:', screenName);
        
        const screens = ['instructions', 'game', 'feedback', 'complete'];
        screens.forEach(screen => {
            const element = document.querySelector(`.${screen}-screen`);
            if (element) {
                element.style.display = screen === screenName ? 'block' : 'none';
            }
        });
    }
    
    showError(message) {
        console.error('Game error:', message);
        
        // Create or update error display
        let errorDiv = document.getElementById('gameError');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'gameError';
            errorDiv.className = 'alert alert-danger';
            errorDiv.style.margin = '1rem';
            document.querySelector('.stage-content-container').prepend(errorDiv);
        }
        
        errorDiv.innerHTML = `
            <h5>Game Error</h5>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="location.reload()">Reload Page</button>
        `;
        errorDiv.style.display = 'block';
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Stage 4');
    new Stage4Game();
});
