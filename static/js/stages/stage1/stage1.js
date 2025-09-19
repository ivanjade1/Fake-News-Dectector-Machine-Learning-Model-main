// Stage 1: Headline Check Game JavaScript - NEW VERSION (Complete Self-Contained Scoring)
// Time limit: 15 seconds per round
// Speed Bonus: ≤5 seconds (+5 XP)
// Lightning Bonus: ≤3 seconds (+5 XP additional)

class Stage1GameNew {
    constructor() {
        this.currentRound = 0;
        this.totalRounds = 10;
        this.timeLimit = 15; // 15 seconds per round
        this.timer = null;
        this.timeRemaining = this.timeLimit;
        this.hintUsed = false;
        this.startTime = null;
        this.totalXP = 0;
        this.correctAnswers = 0; // Stage 1 handles all scoring
        this.totalAnswers = 0; // Stage 1 handles all scoring
        this.selectedCard = null;
        this.selectedStamp = null;
        this.lastAnswerCorrect = undefined; // For storing multi-stamp correctness
        this.processingAnswer = false; // Prevent double processing
        
        // Article pairs (real and fake headlines)
        this.articlePairs = [
            {
                real: {
                    headline: "Konektadong Pinoy Bill has lapsed into law — Palace",
                    reason: "Uses factual language: 'has lapsed into law' is official legal terminology. Attribution to 'Palace' indicates official government source."
                },
                fake: {
                    headline: "Government secretly plans to control all internet access in the Philippines",
                    reason: "Contains sensational words: 'secretly' implies conspiracy, 'control all' is absolute language without evidence or official confirmation."
                }
            },
            {
                real: {
                    headline: "Marcos signs law declaring Paoay Lake a protected area",
                    reason: "Straightforward factual reporting: 'signs law' and 'declaring' are neutral government actions with specific location mentioned."
                },
                fake: {
                    headline: "Marcos destroys local tourism by declaring lake off-limits to Filipinos forever",
                    reason: "Inflammatory language: 'destroys' is emotional, 'off-limits' mischaracterizes protection, 'forever' is absolute and dramatic."
                }
            },
            {
                real: {
                    headline: "Bill seeks SALN disclosure for President, VP, key officials",
                    reason: "Measured language: 'seeks' indicates proposal stage, specific roles mentioned, neutral tone about transparency measure."
                },
                fake: {
                    headline: "Politicians will hide their wealth forever under new transparency bill",
                    reason: "Contradictory logic: transparency bill described as hiding wealth. 'Forever' is absolute, 'will hide' assumes bad intent."
                }
            },
            {
                real: {
                    headline: "House prosecutors seek subpoena of Sara Duterte's bank records",
                    reason: "Procedural language: 'seek subpoena' is standard legal process, specific legal actors mentioned, factual tone."
                },
                fake: {
                    headline: "Sara Duterte's secret bank accounts hold billions in stolen government money",
                    reason: "Sensational claims: 'secret bank accounts' implies hidden conspiracy, 'billions in stolen money' makes unproven financial accusations."
                }
            },
            {
                real: {
                    headline: "Marcos OKs natural gas industry development law",
                    reason: "Neutral reporting: 'OKs' is factual approval language, specific industry mentioned, straightforward government action."
                },
                fake: {
                    headline: "Natural gas law will poison all Filipino children within 5 years, scientists warn",
                    reason: "Fear-mongering: 'poison all' is absolute and alarmist, '5 years' is specific doomsday prediction, exploits parental fears."
                }
            },
            {
                real: {
                    headline: "Marcos inks law extending NHA's corporate term",
                    reason: "Official terminology: 'inks law' is standard government language, specific agency (NHA) and action (extending term) mentioned."
                },
                fake: {
                    headline: "NHA extension law guarantees housing crisis will continue for next 25 years",
                    reason: "Absolute prediction: 'guarantees' claims certainty about future, '25 years' is specific timeframe, presents extension as negative."
                }
            },
            {
                real: {
                    headline: "Marcos signs law boosting judiciary's fiscal autonomy",
                    reason: "Factual language: 'signs law' and 'boosting' are neutral descriptors, 'fiscal autonomy' is proper legal terminology."
                },
                fake: {
                    headline: "Supreme Court steals taxpayer money through unconstitutional budget grab",
                    reason: "Inflammatory accusations: 'steals' is criminal language, 'budget grab' is sensational, 'unconstitutional' makes legal claims without proof."
                }
            },
            {
                real: {
                    headline: "Philippine Supreme Court voids impeachment complaint against VP Duterte",
                    reason: "Legal reporting: 'voids' is proper court terminology, specific legal action and official involved, neutral procedural language."
                },
                fake: {
                    headline: "Supreme Court betrays Constitution to save Sara Duterte from certain conviction",
                    reason: "Accusatory language: 'betrays Constitution' questions court integrity, 'certain conviction' assumes guilt, emotional manipulation."
                }
            },
            {
                real: {
                    headline: "Senate returns impeachment complaints to House, sets terms for trial",
                    reason: "Procedural reporting: 'returns' and 'sets terms' describe standard legislative process, neutral institutional language."
                },
                fake: {
                    headline: "Senate refuses to try Sara Duterte because she has secret dirt on all senators",
                    reason: "Conspiracy theory: 'secret dirt' implies blackmail without evidence, 'all senators' is absolute claim, suggests corruption."
                }
            },
            {
                real: {
                    headline: "New law gives Judiciary fiscal autonomy",
                    reason: "Simple factual statement: 'gives' is neutral action, 'fiscal autonomy' is technical legal term, straightforward reporting."
                },
                fake: {
                    headline: "New judiciary law will bankrupt the Philippines within 3 years, economists predict",
                    reason: "Doomsday prediction: 'bankrupt' is extreme outcome, '3 years' is specific disaster timeline, creates economic panic."
                }
            }
        ];
        
        this.gameRounds = []; // Will store mixed headlines for each round
        this.currentRoundData = null;
        this.generateRandomizedRounds();
    }
    
    generateRandomizedRounds() {
        // Extract all real and fake headlines separately
        const realHeadlines = this.articlePairs.map(pair => ({
            headline: pair.real.headline,
            reason: pair.real.reason,
            type: 'real'
        }));
        
        const fakeHeadlines = this.articlePairs.map(pair => ({
            headline: pair.fake.headline,
            reason: pair.fake.reason,
            type: 'fake'
        }));
        
        // Shuffle both arrays
        this.shuffleArray(realHeadlines);
        this.shuffleArray(fakeHeadlines);
        
        // Create rounds by pairing random real and fake headlines
        for (let i = 0; i < this.totalRounds; i++) {
            this.gameRounds.push({
                real: realHeadlines[i % realHeadlines.length],
                fake: fakeHeadlines[i % fakeHeadlines.length]
            });
        }
        
        // Shuffle the final rounds for additional randomness
        this.shuffleArray(this.gameRounds);
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    initializeStage() {
        // Reset ALL local counters to zero
        this.correctAnswers = 0;
        this.totalAnswers = 0;
        this.totalXP = 0;
        this.currentRound = 0;
        
        // Initialize display-only stats component
        if (window.stageStatsNew) {
            window.stageStatsNew.reset();
            window.stageStatsNew.setStageInfo(1, 'Headline Check');
            window.stageStatsNew.setRound(0, this.totalRounds);
            window.stageStatsNew.setXP(0);
        }
        
        // Manually set accuracy to 0% at start
        this.updateAccuracyDisplay();
        
        this.moveContentToBrowser();
        this.showInstructions();
    }
    
    updateAccuracyDisplay() {
        const accuracy = this.totalAnswers === 0 ? 0 : Math.round((this.correctAnswers / this.totalAnswers) * 100);
        const accuracyEl = document.getElementById('current-accuracy');
        if (accuracyEl) {
            accuracyEl.textContent = `${accuracy}%`;
        }
    }
    
    moveContentToBrowser() {
        // Move the stage content into the browser viewport
        const stageContent = document.getElementById('stage1-content');
        const browserViewport = document.getElementById('browser-viewport');
        
        if (stageContent && browserViewport) {
            // Move the content into the browser viewport
            browserViewport.appendChild(stageContent);
            stageContent.style.display = 'block';
        }
    }
    
    showInstructions() {
        const instructionsScreen = document.getElementById('instructions-screen');
        
        if (instructionsScreen) {
            instructionsScreen.style.display = 'block';
        }
        
        // Bind start game button
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startGame());
        }
    }
    
    startGame() {
        const instructionsScreen = document.getElementById('instructions-screen');
        const gameScreen = document.getElementById('game-screen');
        
        if (instructionsScreen) instructionsScreen.style.display = 'none';
        if (gameScreen) gameScreen.style.display = 'block';
        
        // Start first round
        this.currentRound = 1;
        this.startNewRound();
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
    
    startNewRound() {
        if (this.currentRound > this.totalRounds) {
            this.completeStage();
            return;
        }
        
        // Use currentRound - 1 as array index since rounds are 1-based but arrays are 0-based
        this.currentRoundData = this.gameRounds[this.currentRound - 1];
        this.hintUsed = false;
        this.timeRemaining = this.timeLimit;
        this.startTime = Date.now();
        this.selectedCard = null;
        this.selectedStamp = null;
        
        // Update stats to show current round
        this.updateGameStats();
        
        // Update game title to show current headline number
        const gameTitle = document.getElementById('game-title');
        if (gameTitle) {
            gameTitle.textContent = `Headline ${this.currentRound}`;
        }
        
        this.populateGameContent();
        this.initializeDragAndDrop();
        this.startTimer();
    }
    
    populateGameContent() {
        // Randomly assign which headline appears first
        const firstIsReal = Math.random() < 0.5;
        const firstHeadline = firstIsReal ? this.currentRoundData.real : this.currentRoundData.fake;
        const secondHeadline = firstIsReal ? this.currentRoundData.fake : this.currentRoundData.real;
        
        // Update headline elements
        const headline1 = document.getElementById('headline-1');
        const headline2 = document.getElementById('headline-2');
        
        if (headline1) {
            headline1.dataset.type = firstHeadline.type;
            headline1.querySelector('.headline-text').textContent = firstHeadline.headline;
        }
        
        if (headline2) {
            headline2.dataset.type = secondHeadline.type;
            headline2.querySelector('.headline-text').textContent = secondHeadline.headline;
        }
        
        // Reset drop zones
        document.querySelectorAll('.stamp-drop-zone').forEach(zone => {
            zone.innerHTML = '<span class="drop-hint">Drop stamp here</span>';
            zone.classList.remove('has-stamp');
        });
        
        // Reset hint
        const hintText = document.getElementById('hint-text');
        const hintButton = document.getElementById('hint-button');
        if (hintText) hintText.style.display = 'none';
        if (hintButton) hintButton.disabled = false;
        
        // Reset submit button
        const submitButton = document.getElementById('submit-button');
        if (submitButton) submitButton.disabled = true;
        
        // Bind hint button
        if (hintButton) {
            hintButton.addEventListener('click', () => this.useHint());
        }
        
        // Bind submit button
        if (submitButton) {
            submitButton.addEventListener('click', () => this.submitAnswer());
        }
    }
    
    startTimer() {
        this.updateTimerDisplay();
        this.timer = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.timeRemaining <= 0) {
                this.handleTimeout();
            }
        }, 1000);
    }
    
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    
    updateTimerDisplay() {
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = this.timeRemaining;
            
            if (this.timeRemaining <= 3) {
                timerElement.classList.add('timer-warning');
            } else {
                timerElement.classList.remove('timer-warning');
            }
        }
    }
    
    handleTimeout() {
        // Auto-submit whatever the user has dragged when time runs out
        const dropZones = document.querySelectorAll('.stamp-drop-zone.has-stamp');
        
        if (dropZones.length > 0) {
            // User has placed some stamps, auto-submit their current selection
            console.log(`Auto-submitting ${dropZones.length} stamps due to timeout`);
            
            // Check the user's current answers
            let allCorrect = true;
            let hasAnyAnswer = false;
            
            dropZones.forEach(zone => {
                const headlineNumber = zone.dataset.headline;
                const headlineCard = document.getElementById(`headline-${headlineNumber}`);
                const stamp = zone.querySelector('.placed-stamp');
                
                if (stamp && headlineCard) {
                    hasAnyAnswer = true;
                    const headlineType = headlineCard.dataset.type; // 'real' or 'fake'
                    const stampType = stamp.classList.contains('real-stamp') ? 'real' : 'fake';
                    
                    // Check if this specific headline is correctly labeled
                    if (headlineType !== stampType) {
                        allCorrect = false;
                    }
                }
            });
            
            // Store the result based on user's partial/complete answers
            if (hasAnyAnswer) {
                // If user placed stamps but didn't finish, judge based on what they did
                this.lastAnswerCorrect = allCorrect && (dropZones.length === 2);
            } else {
                // No stamps placed, treat as timeout
                this.lastAnswerCorrect = false;
            }
            
            // Process as a regular answer (not timeout) since user made some attempt
            this.processAnswer(null, null, false);
        } else {
            // No stamps placed at all, process as timeout
            this.processAnswer(null, null, true);
        }
    }
    
    useHint() {
        this.hintUsed = true;
        const hintText = document.getElementById('hint-text');
        const hintButton = document.getElementById('hint-button');
        
        if (hintText && hintButton) {
            hintText.textContent = this.generateSpecificHint();
            hintText.style.display = 'block';
            hintButton.disabled = true;
        }
    }
    
    generateSpecificHint() {
        const realHeadline = this.currentRoundData.real.headline;
        const fakeHeadline = this.currentRoundData.fake.headline;
        
        // Create specific hints based on the actual headline content
        let hint = "Look at the language carefully: ";
        
        // Analyze fake headline for specific red flags
        const fakeWords = fakeHeadline.toLowerCase();
        const realWords = realHeadline.toLowerCase();
        
        // Check for specific problematic words/phrases in the fake headline
        if (fakeWords.includes('secretly') || fakeWords.includes('secret')) {
            hint += "One headline suggests hidden conspiracies with words like 'secretly' or 'secret'. ";
        } else if (fakeWords.includes('destroys') || fakeWords.includes('steals') || fakeWords.includes('betrays')) {
            hint += "One headline uses inflammatory verbs like 'destroys', 'steals', or 'betrays' to create emotional reactions. ";
        } else if (fakeWords.includes('all ') || fakeWords.includes('forever') || fakeWords.includes('guarantees')) {
            hint += "One headline makes absolute claims using words like 'all', 'forever', or 'guarantees' without evidence. ";
        } else if (fakeWords.includes('poison') || fakeWords.includes('bankrupt') || fakeWords.includes('crisis')) {
            hint += "One headline uses fear-inducing words like 'poison', 'bankrupt', or 'crisis' to alarm readers. ";
        } else if (/\d+\s*years?/i.test(fakeHeadline)) {
            hint += "One headline makes specific time predictions (like '3 years' or '25 years') without credible basis. ";
        }
        
        // Check for credible language patterns in real headline
        if (realWords.includes('signs') || realWords.includes('inks')) {
            hint += "The other headline uses official government language like 'signs law' or 'inks law'. ";
        } else if (realWords.includes('seeks') || realWords.includes('sets terms')) {
            hint += "The other headline describes procedural actions like 'seeks' or 'sets terms' neutrally. ";
        } else if (realWords.includes('voids') || realWords.includes('returns')) {
            hint += "The other headline reports court/legislative actions using proper legal terminology. ";
        } else if (realWords.includes('gives') || realWords.includes('boosting')) {
            hint += "The other headline uses neutral, factual language to describe government actions. ";
        }
        
        // Add specific guidance based on headline pair
        if (fakeWords.includes('control all internet')) {
            hint += "Think: would a real news source claim total internet control without evidence?";
        } else if (fakeWords.includes('off-limits to filipinos forever')) {
            hint += "Think: does 'protected area' really mean 'off-limits forever'?";
        } else if (fakeWords.includes('hide their wealth')) {
            hint += "Think: would a transparency bill actually hide information?";
        } else if (fakeWords.includes('billions in stolen')) {
            hint += "Think: would news report specific stolen amounts without proof?";
        } else if (fakeWords.includes('poison all filipino children')) {
            hint += "Think: would a development law really poison all children?";
        } else if (fakeWords.includes('housing crisis will continue')) {
            hint += "Think: does extending an agency's term guarantee a crisis?";
        } else if (fakeWords.includes('steals taxpayer money')) {
            hint += "Think: is fiscal autonomy the same as stealing money?";
        } else if (fakeWords.includes('betrays constitution')) {
            hint += "Think: is following legal procedure really betraying the Constitution?";
        } else if (fakeWords.includes('secret dirt on all senators')) {
            hint += "Think: would senators really all be blackmailed together?";
        } else if (fakeWords.includes('bankrupt the philippines')) {
            hint += "Think: would judicial autonomy really bankrupt an entire country?";
        } else {
            hint += "Compare which headline sounds more factual and which uses emotional manipulation.";
        }
        
        return hint;
    }
    
    processAnswer(selectedCard, selectedStamp, isTimeout = false) {
        // Prevent double processing
        if (this.processingAnswer) {
            console.log('Answer already being processed, skipping...');
            return;
        }
        this.processingAnswer = true;
        
        console.log(`Processing answer for round ${this.currentRound}:`, {
            totalAnswers: this.totalAnswers,
            correctAnswers: this.correctAnswers,
            isTimeout: isTimeout
        });
        
        this.stopTimer();
        // Use timer-consistent calculation: time elapsed = initial time limit - current remaining time
        const responseTime = this.timeLimit - this.timeRemaining; // How long it took to answer (consistent with timer)
        
        let correct = false;
        
        // Track answers locally (Stage 1 handles EVERYTHING)
        this.totalAnswers++;
        console.log(`Total answers incremented to: ${this.totalAnswers}`);
        
        if (!isTimeout) {
            // Use the stored correctness result if available
            if (this.lastAnswerCorrect !== undefined) {
                correct = this.lastAnswerCorrect;
                this.lastAnswerCorrect = undefined; // Reset for next round
            }
        }
        
        if (correct) {
            this.correctAnswers++;
            console.log(`Correct answers incremented to: ${this.correctAnswers}`);
        }
        
        // Calculate XP with scoring system
        let xp = 0;
        let bonusDetails = [];
        
        if (correct) {
            xp += 25; // Base correct answer
            bonusDetails.push("Correct: +25 XP");
            
            // Speed bonuses - more lenient timing
            if (responseTime <= 3) {
                xp += 10; // Lightning bonus (5) + Speed bonus (5)
                bonusDetails.push("Lightning (≤3s): +5 XP");
                bonusDetails.push("Speed (≤5s): +5 XP");
            } else if (responseTime <= 5) {
                xp += 5; // Speed bonus only
                bonusDetails.push("Speed (≤5s): +5 XP");
            } else if (responseTime <= this.timeLimit) {
                // No speed bonus, but still within time limit
                bonusDetails.push("Within time limit");
            }
        } else {
            xp += 5; // Consolation XP
            bonusDetails.push("Attempt: +5 XP");
        }
        
        // Apply hint penalty (cap at 30 XP if hint was used)
        if (this.hintUsed && xp > 30) {
            xp = 30;
            bonusDetails.push("Hint used: Capped at 30 XP");
        }
        
        // Handle timeout
        if (isTimeout) {
            xp = 5;
            bonusDetails = ["Timeout: +5 XP"];
        }
        
        xp = Math.max(0, xp); // Floor at 0
        this.totalXP += xp;
        
        // Update display-only stats component
        if (window.stageStatsNew) {
            window.stageStatsNew.setXP(this.totalXP);
            window.stageStatsNew.showXPGain(xp);
        }
        
        // Update accuracy display manually
        this.updateAccuracyDisplay();
        
        // Show feedback with bonus details
        this.showFeedback(correct, isTimeout, xp, bonusDetails, responseTime);
    }
    
    showFeedback(correct, isTimeout, xp, bonusDetails = [], responseTime = 0) {
        const gameScreen = document.getElementById('game-screen');
        const feedbackScreen = document.getElementById('feedback-screen');
        
        if (gameScreen) gameScreen.style.display = 'none';
        if (feedbackScreen) feedbackScreen.style.display = 'block';
        
        // Format response time for display (how long it took to answer)
        // Since we're using timer-based calculation, it will be in whole seconds
        const timeDisplay = responseTime === 1 ? '1 second' : `${responseTime} seconds`;
        
        // Create bonus details HTML
        const bonusHTML = bonusDetails.length > 0 ? `
            <div class="xp-breakdown">
                ${bonusDetails.map(detail => `<div class="bonus-item">${detail}</div>`).join('')}
            </div>
        ` : '';
        
        // Create response time HTML (show how long it took to answer)
        const responseTimeHTML = !isTimeout ? `
            <div class="response-time">
                <span class="time-label">Answered in:</span> 
                <span class="time-value">${timeDisplay}</span>
            </div>
        ` : '';
        
        let feedbackContent = '';
        if (isTimeout) {
            feedbackContent = `
                <div class="results-card feedback-container timeout">
                    <div class="feedback-header">
                        <h3>Time's Up!</h3>
                        <div class="xp-badge">+${xp} XP</div>
                    </div>
                    ${bonusHTML}
                    <div class="feedback-content">
                        <div class="headline-feedback real">
                            <div class="feedback-label real-label">REAL headline:</div>
                            <p class="headline">${this.currentRoundData.real.headline}</p>
                            <p class="feedback-reason">${this.currentRoundData.real.reason}</p>
                        </div>
                        <div class="headline-feedback fake">
                            <div class="feedback-label fake-label">FAKE headline:</div>
                            <p class="headline">${this.currentRoundData.fake.headline}</p>
                            <p class="feedback-reason">${this.currentRoundData.fake.reason}</p>
                        </div>
                    </div>
                    <button class="action-btn action-btn-primary continue-button" onclick="stage1GameNew.nextRound()">Continue</button>
                </div>
            `;
        } else {
            const status = correct ? 'correct' : 'incorrect';
            const title = correct ? 'Correct!' : 'Incorrect';
            
            feedbackContent = `
                <div class="results-card feedback-container ${status}">
                    <div class="feedback-header">
                        <h3>${title}</h3>
                        <div class="xp-badge">+${xp} XP</div>
                    </div>
                    ${responseTimeHTML}
                    ${bonusHTML}
                    <div class="feedback-content">
                        <div class="headline-feedback real">
                            <div class="feedback-label real-label">REAL headline:</div>
                            <p class="headline">${this.currentRoundData.real.headline}</p>
                            <p class="feedback-reason">${this.currentRoundData.real.reason}</p>
                        </div>
                        <div class="headline-feedback fake">
                            <div class="feedback-label fake-label">FAKE headline:</div>
                            <p class="headline">${this.currentRoundData.fake.headline}</p>
                            <p class="feedback-reason">${this.currentRoundData.fake.reason}</p>
                        </div>
                    </div>
                    <button class="action-btn action-btn-primary continue-button" onclick="stage1GameNew.nextRound()">Continue</button>
                </div>
            `;
        }
        
        feedbackScreen.innerHTML = feedbackContent;
    }
    
    nextRound() {
        // Reset the processing flag for the next round
        this.processingAnswer = false;
        console.log(`Starting round ${this.currentRound + 1}, processing flag reset`);
        
        this.currentRound++;
        
        // Don't update stats if we're past the total rounds (going to completion)
        if (this.currentRound <= this.totalRounds) {
            this.updateGameStats();
        }
        
        const feedbackScreen = document.getElementById('feedback-screen');
        const gameScreen = document.getElementById('game-screen');
        
        if (feedbackScreen) feedbackScreen.style.display = 'none';
        if (gameScreen) gameScreen.style.display = 'block';
        
        this.startNewRound();
    }
    
    completeStage() {
        const gameScreen = document.getElementById('game-screen');
        const completeScreen = document.getElementById('complete-screen');
        
        if (gameScreen) gameScreen.style.display = 'none';
        if (completeScreen) completeScreen.style.display = 'block';
        
        // Ensure stats show final state (10/10, not 11/10)
        if (window.stageStatsNew) {
            window.stageStatsNew.setRound(this.totalRounds, this.totalRounds);
            window.stageStatsNew.setXP(this.totalXP);
        }
        
        // Use ONLY local Stage 1 counters (guaranteed max 10)
        const accuracy = this.totalAnswers === 0 ? 0 : Math.round((this.correctAnswers / this.totalAnswers) * 100);
        
        // Save game results to database
        this.saveGameResults();

        completeScreen.innerHTML = `
            <div class="results-card stage-complete">
                <div class="results-icon" style="background: linear-gradient(135deg, #10b981, #059669); color: white; margin: 0 auto 1rem;">
                    <i class="bi bi-trophy-fill"></i>
                </div>
                <h2>Stage 1 Complete!</h2>
                <p>Great job on completing the Headline Check stage!</p>
                
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
                    <a href="/game/stage2" class="action-btn action-btn-primary next-stage-button">
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
                this.initializeStage();
                document.getElementById('complete-screen').style.display = 'none';
                document.getElementById('instructions-screen').style.display = 'block';
            });
        }
    }
    
    initializeDragAndDrop() {
        const stamps = document.querySelectorAll('.stamp-item');
        const dropZones = document.querySelectorAll('.stamp-drop-zone');
        
        // Remove existing event listeners to prevent duplicates
        stamps.forEach(stamp => {
            stamp.replaceWith(stamp.cloneNode(true));
        });
        
        // Re-select stamps after cloning
        const newStamps = document.querySelectorAll('.stamp-item');
        
        // Add drag event listeners to stamps
        newStamps.forEach(stamp => {
            stamp.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', stamp.dataset.stamp);
                stamp.classList.add('dragging');
            });
            
            stamp.addEventListener('dragend', (e) => {
                stamp.classList.remove('dragging');
            });
        });
        
        // Add drop event listeners to drop zones
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });
            
            zone.addEventListener('dragleave', (e) => {
                zone.classList.remove('drag-over');
            });
            
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                
                const stampType = e.dataTransfer.getData('text/plain');
                const headlineNumber = zone.dataset.headline;
                
                this.placeStamp(headlineNumber, stampType);
            });
        });
    }
    
    placeStamp(headlineNumber, stampType) {
        const dropZone = document.querySelector(`[data-headline="${headlineNumber}"]`);
        const headlineCard = document.getElementById(`headline-${headlineNumber}`);
        
        if (!dropZone || !headlineCard) return;
        
        // Clear previous stamp from this zone
        dropZone.innerHTML = '';
        dropZone.classList.remove('has-stamp');
        
        // Clear stamps from other zones if same stamp type is being placed
        const otherDropZones = document.querySelectorAll('.stamp-drop-zone');
        otherDropZones.forEach(zone => {
            if (zone !== dropZone) {
                const existingStamp = zone.querySelector('.placed-stamp');
                if (existingStamp && existingStamp.classList.contains(`${stampType}-stamp`)) {
                    zone.innerHTML = '<span class="drop-hint">Drop stamp here</span>';
                    zone.classList.remove('has-stamp');
                }
            }
        });
        
        // Add new stamp
        const stampElement = document.createElement('div');
        stampElement.className = `placed-stamp ${stampType}-stamp`;
        stampElement.innerHTML = `<span class="stamp-text">${stampType.toUpperCase()}</span>`;
        dropZone.appendChild(stampElement);
        dropZone.classList.add('has-stamp');
        
        this.checkCanSubmit();
    }
    
    checkCanSubmit() {
        const dropZones = document.querySelectorAll('.stamp-drop-zone');
        const stampedZones = document.querySelectorAll('.stamp-drop-zone.has-stamp');
        const submitButton = document.getElementById('submit-button');
        
        if (submitButton) {
            // Enable submit when both headlines have stamps
            submitButton.disabled = stampedZones.length < 2;
        }
    }
    
    submitAnswer() {
        const dropZones = document.querySelectorAll('.stamp-drop-zone.has-stamp');
        if (dropZones.length < 2) {
            // Show error message
            const actionContainer = document.querySelector('.action-container');
            let errorMsg = actionContainer.querySelector('.error-message');
            if (!errorMsg) {
                errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                actionContainer.insertBefore(errorMsg, document.getElementById('submit-button'));
            }
            errorMsg.textContent = 'Please label both headlines before submitting';
            setTimeout(() => errorMsg.remove(), 3000);
            return;
        }
        
        // Check both headlines
        let allCorrect = true;
        
        dropZones.forEach(zone => {
            const headlineNumber = zone.dataset.headline;
            const headlineCard = document.getElementById(`headline-${headlineNumber}`);
            const stamp = zone.querySelector('.placed-stamp');
            
            if (stamp && headlineCard) {
                const headlineType = headlineCard.dataset.type; // 'real' or 'fake'
                const stampType = stamp.classList.contains('real-stamp') ? 'real' : 'fake';
                
                // Check if this specific headline is correctly labeled
                if (headlineType !== stampType) {
                    allCorrect = false;
                }
            }
        });
        
        // Store the overall result
        this.lastAnswerCorrect = allCorrect;
        
        // Process the answer
        this.processAnswer(null, null, false);
    }
    
    async saveGameResults() {
        // Save completed game results to database
        try {
            const gameData = {
                stage: 1,
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
            console.error('Error saving game results:', error);
        }
    }
}

// Initialize the game when the page loads
let stage1GameNew;
document.addEventListener('DOMContentLoaded', function() {
    // Prevent multiple initializations
    if (stage1GameNew) {
        console.log('Stage1GameNew already initialized, skipping...');
        return;
    }
    
    console.log('Initializing Stage1GameNew...');
    stage1GameNew = new Stage1GameNew();
    stage1GameNew.initializeStage();
});
