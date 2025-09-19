/**
 * Timezone utilities for consistent Philippine time display
 */

// Philippine timezone constant (UTC+8)
const PHILIPPINE_TIMEZONE = 'Asia/Manila';

/**
 * Format a date string or Date object to Philippine time
 * @param {string|Date} dateInput - Date input to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string in Philippine time
 */
function formatPhilippineDate(dateInput, options = {}) {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    const defaultOptions = {
        timeZone: PHILIPPINE_TIMEZONE,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
    };
    
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
}

/**
 * Format a date string or Date object to Philippine time (date only)
 * @param {string|Date} dateInput - Date input to format
 * @returns {string} Formatted date string in Philippine time
 */
function formatPhilippineDateOnly(dateInput) {
    return formatPhilippineDate(dateInput, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

/**
 * Format a date string or Date object to Philippine time (time only)
 * @param {string|Date} dateInput - Date input to format
 * @returns {string} Formatted time string in Philippine time
 */
function formatPhilippineTimeOnly(dateInput) {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    return new Intl.DateTimeFormat('en-US', {
        timeZone: PHILIPPINE_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    }).format(date);
}

/**
 * Format a date string or Date object to Philippine date and time
 * @param {string|Date} dateInput - Date input to format
 * @returns {string} Formatted datetime string in Philippine time
 */
function formatPhilippineDateTime(dateInput) {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    return new Intl.DateTimeFormat('en-US', {
        timeZone: PHILIPPINE_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).format(date);
}

/**
 * Format a date for short display (e.g., in charts)
 * @param {string|Date} dateInput - Date input to format
 * @returns {string} Short formatted date string
 */
function formatPhilippineShortDate(dateInput) {
    return formatPhilippineDate(dateInput, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Get current Philippine time
 * @returns {Date} Current date in Philippine timezone
 */
function getCurrentPhilippineTime() {
    return new Date(new Intl.DateTimeFormat('en-CA', {
        timeZone: PHILIPPINE_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(new Date()).replace(/,/g, ''));
}

// Export functions for use in other scripts
window.PhilippineTime = {
    formatDate: formatPhilippineDate,
    formatDateOnly: formatPhilippineDateOnly,
    formatTimeOnly: formatPhilippineTimeOnly,
    formatDateTime: formatPhilippineDateTime,
    formatShortDate: formatPhilippineShortDate,
    getCurrentTime: getCurrentPhilippineTime,
    TIMEZONE: PHILIPPINE_TIMEZONE
};