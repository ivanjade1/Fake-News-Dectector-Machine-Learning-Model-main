/**
 * Stage 3: Content Preview Game
 * Based on Stage 2 architecture but with content analysis mechanics
 */

class Stage3Game {
    constructor() {
        // Game state
        this.currentRound = 0; // Start at 0, will be incremented to 1 in nextRound()
        this.totalRounds = 10;
        this.totalXP = 0;
        this.correctAnswers = 0;
        this.totalAnswers = 0;
        this.answers = [];
        
        // Timer state
        this.timer = null;
        this.timeRemaining = 30;
        this.startTime = null;
        this.timeUsed = 0;
        
        // UI state
        this.selectedOption = null;
        this.hintsUsed = 0;
        this.highlightMode = false;
        this.highlightedPhrases = [];
        
        // Suspicious phrases selection
        this.selectedPhrases = [];
        this.maxPhrasesAllowed = 3;
        this.phraseOptions = [];
        
        // Scoring tracking
        this.correctPhrasesCount = 0;
        
        // Game data
        this.gameData = null;
        this.currentRoundData = null;
        
        // Initialize the game
        this.initializeGame();
    }
    
    async initializeGame() {
        try {
            this.initializeElements();
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
            window.stageStatsNew.setStageInfo(3, 'Content Preview');
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
    
    initializeElements() {
        // Elements
        this.elements = {
            instructionsScreen: document.querySelector('.instructions-screen'),
            gameScreen: document.querySelector('.game-screen'),
            feedbackScreen: document.querySelector('.feedback-screen'),
            completeScreen: document.querySelector('.complete-screen'),
            
            // Instructions
            startButton: document.querySelector('.start-game-button'),
            
            // Game elements
            roundDisplay: document.querySelector('.current-round'),
            totalRoundsDisplay: document.querySelector('.total-rounds'),
            timerDisplay: document.querySelector('#timer'),
            hintText: document.querySelector('#hint-text'),
            hintContainer: document.querySelector('.hint-container'),
            headlineDisplay: document.querySelector('#main-headline'),
            contentOptionA: document.querySelector('#content-option-0'),
            contentOptionB: document.querySelector('#content-option-1'),
            submitButton: document.querySelector('#submit-button'),
            highlightModeBtn: document.querySelector('.highlight-mode-btn'),
            hintButton: document.querySelector('#hint-button'),
            
            // Suspicious phrases
            suspiciousPhrasesContainer: document.querySelector('#suspicious-phrases-container'),
            phrasesGrid: document.querySelector('#phrases-grid'),
            phrasesSelected: document.querySelector('#phrases-selected'),
            
            // Feedback - no feedbackContainer needed, we use feedbackScreen directly
            continueButton: document.querySelector('.continue-game'),
            
            // Complete
            finalXP: document.querySelector('.final-xp'),
            finalAccuracy: document.querySelector('.final-accuracy'),
            finalCorrect: document.querySelector('.final-correct'),
            finalTotal: document.querySelector('.final-total')
        };
    }
    
    async loadGameData() {
        try {
            const response = await fetch('/game/api/stage3/data');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            this.gameData = await response.json();
            
            // Randomize both order and answer positions like Stage 2
            this.randomizeGameData();
            
            // Set totalRounds based on actual data length
            this.totalRounds = Math.min(this.gameData.length, 10);
        } catch (error) {
            console.error('Error loading game data:', error);
            throw error;
        }
    }
    
    // Randomize both question order and answer positions like Stage 2
    randomizeGameData() {
        // First shuffle the order of questions
        this.shuffleArray(this.gameData);
        
        // Then randomize the position of choices within each question
        this.gameData.forEach(question => {
            // Randomly decide which choice goes first (0 or 1)
            const correctFirst = Math.random() < 0.5;
            
            if (!correctFirst) {
                // Swap the choices and update the answer index
                const temp = question.Choices[0];
                question.Choices[0] = question.Choices[1];
                question.Choices[1] = temp;
                
                // Update the answer index (0 becomes 1, 1 becomes 0)
                question.Answer_Index = question.Answer_Index === 0 ? 1 : 0;
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
    
    bindEvents() {
        // Start button
        this.elements.startButton?.addEventListener('click', () => this.startGame());
        
        // Content option selection
        this.elements.contentOptionA?.addEventListener('click', () => this.selectOption(0));
        this.elements.contentOptionB?.addEventListener('click', () => this.selectOption(1));
        
        // Submit button
        this.elements.submitButton?.addEventListener('click', () => this.submitAnswer());
        
        // Hint button
        this.elements.hintButton?.addEventListener('click', () => this.showHint());
        
        // Continue button
        this.elements.continueButton?.addEventListener('click', () => this.nextRound());
        
        // Highlight mode toggle
        this.elements.highlightModeBtn?.addEventListener('click', () => this.toggleHighlightMode());
        
        // Complete screen buttons
        // Removed - using simple links instead
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }
    
    handleKeydown(e) {
        if (this.elements.gameScreen.style.display === 'block') {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    this.selectOption(0);
                    break;
                case '2':
                    e.preventDefault();
                    this.selectOption(1);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (this.selectedOption !== null && this.elements.submitButton && !this.elements.submitButton.disabled) {
                        this.submitAnswer();
                    }
                    break;
                case 'h':
                case 'H':
                    e.preventDefault();
                    this.toggleHighlightMode();
                    break;
            }
        }
    }
    
    showInstructions() {
        this.elements.instructionsScreen.style.display = 'block';
        this.elements.gameScreen.style.display = 'none';
        this.elements.feedbackScreen.style.display = 'none';
        this.elements.completeScreen.style.display = 'none';
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
        this.answers = [];
        this.nextRound();
    }
    
    nextRound() {
        this.currentRound++;
        
        // Check if game is complete
        if (this.currentRound > this.totalRounds) {
            this.showComplete();
            return;
        }
        
        // Stop any existing timer first
        this.stopTimer();
        
        // Reset for next round
        this.selectedOption = null;
        this.hintsUsed = 0;
        this.highlightedPhrases = [];
        this.timeUsed = 0;
        this.startTime = null;
        this.correctPhrasesCount = 0;
        
        // Clear any visual feedback
        const contentOptions = document.querySelectorAll('.content-option');
        contentOptions.forEach(option => {
            option.classList.remove('correct', 'incorrect');
        });
        
        const phraseHighlights = document.querySelectorAll('.phrase-highlight');
        phraseHighlights.forEach(highlight => {
            highlight.classList.remove('phrase-highlight');
        });
        
        this.showGameScreen();
        this.loadRound();
        this.updateGameStats();
    }
    
    showGameScreen() {
        this.elements.instructionsScreen.style.display = 'none';
        this.elements.gameScreen.style.display = 'block';
        this.elements.feedbackScreen.style.display = 'none';
        this.elements.completeScreen.style.display = 'none';
    }
    
    loadRound() {
        if (!this.gameData || this.currentRound > this.totalRounds) {
            this.showComplete();
            return;
        }
        
        // Get round data - the JSON is an array of objects
        this.currentRoundData = this.gameData[this.currentRound - 1];
        
        // Update UI
        this.elements.roundDisplay.textContent = this.currentRound;
        this.elements.totalRoundsDisplay.textContent = this.totalRounds;
        this.elements.headlineDisplay.textContent = this.currentRoundData.Headline;
        
        // Set up content options
        this.setupContentOptions();
        
        // Reset state
        this.selectedOption = null;
        this.hintsUsed = 0;
        this.highlightMode = false;
        this.highlightedPhrases = [];
        this.timeUsed = 0;
        
        // Reset suspicious phrases
        this.selectedPhrases = [];
        this.hideSuspiciousPhrases();
        
        // Hide hint initially
        this.elements.hintText.style.display = 'none';
        
        // Reset hint button
        this.elements.hintButton.disabled = false;
        this.elements.hintButton.style.opacity = '1';
        
        // Reset highlight mode
        this.resetHighlightMode();
        
        // Reset submit button
        this.updateSubmitButton();
        
        // Start timer
        this.startTimer();
    }
    
    setupContentOptions() {
        const choices = this.currentRoundData.Choices;
        
        // Set content
        this.elements.contentOptionA.querySelector('.content-text').innerHTML = choices[0].Content;
        this.elements.contentOptionB.querySelector('.content-text').innerHTML = choices[1].Content;
        
        // Reset styles
        this.elements.contentOptionA.className = 'content-option results-card';
        this.elements.contentOptionB.className = 'content-option results-card';
        
        // Make text selectable for highlighting
        this.elements.contentOptionA.querySelector('.content-text').setAttribute('data-option', '0');
        this.elements.contentOptionB.querySelector('.content-text').setAttribute('data-option', '1');
        
        // Add text selection event listeners for highlighting
        this.setupHighlightListeners();
    }
    
    setupHighlightListeners() {
        const contentTextA = this.elements.contentOptionA.querySelector('.content-text');
        const contentTextB = this.elements.contentOptionB.querySelector('.content-text');
        
        [contentTextA, contentTextB].forEach(element => {
            element.addEventListener('mouseup', () => this.handleTextSelection(element));
            element.addEventListener('touchend', () => this.handleTextSelection(element));
        });
    }
    
    handleTextSelection(element) {
        if (!this.highlightMode) return;
        
        const selection = window.getSelection();
        if (selection.rangeCount === 0 || selection.isCollapsed) return;
        
        const selectedText = selection.toString().trim();
        if (selectedText.length < 3) return; // Minimum phrase length
        
        // Create highlight span
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.className = 'highlighted';
        span.textContent = selectedText;
        span.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeHighlight(span, selectedText);
        });
        
        // Replace selection with highlighted span
        try {
            range.deleteContents();
            range.insertNode(span);
            
            // Track highlighted phrase
            const option = element.getAttribute('data-option');
            this.highlightedPhrases.push({
                text: selectedText,
                option: option,
                element: span
            });
            
            selection.removeAllRanges();
        } catch (error) {
            console.error('Error highlighting text:', error);
        }
    }
    
    removeHighlight(span, text) {
        if (!this.highlightMode) return;
        
        // Remove from tracked phrases
        this.highlightedPhrases = this.highlightedPhrases.filter(phrase => phrase.element !== span);
        
        // Replace span with plain text
        const textNode = document.createTextNode(text);
        span.parentNode.replaceChild(textNode, span);
    }
    
    toggleHighlightMode() {
        this.highlightMode = !this.highlightMode;
        
        const btn = this.elements.highlightModeBtn;
        const contentTexts = document.querySelectorAll('.content-text');
        
        if (this.highlightMode) {
            btn.classList.add('active');
            btn.textContent = 'Exit Highlight Mode';
            contentTexts.forEach(el => {
                el.classList.add('highlight-mode');
                el.style.cursor = 'text';
                el.style.userSelect = 'text';
            });
        } else {
            btn.classList.remove('active');
            btn.textContent = 'Highlight Red-Flag Phrases';
            contentTexts.forEach(el => {
                el.classList.remove('highlight-mode');
                el.style.cursor = 'pointer';
                el.style.userSelect = 'none';
            });
        }
    }
    
    resetHighlightMode() {
        this.highlightMode = false;
        const btn = this.elements.highlightModeBtn;
        if (btn) {
            btn.classList.remove('active');
            btn.textContent = 'Highlight Red-Flag Phrases';
        }
        
        const contentTexts = document.querySelectorAll('.content-text');
        contentTexts.forEach(el => {
            el.classList.remove('highlight-mode');
            el.style.cursor = 'pointer';
            el.style.userSelect = 'none';
        });
    }
    
    selectOption(option) {
        if (this.highlightMode) return; // Don't select while highlighting
        
        this.selectedOption = option;
        
        // Update visual state
        this.elements.contentOptionA.classList.toggle('selected', option === 0);
        this.elements.contentOptionB.classList.toggle('selected', option === 1);
        
        // Always show suspicious phrases when any option is selected
        console.log('Selected option:', option);
        this.showSuspiciousPhrases();
        
        this.updateSubmitButton();
    }
    
    updateSubmitButton() {
        let canSubmit = this.selectedOption !== null;
        
        // Phrase selection is now optional - remove the requirement
        // User can submit with just an option selected
        
        this.elements.submitButton.disabled = !canSubmit;
    }
    
    showSuspiciousPhrases() {
        const correctAnswerIndex = this.currentRoundData.Answer_Index;
        // Get the UNSELECTED option's content for phrase generation
        const unselectedOptionIndex = this.selectedOption === 0 ? 1 : 0;
        const unselectedChoice = this.currentRoundData.Choices[unselectedOptionIndex];
        
        console.log('showSuspiciousPhrases called');
        console.log('Selected option:', this.selectedOption);
        console.log('Unselected option index:', unselectedOptionIndex);
        console.log('Unselected choice:', unselectedChoice);
        console.log('Container element:', this.elements.suspiciousPhrasesContainer);
        
        // Generate phrase options from the UNSELECTED option's content
        this.generatePhraseOptions(unselectedChoice.Content, unselectedOptionIndex);
        
        // Show the container
        if (this.elements.suspiciousPhrasesContainer) {
            this.elements.suspiciousPhrasesContainer.style.display = 'block';
            console.log('Container displayed');
        } else {
            console.error('Suspicious phrases container not found!');
        }
        
        // Update selection counter
        this.updatePhraseSelectionCounter();
    }
    
    hideSuspiciousPhrases() {
        if (this.elements.suspiciousPhrasesContainer) {
            this.elements.suspiciousPhrasesContainer.style.display = 'none';
        }
        
        // Reset selected phrases
        this.selectedPhrases = [];
        this.updatePhraseSelectionCounter();
    }
    
    generatePhraseOptions(unselectedContent, unselectedOptionIndex) {
        // Get the correct answer index to find the unreliable choice
        const correctAnswerIndex = this.currentRoundData.Answer_Index;
        const unreliableChoice = this.currentRoundData.Choices[correctAnswerIndex === 0 ? 1 : 0];
        const unselectedChoice = this.currentRoundData.Choices[unselectedOptionIndex];
        
        // Get actual red-flag highlights from the JSON data (always from unreliable choice)
        const actualRedFlags = unreliableChoice.Highlights || [];
        
        console.log('generatePhraseOptions called');
        console.log('Unselected option index:', unselectedOptionIndex);
        console.log('Unselected choice:', unselectedChoice);
        console.log('Unreliable choice:', unreliableChoice);
        console.log('Actual red flags:', actualRedFlags);
        
        // If no highlights in JSON, generate some from content for fallback
        if (actualRedFlags.length === 0) {
            console.warn('No highlights found in JSON data for this round');
        }
        
        // Split unselected content into sentences and phrases
        const sentences = unselectedContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
        const phrases = [];
        
        sentences.forEach(sentence => {
            const words = sentence.trim().split(/\s+/);
            
            // Create phrases of 3-8 words
            for (let i = 0; i < words.length - 2; i++) {
                for (let len = 3; len <= Math.min(8, words.length - i); len++) {
                    const phrase = words.slice(i, i + len).join(' ').trim();
                    if (phrase.length > 15 && phrase.length < 100) {
                        phrases.push(phrase);
                    }
                }
            }
        });
        
        // Remove duplicates and filter out actual red flags from decoys
        const uniquePhrases = [...new Set(phrases)];
        const decoyPhrases = this.selectDecoyPhrases(uniquePhrases, actualRedFlags);
        
        // Determine phrase composition based on unselected option
        let combinedPhrases;
        let redFlagsIncluded = 0;
        
        if (unselectedOptionIndex === correctAnswerIndex) {
            // Unselected option is RELIABLE content - only show phrases from reliable content
            // No red flags should be present in reliable content
            combinedPhrases = decoyPhrases.slice(0, 6); // Just normal phrases from reliable content
            redFlagsIncluded = 0;
        } else {
            // Unselected option is UNRELIABLE content - include red flags mixed with phrases from unreliable content
            const maxDecoys = Math.max(0, 6 - actualRedFlags.length);
            const limitedDecoys = decoyPhrases.slice(0, maxDecoys);
            combinedPhrases = [...actualRedFlags, ...limitedDecoys];
            redFlagsIncluded = actualRedFlags.length;
        }
        
        // Remove any potential duplicates (case-insensitive)
        const uniquePhrasesMap = new Map();
        combinedPhrases.forEach(phrase => {
            const key = phrase.toLowerCase();
            if (!uniquePhrasesMap.has(key)) {
                uniquePhrasesMap.set(key, phrase);
            }
        });
        
        this.phraseOptions = Array.from(uniquePhrasesMap.values())
            .sort(() => Math.random() - 0.5);
        
        console.log('Final phrase options:', this.phraseOptions);
        console.log('Unselected option type:', unselectedOptionIndex === correctAnswerIndex ? 'RELIABLE' : 'UNRELIABLE');
        console.log('Red flags included:', redFlagsIncluded, 'Total phrases:', this.phraseOptions.length);
        
        // Render phrase options
        this.renderPhraseOptions();
    }
    
    selectDecoyPhrases(phrases, actualRedFlags) {
        // Create a set of actual red flags for exclusion (case-insensitive)
        const redFlagSet = new Set(actualRedFlags.map(flag => flag.toLowerCase()));
        
        // Select neutral, factual-sounding phrases as decoys
        const decoys = phrases.filter(phrase => {
            const lowerPhrase = phrase.toLowerCase();
            
            // Exclude actual red flags
            if (redFlagSet.has(lowerPhrase)) return false;
            
            // Exclude phrases that contain any red flag as substring
            if (actualRedFlags.some(flag => lowerPhrase.includes(flag.toLowerCase()))) return false;
            
            // Select neutral phrases
            return !/\b(shocking|amazing|incredible|unbelievable)\b/.test(lowerPhrase) &&
                   /\b(the|and|of|in|for|with|by)\b/.test(lowerPhrase);
        });
        
        return decoys.slice(0, 6); // Return up to 6 decoys, will be limited by calling function
    }
    
    renderPhraseOptions() {
        const grid = this.elements.suspiciousPhrasesContainer?.querySelector('.phrases-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        this.phraseOptions.forEach((phrase, index) => {
            const phraseElement = document.createElement('div');
            phraseElement.className = 'phrase-option';
            phraseElement.textContent = phrase;
            phraseElement.dataset.phraseIndex = index;
            
            phraseElement.addEventListener('click', () => this.togglePhraseSelection(index));
            
            grid.appendChild(phraseElement);
        });
    }
    
    togglePhraseSelection(index) {
        const phrase = this.phraseOptions[index];
        const phraseElement = this.elements.suspiciousPhrasesContainer
            ?.querySelector(`[data-phrase-index="${index}"]`);
        
        if (!phraseElement) return;
        
        if (this.selectedPhrases.includes(phrase)) {
            // Deselect
            this.selectedPhrases = this.selectedPhrases.filter(p => p !== phrase);
            phraseElement.classList.remove('selected');
        } else if (this.selectedPhrases.length < this.maxPhrasesAllowed) {
            // Select (if under limit)
            this.selectedPhrases.push(phrase);
            phraseElement.classList.add('selected');
        }
        
        this.updatePhraseSelectionCounter();
    }
    
    updatePhraseSelectionCounter() {
        const counter = this.elements.phrasesSelected;
        
        if (counter) {
            counter.textContent = this.selectedPhrases.length;
        }
        
        // Update submit button state
        this.updateSubmitButton();
    }
    
    showHint() {
        if (this.hintsUsed > 0) return; // Prevent multiple hints per round
        
        this.hintsUsed++;
        
        // Show the hint from the JSON data
        this.elements.hintText.textContent = this.currentRoundData.Hint;
        this.elements.hintText.style.display = 'block';
        
        // Disable hint button
        this.elements.hintButton.disabled = true;
        this.elements.hintButton.style.opacity = '0.5';
    }
    
    startTimer() {
        this.timeRemaining = 30;
        this.startTime = Date.now();
        
        this.updateTimerDisplay();
        
        this.timer = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.timeRemaining <= 0) {
                this.handleTimeout();
            }
        }, 1000);
    }
    
    updateTimerDisplay() {
        document.getElementById('timer').textContent = this.timeRemaining;
        
        // Update timer styling based on time remaining
        const timerElement = document.getElementById('timer');
        timerElement.className = 'timer';
        if (this.timeRemaining <= 5) {
            timerElement.classList.add('danger');
        } else if (this.timeRemaining <= 10) {
            timerElement.classList.add('warning');
        }
    }
    
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        if (this.startTime) {
            this.timeUsed = Math.round((Date.now() - this.startTime) / 1000);
        }
    }
    
    handleTimeout() {
        this.stopTimer();
        
        if (this.selectedOption !== null) {
            // User has selected an option, auto-submit their selection
            console.log(`Auto-submitting selected option ${this.selectedOption} due to timeout`);
            // Process as a regular answer (not timeout) since user made some attempt
            this.submitAnswer(false); // Process as regular answer, not timeout
        } else {
            // No selection made, process as true timeout
            console.log('No selection made, submitting timeout');
            this.submitAnswer(true); // Process as true timeout
        }
    }
    
    async submitAnswer(isTimeout = false) {
        this.stopTimer();
        
        if (!isTimeout && this.selectedOption === null) {
            return;
        }
        
        // Calculate XP
        const xpResult = this.calculateXP(isTimeout);
        
        // Track stats like Stage 2
        this.totalAnswers++;
        const isCorrect = this.selectedOption === this.currentRoundData.Answer_Index;
        if (isCorrect && !isTimeout) {
            this.correctAnswers++;
        }
        
        // Store answer
        this.answers.push({
            round: this.currentRound,
            selected: this.selectedOption,
            correct: this.currentRoundData.Answer_Index,
            isCorrect: isCorrect,
            isTimeout: isTimeout,
            timeUsed: this.timeUsed,
            hintsUsed: this.hintsUsed,
            highlightedPhrases: [...this.highlightedPhrases],
            selectedPhrases: [...this.selectedPhrases],
            xp: xpResult.total
        });
        
        this.totalXP += xpResult.total;
        
        // Update display-only stats component
        if (window.stageStatsNew) {
            window.stageStatsNew.setXP(this.totalXP);
            window.stageStatsNew.showXPGain(xpResult.total);
        }
        
        // Update accuracy display manually
        this.updateAccuracyDisplay();
        
        // Show feedback
        this.showFeedback(xpResult, isTimeout);
    }
    
    calculateXP(isTimeout = false) {
        // Handle true timeout (no selection made)
        if (isTimeout) {
            return {
                base: 0,
                speed: 0,
                lightning: 0,
                hints: 0,
                highlights: 0,
                phrases: 0,
                timeout: 5,
                total: 5
            };
        }
        
        // If no selection made (should not happen with new timeout logic)
        if (this.selectedOption === null) {
            return {
                base: 0,
                speed: 0,
                lightning: 0,
                hints: 0,
                highlights: 0,
                phrases: 0,
                timeout: 5,
                total: 5
            };
        }
        
        const isCorrect = this.selectedOption === this.currentRoundData.Answer_Index;
        
        if (!isCorrect) {
            // Incorrect answer gets consolation XP
            return {
                base: 0,
                speed: 0,
                lightning: 0,
                hints: 0,
                highlights: 0,
                phrases: 0,
                consolation: 5,
                total: 5
            };
        }
        
        // Base XP for correct answer
        let baseXP = 30;
        
        // Speed bonus: +10 XP if answered in less than 8 seconds
        let speedBonus = 0;
        if (this.timeUsed < 8) {
            speedBonus = 10;
        }
        
        // Lightning bonus: +10 XP if answered in less than 4 seconds
        let lightningBonus = 0;
        if (this.timeUsed < 4) {
            lightningBonus = 10;
        }
        
        // Suspicious phrases bonus (only if correct option was selected)
        let phrasesBonus = this.calculatePhrasesBonus();
        console.log(`XP Calculation - phrasesBonus returned: ${phrasesBonus}`);
        
        // Calculate total before applying limits
        let totalBeforeLimit = baseXP + speedBonus + lightningBonus + phrasesBonus;
        
        // Apply maximum XP limit based on hint usage
        let maxXP = this.hintsUsed > 0 ? 60 : 70;
        let total = Math.min(totalBeforeLimit, maxXP);
        
        // Ensure minimum 5 XP for any attempt
        total = Math.max(5, total);
        
        console.log(`XP Breakdown: base=${baseXP}, speed=${speedBonus}, lightning=${lightningBonus}, phrases=${phrasesBonus}, beforeLimit=${totalBeforeLimit}, maxXP=${maxXP}, total=${total}`);
        
        return {
            base: baseXP,
            speed: speedBonus,
            lightning: lightningBonus,
            hints: this.hintsUsed > 0 ? -10 : 0,
            phrases: phrasesBonus,
            total: total
        };
    }
    
    calculatePhrasesBonus() {
        console.log(`=== calculatePhrasesBonus() called at ${new Date().toISOString()} ===`);
        
        // Calculate bonus if phrases were selected, regardless of which option was chosen
        if (this.selectedPhrases.length === 0) {
            console.log('No phrases selected, returning 0');
            return 0;
        }
        
        // Get the red flag phrases from the unreliable choice
        const correctAnswerIndex = this.currentRoundData.Answer_Index;
        const unreliableChoice = this.currentRoundData.Choices[correctAnswerIndex === 0 ? 1 : 0];
        const redFlagPhrases = unreliableChoice.Highlights || [];
        
        if (redFlagPhrases.length === 0) {
            return 0;
        }
        
        // The goal is to identify suspicious phrases from the unselected content
        // Get the unselected option
        const unselectedOptionIndex = this.selectedOption === 0 ? 1 : 0;
        
        if (unselectedOptionIndex === correctAnswerIndex) {
            // Unselected content is RELIABLE - user should NOT select any phrases
            // Bonus for correctly identifying that reliable content has no red flags
            if (this.selectedPhrases.length === 0) {
                this.correctPhrasesCount = 0;
                console.log('Reliable content unselected with no phrases flagged - bonus for good judgment');
                return 5; // Bonus for correctly identifying reliable content has no red flags
            } else {
                this.correctPhrasesCount = 0;
                console.log('Reliable content unselected but phrases flagged - no bonus');
                return 0; // No bonus if they flagged phrases from reliable content
            }
        } else {
            // Unselected content is UNRELIABLE - user should identify red flag phrases
            let correctPhrases = 0;
            
            // Check each selected phrase against known red flags
            console.log('Selected phrases:', this.selectedPhrases);
            console.log('Red flag phrases:', redFlagPhrases);
            
            this.selectedPhrases.forEach(selectedPhrase => {
                const isRedFlag = redFlagPhrases.some(phrase => {
                    const match = selectedPhrase.toLowerCase().includes(phrase.toLowerCase()) ||
                                 phrase.toLowerCase().includes(selectedPhrase.toLowerCase());
                    console.log(`Checking "${selectedPhrase}" against "${phrase}": ${match}`);
                    return match;
                });
                
                console.log(`"${selectedPhrase}" is red flag: ${isRedFlag}`);
                if (isRedFlag) {
                    correctPhrases++;
                }
            });
            
            // Store correct phrases count for display purposes
            this.correctPhrasesCount = correctPhrases;
            console.log(`Total correct phrases found: ${correctPhrases} out of ${this.selectedPhrases.length} selected`);
            
            // Calculate bonus: 1 correct phrase = +5 XP, 2+ correct phrases = +15 XP
            let bonus = 0;
            if (correctPhrases >= 2) {
                bonus = 15;
            } else if (correctPhrases === 1) {
                bonus = 5;
            }
            
            console.log(`Calculation: ${correctPhrases} correct phrases = ${bonus} XP`);
            console.log(`Final phrases bonus: ${bonus} XP`);
            return bonus;
        }
    }
    
    showFeedback(xpResult, isTimeout = false) {
        // Hide all screens and show feedback
        this.elements.gameScreen.style.display = 'none';
        this.elements.feedbackScreen.style.display = 'block';
        
        // Generate and display feedback content
        const feedbackHTML = this.generateFeedbackHTML(xpResult, isTimeout);
        this.elements.feedbackScreen.innerHTML = feedbackHTML;
        
        // Re-bind continue button event
        const continueBtn = this.elements.feedbackScreen.querySelector('.continue-game');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => this.nextRound());
        }
    }
    
    generateFeedbackHTML(xpResult, isTimeout = false) {
        const choices = this.currentRoundData.Choices;
        const correctAnswerIndex = this.currentRoundData.Answer_Index;
        const credibleContent = choices[correctAnswerIndex].Content;
        const unreliableContent = choices[correctAnswerIndex === 0 ? 1 : 0].Content;
        const isCorrect = this.selectedOption === correctAnswerIndex;
        
        let resultText;
        if (isTimeout) {
            // True timeout with no selection
            resultText = 'Time\'s Up!';
        } else if (isCorrect) {
            resultText = 'Correct!';
        } else {
            resultText = 'Incorrect';
        }
        
        // Determine CSS classes for container
        let containerClasses = 'feedback-container results-card';
        if (isTimeout) {
            containerClasses += ' timeout';
        } else if (isCorrect) {
            containerClasses += ' correct';
        } else {
            containerClasses += ' incorrect';
        }
        
        return `
            <div class="${containerClasses}">
                <div class="feedback-header">
                    <h3>${resultText}</h3>
                    <div class="xp-badge">+${xpResult.total} XP</div>
                </div>
                
                ${!isTimeout ? this.generateResponseTimeHTML() : ''}
                ${this.generateXPBreakdownHTML(xpResult, isTimeout)}
            
            <div class="feedback-content">
                <div class="content-feedback credible">
                    <div class="feedback-label credible-label">Credible Content</div>
                    <div class="content-text">${credibleContent}</div>
                </div>
                
                <div class="content-feedback unreliable">
                    <div class="feedback-label unreliable-label">Unreliable Content</div>
                    <div class="content-text">${unreliableContent}</div>
                </div>
                
                <div class="feedback-explanation">
                    <h4>Learning Point</h4>
                    <p>${this.currentRoundData.Lesson}</p>
                </div>
                
                ${this.generateHighlightFeedbackHTML()}
            </div>
            
            <button class="action-btn action-btn-primary continue-game continue-button">
                ${this.currentRound >= this.totalRounds ? 'View Results' : 'Continue'}
            </button>
            </div>
        `;
    }
    
    generateXPBreakdownHTML(xpResult, isTimeout) {
        const correctAnswerIndex = this.currentRoundData.Answer_Index;
        const selectedIncorrect = this.selectedOption !== correctAnswerIndex;
        const unselectedOptionIndex = this.selectedOption === 0 ? 1 : 0;
        const unselectedIsReliable = unselectedOptionIndex === correctAnswerIndex;
        
        console.log(`Display - correctPhrasesCount: ${this.correctPhrasesCount}, xpResult.phrases: ${xpResult.phrases}`);
        
        return `
            <div class="xp-breakdown">
                ${xpResult.timeout > 0 ? `<div class="bonus-item">Timeout: +${xpResult.timeout} XP</div>` : ''}
                ${xpResult.consolation > 0 ? `<div class="bonus-item">Attempt: +${xpResult.consolation} XP</div>` : ''}
                ${xpResult.base > 0 ? `<div class="bonus-item">Correct Answer: +${xpResult.base} XP</div>` : ''}
                ${xpResult.speed > 0 ? `<div class="bonus-item">Speed Bonus (<8s): +${xpResult.speed} XP</div>` : ''}
                ${xpResult.lightning > 0 ? `<div class="bonus-item">Lightning Bonus (<4s): +${xpResult.lightning} XP</div>` : ''}
                ${xpResult.phrases > 0 && unselectedIsReliable ? `<div class="bonus-item">Reliable Content Analysis (no phrases flagged): +${xpResult.phrases} XP</div>` : ''}
                ${xpResult.phrases > 0 && !unselectedIsReliable ? `<div class="bonus-item">Suspicious Phrases Bonus (${this.correctPhrasesCount || 0} correct): +${xpResult.phrases} XP</div>` : ''}
                ${unselectedIsReliable && this.selectedPhrases.length > 0 ? `<div class="bonus-item">No Phrases Bonus - Flagged phrases from reliable content</div>` : ''}
                ${!unselectedIsReliable && this.selectedPhrases.length === 0 ? `<div class="bonus-item">No Phrases Bonus - No red flags identified</div>` : ''}
                ${xpResult.hints < 0 ? `<div class="bonus-item">Hint Used: Maximum reduced to 60 XP</div>` : ''}
            </div>
        `;
    }
    
    generateResponseTimeHTML() {
        return `
            <div class="response-time">
                <span class="time-label">Answered in:</span>
                <span class="time-value">${this.timeUsed} seconds</span>
            </div>
        `;
    }
    
    generateHighlightFeedbackHTML() {
        if (this.highlightedPhrases.length === 0) {
            return '';
        }
        
        const correctAnswerIndex = this.currentRoundData.Answer_Index;
        const unreliableChoice = this.currentRoundData.Choices[correctAnswerIndex === 0 ? 1 : 0];
        const redFlagPhrases = unreliableChoice.Highlights || [];
        const unreliableOption = correctAnswerIndex === 0 ? '1' : '0';
        
        let correctHighlights = [];
        let incorrectHighlights = [];
        
        this.highlightedPhrases.forEach(highlighted => {
            const isRedFlag = redFlagPhrases.some(phrase => {
                return highlighted.text.toLowerCase().includes(phrase.toLowerCase()) ||
                       phrase.toLowerCase().includes(highlighted.text.toLowerCase());
            });
            
            const isInUnreliableContent = highlighted.option === unreliableOption;
            
            if (isRedFlag && isInUnreliableContent) {
                correctHighlights.push(highlighted.text);
            } else {
                incorrectHighlights.push(highlighted.text);
            }
        });
        
        return `
            <div class="highlight-feedback">
                ${correctHighlights.length > 0 ? `
                    <h5>Correctly Identified Red Flags:</h5>
                    ${correctHighlights.map(phrase => `<span class="phrase correct">${phrase}</span>`).join('')}
                ` : ''}
                
                ${incorrectHighlights.length > 0 ? `
                    <h5>Incorrectly Highlighted:</h5>
                    ${incorrectHighlights.map(phrase => `<span class="phrase">${phrase}</span>`).join('')}
                ` : ''}
            </div>
        `;
    }
    
    showComplete() {
        // Calculate final stats
        const correctAnswers = this.answers.filter(a => a.isCorrect).length;
        const accuracy = Math.round((correctAnswers / this.totalRounds) * 100);
        const totalTime = this.answers.reduce((sum, a) => sum + a.timeUsed, 0);
        const avgTime = Math.round(totalTime / this.totalRounds * 10) / 10;
        const totalHighlights = this.answers.reduce((sum, a) => sum + a.highlightedPhrases.length, 0);
        
        // Update final stats component like Stage 2
        if (window.stageStatsNew) {
            window.stageStatsNew.setRound(this.totalRounds, this.totalRounds);
            window.stageStatsNew.setXP(this.totalXP);
        }
        
        // Update accuracy display manually
        this.updateAccuracyDisplay();
        
        // Save game results to database
        this.saveGameResults();

        // Update complete screen elements
        if (this.elements.finalXP) this.elements.finalXP.textContent = this.totalXP;
        if (this.elements.finalAccuracy) this.elements.finalAccuracy.textContent = `${accuracy}%`;
        if (this.elements.finalCorrect) this.elements.finalCorrect.textContent = correctAnswers;
        if (this.elements.finalTotal) this.elements.finalTotal.textContent = this.totalRounds;
        
        // Show complete screen
        this.elements.gameScreen.style.display = 'none';
        this.elements.feedbackScreen.style.display = 'none';
        this.elements.completeScreen.style.display = 'block';
        
        // Add replay button event listener
        const replayBtn = document.getElementById('replay-btn');
        if (replayBtn) {
            replayBtn.addEventListener('click', () => {
                this.resetGame();
            });
        }
        
        // NOTE: Game stats are submitted via /game/api/complete-game in submitFinalResults()
        // Removed duplicate submitResults() call that was causing double counting
    }
    
    // REMOVED: submitResults() method - was using deprecated /game/api/stage3/complete endpoint
    // and causing duplicate game counting. Only using /game/api/complete-game now.

    resetGame() {
        // Reset all game state
        this.currentRound = 0;
        this.correctAnswers = 0;
        this.totalAnswers = 0;
        this.totalXP = 0;
        this.gameActive = false;
        this.roundActive = false;
        this.answers = [];
        this.selectedContentId = null;
        this.highlightedPhrases = [];
        
        // Stop timer if running
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Reset stats display
        if (window.stageStatsNew) {
            window.stageStatsNew.reset();
            window.stageStatsNew.setRound(0, this.totalRounds);
            window.stageStatsNew.setXP(0);
        }
        
        // Update accuracy display manually
        this.updateAccuracyDisplay();
        
        // Show instructions screen
        this.elements.instructionsScreen.style.display = 'block';
        this.elements.gameScreen.style.display = 'none';
        this.elements.feedbackScreen.style.display = 'none';
        this.elements.completeScreen.style.display = 'none';
    }
    
    async saveGameResults() {
        // Save completed game results to database
        try {
            const correctAnswers = this.answers.filter(a => a.isCorrect).length;
            const gameData = {
                stage: 3,
                total_xp: this.totalXP,
                correct_answers: correctAnswers,
                total_rounds: this.totalRounds,
                accuracy: Math.round((correctAnswers / this.totalRounds) * 100)
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

    showError(message) {
        // Simple error display - could be enhanced with modal
        alert(message);
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Stage3Game();
});
