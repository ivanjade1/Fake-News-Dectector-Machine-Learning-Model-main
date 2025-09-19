/**
 * Profile Edit Functionality
 * Handles modal interactions and form submissions for profile updates
 */

class ProfileEditor {
    constructor() {
        // Track user interactions with form fields
        this.interactions = {
            username: false,
            email: false,
            newPassword: false,
            confirmPassword: false,
            usernamePassword: false,
            emailPassword: false,
            currentPassword: false
        };
        this.init();
    }

    init() {
        // Allow strong-password suggestion ONLY on new-password.
        // Suppress autofill/manager prompts on everything else.
        this.configureAutofillBehavior();

        this.bindEventListeners();
        this.setupValidation();
    }

    // --- Autofill/suggestion configuration ---
    configureAutofillBehavior() {
        // Inputs present in the profile edit modals
        const ids = {
            textLike: ['new-username', 'new-email'], // never show suggestions
            passwordSuggestOnly: ['new-password'],   // allow "Suggest strong password"
            passwordNoSuggest: [                     // never show suggestions
                'confirm-password',
                'username-password',
                'email-password',
                'current-password'
            ]
        };

        // Unique autocomplete section token to avoid any saved-credential matching
        const section = 'section-profile-' + Math.random().toString(36).slice(2);

        // Helper: lock field until user interacts (prevents silent prefill/overlay on load)
        const lockUntilInteraction = (el) => {
            el.setAttribute('readonly', 'readonly');
            const unlock = () => el.removeAttribute('readonly');
            el.addEventListener('focus', unlock, { once: true, capture: true });
            el.addEventListener('pointerdown', unlock, { once: true, capture: true });
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Tab' || e.key.length === 1) unlock();
            }, { once: true, capture: true });
        };

        // Hardening applied to all
        const harden = (el) => {
            el.setAttribute('autocapitalize', 'none');
            el.setAttribute('autocorrect', 'off');
            el.setAttribute('spellcheck', 'false');
        };

        // 1) Non-password text fields: no suggestions, no autofill
        ids.textLike.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            harden(el);
            lockUntilInteraction(el);
            el.setAttribute('autocomplete', 'off');
            el.setAttribute('data-autocomplete-section', section);
        });

        // 2) NEW PASSWORD: allow browser strong-password UI
        ids.passwordSuggestOnly.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            harden(el);
            // Make sure it's a real password field
            try { el.type = 'password'; } catch (_) {}
            // Standard hint for creation flows
            el.setAttribute('autocomplete', 'new-password');
            // We still lock until interaction to prevent noisy overlays before focus
            lockUntilInteraction(el);
            // Ensure no masking hack applied here
            el.style.webkitTextSecurity = '';
            el.removeAttribute('data-masked');
        });

        // 3) All other password inputs: DO NOT allow suggestions
        ids.passwordNoSuggest.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            harden(el);
            // Convert to masked text so browsers/managers don't treat it as a password field
            try { el.type = 'text'; } catch (_) {}
            el.style.webkitTextSecurity = 'disc';
            el.setAttribute('data-masked', 'true');
            el.setAttribute('autocomplete', 'off');
            el.setAttribute('data-autocomplete-section', section);
            lockUntilInteraction(el);
        });
    }
    // --- End autofill/suggestion configuration ---

    bindEventListeners() {
        // Edit button clicks
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const editType = btn.getAttribute('data-edit-type');
                this.openModal(editType);
            });
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
                    const modalId = btn.getAttribute('data-modal');
                    if (modalId) {
                        this.closeModal(modalId);
                    }
                }
                if (btn.getAttribute('data-modal') && btn.textContent.includes('Cancel')) {
                    const modalId = btn.getAttribute('data-modal');
                    this.closeModal(modalId);
                }
            });
        });

        // Modal overlay clicks (close when clicking outside)
        document.querySelectorAll('.modal-backdrop').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.add('hidden');
                }
            });
        });

        // Form submissions
        document.getElementById('edit-username-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitUsernameUpdate();
        });

        document.getElementById('edit-email-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitEmailUpdate();
        });

        document.getElementById('edit-password-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitPasswordUpdate();
        });
    }

    setupValidation() {
        // Real-time username validation
        const usernameInput = document.getElementById('new-username');
        const usernameFeedback = document.getElementById('username-feedback');
        
        if (usernameInput) {
            usernameInput.addEventListener('focus', () => {
                this.interactions.username = true;
            });
            
            usernameInput.addEventListener('input', () => {
                if (!this.interactions.username) return;
                
                const username = usernameInput.value.trim();
                this.updateValidation(usernameInput, usernameFeedback, this.validateUsername(username));
            });
        }

        // Real-time email validation
        const emailInput = document.getElementById('new-email');
        const emailFeedback = document.getElementById('email-feedback');
        
        if (emailInput) {
            emailInput.addEventListener('focus', () => {
                this.interactions.email = true;
            });
            
            emailInput.addEventListener('input', () => {
                if (!this.interactions.email) return;
                
                const email = emailInput.value.trim();
                this.updateValidation(emailInput, emailFeedback, this.validateEmail(email));
            });
        }

        // Real-time password validation
        const newPasswordInput = document.getElementById('new-password');
        const confirmPasswordInput = document.getElementById('confirm-password');
        const passwordStrength = document.getElementById('password-strength');
        const passwordMatch = document.getElementById('password-match');

        if (newPasswordInput) {
            newPasswordInput.addEventListener('focus', () => {
                this.interactions.newPassword = true;
            });

            newPasswordInput.addEventListener('input', () => {
                if (!this.interactions.newPassword) return;
                
                const password = newPasswordInput.value;
                const validation = this.validatePassword(password);
                this.updateValidation(newPasswordInput, passwordStrength, validation);
                
                // Check match if confirm password has value and user has interacted with it
                if (confirmPasswordInput && confirmPasswordInput.value && this.interactions.confirmPassword) {
                    this.checkPasswordMatch();
                }
            });
        }

        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('focus', () => {
                this.interactions.confirmPassword = true;
            });

            confirmPasswordInput.addEventListener('input', () => {
                if (!this.interactions.confirmPassword) return;
                this.checkPasswordMatch();
            });
        }

        // Handle password fields in individual edit modals (username, email edit modals)
        this.setupModalPasswordField('username-password', 'usernamePassword');
        this.setupModalPasswordField('email-password', 'emailPassword');
        this.setupModalPasswordField('current-password', 'currentPassword');
    }

    setupModalPasswordField(fieldId, interactionKey) {
        const passwordInput = document.getElementById(fieldId);
        if (passwordInput) {
            passwordInput.addEventListener('focus', () => {
                this.interactions[interactionKey] = true;
            });
            
            passwordInput.addEventListener('input', () => {
                if (!this.interactions[interactionKey]) return;
                
                const password = passwordInput.value;
                // Simple validation for confirmation/verification password fields
                passwordInput.classList.remove('input-error', 'input-success');
                
                if (password.length === 0) {
                    // No styling for empty field
                } else if (password.length >= 6) {
                    passwordInput.classList.add('input-success');
                } else {
                    passwordInput.classList.add('input-error');
                }
            });
        }
    }

    updateValidation(input, feedback, validation) {
        // Update feedback text and color
        feedback.textContent = validation.message;
        feedback.className = `char-counter ${validation.valid ? 'text-green-600' : 'text-red-600'}`;
        
        // Update input border styling
        input.classList.remove('input-error', 'input-success');
        if (validation.message) { // Only add classes if there's a message (user has interacted)
            if (validation.valid) {
                input.classList.add('input-success');
            } else {
                input.classList.add('input-error');
            }
        }
    }

    validateUsername(username) {
        if (!username) {
            return { valid: false, message: '' }; // No message for empty input
        }
        if (username.length < 3) {
            return { valid: false, message: 'Username must be at least 3 characters' };
        }
        if (username.length > 20) {
            return { valid: false, message: 'Username must be no more than 20 characters' };
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return { valid: false, message: 'Username can only contain letters, numbers, and underscores' };
        }
        return { valid: true, message: 'Username looks good!' };
    }

    validateEmail(email) {
        if (!email) {
            return { valid: false, message: '' }; // No message for empty input
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { valid: false, message: 'Please enter a valid email address' };
        }
        return { valid: true, message: 'Email format is valid' };
    }

    validatePassword(password) {
        if (!password) {
            return { valid: false, message: '' }; // No message for empty input
        }
        if (password.length < 6) {
            return { valid: false, message: 'Password must be at least 6 characters' };
        }

        const checks = {
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        const metCriteria = Object.values(checks).filter(Boolean).length;
        if (metCriteria < 3) {
            return { valid: false, message: 'Password needs at least 3 of: uppercase, lowercase, number, special character' };
        }

        return { valid: true, message: 'Password strength is good!' };
    }

    checkPasswordMatch() {
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const confirmPasswordInput = document.getElementById('confirm-password');
        const passwordMatch = document.getElementById('password-match');

        if (!confirmPassword) {
            passwordMatch.textContent = '';
            confirmPasswordInput.classList.remove('input-error', 'input-success');
            return;
        }

        const isMatch = newPassword === confirmPassword;
        const validation = {
            valid: isMatch,
            message: isMatch ? 'Passwords match!' : 'Passwords do not match'
        };

        this.updateValidation(confirmPasswordInput, passwordMatch, validation);
    }

    openModal(type) {
        const modalId = `edit-${type}-modal`;
        const modal = document.getElementById(modalId);
        if (modal) {
            // Hide any existing success message when opening a modal
            const successAlert = document.getElementById('profile-success-message');
            if (successAlert) {
                successAlert.classList.add('hidden');
            }
            
            modal.classList.remove('hidden');
            // Focus first input
            const firstInput = modal.querySelector('input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            // Clear form
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
                // Clear feedback messages
                modal.querySelectorAll('.char-counter').forEach(el => {
                    el.textContent = '';
                    el.className = 'char-counter';
                });
                // Clear validation classes from inputs
                modal.querySelectorAll('input').forEach(input => {
                    input.classList.remove('input-error', 'input-success');
                });
            }
            
            // Reset interaction states based on modal type
            if (modalId.includes('username')) {
                this.interactions.username = false;
                this.interactions.usernamePassword = false;
            } else if (modalId.includes('email')) {
                this.interactions.email = false;
                this.interactions.emailPassword = false;
            } else if (modalId.includes('password')) {
                this.interactions.newPassword = false;
                this.interactions.confirmPassword = false;
            }
        }
    }

    async submitUsernameUpdate() {
        const newUsername = document.getElementById('new-username').value.trim();
        const password = document.getElementById('username-password').value;
        const submitBtn = document.querySelector('#edit-username-form button[type="submit"]');

        // Clear previous errors
        this.clearFieldErrors(['username-feedback', 'username-password-feedback']);

        // Validate
        const usernameValidation = this.validateUsername(newUsername);
        if (!usernameValidation.valid) {
            this.showError('username-feedback', usernameValidation.message);
            return;
        }

        if (!password) {
            this.showError('username-password-feedback', 'Password is required');
            return;
        }

        // Show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-arrow-clockwise spinning mr-2"></i>Updating...';

        try {
            const response = await fetch('/auth/update-username', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: newUsername,
                    password: password
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('Username updated successfully!');
                this.closeModal('edit-username-modal');
                // Update the displayed username
                document.querySelector('[data-edit-type="username"]').previousElementSibling.textContent = newUsername;
                // Update the header username if it exists
                const headerUsername = document.querySelector('.text-xl.font-semibold');
                if (headerUsername) {
                    headerUsername.textContent = newUsername;
                }
            } else {
                // Show error in appropriate field based on the error type
                if (result.message && result.message.toLowerCase().includes('password')) {
                    this.showError('username-password-feedback', result.message);
                } else {
                    this.showError('username-feedback', result.message);
                }
            }
        } catch (error) {
            console.error('Error updating username:', error);
            this.showError('username-feedback', 'Network error occurred');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Update Username';
        }
    }

    async submitEmailUpdate() {
        const newEmail = document.getElementById('new-email').value.trim();
        const password = document.getElementById('email-password').value;
        const submitBtn = document.querySelector('#edit-email-form button[type="submit"]');

        // Clear previous errors
        this.clearFieldErrors(['email-feedback', 'email-password-feedback']);

        // Validate
        const emailValidation = this.validateEmail(newEmail);
        if (!emailValidation.valid) {
            this.showError('email-feedback', emailValidation.message);
            return;
        }

        if (!password) {
            this.showError('email-password-feedback', 'Password is required');
            return;
        }

        // Show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-arrow-clockwise spinning mr-2"></i>Updating...';

        try {
            const response = await fetch('/auth/update-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: newEmail,
                    password: password
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('Email updated successfully!');
                this.closeModal('edit-email-modal');
                // Update the displayed email
                document.querySelector('[data-edit-type="email"]').previousElementSibling.textContent = newEmail;
                // Update the header email if it exists
                const headerEmail = document.querySelector('p.text-neutral-600');
                if (headerEmail) {
                    headerEmail.textContent = newEmail;
                }
            } else {
                // Show error in appropriate field based on the error type
                if (result.message && result.message.toLowerCase().includes('password')) {
                    this.showError('email-password-feedback', result.message);
                } else {
                    this.showError('email-feedback', result.message);
                }
            }
        } catch (error) {
            console.error('Error updating email:', error);
            this.showError('email-feedback', 'Network error occurred');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Update Email';
        }
    }

    async submitPasswordUpdate() {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const submitBtn = document.querySelector('#edit-password-form button[type="submit"]');

        // Clear previous errors
        this.clearFieldErrors(['current-password-feedback', 'password-strength', 'password-match']);

        // Validate
        if (!currentPassword) {
            this.showError('current-password-feedback', 'Current password is required');
            return;
        }

        const passwordValidation = this.validatePassword(newPassword);
        if (!passwordValidation.valid) {
            this.showError('password-strength', passwordValidation.message);
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showError('password-match', 'Passwords do not match');
            return;
        }

        // Show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-arrow-clockwise spinning mr-2"></i>Changing...';

        try {
            const response = await fetch('/auth/update-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                    confirm_password: confirmPassword
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('Password changed successfully!');
                this.closeModal('edit-password-modal');
            } else {
                // Show error in appropriate field based on the error type
                if (result.message && result.message.toLowerCase().includes('current password')) {
                    this.showError('current-password-feedback', result.message);
                } else {
                    this.showError('password-strength', result.message);
                }
            }
        } catch (error) {
            console.error('Error updating password:', error);
            this.showError('password-strength', 'Network error occurred');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Change Password';
        }
    }

    showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.className = 'char-counter text-red-600';
            
            // Also add error styling to the corresponding input field
            const inputId = this.getInputIdFromFeedbackId(elementId);
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                inputElement.classList.remove('input-success');
                inputElement.classList.add('input-error');
            }
        }
    }

    getInputIdFromFeedbackId(feedbackId) {
        // Map feedback element IDs to their corresponding input IDs
        const mappings = {
            'username-feedback': 'new-username',
            'email-feedback': 'new-email',
            'password-strength': 'new-password',
            'password-match': 'confirm-password',
            'current-password-feedback': 'current-password',
            'username-password-feedback': 'username-password',
            'email-password-feedback': 'email-password'
        };
        return mappings[feedbackId] || null;
    }

    clearFieldErrors(fieldIds) {
        fieldIds.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.textContent = '';
                element.className = 'char-counter';
            }
            
            // Also clear error styling from the corresponding input field
            const inputId = this.getInputIdFromFeedbackId(fieldId);
            const inputElement = document.getElementById(inputId);
            if (inputElement) {
                inputElement.classList.remove('input-error', 'input-success');
            }
        });
    }

    showSuccess(message) {
        // Show success message in the profile card
        const successAlert = document.getElementById('profile-success-message');
        const successText = document.getElementById('profile-success-text');
        
        if (successAlert && successText) {
            successText.textContent = message;
            successAlert.classList.remove('hidden');
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                successAlert.classList.add('hidden');
            }, 5000);
            
            // Scroll to top to ensure user sees the message
            const profileCard = successAlert.closest('.auth-card');
            if (profileCard) {
                profileCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }
}

// CSS for spinning animation
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
    }
    .spinning { animation: spin 1s linear infinite; }
`;
document.head.appendChild(style);

// ---------- Imported non-duplicate helpers from auth-utils ----------

// Enhanced password toggle that works for real password inputs and masked text fields
window.togglePassword = function(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const toggleButton = input.nextElementSibling;
    const icon = toggleButton ? toggleButton.querySelector('i') : null;

    // Case 1: real password input (e.g., new-password)
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) { icon.classList.remove('bi-eye'); icon.classList.add('bi-eye-slash'); }
        if (toggleButton) toggleButton.setAttribute('aria-label', 'Hide password');
        return;
    }
    if (input.type === 'text' && input.getAttribute('data-masked') === 'false') {
        // currently showing plain text -> re-mask
        input.style.webkitTextSecurity = 'disc';
        input.setAttribute('data-masked', 'true');
        if (icon) { icon.classList.remove('bi-eye-slash'); icon.classList.add('bi-eye'); }
        if (toggleButton) toggleButton.setAttribute('aria-label', 'Show password');
        return;
    }
    // Case 2: masked text field (confirm/current/username/email passwords)
    if (input.type === 'text' && input.getAttribute('data-masked') === 'true') {
        input.style.webkitTextSecurity = 'none';
        input.setAttribute('data-masked', 'false');
        if (icon) { icon.classList.remove('bi-eye'); icon.classList.add('bi-eye-slash'); }
        if (toggleButton) toggleButton.setAttribute('aria-label', 'Hide password');
    }
};

// Keyboard navigation: Enter moves to next input or submits form
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'submit') {
        e.preventDefault();
        const form = e.target.closest('form');
        if (!form) return;
        const els = Array.from(form.querySelectorAll('input, button[type="submit"]'));
        const i = els.indexOf(e.target);
        if (i > -1 && i < els.length - 1) {
            els[i + 1].focus();
        } else {
            form.requestSubmit ? form.requestSubmit() : form.submit();
        }
    }
});
// -------------------------------------------------------------------

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ProfileEditor();
});
