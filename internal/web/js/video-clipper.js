// Video Clipper - Factory Function Pattern
// Handles video clip requests with progress tracking via SSE

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
        cancelButton: null
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
        // Hide action buttons and quality selector
        const actionButtons = document.querySelector('.action-buttons');
        const qualitySelector = document.querySelector('.quality-selector');

        if (actionButtons) actionButtons.classList.add('hidden');
        if (qualitySelector) qualitySelector.classList.add('hidden');

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

            // Set up loading state for progress bar
            if (state.progressLoading && state.progressFill) {
                // Show loading animation
                state.progressLoading.style.display = 'block';
                state.progressFill.style.display = 'none';
                // Reset progress
                state.progressFill.style.width = '0%';
                state.progressFill.classList.remove('progress-complete');
            }
        }

        // Show status text with animation
        if (state.statusText) {
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

    function hideLoading() {
        // Show action buttons and quality selector again after a delay
        setTimeout(() => {
            const actionButtons = document.querySelector('.action-buttons');
            const qualitySelector = document.querySelector('.quality-selector');

            if (actionButtons) actionButtons.classList.remove('hidden');
            if (qualitySelector) qualitySelector.classList.remove('hidden');

            // Hide progress container with fade out effect
            if (state.progressContainer) {
                state.progressContainer.classList.remove('visible');
                // Wait for the fade out transition to complete before hiding
                setTimeout(() => {
                    if (state.progressContainer) {
                        state.progressContainer.style.display = 'none';
                    }
                }, 300);
            }

            // Hide status text
            if (state.statusText) {
                state.statusText.classList.remove('visible');
            }
        }, 3000); // 3 second delay before showing buttons again
    }

    function showError(message) {
        console.error('Error:', message);

        // Show error message in the status text
        if (state.statusText) {
            state.statusText.textContent = message || 'An error occurred while processing your request.';
            state.statusText.classList.add('error');
            state.statusText.style.opacity = '1';
            state.statusText.style.visibility = 'visible';

            // Update progress bar to show error state
            if (state.progressBar) {
                state.progressBar.style.background = 'linear-gradient(90deg, #ef4444, #f87171, #ef4444)';
                state.progressBar.style.animation = 'progress-pulse 1.5s ease-in-out infinite';
            }
        }

        // Hide loading state immediately
        hideLoading();

        // For rate limit errors, show the message longer (15 seconds)
        const isRateLimitError = message && (
            message.toLowerCase().includes('too many requests') ||
            message.includes('You have reached the maximum number of requests')
        );
        const hideDelay = isRateLimitError ? 15000 : 5000;

        // Remove error state after delay
        setTimeout(() => {
            if (state.statusText) {
                state.statusText.style.opacity = '0';
                state.statusText.style.visibility = 'hidden';
                state.statusText.classList.remove('error');
            }
        }, hideDelay);
    }

    function handleTitleEvent(event) {
        try {
            const data = JSON.parse(event.data);
            let title = data.title || 'the video';
            // Clean up the title from any HTML entities or special characters
            title = title.replace(/&[^;]+;/g, '').trim();

            // Create status message with title
            state.statusText.setAttribute('data-status', 'extracting');
            const statusHTML = `
                <div class="status-message">
                    <div style="color: #000000;">Extracting the required clip from:</div>
                    <div class="truncate-title" title="${title.replace(/"/g, '&quot;')}">${title}</div>
                </div>
            `;

            // Update the status with our custom HTML
            if (state.statusText) {
                state.statusText.innerHTML = statusHTML;
                state.statusText.classList.add('visible');

                // Ensure the status message has the gradient animation
                const statusMessage = state.statusText.querySelector('.status-message > div:first-child');
                if (statusMessage) {
                    statusMessage.style.background = 'linear-gradient(90deg, #4f46e5, #8b5cf6, #4f46e5)';
                    statusMessage.style.backgroundSize = '200% auto';
                    statusMessage.style.backgroundClip = 'text';
                    statusMessage.style.webkitBackgroundClip = 'text';
                    statusMessage.style.webkitTextFillColor = 'transparent';
                    statusMessage.style.animation = 'textGradient 3s linear infinite';
                    statusMessage.style.display = 'inline-block';
                    statusMessage.style.padding = '0.25rem 0';
                }
            }
        } catch (e) {
            console.error('Error parsing title event:', e);
        }
    }

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

            // Update progress with a smooth transition
            requestAnimationFrame(() => {
                updateProgress(progress);
            });
        } catch (e) {
            console.error('Error parsing progress event:', e);
        }
    }

    function handleCompleteEvent(event) {
        if (state.completeHandled) return;
        state.completeHandled = true;
        
        // Update status to show processing message
        if (state.statusText) {
            state.statusText.setAttribute('data-status', 'processing');
        }
        updateStatus('Finalizing process...');

        // First ensure progress is at 100% before starting download
        const completeProgress = (callback) => {
            // Ensure progress elements are visible and updated
            if (state.progressFill) {
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
                
                // Hide loading indicator
                if (state.progressLoading) {
                    state.progressLoading.style.display = 'none';
                }
                
                // Wait for the transition to complete
                setTimeout(() => {
                    // Update status to show completion message
                    if (state.statusText) {
                        state.statusText.setAttribute('data-status', 'complete');
                    }
                    updateStatus('Process complete, download starting...');
                    callback();
                }, 500);
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
                        hideLoading();
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
            updateStatus('Starting download...');
            startDownload();
        });
    }

    async function cancelCurrentOperation() {
        if (!state.currentProcessId) return;
        
        try {
            updateStatus('Cancelling...');
            const response = await fetch(`/cancel/${state.currentProcessId}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to cancel operation');
            }
            
            // Close the event source if it exists
            if (state.eventSource) {
                state.eventSource.close();
                state.eventSource = null;
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
                        hideLoading();
                    }, 300);
                } else {
                    hideLoading();
                }
            }, 1000);
            
        } catch (error) {
            console.error('Error cancelling operation:', error);
            updateStatus('Error cancelling operation');
            
            // Still hide the loading state after a delay
            setTimeout(() => {
                hideLoading();
            }, 2000);
        }
    }

    function setupSSEConnection(processId) {
        // Close any existing connection
        if (state.eventSource) {
            state.eventSource.close();
            state.eventSource = null;
        }

        const progressUrl = `/progress/${processId}`;
        state.eventSource = new EventSource(progressUrl);

        const onConnectionError = (error) => {
            console.error('SSE Connection Error:', error);
            if (state.eventSource) {
                state.eventSource.close();
                state.eventSource = null;
            }
            showError(error.message);
            hideLoading();
        };

        // Handle successful connection
        state.eventSource.onopen = () => {
            console.log('SSE connection established');
            updateStatus('Connected to server...');
        };

        // Handle errors
        state.eventSource.onerror = onConnectionError;

        // Set up event listeners
        state.eventSource.addEventListener('title', handleTitleEvent);
        state.eventSource.addEventListener('progress', handleProgressEvent);
        state.eventSource.addEventListener('complete', handleCompleteEvent);

        // Add a global error handler for uncaught errors
        const errorHandler = (event) => {
            console.error('SSE Error Event:', event);
            showError('An error occurred while processing your request');
            if (state.eventSource) {
                state.eventSource.close();
                state.eventSource = null;
            }
            hideLoading();
            // Remove this listener after it's been called
            window.removeEventListener('error', errorHandler);
        };

        // Add the global error handler
        window.addEventListener('error', errorHandler);

        // Clean up after connection closes
        state.eventSource.addEventListener('complete', () => {
            if (state.eventSource) {
                state.eventSource.close();
                state.eventSource = null;
            }
            window.removeEventListener('error', errorHandler);
        }, { once: true });
    }

    function validateTimeFormat(timeStr) {
        return /^(\d{1,2}:)?\d{1,2}:\d{1,2}$/.test(timeStr);
    }

    function createDurationWarning() {
        const durationSpan = document.getElementById('duration-value');
        if (!durationSpan) return null;

        let warningElement = document.getElementById('duration-warning');
        if (!warningElement) {
            warningElement = document.createElement('div');
            warningElement.id = 'duration-warning';
            warningElement.className = 'duration-warning-text';
            warningElement.innerHTML = 'Max duration is 30 min. Need more? <a href="/contact" class="contact-link">Let us know</a>';
            durationSpan.parentNode.appendChild(warningElement);
        }
        return warningElement;
    }

    function updateDurationWarning(duration) {
        const maxDuration = 30 * 60; // 30 minutes in seconds
        const durationSpan = document.getElementById('duration-value');
        const warningElement = document.getElementById('duration-warning') || createDurationWarning();

        if (!durationSpan || !warningElement) return;

        if (duration > maxDuration) {
            durationSpan.classList.add('duration-warning');
            warningElement.classList.add('visible');
            return false; // Invalid duration
        } else {
            durationSpan.classList.remove('duration-warning');
            warningElement.classList.remove('visible');
            return true; // Valid duration
        }
    }

    function timeToSeconds(timeStr) {
        if (!timeStr) return 0;
        // Convert HH:MM:SS or MM:SS to seconds
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        }
        return 0;
    }

    function secondsToTimeString(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);

        if (mins === 0) {
            return `${secs} sec`;
        } else if (secs === 0) {
            return `${mins} min`;
        } else {
            return `${mins} min ${secs} sec`;
        }
    }

    function updateDurationDisplay() {
        const startTime = getFormElement('start-time').value;
        const endTime = getFormElement('end-time').value;
        const durationSpan = document.getElementById('duration-value');

        if (!durationSpan) return;

        if (!startTime || !endTime) {
            durationSpan.textContent = '00:00:00';
            updateDurationWarning(0);
            return;
        }

        try {
            const start = timeToSeconds(startTime);
            const end = timeToSeconds(endTime);

            if (end <= start) {
                durationSpan.textContent = '00:00:00';
                updateDurationWarning(0);
                return;
            }

            const duration = end - start;
            durationSpan.textContent = secondsToTimeString(duration);
            updateDurationWarning(duration);
        } catch (e) {
            console.error('Error calculating duration:', e);
            durationSpan.textContent = '00:00:00';
            updateDurationWarning(0);
        }
    }

    function getFormElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Could not find form element with ID: ${id}`);
        }
        return element;
    }

    async function handleSubmit(event) {
        // Check duration first
        const startTime = getFormElement('start-time').value;
        const endTime = getFormElement('end-time').value;

        if (startTime && endTime) {
            try {
                const start = timeToSeconds(startTime);
                const end = timeToSeconds(endTime);
                if (end > start) {
                    const duration = end - start;
                    if (!updateDurationWarning(duration)) {
                        event.preventDefault();
                        // Scroll to the duration display
                        const durationDisplay = document.querySelector('.duration-display');
                        if (durationDisplay) {
                            durationDisplay.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                        return false;
                    }
                }
            } catch (e) {
                console.error('Error validating duration:', e);
            }
        }

        event.preventDefault();

        if (!state.form) {
            console.error('Form element not found');
            showError('Form initialization error. Please refresh the page.');
            return;
        }

        try {
            const videoUrl = getFormElement('video-url').value.trim();
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

            showLoading();
            updateStatus('Getting video information...');
            updateProgress(0);

            // Add timeout for the fetch request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            let response;
            try {
                response = await fetch('/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        videoUrl,
                        clipStart,
                        clipEnd,
                        quality
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    if (response.status === 429) {
                        throw new Error('You have reached the maximum number of requests. Please try again later.');
                    }
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.message || `Server error: ${response.status} ${response.statusText}`);
                }

                const result = await response.json();
                if (result.processId) {
                    state.currentProcessId = result.processId;
                    // Save processID to sessionStorage
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
                // Only show error message if it's a 429 or another error we want to display
                const errorMessage = error.message || 'Failed to process your request. Please try again.';
                showError(errorMessage);
                hideLoading();
                // Don't re-throw here as we've already handled the error
            }
        } catch (error) {
            console.error('Error in form submission:', error);
            showError('An unexpected error occurred. Please try again.');
            hideLoading();
        }
    }

    function setupPasteButton() {
        const pasteButton = document.getElementById('paste-url');
        const videoUrlInput = document.getElementById('video-url');

        if (!pasteButton || !videoUrlInput) return;

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

            // Focus the input first
            videoUrlInput.focus();

            // On mobile, just show instructions
            if (isMobile) {
                showError('Tap and hold in the input field, then select "Paste"');
                return;
            }

            // For desktop, try to read from clipboard
            showLoading();

            try {
                if (navigator.clipboard && navigator.clipboard.readText) {
                    const text = await navigator.clipboard.readText();
                    if (!handlePasteSuccess(text)) {
                        showError('Clipboard is empty');
                    }
                } else {
                    showError('Please paste manually (Ctrl+V)');
                }
            } catch (err) {
                console.error('Clipboard access error:', err);
                showError('Please paste manually (Ctrl+V)');
            }

            // Reset the button after a short delay
            setTimeout(resetButton, 1000);
        };

        // Initialize input field for mobile
        const initMobileInput = () => {
            // Ensure input field is editable
            videoUrlInput.removeAttribute('readonly');
            videoUrlInput.removeAttribute('disabled');

            // Reset any problematic styles
            videoUrlInput.style.cssText = '';

            // Ensure standard input behavior
            videoUrlInput.style.webkitAppearance = 'none';
            videoUrlInput.style.MozAppearance = 'textfield';
            videoUrlInput.style.appearance = 'none';
        };

        // Initialize mobile input if needed
        if (isMobile) {
            initMobileInput();
            pasteButton.title = 'Tap to paste (long-press in the input field)';
        }

        // Add event listeners
        pasteButton.addEventListener('click', handlePaste);

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

        // Simple format function that only runs on blur
        const formatTimeOnBlur = (input) => {
            let value = input.value || '';

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

                // Pad with leading zeros
                hh = hh.padStart(2, '0');
                mm = mm.padStart(2, '0');
                ss = ss.padStart(2, '0');

                // Limit values
                hh = Math.min(99, parseInt(hh) || 0).toString().padStart(2, '0');
                mm = Math.min(59, parseInt(mm) || 0).toString().padStart(2, '0');
                ss = Math.min(59, parseInt(ss) || 0).toString().padStart(2, '0');

                input.value = `${hh}:${mm}:${ss}`;
            }

            updateDurationDisplay();
        };

        // Initialize time inputs
        timeInputs.forEach(input => {
            // Reset any problematic styles
            input.style.webkitAppearance = 'none';
            input.style.MozAppearance = 'textfield';
            input.style.appearance = 'none';

            // Format on blur
            input.addEventListener('blur', () => formatTimeOnBlur(input));

            // Initialize if empty on focus
            input.addEventListener('focus', (e) => {
                if (!e.target.value) {
                    e.target.value = '00:00:00';
                }
            });

            // Allow any input - we'll format on blur
            input.addEventListener('input', updateDurationDisplay);

            // Only allow numbers and colons
            input.addEventListener('keypress', (e) => {
                if (!/[0-9:]/.test(e.key)) {
                    e.preventDefault();
                }
            });
        });

        // Initial update
        updateDurationDisplay();
    }

    function createProgressElements() {
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
                top: -6px;
                transform: scale(0.9);
                transform-origin: center top;
                margin-top: -2px;
            `;

            // Remove progress info container and its children

            // Create progress bar wrapper
            const progressWrapper = document.createElement('div');
            progressWrapper.className = 'progress-wrapper';

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

    // Public API
    return {
        init: function () {
            try {
                // Check for existing processID in sessionStorage and cancel it
                const savedProcessId = sessionStorage.getItem('ProcessId');
                if (savedProcessId) {
                    console.log('Found stored process ID, sending cancel request:', savedProcessId);
                    // Send cancel request without setting as current process
                    fetch(`/cancel/${savedProcessId}`, { method: 'GET' })
                        .catch(error => console.error('Error cancelling stored process:', error));
                    // Clear the saved process ID
                    sessionStorage.removeItem('ProcessId');
                }

                state.form = document.getElementById('clip-form');
                if (!state.form) return;

                state.actionButtons = state.form.querySelector('.action-buttons');

                createProgressElements();
                setupPasteButton();
                setupTimeInputs();

                state.form.addEventListener('submit', handleSubmit);

                console.log('Video Clipper initialized');
            } catch (error) {
                console.error('Initialization error:', error);
                showError('Failed to initialize the application. Please refresh the page.');
            }
        }
    };
})();

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => VideoClipper.init());
} else {
    VideoClipper.init();
}
