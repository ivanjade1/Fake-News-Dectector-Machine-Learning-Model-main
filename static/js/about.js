// About Page JavaScript - Accordion Functionality
// Based on working history.css accordion behavior

document.addEventListener('DOMContentLoaded', function() {
    initializeAccordions();
    handleHashNavigation();
    initializeSmoothScrolling();
});

/**
 * Initialize accordion functionality - based on history.css behavior
 * Allows multiple accordions to be open simultaneously
 */
function initializeAccordions() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    
    accordionHeaders.forEach(header => {
        header.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('data-target');
            const targetContent = document.getElementById(targetId);
            const icon = this.querySelector('.accordion-icon');
            
            if (!targetContent) {
                console.warn('Target content not found:', targetId);
                return;
            }
            
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            
            // Toggle current accordion only (no closing others)
            if (isExpanded) {
                // Close
                this.setAttribute('aria-expanded', 'false');
                targetContent.classList.add('hidden');
                if (icon) {
                    icon.style.transform = 'rotate(0deg)';
                }
            } else {
                // Open
                this.setAttribute('aria-expanded', 'true');
                targetContent.classList.remove('hidden');
                if (icon) {
                    icon.style.transform = 'rotate(180deg)';
                }
            }
        });
        
        // Set initial state
        header.setAttribute('aria-expanded', 'false');
    });
    
    // Debug: Check if accordions are found
    console.log('Found accordion headers:', accordionHeaders.length);
    accordionHeaders.forEach((header, index) => {
        const target = header.getAttribute('data-target');
        const content = document.getElementById(target);
        console.log(`Header ${index}:`, target, content ? 'found' : 'NOT FOUND');
    });
}

/**
 * Handle hash navigation for direct links to sections
 */
function handleHashNavigation() {
    const hash = window.location.hash;
    if (hash) {
        const targetElement = document.querySelector(hash);
        if (targetElement) {
            // Scroll to the section
            setTimeout(() => {
                targetElement.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Highlight the section briefly
                targetElement.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
                targetElement.style.transition = 'background-color 0.3s ease';
                
                setTimeout(() => {
                    targetElement.style.backgroundColor = '';
                }, 2000);
            }, 100);
        }
    }
}

/**
 * Initialize smooth scrolling for anchor links
 */
function initializeSmoothScrolling() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            const targetElement = document.querySelector(href);
            if (targetElement) {
                e.preventDefault();
                
                // Update URL without triggering page jump
                history.pushState(null, null, href);
                
                // Smooth scroll to target
                targetElement.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Brief highlight effect
                targetElement.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
                targetElement.style.transition = 'background-color 0.3s ease';
                
                setTimeout(() => {
                    targetElement.style.backgroundColor = '';
                }, 2000);
            }
        });
    });
}

/**
 * Utility function to close all accordions
 */
function closeAllAccordions() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    const accordionContents = document.querySelectorAll('.accordion-content');
    
    accordionHeaders.forEach(header => {
        header.setAttribute('aria-expanded', 'false');
        const icon = header.querySelector('.accordion-icon');
        if (icon) {
            icon.style.transform = 'rotate(0deg)';
        }
    });
    
    accordionContents.forEach(content => {
        content.classList.remove('show');
        content.style.maxHeight = '0';
    });
}

/**
 * Utility function to open specific accordion
 */
function openAccordion(targetId) {
    const targetContent = document.getElementById(targetId);
    const targetHeader = document.querySelector(`[data-target="${targetId}"]`);
    
    if (targetContent && targetHeader) {
        targetHeader.setAttribute('aria-expanded', 'true');
        targetContent.classList.add('show');
        targetContent.style.maxHeight = targetContent.scrollHeight + 'px';
        
        const icon = targetHeader.querySelector('.accordion-icon');
        if (icon) {
            icon.style.transform = 'rotate(180deg)';
        }
    }
}

/**
 * Handle window resize for accordion content height recalculation
 */
window.addEventListener('resize', function() {
    const openAccordions = document.querySelectorAll('.accordion-content.show');
    
    openAccordions.forEach(content => {
        content.style.maxHeight = content.scrollHeight + 'px';
    });
});

/**
 * Handle browser back/forward navigation
 */
window.addEventListener('popstate', function() {
    handleHashNavigation();
});

/**
 * Export functions for potential external use
 */
window.AboutPage = {
    closeAllAccordions,
    openAccordion,
    handleHashNavigation
};
