/**
 * Stage 5: Full Article Analysis Game
 */

class Stage5Game {
    constructor() {
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
        this.maxRoundTime = 90; // 90 seconds per round
        this.currentTime = this.maxRoundTime;
        this.timerInterval = null;
        
        // Statistics
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
            this.setupEventListeners();
            this.initializeStats();
            this.showInstructions();
        } catch (error) {
            console.error('Failed to initialize Stage 5:', error);
            this.showError('Failed to load game data. Please refresh the page.');
        }
    }
    
    initializeStats() {
        // Reset ALL local counters to zero
        this.correctAnswers = 0;
        this.totalAnswers = 0;
        this.totalXP = 0;
        this.currentRound = 0;
        
        // Initialize display-only stats component - only if game data is loaded
        if (window.stageStatsNew && this.totalRounds) {
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
            const response = await fetch('/game/api/stage5/data');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            this.gameData = await response.json();
            this.totalRounds = this.gameData.length;
            
            // Randomize the data
            this.randomizeGameData();
            
        } catch (error) {
            console.error('Error loading Stage 5 data:', error);
            throw error;
        }
    }

    // Randomize question order
    randomizeGameData() {
        this.shuffleArray(this.gameData);
    }

    // Fisher-Yates shuffle algorithm
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
                const choice = btn.getAttribute('data-choice');
                this.handleVerificationSelect(choice);
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
        
        // Navigation buttons - using event delegation
        document.addEventListener('click', (e) => {
            if (e.target.id === 'next-round-btn') {
                this.nextRound();
            }
        });
    }
    
    showInstructions() {
        this.showScreen('instructions');
    }
    
    startGame() {
        console.log('Starting Stage 5 game');
        
        // Check if game data is loaded
        if (!this.gameData || !Array.isArray(this.gameData) || this.gameData.length === 0) {
            console.error('Cannot start game: game data not loaded');
            this.showError('Game data not loaded. Please refresh the page.');
            return;
        }
        
        this.gameStartTime = Date.now();
        this.currentRound = 0;
        this.totalXP = 0;
        this.gameActive = true;
        
        // Reset ALL local counters to zero
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
        
        // Check if game data is available
        if (!this.gameData || !Array.isArray(this.gameData)) {
            console.error('Cannot proceed: game data not available');
            this.showError('Game data not available. Please refresh the page.');
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
            this.totalRounds = this.gameData.length;
        }
        
        console.log(`Starting round ${this.currentRound}/${this.totalRounds}`);
        
        this.loadCurrentRound();
        this.startTimer();
        this.hideHint();
        this.updateUI();
        this.updateGameStats();
        
        // Switch to game screen for the new round
        this.showScreen('game');
    }
    
    loadCurrentRound() {
        if (!this.gameData || !Array.isArray(this.gameData) || this.currentRound > this.gameData.length) {
            console.error('Invalid game data or round number', {
                gameData: this.gameData,
                currentRound: this.currentRound,
                totalRounds: this.totalRounds
            });
            this.showError('Invalid game data. Please refresh the page.');
            return;
        }
        
        const roundData = this.gameData[this.currentRound - 1];
        if (!roundData) {
            console.error('Round data not found for round:', this.currentRound);
            this.showError('Round data not found. Please refresh the page.');
            return;
        }
        
        console.log('Loading round data:', roundData);
        
        // Update article display
        this.updateArticleDisplay(roundData);
        
        // Reset verification selection
        this.clearVerificationSelection();
        
        // Enable interactions
        this.enableVerificationButtons();
        
        // Reset submit button
        this.updateSubmitButton();
    }
    
    updateArticleDisplay(roundData) {
        // Update URL
        const urlEl = document.getElementById('article-url');
        if (urlEl) {
            urlEl.textContent = roundData.url;
        }
        
        // Update headline
        const headlineEl = document.getElementById('article-headline');
        if (headlineEl) {
            headlineEl.textContent = roundData.headline;
        }
        
        // Update source
        const sourceEl = document.getElementById('article-source');
        if (sourceEl) {
            sourceEl.textContent = roundData.source;
        }
        
        // Update date
        const dateEl = document.getElementById('article-date');
        if (dateEl) {
            dateEl.textContent = roundData.date;
        }
        
        // Update content
        const contentEl = document.getElementById('article-content');
        if (contentEl && roundData.content) {
            contentEl.innerHTML = '';
            roundData.content.forEach(paragraph => {
                const p = document.createElement('p');
                p.textContent = paragraph;
                contentEl.appendChild(p);
            });
        }
    }
    
    handleVerificationSelect(verification) {
        if (!this.roundActive) return;
        
        console.log('Verification selected:', verification);
        this.selectedVerification = verification;
        this.updateVerificationSelection();
        
        // Enable submit button
        this.updateSubmitButton();
    }
    
    updateVerificationSelection() {
        const verificationBtns = document.querySelectorAll('.verification-btn');
        verificationBtns.forEach(btn => {
            const choice = btn.getAttribute('data-choice');
            if (choice === this.selectedVerification) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }
    
    updateSubmitButton() {
        const submitBtn = document.getElementById('submit-button');
        if (submitBtn) {
            submitBtn.disabled = !this.selectedVerification;
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
            btn.disabled = false;
        });
    }
    
    disableVerificationButtons() {
        const verificationBtns = document.querySelectorAll('.verification-btn');
        verificationBtns.forEach(btn => {
            btn.disabled = true;
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
        const isCorrect = !isTimeout && this.selectedVerification === roundData.verdict;
        
        // Calculate XP
        const xpData = this.calculateXP(isCorrect, isTimeout, responseTime);
        
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
            xpData.baseXP = 60;
            xpData.bonuses.push('Correct Answer: +60 XP');
            
            // Speed bonuses (always applied, like Stage 4 - separate conditions, not if-else)
            if (responseTime < 30) { // Speed bonus (under 30 seconds)
                xpData.speedBonus = 15;
                xpData.bonuses.push('Speed Bonus (<30s): +15 XP');
            }
            
            if (responseTime < 15) { // Lightning bonus (under 15 seconds)
                xpData.lightningBonus = 25;
                xpData.bonuses.push('Lightning Bonus (<15s): +25 XP');
            }
            
            // Calculate total before applying limits
            xpData.totalXP = xpData.baseXP + xpData.speedBonus + xpData.lightningBonus;
            
            // Apply maximum XP limit based on hint usage (like Stage 4)
            const maxXP = this.hintUsed ? 85 : 100;
            xpData.totalXP = Math.min(xpData.totalXP, maxXP);
            
            // Add hint usage message if hint was used
            if (this.hintUsed) {
                xpData.bonuses.push('Hint Used: Maximum reduced to 85 XP');
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
        this.totalAnswers++;
        
        if (isTimeout) {
            this.stats.timeouts++;
        } else if (isCorrect) {
            this.correctAnswers++;
            this.stats.correct++;
            if (xpData.speedBonus > 0) this.stats.speedBonuses++;
            if (xpData.lightningBonus > 0) this.stats.lightningBonuses++;
        } else {
            this.stats.incorrect++;
        }
        
        if (this.hintUsed) {
            this.stats.hintsUsed++;
        }
        
        this.stats.totalResponseTime += responseTime;
        this.totalXP += xpData.totalXP;
        
        // Record the answer
        this.answers.push({
            round: this.currentRound,
            correct: isCorrect,
            timeout: isTimeout,
            responseTime: responseTime,
            xp: xpData.totalXP
        });
        
        // Update display
        this.updateGameStats();
        
        // Show XP gain popup if game has the method
        if (window.stageStatsNew && window.stageStatsNew.showXPGain && xpData.totalXP > 0) {
            window.stageStatsNew.showXPGain(xpData.totalXP);
        }
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
                responseTimeEl.textContent = '90 seconds';
            } else {
                responseTimeEl.textContent = `${responseTime.toFixed(1)} seconds`;
            }
        }
        
        const responseTimeContainer = document.querySelector('.response-time');
        if (responseTimeContainer) {
            responseTimeContainer.style.display = 'flex'; // Always show response time
        }
        
        // Update article summary
        const articleSummary = document.getElementById('article-summary');
        if (articleSummary) {
            // Format content with paragraphs - handle both string and array content
            let formattedContent = '';
            if (roundData.content) {
                if (typeof roundData.content === 'string') {
                    formattedContent = roundData.content
                        .split('\n\n')
                        .map(paragraph => paragraph.trim())
                        .filter(paragraph => paragraph.length > 0)
                        .map(paragraph => `<p>${paragraph}</p>`)
                        .join('');
                } else if (Array.isArray(roundData.content)) {
                    formattedContent = roundData.content
                        .map(paragraph => `<p>${paragraph}</p>`)
                        .join('');
                } else {
                    formattedContent = `<p>${roundData.content}</p>`;
                }
            }
            
            articleSummary.innerHTML = `
                <div class="article-field">
                    <div class="field-label">URL:</div>
                    <div class="field-content url-content">${roundData.url}</div>
                </div>
                <div class="article-field">
                    <div class="field-label">HEADLINE:</div>
                    <div class="field-content headline-content">${roundData.headline}</div>
                </div>
                <div class="article-field">
                    <div class="field-label">SOURCE:</div>
                    <div class="field-content source-content">${roundData.source}</div>
                </div>
                <div class="article-field">
                    <div class="field-label">DATE:</div>
                    <div class="field-content date-content">${roundData.date}</div>
                </div>
                <div class="article-field">
                    <div class="field-label">CONTENT:</div>
                    <div class="field-content content-text">${formattedContent}</div>
                </div>
            `;
        }
        
        // Update analysis result
        const analysisResultContent = document.getElementById('source-analysis-content');
        if (analysisResultContent) {
            const verdictClass = roundData.verdict === 'REAL' ? 'supports' : 'refutes';
            const verdictText = roundData.verdict === 'REAL' ? 'SUPPORTS authenticity' : 'REFUTES authenticity';
            analysisResultContent.innerHTML = `
                <div class="source-item ${verdictClass}">
                    <div class="source-name">Analysis Result</div>
                    <div class="source-verdict ${verdictClass}">${verdictText}</div>
                    <div class="source-snippet">${roundData.reason_lesson}</div>
                </div>
            `;
        }
        
        // Update learning point
        const learningText = document.getElementById('learning-text');
        if (learningText) {
            learningText.textContent = roundData.hint;
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
        const roundData = this.gameData[this.currentRound - 1];
        
        const hintText = document.getElementById('hint-text');
        const hintContainer = document.querySelector('.hint-container');
        
        if (hintText && hintContainer && roundData.hint) {
            hintText.textContent = roundData.hint;
            hintText.style.display = 'block';
        }
        
        // Disable hint button
        const hintBtn = document.getElementById('hint-button');
        if (hintBtn) {
            hintBtn.disabled = true;
            hintBtn.innerHTML = '<span class="hint-text">Hint Used</span>';
        }
    }
    
    hideHint() {
        const hintText = document.getElementById('hint-text');
        if (hintText) {
            hintText.style.display = 'none';
        }
        
        // Re-enable hint button
        const hintBtn = document.getElementById('hint-button');
        if (hintBtn) {
            hintBtn.disabled = false;
            hintBtn.innerHTML = '<span class="hint-text">Hint</span>';
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
        if (this.currentTime <= 15) {
            timerEl.classList.add('danger');
        } else if (this.currentTime <= 30) {
            timerEl.classList.add('warning');
        }
    }
    
    handleTimeout() {
        if (!this.roundActive) return;
        
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
        // Update round display
        this.updateProgressDisplays();
    }
    
    updateProgressDisplays() {
        // Update round indicators
        const currentRoundEls = document.querySelectorAll('.current-round');
        currentRoundEls.forEach(el => {
            el.textContent = this.currentRound;
        });
        
        const totalRoundsEls = document.querySelectorAll('.total-rounds');
        totalRoundsEls.forEach(el => {
            el.textContent = this.totalRounds;
        });
    }
    
    endGame() {
        this.gameActive = false;
        this.showComplete();
        this.submitGameStats();
    }
    
    showComplete() {
        // Update final stats
        const finalXPEl = document.querySelector('.final-xp');
        if (finalXPEl) {
            finalXPEl.textContent = this.totalXP;
        }
        
        const finalAccuracyEl = document.querySelector('.final-accuracy');
        if (finalAccuracyEl) {
            const accuracy = Math.round((this.correctAnswers / this.totalAnswers) * 100);
            finalAccuracyEl.textContent = `${accuracy}%`;
        }
        
        const finalCorrectEl = document.querySelector('.final-correct');
        if (finalCorrectEl) {
            finalCorrectEl.textContent = this.correctAnswers;
        }
        
        const finalTotalEl = document.querySelector('.final-total');
        if (finalTotalEl) {
            finalTotalEl.textContent = this.totalRounds;
        }
        
        this.showScreen('complete');
        
        // Save game results to database
        this.submitGameStats();
        
        // Add replay button event listener
        const replayBtn = document.getElementById('replay-btn');
        if (replayBtn) {
            replayBtn.addEventListener('click', () => {
                this.resetGame();
            });
        }
    }
    
    async submitGameStats() {
        try {
            const gameData = {
                stage: 5,
                total_xp: this.totalXP,
                correct_answers: this.correctAnswers,
                total_rounds: this.totalRounds,
                accuracy: Math.round((this.correctAnswers / this.totalAnswers) * 100)
            };
            
            console.log('Submitting Stage 5 stats:', gameData);
            
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
                    // Optionally update UI with new stats
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
            console.error('Error submitting game stats:', error);
        }
    }
    
    resetGame() {
        this.currentRound = 0;
        this.totalXP = 0;
        this.correctAnswers = 0;
        this.totalAnswers = 0;
        this.answers = [];
        this.gameActive = false;
        this.roundActive = false;
        this.selectedVerification = null;
        this.hintUsed = false;
        
        this.stopTimer();
        this.initializeStats();
        this.showInstructions();
    }
    
    showScreen(screenName) {
        const screens = ['instructions', 'game', 'feedback', 'complete'];
        screens.forEach(screen => {
            const element = document.getElementById(`${screen}-screen`);
            if (element) {
                element.style.display = screen === screenName ? 'block' : 'none';
            }
        });
    }
    
    showError(message) {
        console.error('Stage 5 Error:', message);
        alert(message); // You might want to show a proper error modal here
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Stage5Game();
});