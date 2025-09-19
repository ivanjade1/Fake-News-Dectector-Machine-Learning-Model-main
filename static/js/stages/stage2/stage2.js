// Stage 2: Source Showdown Game JavaScript
// Time limit: 30 seconds per round
// Speed Bonus: ≤8 seconds (+10 XP)
// Lightning Bonus: ≤4 seconds (+10 XP additional)

class Stage2Game {
    constructor() {
        this.currentRound = 0;
        this.totalRounds = 10; // Default to 10 rounds
        this.timeLimit = 30; // 30 seconds per round
        this.timer = null;
        this.timeRemaining = this.timeLimit;
        this.hintUsed = false;
        this.startTime = null;
        this.totalXP = 0;
        this.correctAnswers = 0;
        this.totalAnswers = 0;
        this.selectedOption = null;
        this.processingAnswer = false;
        this.gameData = null;
        
        this.initializeGame();
    }
    
    async initializeGame() {
        try {
            await this.loadGameData();
            this.initializeStats();
            this.bindEvents();
            this.showInstructions();
        } catch (error) {
            console.error('Failed to initialize game:', error);
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
            window.stageStatsNew.reset();
            window.stageStatsNew.setStageInfo(2, 'Source Showdown');
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
            const response = await fetch('/game/api/stage2/data');
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to load game data');
            }
            
            this.gameData = result.data;
            
            // Generate random rounds from the source pools
            this.generateRandomRounds();
            
            this.totalRounds = this.gameData.rounds.length;
        } catch (error) {
            console.error('Error loading game data:', error);
            throw error;
        }
    }
    
    generateRandomRounds() {
        const reliableSources = [...this.gameData.reliable_sources];
        const unreliableSources = [...this.gameData.unreliable_sources];
        const predefinedRounds = [...this.gameData.rounds];
        
        // Shuffle the predefined rounds for random order
        this.shuffleArray(predefinedRounds);
        
        // Generate rounds using the predefined pairings with specific lessons
        const rounds = [];
        for (let i = 0; i < 10; i++) {
            const roundConfig = predefinedRounds[i % predefinedRounds.length];
            
            // Find the specific sources for this round
            const reliableSource = reliableSources.find(s => s.id === roundConfig.reliable_source_id);
            const unreliableSource = unreliableSources.find(s => s.id === roundConfig.unreliable_source_id);
            
            // Randomly decide which source goes first (0 or 1)
            const reliableFirst = Math.random() < 0.5;
            
            rounds.push({
                choices: reliableFirst ? [reliableSource, unreliableSource] : [unreliableSource, reliableSource],
                answer_index: reliableFirst ? 0 : 1,
                lesson: roundConfig.lesson
            });
        }
        
        this.gameData.rounds = rounds;
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    showError(message) {
        const container = document.querySelector('.stage-content-container');
        if (container) {
            container.innerHTML = `
                <div class="results-card" style="text-align: center; padding: 2rem;">
                    <h2 style="color: #ef4444; margin-bottom: 1rem;">Error</h2>
                    <p style="color: #6b7280; margin-bottom: 1.5rem;">${message}</p>
                    <button class="action-btn action-btn-primary" onclick="location.reload()">
                        Reload Page
                    </button>
                </div>
            `;
        }
    }
    
    bindEvents() {
        // Start game button
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startGame());
        }
        
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
        
        // Source option selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.source-option')) {
                this.selectSource(e.target.closest('.source-option'));
            }
        });
    }
    
    showInstructions() {
        this.hideAllScreens();
        document.getElementById('instructions-screen').style.display = 'block';
    }
    
    startGame() {
        if (!this.gameData) {
            this.showError('Game data not loaded. Please refresh the page.');
            return;
        }
        
        this.currentRound = 0; // Start at 0, will be incremented to 1 in nextRound()
        this.totalXP = 0;
        this.correctAnswers = 0;
        this.totalAnswers = 0;
        this.updateGameStats();
        this.nextRound();
    }
    
    nextRound() {
        this.currentRound++;
        
        if (this.currentRound > this.totalRounds) {
            this.showCompleteScreen();
            return;
        }
        
        this.hideAllScreens();
        this.resetRoundState();
        this.loadRound();
        this.updateGameStats();
        this.startTimer();
        document.getElementById('game-screen').style.display = 'block';
    }
    
    resetRoundState() {
        this.hintUsed = false;
        this.selectedOption = null;
        this.processingAnswer = false;
        this.timeRemaining = this.timeLimit;
        this.startTime = Date.now();
        
        // Reset UI state
        const hintText = document.getElementById('hint-text');
        if (hintText) hintText.style.display = 'none';
        
        const hintBtn = document.getElementById('hint-button');
        if (hintBtn) {
            hintBtn.disabled = false;
            hintBtn.style.opacity = '1';
        }
        
        // Reset submit button like Stage 1
        const submitBtn = document.getElementById('submit-button');
        if (submitBtn) {
            submitBtn.disabled = true;
        }
        
        // Clear source selections
        document.querySelectorAll('.source-option').forEach(option => {
            option.classList.remove('selected');
        });
    }
    
    loadRound() {
        const roundData = this.gameData.rounds[this.currentRound - 1]; // Convert 1-based to 0-based indexing
        
        // Update round info
        const gameTitle = document.getElementById('game-title');
        if (gameTitle) {
            gameTitle.textContent = `Source Comparison ${this.currentRound}`;
        }
        
        // Load source options
        roundData.choices.forEach((choice, index) => {
            this.loadSourceOption(index, choice);
        });
    }
    
    loadSourceOption(index, choice) {
        const urlElement = document.getElementById(`source-url-${index}`);
        const headlineElement = document.getElementById(`source-headline-${index}`);
        const dateElement = document.getElementById(`source-date-${index}`);
        const previewElement = document.getElementById(`source-preview-${index}`);
        
        if (urlElement) urlElement.textContent = choice.URL;
        if (headlineElement) headlineElement.textContent = choice.Headline;
        if (dateElement) {
            dateElement.textContent = window.PhilippineTime.formatDate(choice.Date, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        if (previewElement) previewElement.textContent = choice.Content;
    }
    
    selectSource(sourceElement) {
        if (this.processingAnswer) return;
        
        // Clear previous selections
        document.querySelectorAll('.source-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Mark this source as selected
        sourceElement.classList.add('selected');
        this.selectedOption = parseInt(sourceElement.dataset.option);
        
        // Enable submit button like Stage 1
        this.checkCanSubmit();
    }
    
    checkCanSubmit() {
        const submitButton = document.getElementById('submit-button');
        if (submitButton) {
            // Enable submit when a source is selected
            submitButton.disabled = this.selectedOption === null;
        }
    }
    
    showHint() {
        if (this.hintUsed) return;
        
        this.hintUsed = true;
        const roundData = this.gameData.rounds[this.currentRound - 1]; // Convert 1-based to 0-based indexing
        
        const hintText = document.getElementById('hint-text');
        if (hintText) {
            hintText.textContent = roundData.lesson;
            hintText.style.display = 'block';
        }
        
        const hintBtn = document.getElementById('hint-button');
        if (hintBtn) {
            hintBtn.disabled = true;
            hintBtn.style.opacity = '0.5';
        }
    }
    
    startTimer() {
        this.updateTimerDisplay();
        
        this.timer = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.timeRemaining <= 0) {
                this.timeUp();
            }
        }, 1000);
    }
    
    updateTimerDisplay() {
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = this.timeRemaining;
            
            // Update timer styling based on time remaining
            timerElement.classList.remove('warning', 'danger');
            if (this.timeRemaining <= 5) {
                timerElement.classList.add('danger');
            } else if (this.timeRemaining <= 10) {
                timerElement.classList.add('warning');
            }
        }
    }
    
    timeUp() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        if (!this.processingAnswer) {
            // Auto-submit logic similar to Stage 1's handleTimeout()
            if (this.selectedOption !== null) {
                // User has selected a source, auto-submit their selection
                console.log(`Auto-submitting selected option ${this.selectedOption} due to timeout`);
                // Process as a regular answer (not timeout) since user made some attempt
                this.submitAnswer(false); // Process as regular answer, not timeout
            } else {
                // No selection made, process as true timeout
                console.log('No selection made, submitting timeout');
                this.submitAnswer(true); // Process as true timeout
            }
        }
    }
    
    submitAnswer(timeUp = false) {
        // Validation: Check if a source is selected (unless time is up)
        if (!timeUp && this.selectedOption === null) {
            // Show error message like Stage 1
            const actionContainer = document.querySelector('.action-container');
            let errorMsg = actionContainer.querySelector('.error-message');
            if (!errorMsg) {
                errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                actionContainer.insertBefore(errorMsg, document.getElementById('submit-button'));
            }
            errorMsg.textContent = 'Please select a source before submitting';
            setTimeout(() => errorMsg.remove(), 3000);
            return;
        }
        
        if (this.processingAnswer) return;
        this.processingAnswer = true;
        
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        const roundData = this.gameData.rounds[this.currentRound - 1]; // Convert 1-based to 0-based indexing
        const correctAnswer = roundData.answer_index;
        
        // Handle the case where time is up but no selection was made
        let isCorrect = false;
        if (this.selectedOption !== null) {
            isCorrect = this.selectedOption === correctAnswer;
        }
        // If selectedOption is null (no selection), isCorrect remains false
        
        this.totalAnswers++;
        if (isCorrect) {
            this.correctAnswers++;
        }

        // Calculate XP - exactly matching Stage 1's logic
        let roundXP = 0;
        if (isCorrect) {
            roundXP = 30; // Base correct answer (same as Stage 1)
            
            if (!timeUp) {
                // Only add speed bonuses if not timeout
                const responseTime = (Date.now() - this.startTime) / 1000;
                
                if (responseTime <= 4) {
                    roundXP += 20; // Lightning bonus (10) + Speed bonus (10)
                } else if (responseTime <= 8) {
                    roundXP += 10; // Speed bonus only
                }
            }
            
            // Apply hint penalty if used (same as Stage 1)
            if (this.hintUsed && roundXP > 40) {
                roundXP = 40;
            }
        } else {
            roundXP = 5; // Consolation XP (same as Stage 1)
        }
        
        // Handle true timeout (no attempt made)
        if (timeUp) {
            roundXP = 5; // Timeout XP (same as Stage 1)
        }
        
        roundXP = Math.max(5, roundXP); // Floor at 5 XP minimum (same as Stage 1)

        this.totalXP += roundXP;
        
        // Update display-only stats component
        if (window.stageStatsNew) {
            window.stageStatsNew.setXP(this.totalXP);
            window.stageStatsNew.showXPGain(roundXP);
        }
        
        // Update accuracy display manually
        this.updateAccuracyDisplay();
        
        // Show feedback screen immediately like Stage 1
        this.showFeedbackScreen(isCorrect, roundXP, roundData.lesson, timeUp);
    }
    
    showFeedbackScreen(isCorrect, xpEarned, lesson, timeUp) {
        this.hideAllScreens();
        
        const feedbackScreen = document.getElementById('feedback-screen');
        feedbackScreen.innerHTML = this.generateFeedbackHTML(isCorrect, xpEarned, lesson, timeUp);
        feedbackScreen.style.display = 'block';
        
        // Bind next round button
        const nextBtn = feedbackScreen.querySelector('.next-round-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.nextRound();
            });
        }
    }
    
    generateFeedbackHTML(isCorrect, xpEarned, lesson, timeUp) {
        // Update result text to show correct even if timeout
        let resultText;
        if (timeUp) {
            resultText = isCorrect ? 'Time\'s Up! (Correct Selection)' : 'Time\'s Up!';
        } else {
            resultText = isCorrect ? 'Correct!' : 'Incorrect';
        }
        
        const resultClass = timeUp ? 'timeout' : (isCorrect ? 'correct' : 'incorrect');
        
        const responseTime = ((Date.now() - this.startTime) / 1000).toFixed(1);
        
        // Calculate XP breakdown - exactly matching Stage 1
        let baseXP = 0;
        let speedBonus = 0;
        let lightningBonus = 0;
        let hintPenalty = '';
        let consolationXP = 0;
        let timeoutXP = 0;
        
        if (timeUp) {
            // True timeout (no attempt made)
            timeoutXP = 5;
        } else if (isCorrect) {
            // Correct answer
            baseXP = 30; // Same as Stage 1
            const time = parseFloat(responseTime);
            
            if (time <= 4) {
                speedBonus = 10;
                lightningBonus = 10;
            } else if (time <= 8) {
                speedBonus = 10;
            }
            
            if (this.hintUsed && (baseXP + speedBonus + lightningBonus) > 40) {
                hintPenalty = 'Hint used: Capped at 40 XP';
            }
        } else {
            // Incorrect answer
            consolationXP = 5; // Same as Stage 1
        }
        
        return `
            <div class="results-card feedback-container ${resultClass}">
                <div class="feedback-header">
                    <h3>${resultText}</h3>
                    <div class="xp-badge">+${xpEarned} XP</div>
                </div>
                
                ${!timeUp ? `
                <div class="response-time">
                    <span class="time-label">Answered in:</span>
                    <span class="time-value">${responseTime} seconds</span>
                </div>
                ` : ''}
                
                <div class="xp-breakdown">
                    ${timeoutXP > 0 ? `<div class="bonus-item">Timeout: +${timeoutXP} XP</div>` : ''}
                    ${baseXP > 0 ? `<div class="bonus-item">Correct: +${baseXP} XP</div>` : ''}
                    ${consolationXP > 0 ? `<div class="bonus-item">Attempt: +${consolationXP} XP</div>` : ''}
                    ${speedBonus > 0 ? `<div class="bonus-item">Speed (≤8s): +${speedBonus} XP</div>` : ''}
                    ${lightningBonus > 0 ? `<div class="bonus-item">Lightning (≤4s): +${lightningBonus} XP</div>` : ''}
                    ${hintPenalty ? `<div class="bonus-item">${hintPenalty}</div>` : ''}
                </div>
                
                <div class="feedback-content">
                    <div class="headline-feedback reliable">
                        <div class="feedback-label real-label">RELIABLE source:</div>
                        <p class="headline">${this.getCurrentRoundReliableSource().Headline}</p>
                        <p class="source-url">${this.getCurrentRoundReliableSource().URL}</p>
                        <p class="feedback-reason">${this.getCurrentRoundReliableSource().Content}</p>
                    </div>
                    <div class="headline-feedback unreliable">
                        <div class="feedback-label fake-label">UNRELIABLE source:</div>
                        <p class="headline">${this.getCurrentRoundUnreliableSource().Headline}</p>
                        <p class="source-url">${this.getCurrentRoundUnreliableSource().URL}</p>
                        <p class="feedback-reason">${this.getCurrentRoundUnreliableSource().Content}</p>
                    </div>
                    
                    <div class="feedback-explanation">
                        <h4>Learning Point:</h4>
                        <p>${lesson}</p>
                    </div>
                </div>
                
                <div class="action-container">
                    <button class="action-btn action-btn-primary next-round-btn continue-button">
                        ${this.currentRound >= this.totalRounds ? 'View Results' : 'Continue'}
                    </button>
                </div>
            </div>
        `;
    }
    
    getCurrentRoundReliableSource() {
        const roundData = this.gameData.rounds[this.currentRound - 1];
        const correctIndex = roundData.answer_index;
        return roundData.choices[correctIndex];
    }
    
    getCurrentRoundUnreliableSource() {
        const roundData = this.gameData.rounds[this.currentRound - 1];
        const correctIndex = roundData.answer_index;
        const unreliableIndex = correctIndex === 0 ? 1 : 0;
        return roundData.choices[unreliableIndex];
    }
    
    showCompleteScreen() {
        this.hideAllScreens();
        
        // Ensure stats show final state (10/10, not 11/10)
        if (window.stageStatsNew) {
            window.stageStatsNew.setRound(this.totalRounds, this.totalRounds);
            window.stageStatsNew.setXP(this.totalXP);
        }
        
        // Update accuracy display manually one last time
        this.updateAccuracyDisplay();
        
        // Use ONLY local Stage 2 counters (guaranteed max 10)
        const accuracy = this.totalAnswers === 0 ? 0 : Math.round((this.correctAnswers / this.totalAnswers) * 100);
        
        // Save game results to database
        this.saveGameResults();

        const completeScreen = document.getElementById('complete-screen');
        completeScreen.innerHTML = `
            <div class="results-card stage-complete">
                <div class="results-icon" style="background: linear-gradient(135deg, #10b981, #059669); color: white; margin: 0 auto 1rem;">
                    <i class="bi bi-trophy-fill"></i>
                </div>
                <h2>Stage 2 Complete!</h2>
                <p>Great job on completing the Source Showdown stage!</p>
                
                <div class="stage-stats">
                    <div class="results-card stat">
                        <div class="stat-label">Total XP</div>
                        <div class="stat-value">${this.totalXP}</div>
                    </div>
                    <div class="results-card stat">
                        <div class="stat-label">Accuracy</div>
                        <div class="stat-value">${accuracy}%</div>
                    </div>
                    <div class="results-card stat">
                        <div class="stat-label">Correct</div>
                        <div class="stat-value">${this.correctAnswers}/${this.totalRounds}</div>
                    </div>
                </div>
                
                <div class="stage-actions">
                    <a href="/game/stage3" class="action-btn action-btn-primary next-stage-button">
                        Next Stage
                    </a>
                    <button class="action-btn action-btn-secondary" id="replay-btn">
                        Replay
                    </button>
                </div>
            </div>
        `;
        
        // Add replay button event listener
        const replayBtn = document.getElementById('replay-btn');
        if (replayBtn) {
            replayBtn.addEventListener('click', () => {
                this.resetGame();
            });
        }
        
        completeScreen.style.display = 'block';
    }
    
    resetGame() {
        // Reset all game state
        this.currentRound = 0;
        this.correctAnswers = 0;
        this.totalAnswers = 0;
        this.totalXP = 0;
        this.isGameActive = false;
        this.answers = [];
        
        // Reset stats display
        if (window.stageStatsNew) {
            window.stageStatsNew.reset();
            window.stageStatsNew.setRound(0, this.totalRounds);
            window.stageStatsNew.setXP(0);
        }
        
        // Show instructions screen
        this.hideAllScreens();
        document.getElementById('instructions-screen').style.display = 'block';
    }
    
    async saveGameResults() {
        // Save completed game results to database
        try {
            const gameData = {
                stage: 2,
                total_xp: this.totalXP,
                correct_answers: this.correctAnswers,
                total_rounds: this.totalRounds,
                accuracy: this.totalAnswers === 0 ? 0 : Math.round((this.correctAnswers / this.totalAnswers) * 100)
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

    hideAllScreens() {
        const screens = ['instructions-screen', 'game-screen', 'feedback-screen', 'complete-screen'];
        screens.forEach(screenId => {
            const screen = document.getElementById(screenId);
            if (screen) {
                screen.style.display = 'none';
            }
        });
    }
}

// Initialize the game when the page loads
let stage2Game;
document.addEventListener('DOMContentLoaded', function() {
    // Prevent multiple initializations
    if (stage2Game) {
        console.log('Stage2Game already initialized, skipping...');
        return;
    }
    
    console.log('Initializing Stage2Game...');
    stage2Game = new Stage2Game();
});
