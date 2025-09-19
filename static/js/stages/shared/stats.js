/**
 * Stage Stats Component - NEW VERSION
 * Manages the shared stats header for all game stages (DISPLAY ONLY)
 * Stage 1 handles its own scoring logic completely
 */

class StageStatsNew {
  constructor() {
    this.currentRound = 0;
    this.totalRounds = 10;
    this.currentXP = 0;
    
    this.init();
  }
  
  init() {
    this.updateDisplay();
  }
  
  /**
   * Update the stage information
   * @param {number} stageNumber - The current stage number
   * @param {string} stageTitle - The stage title
   */
  setStageInfo(stageNumber, stageTitle) {
    const stageNumberEl = document.getElementById('stage-number');
    const stageTitleEl = document.getElementById('stage-title');
    
    if (stageNumberEl) stageNumberEl.textContent = stageNumber;
    if (stageTitleEl) stageTitleEl.textContent = stageTitle;
  }
  
  /**
   * Update the current round
   * @param {number} round - Current round number
   * @param {number} total - Total number of rounds (optional)
   */
  setRound(round, total = null) {
    this.currentRound = round;
    if (total !== null) this.totalRounds = total;
    
    this.updateRoundDisplay();
    this.updateProgress();
  }
  
  /**
   * Add XP to the current total
   * @param {number} xp - XP to add
   */
  addXP(xp) {
    this.currentXP += xp;
    this.updateXPDisplay();
  }
  
  /**
   * Set total XP
   * @param {number} xp - Total XP
   */
  setXP(xp) {
    this.currentXP = xp;
    this.updateXPDisplay();
  }
  
  /**
   * Reset display only (no internal counters)
   */
  reset() {
    this.currentRound = 0;
    this.currentXP = 0;
    this.updateDisplay();
  }
  
  /**
   * Update all display elements
   */
  updateDisplay() {
    this.updateRoundDisplay();
    this.updateXPDisplay();
    this.updateProgress();
    // Note: Accuracy is NOT updated here - handled by individual stages
  }
  
  /**
   * Update round display with animation
   */
  updateRoundDisplay() {
    const roundEl = document.getElementById('current-round');
    if (roundEl) {
      const newText = `${this.currentRound}/${this.totalRounds}`;
      if (roundEl.textContent !== newText) {
        this.animateValueChange(roundEl, newText);
      }
    }
  }
  
  /**
   * Update XP display with animation
   */
  updateXPDisplay() {
    const xpEl = document.getElementById('current-xp');
    if (xpEl) {
      const newText = this.currentXP.toString();
      if (xpEl.textContent !== newText) {
        this.animateValueChange(xpEl, newText);
      }
    }
  }
  
  /**
   * Update progress bar
   */
  updateProgress() {
    const progressFillEl = document.getElementById('progress-fill');
    const progressTextEl = document.getElementById('progress-text');
    
    if (progressFillEl) {
      const percentage = (this.currentRound / this.totalRounds) * 100;
      progressFillEl.style.width = `${percentage}%`;
    }
    
    if (progressTextEl) {
      progressTextEl.textContent = `${this.currentRound}/${this.totalRounds}`;
    }
  }
  
  /**
   * Animate value changes
   * @param {HTMLElement} element - Element to animate
   * @param {string} newValue - New value to display
   */
  animateValueChange(element, newValue) {
    element.classList.add('updated');
    element.textContent = newValue;
    
    setTimeout(() => {
      element.classList.remove('updated');
    }, 500);
  }
  
  /**
   * Show a temporary XP gain notification
   * @param {number} xp - XP gained
   */
  showXPGain(xp) {
    const xpEl = document.getElementById('current-xp');
    if (!xpEl) return;
    
    // Create floating XP indicator
    const indicator = document.createElement('div');
    indicator.textContent = `+${xp} XP`;
    indicator.style.cssText = `
      position: absolute;
      top: -20px;
      right: 0;
      background: linear-gradient(135deg, #10b981, #34d399);
      color: white;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      pointer-events: none;
      animation: xpFloat 2s ease-out forwards;
      z-index: 100;
    `;
    
    // Add animation styles if not already present
    if (!document.getElementById('xp-animation-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'xp-animation-styles';
      styleSheet.textContent = `
        @keyframes xpFloat {
          0% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-30px);
          }
        }
      `;
      document.head.appendChild(styleSheet);
    }
    
    const container = xpEl.parentElement;
    container.style.position = 'relative';
    container.appendChild(indicator);
    
    // Remove after animation
    setTimeout(() => {
      if (indicator.parentElement) {
        indicator.parentElement.removeChild(indicator);
      }
    }, 2000);
  }
}

// Initialize global stats instance
if (!window.stageStatsNew) {
  console.log('Initializing StageStatsNew...');
  window.stageStatsNew = new StageStatsNew();
} else {
  console.log('StageStatsNew already exists, skipping initialization...');
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StageStatsNew;
}
