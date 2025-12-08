// Video Clipper - Factory Function Pattern
// Handles video clip requests with progress tracking via SSE

// Global variable to store client fingerprint and credits
let clientFingerprint = '';
let availableCredits = 0;
let fingerprintPromise = null;

// Defer fingerprint generation using requestIdleCallback
function initFingerprint() {
    if (fingerprintPromise) return fingerprintPromise;
    
    fingerprintPromise = new Promise((resolve) => {
        const generateAndFetch = async () => {
            try {
                clientFingerprint = await generateFingerprint();
                
                // Fetch credits using the generated fingerprint
                try {
                    const response = await fetch('/api/credits', {
                        headers: {
                            'X-Client-FP': clientFingerprint
                        }
                    });
                    const creditsData = await response.json();
            // Update the credits display
            const creditsDisplay = document.getElementById('credits-available');
            if (creditsDisplay) {
                if (creditsData.credits_left !== undefined) {
                    availableCredits = creditsData.credits_left;
                    creditsDisplay.textContent = availableCredits.toFixed(2);
                    // Update color based on credits
                    creditsDisplay.style.fontWeight = '600';
                    if (availableCredits > 0) {
                        creditsDisplay.style.color = '#10B981'; // Green color for positive credits
                    } else {
                        creditsDisplay.style.color = '#EF4444'; // Red color for zero credits
                    }
                    
                    // Update the credit cost display after credits are loaded
                    if (typeof updateCreditCostDisplay === 'function') {
                        // Update with the new credits
                        updateCreditCostDisplay();
                        // Also update the duration display to trigger cost calculation
                        updateDurationDisplay();
                    }
                    
                    // Show reset time if available
                    const resetTimeElement = document.getElementById('credits-reset-time');
                    if (creditsData.reset_time && resetTimeElement) {
                        // Parse RFC3339 formatted time from server
                        const resetDate = new Date(creditsData.reset_time);
                        const now = new Date();
                        const timeUntilReset = resetDate - now;
                     
                        // Format the reset time in Xh Ym or Xm format
                        let resetTimeText;
                        if (timeUntilReset < 0) {
                            resetTimeText = 'Resets soon';
                        } else {
                            const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
                            const minutes = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));
                            const seconds = Math.floor((timeUntilReset % (1000 * 60)) / 1000);
                            
                            if (hours > 0) {
                                resetTimeText = `Resets in ${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`.trim();
                            } else if (minutes > 0) {
                                resetTimeText = `Resets in ${minutes}m${seconds > 0 ? ` ${seconds}s` : ''}`.trim();
                            } else {
                                resetTimeText = `Resets in ${seconds}s`;
                            }
                        }
                        
                        // Show the reset time element
                        resetTimeElement.style.display = 'inline-block';
                        
                        // Handle hint for both desktop and mobile
                        const mobileHint = document.getElementById('mobile-hint');
                        const isMobile = window.innerWidth <= 768;
                        
                        const showHint = () => {
                            if (mobileHint) {
                                mobileHint.textContent = resetTimeText;
                                mobileHint.style.display = 'block';
                                // Hide on next click outside
                                setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
                            }
                        };
                        
                        const hideHint = () => {
                            if (mobileHint) mobileHint.style.display = 'none';
                            document.removeEventListener('click', handleClickOutside);
                        };
                        
                        const handleClickOutside = (e) => {
                            if (!resetTimeElement.contains(e.target)) {
                                hideHint();
                            }
                        };
                        
                        // Desktop: show on hover, mobile: show on click
                        if (!isMobile) {
                            resetTimeElement.addEventListener('mouseenter', showHint);
                            resetTimeElement.addEventListener('mouseleave', hideHint);
                        } else {
                            // Mobile: show on click
                            resetTimeElement.addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                if (mobileHint) {
                                    const isVisible = mobileHint.style.display === 'block';
                                    if (isVisible) {
                                        hideHint();
                                    } else {
                                        showHint();
                                    }
                                }
                            });
                        }
                        
                    } else if (resetTimeElement) {
                        resetTimeElement.style.display = 'none';
                    }
                } else {
                    creditsDisplay.textContent = 'Unlimited';
                    creditsDisplay.style.fontWeight = '600';
                    creditsDisplay.style.color = '#10B981';
                }
            }
        } catch (error) {
            console.error('Failed to fetch credits:', error);
        }
            } catch (error) {
                console.error('Failed to generate fingerprint:', error);
            }
            resolve();
        };
        
        // Use requestIdleCallback for non-critical initialization
        if ('requestIdleCallback' in window) {
            requestIdleCallback(generateAndFetch, { timeout: 2000 });
        } else {
            setTimeout(generateAndFetch, 100);
        }
    });
    
    return fingerprintPromise;
}

// Initialize on first user interaction or after a delay
if ('requestIdleCallback' in window) {
    requestIdleCallback(() => initFingerprint(), { timeout: 3000 });
} else {
    setTimeout(() => initFingerprint(), 1000);
}

// Also init on first interaction
['click', 'touchstart', 'keydown'].forEach(evt => {
    document.addEventListener(evt, () => initFingerprint(), { once: true, passive: true });
});

// Function to get or generate client fingerprint
async function getClientFingerprint() {
    if (clientFingerprint) return clientFingerprint;
    return await generateFingerprint();
}

// Function to generate a stable client fingerprint
async function generateFingerprint() {
    try {
        // Collect and normalize browser and system information
        const userAgentData = navigator.userAgentData || {};
        
        // Normalize each field
        const fingerprintData = {
            // Convert to string, trim, and normalize case
            userAgent: String(navigator.userAgent || '').trim().toLowerCase(),
            
            // Normalize platform string
            platform: String(
                userAgentData.platform || 
                navigator.platform || ''
            ).trim().toLowerCase(),
            
            // Ensure numeric values are integers
            hardwareConcurrency: Math.max(0, parseInt(navigator.hardwareConcurrency) || 0),
            deviceMemory: Math.max(0, parseInt(navigator.deviceMemory) || 0),
            
            // Ensure screen dimensions are numbers and within reasonable bounds
            screenWidth: Math.max(0, Math.min(9999, parseInt(window.screen.width) || 0)),
            screenHeight: Math.max(0, Math.min(9999, parseInt(window.screen.height) || 0)),
            
            // Normalize timezone (case-insensitive)
            timezone: String(
                Intl.DateTimeFormat().resolvedOptions().timeZone || ''
            ).trim().toLowerCase(),
            
            // Normalize languages: sort, lowercase, and filter out empty strings
            languages: [...(navigator.languages || [])]
                .map(lang => String(lang).trim().toLowerCase())
                .filter(Boolean)
                .sort()
                .join(','),
                
            // Ensure color depth is a reasonable number
            colorDepth: Math.max(1, Math.min(64, parseInt(window.screen.colorDepth) || 0))
        };

        // Convert the data to a JSON string
        const dataString = JSON.stringify(fingerprintData);
        
        // Create a SHA-256 hash
        const msgBuffer = new TextEncoder().encode(dataString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        
        // Convert to hex string (already 64 characters)
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
        console.error('Error generating fingerprint:', error);
        // Fallback to a random 64-character hex string if fingerprinting fails
        const randomValues = new Uint8Array(32);
        crypto.getRandomValues(randomValues);
        return Array.from(randomValues, b => b.toString(16).padStart(2, '0')).join('');
    }
}

// Get or create client fingerprint
async function getClientFingerprint() {
    // Ensure fingerprint is initialized
    await initFingerprint();
    
    try {
        let fingerprint = localStorage.getItem('X-Client-FP');
        if (!fingerprint) {
            fingerprint = await generateFingerprint();
            localStorage.setItem('X-Client-FP', fingerprint);
        }
        return fingerprint;
    } catch (error) {
        console.error('Error in getClientFingerprint:', error);
        // Fallback to a random 64-character hex string if fingerprint retrieval fails
        const randomValues = new Uint8Array(32);
        crypto.getRandomValues(randomValues);
        return Array.from(randomValues, b => b.toString(16).padStart(2, '0')).join('');
    }
}

// Rate limit error handling utilities
function calculateRetryTime(resetTimestamp) {
    // Get current time in seconds
    const now = Math.floor(Date.now() / 1000);
    
    // Calculate difference in seconds
    const totalSeconds = Math.max(0, resetTimestamp - now);
    
    // Break down into hours, minutes, seconds
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return { hours, minutes, seconds, totalSeconds };
}

function formatRetryTime(retryTime) {
    const { hours, minutes, seconds, totalSeconds } = retryTime;
    
    // Handle edge case: time has already passed or is very soon
    if (totalSeconds <= 0) {
        return 'shortly';
    }
    
    // Format based on duration
    if (hours > 0) {
        // Show hours and minutes (e.g., "2h 30m")
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else if (minutes > 0) {
        // Show minutes and seconds (e.g., "45m 30s")
        return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    } else {
        // Show only seconds (e.g., "30s")
        return `${seconds}s`;
    }
}

function formatRateLimitError(response) {
    try {
        // Extract X-RateLimit-Reset header
        const resetHeader = response.headers.get('X-RateLimit-Reset');
        
        if (!resetHeader) {
            // Fallback if header is missing
            return "You've made too many requests. Please try again later.";
        }
        
        // Parse reset timestamp
        const resetTimestamp = parseInt(resetHeader, 10);
        
        if (isNaN(resetTimestamp)) {
            // Fallback if header is invalid
            return "You've made too many requests. Please try again later.";
        }
        
        // Calculate and format retry time
        const retryTime = calculateRetryTime(resetTimestamp);
        const formattedTime = formatRetryTime(retryTime);
        
        // Return formatted message
        return `You've made too many requests. Please try again in ${formattedTime}.`;
        
    } catch (error) {
        console.error('Error formatting rate limit message:', error);
        // Fallback for any unexpected errors
        return "You've made too many requests. Please try again later.";
    }
}

const VideoClipper = (function () {
    // Private state
    let state = {
        form: null,
        progressBar: null,
        progressContainer: null,
        statusText: null,
        actionButtons: null,
        eventSource: null,
        downloadUrl: null,
        completeHandled: false,
        currentProcessId: null,
        cancelButton: null,
        connectionClosedIntentionally: false,
        completeEventReceived: false,
        errorEventReceived: false
    };

    // Private methods
    function updateStatus(message) {
        if (state.statusText) {
            state.statusText.innerHTML = message;
            // Add visible class to trigger animation
            state.statusText.classList.add('visible');
            // Force reflow to ensure animation plays
            void state.statusText.offsetWidth;
        }
    }

    function updateProgress(percent) {
        if (state.progressFill && state.progressLoading) {
            const safePercent = Math.min(100, Math.max(0, percent));
            const roundedPercent = Math.round(safePercent);

            // Update progress fill width and bubble position
            state.progressFill.style.width = `${safePercent}%`;
            
            // Update bubble position and text
            if (state.progressBubble) {
                state.progressBubble.textContent = `${roundedPercent}%`;
                state.progressBubble.style.right = `${100 - safePercent}%`;
                
                // Change bubble color when complete
                if (safePercent === 100) {
                    state.progressBubble.style.background = '#10b981';
                } else {
                    state.progressBubble.style.background = '#4f46e5';
                }
            }

            // Update progress state
            if (safePercent === 0) {
                // Show loading animation
                state.progressLoading.style.display = 'block';
                state.progressFill.style.display = 'none';
                state.progressFill.classList.remove('progress-complete');
                if (state.progressBubble) {
                    state.progressBubble.style.display = 'none';
                }
            } else if (safePercent === 100) {
                // Show complete state
                state.progressLoading.style.display = 'none';
                state.progressFill.style.display = 'block';
                state.progressFill.classList.add('progress-complete');
                state.progressFill.style.width = '100%';
                if (state.progressBubble) {
                    state.progressBubble.style.right = '0%';
                    state.progressBubble.style.background = '#10b981';
                }
            } else {
                // Show progress
                state.progressLoading.style.display = 'none';
                state.progressFill.style.display = 'block';
                state.progressFill.classList.remove('progress-complete');
                if (state.progressBubble) {
                    state.progressBubble.style.display = 'block';
                }
            }

            // Update ARIA attributes
            state.progressBar.setAttribute('aria-valuenow', safePercent);
            state.progressBar.setAttribute('aria-valuetext', `${safePercent}% complete`);
        }

        // Update aria attributes for accessibility
        if (state.progressContainer) {
            state.progressContainer.setAttribute('aria-valuenow', percent);
            state.progressContainer.setAttribute('aria-valuetext', `${Math.round(percent)}% complete`);
        }
    }

    function showLoading() {
        // Reset completion flag for new download
        state.completeHandled = false;
        
        // Reset connection flags
        state.connectionClosedIntentionally = false;
        state.completeEventReceived = false;
        state.errorEventReceived = false;
        
        // Clear any existing error timeouts
        if (errorTimeout) {
            clearTimeout(errorTimeout);
            errorTimeout = null;
        }
        
        // Hide download button, quality selector and credit cost display
        const downloadButton = document.querySelector('.btn-download');
        const qualitySelector = document.querySelector('.quality-selector');
        const creditCostDisplay = document.getElementById('credit-cost-display');
        
        if (downloadButton) downloadButton.classList.add('hidden');
        if (qualitySelector) qualitySelector.classList.add('hidden');
        if (creditCostDisplay) creditCostDisplay.style.display = 'none';
       
        // Create progress elements if they don't exist
        if (!state.progressContainer) {
            createProgressElements();
        }

        // Show and animate progress container
        if (state.progressContainer) {
            state.progressContainer.style.display = 'block';
            state.progressContainer.classList.add('visible');
            
            // Show progress info
            const progressInfo = state.progressContainer.querySelector('.progress-info');
            if (progressInfo) {
                progressInfo.style.visibility = 'visible';
                progressInfo.style.opacity = '1';
            }

            // Reset progress bar state completely
            if (!state.progressBar && state.progressContainer) {
                // Recreate progress elements if they don't exist
                createProgressElements();
            }
            
            if (state.progressBar) {
                // Reset progress bar styles
                state.progressBar.style.background = '';
                state.progressBar.style.animation = '';
                state.progressBar.style.width = '100%';
                state.progressBar.setAttribute('aria-valuenow', '0');
                state.progressBar.setAttribute('aria-valuetext', '0% complete');
                state.progressBar.classList.remove('error');
                
                // Reset progress fill
                if (state.progressFill) {
                    state.progressFill.style.transition = 'none';
                    state.progressFill.style.width = '0%';
                    state.progressFill.style.background = '#4f46e5';
                    state.progressFill.classList.remove('progress-complete', 'error');
                    state.progressFill.style.display = 'block';
                    
                    // Force reflow to ensure styles are applied
                    void state.progressFill.offsetWidth;
                    
                    // Enable transitions
                    state.progressFill.style.transition = 'width 0.3s ease-out';
                }
                
                // Reset loading indicator
                if (state.progressLoading) {
                    state.progressLoading.style.display = 'block';
                }
                
                // Reset bubble
                if (state.progressBubble) {
                    state.progressBubble.style.display = 'none';
                    state.progressBubble.textContent = '0%';
                    state.progressBubble.style.background = '#4f46e5';
                }
                
                // Force update to 0% to ensure visibility
                updateProgress(0);
            }
            
            if (state.progressLoading) {
                state.progressLoading.style.display = 'block';
            }
            
            if (state.progressBubble) {
                state.progressBubble.style.display = 'none';
                state.progressBubble.style.background = '#4f46e5';
                state.progressBubble.textContent = '0%';
            }
            
            // Reset progress bar container state
            if (state.progressBar) {
                state.progressBar.removeAttribute('aria-valuenow');
                state.progressBar.removeAttribute('aria-valuetext');
            }
        }

        // Reset status text state
        if (state.statusText) {
            // Remove any error state
            state.statusText.classList.remove('error');
            state.statusText.style.opacity = '1';
            state.statusText.style.visibility = 'visible';
            
            state.statusText.setAttribute('data-status', 'loading');
            state.statusText.innerHTML = `
                <div class="status-message">
                    <div>Getting video information...</div>
                </div>
            `;
            state.statusText.style.display = 'block';
            state.statusText.classList.add('visible');
        }

        // Initial progress update
        updateProgress(0);
    }

    function hideLoading(force = false) {
        // Don't hide loading if there's an error showing, unless forced
        if (!force && state.statusText && state.statusText.classList.contains('error')) {
            return;
        }
        
        // Hide both elements after 3 seconds
        setTimeout(() => {
            // Remove visible class from both elements, but never hide error messages
            if (state.statusText && !state.statusText.classList.contains('error')) {
                state.statusText.classList.remove('visible');
            }
            if (state.progressContainer) state.progressContainer.classList.remove('visible');
            
            // Show download button, credit cost, and quality selector after transition
            setTimeout(async () => {
                const downloadButton = document.querySelector('.btn-download');
                const qualitySelector = document.querySelector('.quality-selector');
                const creditCostDisplay = document.getElementById('credit-cost-display');
                
                // Update credits from server to get the latest values
                try {
                    await updateCreditsFromServer();
                    updateCreditCostDisplay();
                } catch (error) {
                    console.error('Error updating credits:', error);
                }
                
if (downloadButton) downloadButton.classList.remove('hidden');
                if (qualitySelector) qualitySelector.classList.remove('hidden');
                if (creditCostDisplay) creditCostDisplay.style.display = 'block';
                if (state.progressContainer) state.progressContainer.style.display = 'none';
                
                // Ensure the reset time emoji remains visible
                const creditsResetTime = document.getElementById('credits-reset-time');
                if (creditsResetTime) creditsResetTime.style.display = 'inline-block';
            }, 300);
        }, 3000);
    }

    function clearProcessId(force = false) {
        const currentProcessId = state.currentProcessId;
        state.currentProcessId = null;
        
        try {
            // Always clear from session storage when force is true, regardless of page unloading
            if (force || !isPageUnloading) {
                sessionStorage.removeItem('ProcessId');
            }
            
            // Reset status text if it exists
            if (state.statusText) {
                // Only clear if there's an error state
                if (state.statusText.classList.contains('error')) {
                    state.statusText.innerHTML = '';
                    state.statusText.classList.remove('error');
                    state.statusText.style.opacity = '0';
                    state.statusText.style.visibility = 'hidden';
                }
            }
            
        } catch (e) {
            console.error('Error clearing process state:', e);
        }
    }
    
    function clearFormValues() {
            if (state.form) {
            // Reset the form
                state.form.reset();
                
                // Clear any custom state or UI elements if needed
                const urlInput = getFormElement('video-url');
                if (urlInput) {
                    urlInput.value = '';
            }
        }
    }

    function resetProgressBar() {
        // Reset progress bar container
        if (state.progressBar) {
            state.progressBar.style.background = '';
            state.progressBar.style.animation = '';
            state.progressBar.style.width = '100%';
            state.progressBar.setAttribute('aria-valuenow', '0');
            state.progressBar.setAttribute('aria-valuetext', '0% complete');
            state.progressBar.classList.remove('error');
        }
        
        // Reset progress bar container styling
        const progressBarContainer = state.progressBar?.parentElement;
        if (progressBarContainer) {
            progressBarContainer.style.backgroundColor = '';
            progressBarContainer.style.border = '';
        }
        
        // Reset progress fill
        if (state.progressFill) {
            state.progressFill.style.transition = 'none';
            state.progressFill.style.width = '0%';
            state.progressFill.style.background = '#4f46e5';
            state.progressFill.classList.remove('progress-complete', 'error');
            // Force reflow
            void state.progressFill.offsetWidth;
            state.progressFill.style.transition = 'width 0.3s ease-out';
            state.progressFill.style.display = 'none';
        }
        
        // Reset loading indicator
        if (state.progressLoading) {
            state.progressLoading.style.display = 'none';
        }
        
        // Reset bubble
        if (state.progressBubble) {
            state.progressBubble.style.display = 'none';
            state.progressBubble.style.background = '#4f46e5';
            state.progressBubble.textContent = '0%';
        }
        if (state.progressLoading) {
            state.progressLoading.style.display = 'block';
        }
    }

    let errorTimeout;
    let currentErrorId = 0;
    
    function showError(message, customDuration = null) {
        // Generate a new error ID and get the current timestamp
        currentErrorId++;
        const errorId = currentErrorId;
        const errorTimestamp = Date.now();
        const hideDelay = customDuration || 10000; // Use custom duration or default 10s
        
        
        // Clear any existing timeout to prevent premature hiding
        if (errorTimeout) {
            clearTimeout(errorTimeout);
            errorTimeout = null;
        }
        
        // Don't call hideLoading here - we'll handle visibility manually to respect error duration
        // Just stop any loading animations
        if (state.progressLoading) {
            state.progressLoading.style.display = 'none';
        }
        
        // Only clear the process ID for actual errors, not during page unload
        if (isPageUnloading || !navigator.onLine || !document.hasFocus()) {
        } else {
            clearProcessId();
        }

        // Show error message in the status text with close button
        if (state.statusText) {
            const errorMessage = message || 'An error occurred while processing your request.';
            state.statusText.innerHTML = `
                <div class="status-message">
                    <div style="color: #dc2626; font-weight: 600;">${errorMessage}</div>
                    <button class="close-status" aria-label="Close message">OK</button>
                </div>
            `;
            state.statusText.classList.add('error');
            state.statusText.style.opacity = '1';
            state.statusText.style.visibility = 'visible';
            
            // Add click handler for close button
            const closeBtn = state.statusText.querySelector('.close-status');
            if (closeBtn) {
                // Remove any existing event listeners to prevent duplicates
                closeBtn.replaceWith(closeBtn.cloneNode(true));
                const newCloseBtn = state.statusText.querySelector('.close-status');
                
                newCloseBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // Clear any pending timeout
                    if (errorTimeout) {
                        clearTimeout(errorTimeout);
                        errorTimeout = null;
                    }
                    
                    // Increment error ID to prevent auto-hide from interfering
                    currentErrorId++;
                    
                    // Show action buttons and UI elements
                    const downloadButton = document.querySelector('.btn-download');
                    const qualitySelector = document.querySelector('.quality-selector');
                    const creditCostDisplay = document.getElementById('credit-cost-display');
                    
                    if (downloadButton) downloadButton.classList.remove('hidden');
                    if (qualitySelector) qualitySelector.classList.remove('hidden');
                    if (creditCostDisplay) creditCostDisplay.style.display = 'block';
                    
                    // Reset progress bar and UI immediately
                    resetProgressBar();
                    
                    // Reset error state flags
                    state.errorEventReceived = false;
                    
                    // Fade out the error message and progress container
                    state.statusText.style.opacity = '0';
                    if (state.progressContainer) {
                        state.progressContainer.classList.remove('visible');
                    }
                    
                    setTimeout(() => {
                        if (state.statusText) {
                            state.statusText.style.visibility = 'hidden';
                            state.statusText.classList.remove('error');
                        }
                        if (state.progressContainer) {
                            state.progressContainer.style.display = 'none';
                        }
                    }, 300); // Wait for opacity transition
                });
            }

            // Update progress bar to show error state
            if (state.progressFill) {
                // Override inline styles completely for error state
                state.progressFill.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    height: 100%;
                    width: 100%;
                    background: #ff4444 !important;
                    transition: all 0.3s ease-out;
                    display: block;
                    z-index: 1;
                `;
            }
            
            // Add error class to progress bar for CSS styling
            if (state.progressBar) {
                state.progressBar.classList.add('error');
                
                // Also add error class to progress fill for additional styling
                if (state.progressFill) {
                    state.progressFill.classList.add('error');
                }
            }
            
            // Also style the progress bar container for error state
            const progressBarContainer = state.progressBar?.parentElement;
            if (progressBarContainer) {
                progressBarContainer.style.backgroundColor = '#fee2e2';
                progressBarContainer.style.border = '2px solid #ef4444';
            }
            
            // Hide loading indicator during error
            if (state.progressLoading) {
                state.progressLoading.style.display = 'none';
            }
            
            // Ensure progress container is visible during error
            if (state.progressContainer) {
                state.progressContainer.style.display = 'block';
                state.progressContainer.classList.add('visible');
            }
            
            // Store the current error ID in a closure for the timeout
            const hideError = () => {
                // Double check this is still the current error
                if (errorId !== currentErrorId) {
                    return;
                }
                
                const elapsed = Date.now() - errorTimestamp;
                const remaining = Math.max(0, hideDelay - elapsed);
                
                if (remaining > 0) {
                    errorTimeout = setTimeout(hideError, remaining);
                    return;
                }
                
                
                if (state.statusText && state.statusText.classList.contains('error')) {
                    // Show action buttons and UI elements
                    const downloadButton = document.querySelector('.btn-download');
                    const qualitySelector = document.querySelector('.quality-selector');
                    const creditCostDisplay = document.getElementById('credit-cost-display');
                    
                    if (downloadButton) downloadButton.classList.remove('hidden');
                    if (qualitySelector) qualitySelector.classList.remove('hidden');
                    if (creditCostDisplay) creditCostDisplay.style.display = 'block';
                    
                    // Reset progress bar and UI immediately
                    resetProgressBar();
                    
                    // Reset error state flags
                    state.errorEventReceived = false;
                    
                    // Fade out the error message and progress container
                    state.statusText.style.opacity = '0';
                    if (state.progressContainer) {
                        state.progressContainer.classList.remove('visible');
                    }
                    
                    setTimeout(() => {
                        if (state.statusText && state.statusText.classList.contains('error') && errorId === currentErrorId) {
                            state.statusText.style.visibility = 'hidden';
                            state.statusText.classList.remove('error');
                        }
                        if (state.progressContainer) {
                            state.progressContainer.style.display = 'none';
                        }
                    }, 300);
                }
                errorTimeout = null;
            };
            
            errorTimeout = setTimeout(hideError, hideDelay);
        }
    };
    


    function handleProgressEvent(event) {
        try {
            const data = JSON.parse(event.data);
            let progress = parseInt(data.progress || '0', 10);

            // Ensure progress elements are visible
            if (state.progressContainer && state.progressContainer.style.display === 'none') {
                state.progressContainer.style.display = 'block';
                void state.progressContainer.offsetHeight;
                state.progressContainer.classList.add('visible');
            }

            // Update status text when progress first starts (progress > 0 and status is still "Getting video information")
            if (progress > 0 && state.statusText && state.statusText.getAttribute('data-status') === 'loading') {
                state.statusText.setAttribute('data-status', 'extracting');
                const statusHTML = `
                    <div class="status-message">
                        <div style="color: #10B981; margin-bottom: 0.5rem;">Getting video information ✓</div>
                        <div style="color: #000000;">Extracting the required clip</div>
                    </div>
                `;

                // Update the status with our custom HTML
                state.statusText.innerHTML = statusHTML;
                state.statusText.classList.add('visible');

                // Apply gradient animation only to the active (second) line
                const activeMessage = state.statusText.querySelector('.status-message > div:last-child');
                if (activeMessage) {
                    activeMessage.style.background = 'linear-gradient(90deg, #4f46e5, #8b5cf6, #4f46e5)';
                    activeMessage.style.backgroundSize = '200% auto';
                    activeMessage.style.backgroundClip = 'text';
                    activeMessage.style.webkitBackgroundClip = 'text';
                    activeMessage.style.webkitTextFillColor = 'transparent';
                    activeMessage.style.animation = 'textGradient 3s linear infinite';
                    activeMessage.style.display = 'inline-block';
                    activeMessage.style.padding = '0.25rem 0';
                }
            }

            // Update progress with a smooth transition
            requestAnimationFrame(() => {
                updateProgress(progress);
            });

            // Handle 100% progress case
            if (progress === 100) {
                // Update progress to 100% which will handle the UI updates
                updateProgress(100);
                
                // Update status to show processing message with animation
                if (state.statusText) {
                    // Set status to 'loading' to get the loading animation
                    state.statusText.setAttribute('data-status', 'loading');
                    
                    // Create the status message with both lines
                    state.statusText.innerHTML = `
                        <div class="status-message">
                            <div>Process complete</div>
                            <div class="status-subtext">Generating download URL...</div>
                        </div>
                    `;
                    
                    // Match the exact style from showLoading
                    state.statusText.style.display = 'block';
                    state.statusText.classList.add('visible');
                    state.statusText.style.opacity = '1';
                    state.statusText.style.visibility = 'visible';
                }
            }
        } catch (e) {
            console.error('Error parsing progress event:', e);
        }
    }

    async function handleCompleteEvent(event) {
        if (state.completeHandled) return;
        state.completeHandled = true;
        state.completeEventReceived = true;
        
        // Update credits after successful completion
        try {
            await updateCreditsFromServer();
        } catch (e) {
            console.error('Failed to update credits after completion:', e);
        }
        
        // Mark that we're completing successfully to prevent connection error messages
        errorShown = true;
        
        // First ensure progress is at 100% before starting download
        const completeProgress = (callback) => {
            // Ensure progress elements are visible and updated
            if (state.progressFill) {
                // If we're not already at 100%, update to 100%
                if (parseFloat(state.progressFill.style.width) < 100) {
                    // First update to current progress to ensure smooth transition
                    const currentWidth = parseFloat(state.progressFill.style.width) || 0;
                    state.progressFill.style.transition = 'none';
                    state.progressFill.style.width = `${currentWidth}%`;
                    
                    // Force reflow
                    void state.progressFill.offsetWidth;
                    
                    // Set up smooth transition to 100%
                    state.progressFill.style.transition = 'width 0.5s ease-out, background-color 0.3s ease-out';
                    state.progressFill.style.width = '100%';
                    state.progressFill.style.background = '#10b981';
                    state.progressFill.classList.add('progress-complete');
                    
                    // Update bubble
                    if (state.progressBubble) {
                        state.progressBubble.style.display = 'block';
                        state.progressBubble.textContent = '100%';
                        state.progressBubble.style.right = '0%';
                        state.progressBubble.style.background = '#10b981';
                        state.progressBubble.style.transition = 'all 0.5s ease-out';
                    }
                }
                
                // Hide loading indicator
                if (state.progressLoading) {
                    state.progressLoading.style.display = 'none';
                }
                
                callback();
            } else {
                callback();
            }
        };
        
        const startDownload = () => {
            try {
                let data;
                try {
                    data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                } catch (e) {
                    console.warn('Could not parse event data, using empty object');
                    data = {};
                }

                if (data && (data.downloadUrl || data.url)) {
                    updateStatus('Starting download...');
                    
                    // Create a temporary link and trigger download
                    const link = document.createElement('a');
                    link.href = data.downloadUrl || data.url;
                    link.download = data.filename || 'video_clip.mp4';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    // Keep the UI in the completed state for a moment before hiding
                    setTimeout(() => {
                        hideLoading(true); // Force hide loading even if error is showing
                        // Reset progress bar after hiding loading state
                        resetProgressBar();
                        // Clear form values including URL input
                        clearFormValues();
                        
                        // Track the clip and show support popup if needed
                        trackClipAndShowSupport();
                    }, 3000);
                } else {
                throw new Error('Invalid download URL received');
                }
            } catch (error) {
                console.error('Error handling complete event:', error);
                updateStatus('Error starting download. Please try again.');
                showError('Error processing download. ' + (error.message || 'Please try again.'));
                
                // Still show completion state even if there was an error with the download
                if (state.progressFill) {
                state.progressFill.style.background = '#10b981';
                    state.progressFill.style.width = '100%';
                    state.progressFill.style.transition = 'all 0.3s ease-out';
                    if (state.progressLoading) {
                        state.progressLoading.style.display = 'none';
                    }
                }
            }
        };
        
        // Start the completion sequence - wait for progress to reach 100% before download
        completeProgress(() => {
            // Mark that we're closing the connection intentionally
            state.connectionClosedIntentionally = true;
            
            // Close the SSE connection since we're done
            if (state.eventSource) {
                state.eventSource.close();
                state.eventSource = null;
            }
            
            clearProcessId();
            startDownload();
        });
    }

    async function cancelCurrentOperation() {
        if (!state.currentProcessId) return;
        
        try {
            updateStatus('Cancelling...');
            const response = await fetch(`/api/cancel/${state.currentProcessId}?reason=cancel-button-click`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to cancel operation');
            }
            
            // Close the event source if it exists and clear process ID
            if (state.eventSource) {
                // Mark that we're closing the connection intentionally
                state.connectionClosedIntentionally = true;
                state.eventSource.close();
                state.eventSource = null;
            }
            clearProcessId();
            
            // Update credits from server after cancellation
            try {
                await updateCreditsFromServer();
            } catch (e) {
                console.error('Failed to update credits after cancellation:', e);
            }
            
            // Update UI to show cancellation state
            updateStatus('Download cancelled');
            if (state.progressFill) {
                state.progressFill.style.background = '#6b7280';
                state.progressFill.style.width = '100%';
                state.progressFill.style.transition = 'all 0.3s ease-out';
            }
            
            // Hide progress bar after 1 second
            setTimeout(() => {
                if (state.progressContainer) {
                    state.progressContainer.style.opacity = '0';
                    state.progressContainer.style.transition = 'opacity 0.3s ease-out';
                    
                    // Remove from DOM after fade out
                    setTimeout(() => {
                        if (state.progressContainer && state.progressContainer.parentNode) {
                            state.progressContainer.parentNode.removeChild(state.progressContainer);
                            state.progressContainer = null;
                        }
                        hideLoading(true); // Force hide loading
                    }, 300);
                } else {
                    hideLoading(true); // Force hide loading
                }
            }, 1000);
            
        } catch (error) {
            console.error('Error cancelling operation:', error);
            updateStatus('Error cancelling operation');
            
            // Still hide the loading state after a delay
            setTimeout(() => {
                hideLoading(true); // Force hide loading
            }, 2000);
        }
    }

    function setupSSEConnection(processId) {
        // Close any existing connection
        if (state.eventSource) {
            state.eventSource.close();
            state.eventSource = null;
        }

        const progressUrl = `/api/progress/${processId}`;
        state.eventSource = new EventSource(progressUrl);
        let errorShown = false;
        state.connectionClosedIntentionally = false;

        const showConnectionError = (message) => {
            if (errorShown || state.completeHandled) return;
            errorShown = true;
            
            // Mark that we've received an error event to prevent connection error messages
            state.errorEventReceived = true;
            
            if (state.eventSource) {
                state.eventSource.close();
                state.eventSource = null;
            }
            
            clearProcessId();
            
            showError(message);
            // Don't call hideLoading here - showError will handle it
        };

        // Handle connection errors
        state.eventSource.onerror = () => {
            
            // Only handle connection errors if the page is still focused, online, and not unloading
            if (!isPageUnloading && document.hasFocus() && navigator.onLine) {
                // Add a small delay to allow server error events to be processed first
                setTimeout(() => {
                    // Only show connection error if we haven't completed successfully
                    // and we haven't already shown an error
                    // and the connection wasn't closed intentionally
                    // and we haven't received the complete event
                    // and we haven't received an error event from the server
                    if (!errorShown && !state.completeHandled && !state.connectionClosedIntentionally && !state.completeEventReceived && !state.errorEventReceived) {
                        showConnectionError('Connection to server was lost');
                    }
                }, 100); // 100ms delay to allow server events to be processed
            }
        };

        // Set up event listeners
        state.eventSource.addEventListener('progress', handleProgressEvent);
        state.eventSource.addEventListener('complete', (event) => {
            window.removeEventListener('error', errorHandler);
            handleCompleteEvent(event);
        });
        
        // Handle server-sent error messages
        state.eventSource.addEventListener('error', (event) => {
            if (!event.data) {
                return;
            }
            
            try {
                let data;
                if (typeof event.data === 'string' && event.data.trim() !== '') {
                    data = JSON.parse(event.data);
                    if (data && data.message) {
                        showConnectionError(data.message);
                    }
                } else {
                    showConnectionError('An error occurred during processing');
                }
            } catch (e) {
                console.error('Error parsing server error event:', e);
                showConnectionError('An error occurred during processing');
            }
        });
        
        // Handle generic messages (fallback)
        state.eventSource.addEventListener('message', (event) => {
            if (!event.data) return;
            
            try {
                if (typeof event.data === 'string' && event.data.trim() !== '') {
                    const data = JSON.parse(event.data);
                    if (data && data.error) {
                        showConnectionError(data.error);
                    }
                }
            } catch (e) {
                console.error('Error parsing server message:', e);
            }
        });

        // Add a global error handler for uncaught errors
        const errorHandler = (event) => {
            console.error('Global error:', event);
            if (!errorShown && !state.completeHandled && !state.completeEventReceived && !state.errorEventReceived) {
                showConnectionError('An unexpected error occurred');
            }
        };

        window.addEventListener('error', errorHandler);

        // Clean up error handler when complete
        state.eventSource.addEventListener('complete', () => {
            window.removeEventListener('error', errorHandler);
        }, { once: true });
    };

    function validateTimeFormat(timeStr) {
        return /^(\d{1,2}:)?\d{1,2}:\d{1,2}$/.test(timeStr);
    }

    // Cache for time string formatting
    const timeStringCache = new Map();
    const timeCache = new Map();
    
    function timeToSeconds(timeStr) {
        if (!timeStr) return 0;
        
        // Check cache first
        if (timeCache.has(timeStr)) {
            return timeCache.get(timeStr);
        }
        
        // Fast path for common formats
        let seconds = 0;
        const parts = timeStr.split(':');
        const len = parts.length;
        
        if (len === 3) {
            // HH:MM:SS format
            seconds = (+parts[0] * 3600) + (+parts[1] * 60) + (+parts[2]);
        } else if (len === 2) {
            // MM:SS format
            seconds = (+parts[0] * 60) + (+parts[1]);
        }
        
        // Cache result if valid
        if (len === 2 || len === 3) {
            timeCache.set(timeStr, seconds);
            // Limit cache size to prevent memory leaks
            if (timeCache.size > 100) {
                const firstKey = timeCache.keys().next().value;
                timeCache.delete(firstKey);
            }
        }
        
        return seconds;
    }
    
    function secondsToTimeString(seconds) {
        // Check cache first
        if (timeStringCache.has(seconds)) {
            return timeStringCache.get(seconds);
        }
        
        // Fast path for common values
        if (seconds === 0) {
            timeStringCache.set(0, '0 sec');
            return '0 sec';
        }
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        let result;
        
        if (mins === 0) {
            result = `${secs} sec`;
        } else if (secs === 0) {
            result = `${mins} min`;
        } else {
            result = `${mins} min ${secs} sec`;
        }
        
        // Cache result
        timeStringCache.set(seconds, result);
        
        // Limit cache size
        if (timeStringCache.size > 100) {
            const firstKey = timeStringCache.keys().next().value;
            timeStringCache.delete(firstKey);
        }
        
        return result;
    }

    // Cache DOM elements at module level
    let durationDisplayCache = {
        startTimeInput: null,
        endTimeInput: null,
        durationSpan: null,
        lastStartTime: '',
        lastEndTime: '',
        lastDuration: ''
    };

    function updateDurationDisplay() {
        // Initialize cache on first run
        if (!durationDisplayCache.durationSpan) {
            durationDisplayCache.startTimeInput = getFormElement('start-time');
            durationDisplayCache.endTimeInput = getFormElement('end-time');
            durationDisplayCache.durationSpan = document.getElementById('duration-value');
            if (!durationDisplayCache.durationSpan) return;
        }

        const { startTimeInput, endTimeInput, durationSpan } = durationDisplayCache;
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;

        // Skip if no change in inputs
        if (startTime === durationDisplayCache.lastStartTime && 
            endTime === durationDisplayCache.lastEndTime) {
            return;
        }

        // Update cache
        durationDisplayCache.lastStartTime = startTime;
        durationDisplayCache.lastEndTime = endTime;

        if (!startTime || !endTime) {
            if (durationDisplayCache.lastDuration !== '00:00:00') {
                durationDisplayCache.lastDuration = '00:00:00';
                durationSpan.textContent = '00:00:00';
            }
            return;
        }

        // Use requestAnimationFrame to batch DOM updates
        requestAnimationFrame(() => {
            try {
                const start = timeToSeconds(startTime);
                const end = timeToSeconds(endTime);
                const duration = Math.max(0, end - start);
                const durationStr = secondsToTimeString(duration);
                
                if (durationDisplayCache.lastDuration !== durationStr) {
                    durationDisplayCache.lastDuration = durationStr;
                    durationSpan.textContent = durationStr;
                }
            } catch (e) {
                console.error('Error calculating duration:', e);
                if (durationDisplayCache.lastDuration !== '00:00:00') {
                    durationDisplayCache.lastDuration = '00:00:00';
                    durationSpan.textContent = '00:00:00';
                }
            }
        });
    }
    
    function getFormElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Could not find form element with ID: ${id}`);
        }
        return element;
    }

    async function handleSubmit(event) {
        event.preventDefault();

        // Check if user has enough credits
        if (availableCredits <= 0) {
            showError('No credits available.');
            return;
        }

        if (!state.form) {
            console.error('Form element not found');
            showError('Form initialization error. Please refresh the page.');
            return;
        }

        try {
            const videoUrl = getFormElement('video-url').value.trim();
            const videoUrlLower = videoUrl.toLowerCase();
            
            // Check if it's a YouTube playlist URL
            if ((videoUrlLower.includes('youtube') || videoUrlLower.includes('youtu.be')) && videoUrlLower.includes('list=')) {
                throw new Error('It looks like you used a playlist link. Please copy the video link from the Share button instead.');
            }
            
            // Check if it's a Google search URL (but not Google Drive)
            if ((videoUrlLower.includes('google.com/search') || videoUrlLower.includes('google.') && videoUrlLower.includes('/search')) && !videoUrlLower.includes('drive.google.com')) {
                throw new Error('It looks like you used a Google search link. Please copy the actual video URL instead.');
            }
            
            // Check if it's a Bing search URL
            if (videoUrlLower.includes('bing.com/') && (videoUrlLower.includes('/search') || videoUrlLower.includes('?q='))) {
                throw new Error('It looks like you used a Bing search link. Please copy the actual video URL instead.');
            }
            
            const clipStart = getFormElement('start-time').value;
            const clipEnd = getFormElement('end-time').value;
            const quality = getFormElement('video-quality').value;

            // Input validation
            if (!videoUrl) {
                throw new Error('Please enter a video URL');
            }

            if (!clipStart || !clipEnd) {
                throw new Error('Please specify both start and end times');
            }

            if (!validateTimeFormat(clipStart) || !validateTimeFormat(clipEnd)) {
                throw new Error('Please enter times in HH:MM:SS or MM:SS format');
            }

            const startSeconds = timeToSeconds(clipStart);
            const endSeconds = timeToSeconds(clipEnd);

            if (startSeconds >= endSeconds) {
                throw new Error('End time must be after start time');
            }

            // Final credit check before submission using the last calculated cost
            const roundedCost = parseFloat(lastCalculatedCost.toFixed(2));
            if (availableCredits < roundedCost) {
                const errorMessage = `Not enough credits. This clip requires ${roundedCost} credits, but you only have ${availableCredits}.`;
                showError(errorMessage);
                return; // Exit early instead of throwing to prevent duplicate error handling
            }

            showLoading();
            updateStatus('Getting video information...');
            updateProgress(0);

            // Add timeout for the fetch request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            let response;
            try {
                // Get client fingerprint
                // Use the pre-generated fingerprint
                const clientFingerprint = await getClientFingerprint();
                
                response = await fetch('/api/submit', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-Client-FP': clientFingerprint
                    },
                    body: JSON.stringify({
                        videoUrl,
                        clipStart,
                        clipEnd,
                        quality: parseInt(quality, 10) || 720  // Convert quality to integer with fallback to 720
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    // Check for rate limit error (429)
                    if (response.status === 429) {
                        const retryMessage = formatRateLimitError(response);
                        throw new Error(retryMessage);
                    }
                    
                    // Handle other errors as before
                    try {
                        const error = await response.json();
                        throw new Error(error.message || `Server error: ${response.status} ${response.statusText}`);
                    } catch (e) {
                        throw new Error('Failed to process your request. Please try again.');
                        throw new Error(`Server error: ${response.status} ${response.statusText}`);
                    }
                }

                const result = await response.json();
                if (result.processId) {
                    state.currentProcessId = result.processId;
                    sessionStorage.setItem('ProcessId', result.processId);
                    setupSSEConnection(result.processId);
                } else {
                    throw new Error('No process ID received from server');
                }
            } catch (error) {
                console.error('Error in handleSubmit:', {
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString()
                });
                const errorMessage = error.message || 'Failed to process your request. Please try again.';
                // Show rate limit errors for 30 seconds, other errors for 10 seconds
                const duration = errorMessage.includes('too many requests') ? 30000 : null;
                showError(errorMessage, duration);
                // Don't call hideLoading here - showError will handle it
                // Don't re-throw here as we've already handled the error
            }
        } catch (error) {
            console.error('Error in form submission:', error);
            // Only show generic error for unexpected errors, not for validation errors
            if (error.message.includes('must be after') || 
                error.message.includes('Please enter') ||
                error.message.includes('playlist link') ||
                error.message.includes('Google search link') ||
                error.message.includes('Bing search link')) {
                // Show rate limit errors for 30 seconds, other errors for 10 seconds
                const duration = error.message.includes('too many requests') ? 30000 : null;
                showError(error.message, duration);
            } else {
                showError('An unexpected error occurred. Please try again.');
            }
            // Don't call hideLoading here - showError will handle it
        }
    }

    function setupPasteButton() {
        const pasteButton = document.getElementById('paste-url');
        const videoUrlInput = document.getElementById('video-url');
        
        if (!pasteButton) {
            console.error('Paste button not found!');
            return;
        }
        if (!videoUrlInput) {
            console.error('Video URL input not found!');
            return;
        }
        
        // Create error message element
        const urlErrorElement = document.createElement('div');
        urlErrorElement.className = 'url-error';
        urlErrorElement.style.display = 'none';
        urlErrorElement.style.color = 'red';
        urlErrorElement.style.marginTop = '5px';
        urlErrorElement.style.fontSize = '0.9em';
        
        // Find the form group and insert the error message right after the input
        const formGroup = videoUrlInput.closest('.form-group');
        if (formGroup) {
            formGroup.appendChild(urlErrorElement);
        }

        // Store original button state
        const originalHTML = pasteButton.innerHTML;
        const originalTitle = pasteButton.title;
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        // Function to reset button state
        const resetButton = () => {
            pasteButton.innerHTML = originalHTML;
            pasteButton.title = originalTitle;
            pasteButton.disabled = false;
        };

        // Function to show loading state
        const showLoading = () => {
            pasteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            pasteButton.title = 'Reading clipboard...';
            pasteButton.disabled = true;
        };

        // Function to handle successful paste
        const handlePasteSuccess = (text) => {
            if (!text) return false;

            // Insert text at cursor position
            const start = videoUrlInput.selectionStart;
            const end = videoUrlInput.selectionEnd;
            const before = videoUrlInput.value.substring(0, start);
            const after = videoUrlInput.value.substring(end);

            videoUrlInput.value = before + text + after;

            // Move cursor to the end of the pasted text
            const newCursorPos = start + text.length;
            videoUrlInput.setSelectionRange(newCursorPos, newCursorPos);

            // Trigger input event
            videoUrlInput.dispatchEvent(new Event('input', { bubbles: true }));

            // Show success state
            pasteButton.innerHTML = '<i class="fas fa-check"></i>';
            pasteButton.title = 'Pasted!';
            setTimeout(resetButton, 1500);

            return true;
        };

        // Function to handle paste operation
        const handlePaste = async (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }

            try {
                // Focus the input first and show loading state
                videoUrlInput.focus();
                showLoading();

                // On mobile, use a different approach
                if (isMobile) {
                    // For mobile, we'll use a temporary input to capture the paste
                    const tempInput = document.createElement('input');
                    tempInput.style.position = 'fixed';
                    tempInput.style.opacity = 0;
                    tempInput.style.pointerEvents = 'none';
                    document.body.appendChild(tempInput);
                    
                    // Focus and select the temp input
                    tempInput.focus();
                    
                    // Use a timeout to handle async nature of mobile paste
                    setTimeout(async () => {
                        try {
                            // Try modern clipboard API first
                            if (navigator.clipboard && navigator.clipboard.readText) {
                                const text = await navigator.clipboard.readText();
                                if (text && text.trim()) {
                                    handlePasteSuccess(text);
                                    document.body.removeChild(tempInput);
                                    return;
                                }
                            }
                            
                            // If we get here, modern API failed - show instructions
                            urlErrorElement.textContent = 'Tap and hold in the input field, then select "Paste"';
                            urlErrorElement.style.display = 'block';
                            videoUrlInput.focus();
                            
                        } catch (err) {
                            console.error('Clipboard access error:', err);
                            urlErrorElement.textContent = 'Please tap and hold in the input field to paste';
                            urlErrorElement.style.display = 'block';
                            videoUrlInput.focus();
                        } finally {
                            document.body.removeChild(tempInput);
                            setTimeout(resetButton, 2000);
                        }
                    }, 0);
                    return;
                }

                // For desktop browsers
                try {
                    // Try modern clipboard API with permission check
                    if (navigator.clipboard && navigator.clipboard.readText) {
                        try {
                            const permission = await navigator.permissions.query({ name: 'clipboard-read' });
                            if (permission.state === 'denied') {
                                throw new Error('Clipboard permission denied');
                            }
                            
                            const text = await navigator.clipboard.readText();
                            if (text && text.trim()) {
                                handlePasteSuccess(text);
                                return;
                            }
                            throw new Error('Clipboard is empty');
                        } catch (err) {
                            console.warn('Modern clipboard API failed, falling back to execCommand');
                            throw err; // Will be caught by the outer catch
                        }
                    }
                    
                    // Fallback for browsers that don't support the modern Clipboard API
                    try {
                        // Show instructions for manual paste
                        urlErrorElement.textContent = 'Please use Ctrl+V to paste or type the URL';
                        urlErrorElement.style.display = 'block';
                        videoUrlInput.focus();
                        
                        // Focus the input and select all text to make manual paste easier
                        videoUrlInput.select();
                        
                        // Reset the button after a short delay
                        setTimeout(resetButton, 2000);
                        return;
                    } catch (execCommandErr) {
                        console.warn('execCommand failed:', execCommandErr);
                        // Continue to show instructions
                    }
                    
                    // If we get here, all methods failed
                    throw new Error('Could not access clipboard');
                    
                } catch (err) {
                    console.error('Paste error:', err);
                    urlErrorElement.textContent = 'Please use Ctrl+V to paste the URL';
                    urlErrorElement.style.display = 'block';
                    videoUrlInput.focus();
                }
                
            } catch (err) {
                console.error('Unexpected error in paste handler:', err);
                urlErrorElement.textContent = 'Please paste manually (Ctrl+V)';
                urlErrorElement.style.display = 'block';
            } finally {
                // Reset the button after a short delay
                setTimeout(resetButton, 1000);
            }
        };

        // Initialize input field for mobile
        const initMobileInput = () => {
            // Ensure input field is editable and visible
            videoUrlInput.removeAttribute('readonly');
            videoUrlInput.removeAttribute('disabled');
            videoUrlInput.setAttribute('inputmode', 'url');
            videoUrlInput.setAttribute('autocapitalize', 'off');
            videoUrlInput.setAttribute('autocomplete', 'on');
            videoUrlInput.setAttribute('autocorrect', 'off');
            videoUrlInput.setAttribute('spellcheck', 'false');

            // Reset any problematic styles
            videoUrlInput.style.cssText = `
                -webkit-appearance: none;
                -moz-appearance: textfield;
                appearance: none;
                width: 100%;
                min-height: 44px;  /* Minimum touch target size */
                padding: 8px 12px;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: 16px;  /* Prevent iOS zoom on focus */
                line-height: 1.5;
            `;

            // Add a tap handler to help with mobile focus issues
            const handleTap = (e) => {
                e.preventDefault();
                videoUrlInput.focus();
                
                // Show keyboard on mobile
                if (document.activeElement !== videoUrlInput) {
                    videoUrlInput.focus();
                    // Small delay to ensure focus is set before showing keyboard
                    setTimeout(() => {
                        videoUrlInput.selectionStart = videoUrlInput.selectionEnd = 10000;
                    }, 100);
                }
            };

            // Add touch events for better mobile support
            videoUrlInput.addEventListener('touchstart', handleTap, { passive: true });
            videoUrlInput.addEventListener('click', handleTap);
            
            // Enhanced paste handling for mobile
            const handlePasteEvent = (e) => {
                try {
                    const clipboardData = e.clipboardData || (window.clipboardData && window.clipboardData.getData) ? window.clipboardData : null;
                    if (!clipboardData) return;

                    // Get pasted text
                    const pastedText = clipboardData.getData('text/plain');
                    if (!pastedText) return;
                    
                    e.preventDefault();
                    
                    // Get current cursor position
                    const start = videoUrlInput.selectionStart;
                    const end = videoUrlInput.selectionEnd;
                    
                    // Insert text at cursor position
                    const currentValue = videoUrlInput.value;
                    const newValue = currentValue.substring(0, start) + pastedText + currentValue.substring(end);
                    
                    // Update input value
                    videoUrlInput.value = newValue;
                    
                    // Update cursor position
                    const newPos = start + pastedText.length;
                    requestAnimationFrame(() => {
                        videoUrlInput.setSelectionRange(newPos, newPos);
                        // Trigger input event for any listeners
                        videoUrlInput.dispatchEvent(new Event('input', { bubbles: true }));
                        videoUrlInput.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                    
                    // Show success feedback
                    if (isMobile) {
                        urlErrorElement.textContent = 'Pasted successfully!';
                        urlErrorElement.style.color = '#10b981';
                        urlErrorElement.style.display = 'block';
                        setTimeout(() => {
                            urlErrorElement.style.display = 'none';
                        }, 2000);
                    }
                } catch (err) {
                    console.error('Paste handler error:', err);
                }
            };
            
            // Add paste event listeners
            videoUrlInput.addEventListener('paste', handlePasteEvent, { passive: false });
            
            // For iOS Safari which sometimes needs this
            videoUrlInput.addEventListener('input', (e) => {
                // This helps with some iOS paste issues
                if (e.inputType === 'insertFromPaste' || e.inputType === 'insertText') {
                    videoUrlInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        };

        // Initialize mobile input if needed
        if (isMobile) {
            initMobileInput();
            
            // For mobile, we'll use a different approach
            const handleMobilePaste = async () => {
                try {
                    // Show loading state
                    showLoading();
                    
                    // Try to read from clipboard
                    if (navigator.clipboard && navigator.clipboard.readText) {
                        try {
                            const text = await navigator.clipboard.readText();
                            if (text && text.trim()) {
                                // Insert the text and show success
                                videoUrlInput.value = text;
                                videoUrlInput.dispatchEvent(new Event('input', { bubbles: true }));
                                
                                // Show success feedback
                                urlErrorElement.textContent = 'Pasted successfully!';
                                urlErrorElement.style.color = '#10b981';
                                urlErrorElement.style.display = 'block';
                                setTimeout(() => {
                                    urlErrorElement.style.display = 'none';
                                }, 2000);
                                return;
                            }
                        } catch (err) {
                            showError('Clipboard API not available or permission denied');
                        }
                    }
                    
                    // If we get here, show instructions for manual paste
                    urlErrorElement.textContent = 'Please tap and hold in the input field to paste';
                    urlErrorElement.style.display = 'block';
                    videoUrlInput.focus();
                    
                    // Set a temporary input for better mobile paste experience
                    const tempInput = document.createElement('input');
                    tempInput.type = 'text';
                    tempInput.style.position = 'fixed';
                    tempInput.style.opacity = 0;
                    tempInput.style.pointerEvents = 'none';
                    document.body.appendChild(tempInput);
                    tempInput.focus();
                    
                    // Clean up after a short delay
                    setTimeout(() => {
                        document.body.removeChild(tempInput);
                        videoUrlInput.focus();
                        setTimeout(resetButton, 1000);
                    }, 500);
                    
                } catch (err) {
                    console.error('Mobile paste error:', err);
                    urlErrorElement.textContent = 'Please tap and hold in the input field to paste';
                    urlErrorElement.style.display = 'block';
                    videoUrlInput.focus();
                    setTimeout(resetButton, 1000);
                }
            };
            
            // Use the mobile-specific handler
            pasteButton.addEventListener('click', handleMobilePaste);
            pasteButton.title = 'Tap to paste from clipboard';
        } else {
            // Use the regular handler for desktop
            pasteButton.addEventListener('click', handlePaste);
        }
        
        // Add input event listener for live URL validation
        videoUrlInput.addEventListener('input', function() {
            const url = this.value.trim().toLowerCase();
            
            // Check for playlist URLs
            if ((url.includes('youtube') || url.includes('youtu.be')) && url.includes('list=')) {
                urlErrorElement.textContent = 'It looks like you used a playlist link. Please copy the video link from the Share button instead.';
                urlErrorElement.style.display = 'block';
                urlErrorElement.style.color = 'red';
                this.setCustomValidity('Please use a video link, not a playlist link');
            } 
            // Check for Google search URLs (but not Google Drive)
            else if ((url.includes('google.com/search') || (url.includes('google.') && url.includes('/search'))) && !url.includes('drive.google.com')) {
                urlErrorElement.textContent = 'It looks like you used a Google search link. Please copy the actual video URL instead.';
                urlErrorElement.style.display = 'block';
                urlErrorElement.style.color = 'red';
                this.setCustomValidity('Please use the actual video URL, not a search link');
            }
            // Check for Bing search URLs
            else if (url.includes('bing.com/') && (url.includes('/search') || url.includes('?q='))) {
                urlErrorElement.textContent = 'It looks like you used a Bing search link. Please copy the actual video URL instead.';
                urlErrorElement.style.display = 'block';
                urlErrorElement.style.color = 'red';
                this.setCustomValidity('Please use the actual video URL, not a search link');
            }
            else {
                urlErrorElement.style.display = 'none';
                this.setCustomValidity('');
            }
        });

        // Make input focusable
        videoUrlInput.addEventListener('click', function () {
            this.focus();
        });

        // Prevent any event handlers that might interfere with input
        const stopProp = (e) => e.stopPropagation();
        videoUrlInput.addEventListener('keydown', stopProp);
        videoUrlInput.addEventListener('keyup', stopProp);
        videoUrlInput.addEventListener('input', stopProp);
    }

    function formatTimeInput(value, isDeleting = false) {
        if (!value) return '00:00:00';

        // If deleting, just return the current value to allow normal deletion
        if (isDeleting) {
            return value;
        }

        // If it already has colons, preserve the existing structure
        if (value.includes(':')) {
            const parts = value.split(':');
            // Ensure we have 3 parts
            while (parts.length < 3) parts.push('00');
            // Pad each part with leading zeros
            return parts.map(part => part.padStart(2, '0')).join(':').slice(0, 8);
        }

        // For raw numbers, pad and format
        const digits = value.replace(/\D/g, '');
        if (!digits) return '00:00:00';

        // Pad with zeros to make 6 digits
        const padded = digits.padStart(6, '0').slice(-6);

        // Format as HH:MM:SS
        return `${padded.slice(0, 2)}:${padded.slice(2, 4)}:${padded.slice(4, 6)}`;
    }

    function setupTimeInputs() {
        const timeInputs = document.querySelectorAll('input[type="text"][pattern]');
        let debounceTimer;
        let rafId;
        
        // Use passive event listeners for better scrolling performance
        const passiveOptions = { passive: true };
        
        // Cache DOM elements at module level
        if (!durationDisplayCache.startTimeInput) {
            durationDisplayCache.startTimeInput = getFormElement('start-time');
            durationDisplayCache.endTimeInput = getFormElement('end-time');
            durationDisplayCache.durationSpan = document.getElementById('duration-value');
            
            if (!durationDisplayCache.startTimeInput || 
                !durationDisplayCache.endTimeInput || 
                !durationDisplayCache.durationSpan) {
                return;
            }
        }

        // Simple format function that only runs on blur
        const formatTimeOnBlur = (input) => {
            const value = input.value || '';
            
            // If empty, set to default
            if (!value.trim()) {
                input.value = '00:00:00';
                return;
            }

            // Only format if it's a valid time format
            const timeRegex = /^(\d{0,2}):?(\d{0,2}):?(\d{0,2})/;
            const match = value.match(timeRegex);

            if (match) {
                let [_, hh = '00', mm = '00', ss = '00'] = match;

                // Pad with leading zeros and limit values in one operation
                hh = Math.min(99, parseInt(hh) || 0).toString().padStart(2, '0');
                mm = Math.min(59, parseInt(mm) || 0).toString().padStart(2, '0');
                ss = Math.min(59, parseInt(ss) || 0).toString().padStart(2, '0');

                input.value = `${hh}:${mm}:${ss}`;
            }
        };
        
        // Optimized debounced update with RAF and microtask batching
        const debouncedUpdate = () => {
            clearTimeout(debounceTimer);
            cancelAnimationFrame(rafId);
            
            // Use microtask to batch updates
            debounceTimer = setTimeout(() => {
                rafId = requestAnimationFrame(() => {
                    // Use a microtask to batch multiple updates in the same frame
                    Promise.resolve().then(updateDurationDisplay);
                });
            }, 50); // Reduced debounce time for better responsiveness
        };

        // Initialize time inputs
        timeInputs.forEach(input => {
            // Reset any problematic styles
            input.style.webkitAppearance = 'none';
            input.style.MozAppearance = 'textfield';
            input.style.appearance = 'none';

            // Format on blur and update display
            input.addEventListener('blur', (e) => {
                formatTimeOnBlur(e.target);
                updateDurationDisplay();
            });

            // Initialize if empty on focus
            input.addEventListener('focus', (e) => {
                if (!e.target.value) {
                    e.target.value = '00:00:00';
                }
            });

            // Debounced input handler
            input.addEventListener('input', debouncedUpdate);

            // Optimized keydown handler with passive event
            input.addEventListener('keydown', (e) => {
                if (!/[0-9:]|Backspace|Delete|Arrow(?:Left|Right|Up|Down)|Home|End|Tab|Control|Meta|Alt|Shift|Escape|Enter/.test(e.key)) {
                    e.preventDefault();
                }
            }, { passive: true });
            
            // Add inputmode for better mobile keyboard experience
            input.setAttribute('inputmode', 'numeric');
        });
        
        // Initial update
        updateDurationDisplay();
    }

    function cleanupProgressElements() {
        // Remove any existing progress containers
        const existingContainers = document.querySelectorAll('.progress-container');
        existingContainers.forEach(container => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        });
        // Reset state
        state.progressContainer = null;
        state.progressBar = null;
        state.progressFill = null;
        state.progressBubble = null;
        state.progressLoading = null;
        state.statusText = null;
    }

    function createProgressElements() {
        // Clean up any existing progress elements first
        cleanupProgressElements();
        
        if (!state.progressContainer) {
            // Create progress container
            state.progressContainer = document.createElement('div');
            state.progressContainer.className = 'progress-container';
            
            // Create cancel button
            state.cancelButton = document.createElement('button');
            state.cancelButton.className = 'cancel-button';
            state.cancelButton.innerHTML = '✕';
            state.cancelButton.title = 'Cancel download';
            
            state.cancelButton.addEventListener('click', () => {
                if (state.currentProcessId && !state.completeHandled) {
                    if (confirm('Are you sure you want to cancel this download?')) {
                        cancelCurrentOperation();
                    }
                }
            });

            // Create status text
            state.statusText = document.createElement('div');
            state.statusText.className = 'status-text';
            state.statusText.style.cssText = `
                margin: 0 auto 0;
                text-align: center;
                font-weight: 500;
                color: #4b5563;
                opacity: 0;
                font-size: 1rem;
                line-height: 0.9;
                padding: 0;
                position: relative;
                transform: scale(0.9);
                transform-origin: center top;
            `;

            // Remove progress info container and its children

            // Create progress bar wrapper
            const progressWrapper = document.createElement('div');
            progressWrapper.className = 'progress-wrapper';
            progressWrapper.style.position = 'relative';

            // Create progress bar container
            const progressBarContainer = document.createElement('div');
            progressBarContainer.className = 'progress-bar-container';

            // Create progress bar
            state.progressBar = document.createElement('div');
            state.progressBar.className = 'progress-bar';

            // Create loading overlay
            state.progressLoading = document.createElement('div');
            state.progressLoading.className = 'progress-loading';
            state.progressLoading.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                display: none;
            `;

            // Create progress fill
            state.progressFill = document.createElement('div');
            state.progressFill.className = 'progress-fill';
            
            // Create bubble indicator
            state.progressBubble = document.createElement('div');
            state.progressBubble.className = 'progress-bubble';
            state.progressBubble.textContent = '0%';
            state.progressBubble.style.cssText = `
                position: absolute;
                right: -20px;
                top: 50%;
                transform: translateY(-50%) translateX(50%);
                background: #4f46e5;
                color: white;
                border-radius: 12px;
                padding: 2px 8px;
                font-size: 0.7rem;
                font-weight: 600;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                white-space: nowrap;
                transition: all 0.3s ease-out;
                z-index: 10;
                pointer-events: none;
            `;
            
            // Add progress bar to container
            progressBarContainer.appendChild(state.progressBar);
            
            // Add progress bar container and cancel button to wrapper
            progressWrapper.appendChild(progressBarContainer);
            progressWrapper.appendChild(state.cancelButton);
            state.progressFill.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                width: 0%;
                background: #4f46e5;
                transition: width 0.3s ease-out;
                display: none;
            `;

            // Assemble the progress bar
            state.progressBar.appendChild(state.progressLoading);
            state.progressBar.appendChild(state.progressFill);
            state.progressBar.appendChild(state.progressBubble);

            // Add elements to progress container
            state.progressContainer.appendChild(state.statusText);
            state.progressContainer.appendChild(progressWrapper);

            // Add styles for animations
            if (!document.getElementById('progress-bar-styles')) {
                const style = document.createElement('style');
                style.id = 'progress-bar-styles';
                style.textContent = `
                    @keyframes loadingShine {
                        0% { background-position: 200% 0; }
                        100% { background-position: -200% 0; }
                    }
                    .progress-bar {
                        position: relative;
                        overflow: visible;
                    }
                    .progress-bubble::after {
                        content: '';
                        position: absolute;
                        bottom: -4px;
                        left: 50%;
                        transform: translateX(-50%) rotate(45deg);
                        width: 8px;
                        height: 8px;
                        background: inherit;
                        z-index: -1;
                    }
                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .status-text.visible {
                        animation: fadeInUp 0.3s ease-out forwards;
                    }
                `;
                document.head.appendChild(style);
            }

            // Insert into DOM
            const form = document.getElementById('clip-form');
            if (form) {
                form.parentNode.insertBefore(state.progressContainer, form.nextSibling);
            }

            // Initialize loading state
            state.progressLoading.style.display = 'block';
        }
    }

    // Track clips and show support popup if needed
    function trackClipAndShowSupport() {
        try {
            // Initialize or get the clip count from localStorage
            let clipsCount = parseInt(localStorage.getItem('clipsCount')) || 0;
            clipsCount++;
            localStorage.setItem('clipsCount', clipsCount);
            
            // Check if we should show the support popup
            const isAsked = localStorage.getItem('isAsked') === 'true';
            
            if (clipsCount >= 7 && !isAsked) {
                // Set flag to prevent showing the popup again
                localStorage.setItem('isAsked', 'true');
                
                // Show the support popup
                showSupportPopup();
            }
        } catch (error) {
            console.error('Error tracking clip count:', error);
        }
    }
    
    // Show support popup
    function showSupportPopup() {
        // Create popup container
        const popup = document.createElement('div');
        popup.id = 'support-popup';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 2.5rem 3rem;
            border-radius: 12px;
            box-shadow: 0 6px 30px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            max-width: 90%;
            width: 100%;
            max-width: 650px;
            text-align: center;
        `;
        
        // Add popup content
        popup.innerHTML = `
            <h3 style="margin: 0 0 1.25rem 0; color: #1a1a1a; font-size: 1.75rem; font-weight: 700; line-height: 1.3;">Love using VideoClipper?</h3>
            <p style="color: #4a5568; line-height: 1.6; margin: 0 0 2rem 0; font-size: 1.1rem;">
                We love seeing you get value from VideoClipper! 💙<br>If it’s been helpful, please consider supporting the project so we can keep it alive, free, and growing with new features for everyone.
            </p>
            <div style="display: flex; justify-content: center; gap: 1rem;">
                <a id="support-yes" href="https://ko-fi.com/videoclipper" target="_blank" style="
                    background: #f45d22;
                    color: white;
                    text-decoration: none;
                    border: none;
                    padding: 0.9rem 2.25rem;
                    border-radius: 6px;
                    font-weight: 600;
                    font-size: 1.05rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: inline-block;
                ">
                    Support us
                </a>
                <button id="support-no" style="
                    background: transparent;
                    color: #4b5563;
                    border: 1px solid #e5e7eb;
                    padding: 0.9rem 2.25rem;
                    border-radius: 6px;
                    font-weight: 500;
                    font-size: 1.05rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                ">
                    Not now
                </button>
            </div>
        `;
        
        // Add overlay
        const overlay = document.createElement('div');
        overlay.id = 'support-popup-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.4);
            z-index: 9999;
            backdrop-filter: blur(2px);
        `;
        
        // Add to body
        document.body.appendChild(overlay);
        document.body.appendChild(popup);
        
        // Add event listeners
        document.getElementById('support-yes').addEventListener('click', (e) => {
            // Let the default anchor click behavior handle the navigation
            closePopup();
        });
        
        document.getElementById('support-no').addEventListener('click', closePopup);
        // Removed overlay click to close
        
        // Close popup function
        function closePopup() {
            if (document.body.contains(popup)) {
                document.body.removeChild(popup);
            }
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        }
        
        // Close with Escape key
        document.addEventListener('keydown', function handleEscape(e) {
            if (e.key === 'Escape') {
                closePopup();
                document.removeEventListener('keydown', handleEscape);
            }
        });
    }


    // Test function to manually trigger error state
    function testErrorState() {
        console.log('Testing error state...');
        if (state.progressFill) {
            state.progressFill.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                width: 100%;
                background: #ff4444 !important;
                transition: all 0.3s ease-out;
                display: block;
                z-index: 1;
            `;
            console.log('Test: Progress fill should now be red');
        }
    }


    // Public API
    // Store the last calculated cost to avoid recalculating
    let lastCalculatedCost = 0;
    
    // Cache DOM elements for credit calculation
    let creditCalcElements = {
        startTime: null,
        endTime: null,
        quality: null
    };
    
    // Initialize credit calculation elements
    function initCreditCalcElements() {
        creditCalcElements = {
            startTime: document.getElementById('start-time'),
            endTime: document.getElementById('end-time'),
            quality: document.getElementById('video-quality')
        };
    }
    
    // Function to update credits from the server
    async function updateCreditsFromServer() {
        try {
            const response = await fetch('/api/credits', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Client-FP': await getClientFingerprint()
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch credits');
            }
            
            const data = await response.json();
            
            // Update available credits
            if (data.credits_left !== undefined) {
                availableCredits = data.credits_left;
                const creditsDisplay = document.getElementById('credits-available');
                if (creditsDisplay) {
                    creditsDisplay.textContent = availableCredits.toFixed(2);
                    creditsDisplay.style.fontWeight = '600';
                    creditsDisplay.style.color = availableCredits > 0 ? '#10B981' : '#EF4444';
                    updateCreditCostDisplay();
                }
            }
            
            // Update reset time if available
            if (data.reset_time) {
                const resetTimeDisplay = document.getElementById('credits-reset-time');
                if (resetTimeDisplay) {
                    const resetDate = new Date(data.reset_time);
                    const now = new Date();
                    const timeUntilReset = resetDate - now;
                    
                    // Format the reset time in Xh Ym or Xm format
                    let resetTimeText;
                    if (timeUntilReset < 0) {
                        resetTimeText = 'Resets soon';
                    } else {
                        const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
                        const minutes = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((timeUntilReset % (1000 * 60)) / 1000);
                        
                        if (hours > 0) {
                            resetTimeText = `Resets in ${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`.trim();
                        } else if (minutes > 0) {
                            resetTimeText = `Resets in ${minutes}m${seconds > 0 ? ` ${seconds}s` : ''}`.trim();
                        } else {
                            resetTimeText = `Resets in ${seconds}s`;
                        }
                    }
                    
                    // Update the tooltip text (aria-label) for both desktop and mobile
                    resetTimeDisplay.setAttribute('aria-label', resetTimeText);
                    
                    // Also update the mobile hint text if it exists
                    const mobileHint = resetTimeDisplay.querySelector('#mobile-hint');
                    if (mobileHint) {
                        mobileHint.textContent = resetTimeText;
                    }
                }
            }
            
            return data;
        } catch (error) {
            console.error('Error updating credits:', error);
            throw error;
        }
    }
    
    // Calculate credit cost based on duration and quality
    function calculateCreditCost() {
        // Initialize elements if not already done
        if (!creditCalcElements.startTime) {
            initCreditCalcElements();
        }
        
        const startTime = (creditCalcElements.startTime && creditCalcElements.startTime.value) || '00:00:00';
        const endTime = (creditCalcElements.endTime && creditCalcElements.endTime.value) || '00:00:00';
        const quality = (creditCalcElements.quality && creditCalcElements.quality.value) || '1080';
        
        // Convert time to seconds
        const startSeconds = timeToSeconds(startTime);
        const endSeconds = timeToSeconds(endTime);
        
        // Calculate duration in seconds
        const durationInSeconds = Math.max(0, endSeconds - startSeconds);
        
        // Define cost per minute for each quality
        const costPerMinute = {
            '480': 0.25,
            '720': 0.5,
            '1080': 1.0,
            '1440': 2.0
        };
        
        // Calculate and store total cost
        const cost = costPerMinute[quality] * (durationInSeconds / 60);
        lastCalculatedCost = cost;
        return { cost, durationInSeconds };
    }
    
    // Update credit cost display and control download button state
    function updateCreditCostDisplay() {
        const creditCostDisplay = document.getElementById('credit-cost-display');
        const creditCostText = document.getElementById('credit-cost-text');
        const downloadBtn = document.getElementById('download-btn');
        
        // Block download button if no credits available
        if (availableCredits <= 0) {
            if (downloadBtn) downloadBtn.disabled = true;
            creditCostDisplay.style.display = 'block';
            creditCostText.textContent = 'No credits available';
            creditCostText.style.color = '#EF4444'; // Red color
            return;
        }
        
        try {
            const { cost, durationInSeconds } = calculateCreditCost();
            
            // Only show if we have a valid duration and cost
            if (durationInSeconds > 0 && cost > 0) {
                const roundedCost = parseFloat(cost.toFixed(2));
                const hasEnoughCredits = availableCredits >= roundedCost;
                
                if (hasEnoughCredits) {
                    creditCostText.textContent = `Uses ${roundedCost} credits`;
                    creditCostText.style.color = '#10B981'; // Green color
                    if (downloadBtn) downloadBtn.disabled = false;
                } else {
                    creditCostText.textContent = `Needs ${roundedCost} credits`;
                    creditCostText.style.color = '#EF4444'; // Red color
                    if (downloadBtn) downloadBtn.disabled = true;
                }
                
                creditCostDisplay.style.display = 'block';
            } else {
                creditCostDisplay.style.display = 'none';
                if (downloadBtn) downloadBtn.disabled = true;
            }
        } catch (error) {
            console.error('Error updating credit cost:', error);
            creditCostDisplay.style.display = 'none';
            if (downloadBtn) downloadBtn.disabled = true;
        }
    }
    
    // Add event listeners for credit cost calculation
    function setupCreditCostListeners() {
        // Initialize elements if not already done
        if (!creditCalcElements.startTime) {
            initCreditCalcElements();
        }
        
        const timeInputs = [
            creditCalcElements.startTime,
            creditCalcElements.endTime
        ].filter(Boolean);
        
        const qualitySelect = creditCalcElements.quality;
        
        // Update credit cost when time inputs change
        timeInputs.forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    // Only update if this is a valid time input
                    if (input.value && input.checkValidity()) {
                        updateCreditCostDisplay();
                    }
                });
            }
        });
        
        // Update credit cost when quality changes
        if (qualitySelect) {
            qualitySelect.addEventListener('change', updateCreditCostDisplay);
        }
        
        // Initial update
        updateCreditCostDisplay();
    }
    
    return {
        init: function () {
            try {
                // Check for existing processID in sessionStorage and cancel it
                const savedProcessId = sessionStorage.getItem('ProcessId');
                if (savedProcessId) {
                    // Send cancel request and clear the process ID
                    fetch(`/api/cancel/${savedProcessId}?reason=page-refresh`, { method: 'GET' })
                        .finally(() => {
                            // Clear the process ID after sending the cancel request
                            sessionStorage.removeItem('ProcessId');
                        })
                        .catch(error => console.error('Error cancelling stored process:', error));
                }

                state.form = document.getElementById('clip-form');
                if (!state.form) return;

                state.actionButtons = state.form.querySelector('.action-buttons');

                createProgressElements();
                setupPasteButton();
                setupTimeInputs();
                setupCreditCostListeners();

                state.form.addEventListener('submit', handleSubmit);

                // Initialize credits and update display
                updateCreditsFromServer().then(() => {
                    // After credits are loaded, update the display
                    updateCreditCostDisplay();
                });

            } catch (error) {
                showError('Failed to initialize the application. Please refresh the page.');
            }
        },
        testError: testErrorState
    };
})();

// Add page unload detection
let isPageUnloading = false;

window.addEventListener('beforeunload', () => {
    isPageUnloading = true;
});

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => VideoClipper.init());
} else {
    VideoClipper.init();
}