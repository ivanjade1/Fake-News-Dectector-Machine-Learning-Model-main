// Feedback system with modal confirmation and submission
document.addEventListener('DOMContentLoaded', function() {
  // Small delay to ensure all elements are rendered
  setTimeout(function() {
    const stars = document.querySelectorAll('.star-input');
    const ratingDescription = document.querySelector('.rating-description');
    const form = document.getElementById('feedbackForm');
    
    // Modal elements
    const confirmModal = document.getElementById('feedbackConfirmModal');
    const resultModal = document.getElementById('feedbackResultModal');
    
    const descriptions = {
      1: 'Poor - Needs significant improvement',
      2: 'Fair - Some issues to address', 
      3: 'Good - Generally satisfactory',
      4: 'Very Good - Mostly excellent',
      5: 'Excellent - Outstanding experience'
    };

    // Update rating description
    function updateRatingDescription(rating) {
      if (ratingDescription && descriptions[rating]) {
        ratingDescription.textContent = descriptions[rating];
      }
    }

    // Initialize with existing rating
    const checkedStar = document.querySelector('.star-input:checked');
    if (checkedStar) {
      updateRatingDescription(checkedStar.value);
    }

    // Add event listeners to stars
    stars.forEach(star => {
      const label = star.nextElementSibling; // Get the associated label
      
      star.addEventListener('change', function() {
        updateRatingDescription(this.value);
        
        // Visual feedback - highlight selected stars
        const rating = parseInt(this.value);
        stars.forEach((s, index) => {
          const starValue = parseInt(s.value);
          const starLabel = s.nextElementSibling;
          
          if (starValue <= rating) {
            starLabel.style.color = '#f59e0b';
          } else {
            starLabel.style.color = '';
          }
        });
      });
      
      // Add hover effects to the LABEL (what user actually hovers over)
      if (label) {
        label.addEventListener('mouseover', function() {
          const rating = parseInt(star.value);
          
          // Update description on hover
          updateRatingDescription(rating);
          
          // Visual hover effect
          stars.forEach((s, index) => {
            const starValue = parseInt(s.value);
            const starLabel = s.nextElementSibling;
            
            if (starValue <= rating) {
              starLabel.style.color = '#fbbf24';
            } else {
              starLabel.style.color = '';
            }
          });
        });
      }
      
      // Also add hover effects to the input (backup)
      star.addEventListener('mouseover', function() {
        const rating = parseInt(this.value);
        
        // Update description on hover
        updateRatingDescription(rating);
        
        // Visual hover effect
        stars.forEach((s, index) => {
          const starValue = parseInt(s.value);
          const starLabel = s.nextElementSibling;
          
          if (starValue <= rating) {
            starLabel.style.color = '#fbbf24';
          } else {
            starLabel.style.color = '';
          }
        });
      });
    });

    // Reset hover effects when mouse leaves star rating area
    const starRating = document.querySelector('.star-rating');
    if (starRating) {
      starRating.addEventListener('mouseleave', function() {
        const checkedStar = document.querySelector('.star-input:checked');
        if (checkedStar) {
          const rating = parseInt(checkedStar.value);
          
          // Restore description for selected rating
          updateRatingDescription(rating);
          
          // Restore visual state for selected rating
          stars.forEach((s, index) => {
            const starValue = parseInt(s.value);
            const starLabel = s.nextElementSibling;
            
            if (starValue <= rating) {
              starLabel.style.color = '#f59e0b';
            } else {
              starLabel.style.color = '';
            }
          });
        } else {
          // Clear description and reset all stars if none selected
          if (ratingDescription) {
            ratingDescription.textContent = '';
          }
          stars.forEach(s => {
            s.nextElementSibling.style.color = '';
          });
        }
      });
    }

    // Form submission handling with confirmation modal
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault(); // Prevent default form submission
        
        // Collect form data
        const formData = new FormData(form);
        const name = formData.get('name') || '';
        const comments = formData.get('comments') || '';
        const rating = formData.get('rating');
        
        // Validate form
        if (!comments.trim()) {
          alert('Comments are required.');
          return;
        }
        
        if (!rating || rating < 1 || rating > 5) {
          alert('Please select a rating between 1 and 5 stars.');
          return;
        }
        
        // Show confirmation modal with form data
        showConfirmationModal(name, comments, parseInt(rating));
      });
    }

    // Modal functions
    function showConfirmationModal(name, comments, rating) {
      // Populate confirmation modal
      document.getElementById('confirmName').textContent = name || 'Anonymous';
      document.getElementById('confirmComments').textContent = comments;
      
      // Create star display with new structure
      const confirmRatingDiv = document.getElementById('confirmRating');
      confirmRatingDiv.innerHTML = '';
      
      // Create stars container
      const starsContainer = document.createElement('div');
      starsContainer.className = 'modal-rating-stars';
      
      for (let i = 1; i <= 5; i++) {
        const star = document.createElement('i');
        star.className = `bi bi-star${i <= rating ? '-fill' : ''} text-lg`;
        star.style.color = i <= rating ? '#f59e0b' : '#d1d5db';
        starsContainer.appendChild(star);
      }
      
      // Add rating text
      const ratingText = document.createElement('span');
      ratingText.className = 'modal-rating-text';
      ratingText.textContent = `${rating} star${rating !== 1 ? 's' : ''} - ${descriptions[rating]}`;
      
      // Append both containers
      confirmRatingDiv.appendChild(starsContainer);
      confirmRatingDiv.appendChild(ratingText);
      
      // Show modal
      confirmModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }

    function hideConfirmationModal() {
      confirmModal.classList.add('hidden');
      document.body.style.overflow = '';
    }

    function showResultModal() {
      // Show loading state
      document.getElementById('feedbackLoading').classList.remove('hidden');
      document.getElementById('feedbackError').classList.add('hidden');
      document.getElementById('feedbackSuccess').classList.add('hidden');
      document.getElementById('retryFeedbackSubmit').classList.add('hidden');
      document.getElementById('closeFeedbackResultBtn').classList.add('hidden');
      
      resultModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }

    function hideResultModal() {
      resultModal.classList.add('hidden');
      document.body.style.overflow = '';
    }

    function showSuccess() {
      document.getElementById('feedbackLoading').classList.add('hidden');
      document.getElementById('feedbackError').classList.add('hidden');
      document.getElementById('feedbackSuccess').classList.remove('hidden');
      document.getElementById('retryFeedbackSubmit').classList.add('hidden');
      document.getElementById('closeFeedbackResultBtn').classList.remove('hidden');
      
      // Reset form after successful submission
      form.reset();
      // Clear star selections
      stars.forEach(s => {
        s.checked = false;
        s.nextElementSibling.style.color = '';
      });
      if (ratingDescription) {
        ratingDescription.textContent = '';
      }
    }

    function showError(message) {
      // If modals exist, show error in modal
      if (resultModal) {
        document.getElementById('feedbackLoading').classList.add('hidden');
        document.getElementById('feedbackError').classList.remove('hidden');
        document.getElementById('feedbackSuccess').classList.add('hidden');
        document.getElementById('feedbackErrorMessage').textContent = message;
        document.getElementById('retryFeedbackSubmit').classList.remove('hidden');
        document.getElementById('closeFeedbackResultBtn').classList.remove('hidden');
      } else {
        // Fallback to alert if modal doesn't exist
        alert(message);
      }
    }

    async function submitFeedback() {
      const formData = new FormData(form);
      
      try {
        const response = await fetch(form.action || window.location.pathname, {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          showSuccess();
        } else {
          const errorText = await response.text();
          showError('Failed to submit feedback. Please try again.');
        }
      } catch (error) {
        console.error('Error submitting feedback:', error);
        showError('Network error. Please check your connection and try again.');
      }
    }

    // Modal event listeners - only add if modals exist
    if (confirmModal && resultModal) {
      // Confirmation modal
      document.getElementById('closeFeedbackConfirmModal').addEventListener('click', hideConfirmationModal);
      document.getElementById('cancelFeedbackSubmit').addEventListener('click', hideConfirmationModal);
      
      document.getElementById('confirmFeedbackSubmit').addEventListener('click', function() {
        hideConfirmationModal();
        showResultModal();
        submitFeedback();
      });
      
      // Result modal
      document.getElementById('closeFeedbackResultModal').addEventListener('click', hideResultModal);
      document.getElementById('closeFeedbackResultBtn').addEventListener('click', hideResultModal);
      
      document.getElementById('retryFeedbackSubmit').addEventListener('click', function() {
        showResultModal();
        submitFeedback();
      });
      
      // Close modals when clicking outside
      confirmModal.addEventListener('click', function(e) {
        // Check if the click is outside the modal content
        const modalCard = confirmModal.querySelector('.modal-card');
        if (modalCard && !modalCard.contains(e.target)) {
          hideConfirmationModal();
        }
      });
      
      resultModal.addEventListener('click', function(e) {
        // Check if the click is outside the modal content
        const modalCard = resultModal.querySelector('.modal-card');
        if (modalCard && !modalCard.contains(e.target)) {
          hideResultModal();
        }
      });
      
      // Close modals with Escape key
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          if (!confirmModal.classList.contains('hidden')) {
            hideConfirmationModal();
          }
          if (!resultModal.classList.contains('hidden')) {
            hideResultModal();
          }
        }
      });
    }

    // Reset button event listener
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        resetForm();
      });
    }

    // Reset form function
    function resetForm() {
      // Reset the form
      if (form) {
        form.reset();
      }
      
      // Reset star ratings visual state
      stars.forEach(star => {
        const starLabel = star.nextElementSibling;
        if (starLabel) {
          starLabel.style.color = '';
        }
      });
      
      // Reset rating description
      if (ratingDescription) {
        ratingDescription.textContent = '';
      }
      
      // Clear any error states or styling
      const inputs = form.querySelectorAll('.auth-input');
      inputs.forEach(input => {
        input.classList.remove('error'); // Remove any error classes if they exist
      });
    }

  }, 100); // 100ms delay
});
