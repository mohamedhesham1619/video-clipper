// Video Clipper - Factory Function Pattern
// Handles video clip requests with progress tracking via SSE

const VideoClipper = (function() {
    // Private state
    let state = {
        form: null,
        progressBar: null,
        progressContainer: null,
        statusText: null,
        actionButtons: null,
        eventSource: null,
        downloadUrl: null
    };

    // Private methods
    function updateStatus(message) {
        if (state.statusText) {
            state.statusText.textContent = message;
        }
    }

    function updateProgress(percent) {
        if (state.progressBar) {
            const progress = Math.min(100, Math.max(0, percent));
            state.progressBar.style.width = `${progress}%`;
            
            // Add animation effect
            state.progressBar.style.transform = 'scaleX(1.02)';
            setTimeout(() => {
                if (state.progressBar) {
                    state.progressBar.style.transform = 'scaleX(1)';
                }
            }, 150);
        }
    }

    function showLoading() {
        if (state.progressContainer) {
            state.progressContainer.style.display = 'block';
            setTimeout(() => {
                state.progressContainer.style.opacity = '1';
            }, 10);
        }
        if (state.statusText) state.statusText.style.display = 'block';
        if (state.actionButtons) state.actionButtons.style.display = 'none';
    }

    function hideLoading() {
        if (state.progressContainer) {
            state.progressContainer.style.opacity = '0';
            setTimeout(() => {
                if (state.progressContainer) {
                    state.progressContainer.style.display = 'none';
                }
            }, 300);
        }
        if (state.statusText) state.statusText.style.display = 'none';
        if (state.actionButtons) state.actionButtons.style.display = 'block';
    }

    function showError(message) {
        updateStatus(`Error: ${message}`);
        setTimeout(hideLoading, 3000);
    }

    function handleTitleEvent(event) {
        try {
            const data = JSON.parse(event.data);
            let title = data.title || 'the video';
            const maxLength = 50;
            if (title.length > maxLength) {
                title = title.substring(0, maxLength) + '...';
            }
            updateStatus(`Processing: ${title}`);
        } catch (e) {
            console.error('Error parsing title event:', e);
        }
    }

    function handleProgressEvent(event) {
        try {
            const data = JSON.parse(event.data);
            const progress = parseInt(data.progress || '0', 10);
            updateProgress(progress);
            updateStatus('Processing video...');
        } catch (e) {
            console.error('Error parsing progress event:', e);
        }
    }

    function handleCompleteEvent(event) {
        try {
            const data = JSON.parse(event.data);
            updateProgress(100);
            updateStatus('Download starting...');
            
            if (state.progressBar) {
                state.progressBar.style.backgroundColor = '#10b981';
            }
            
            if (data.downloadUrl) {
                const link = document.createElement('a');
                link.href = data.downloadUrl;
                link.download = '';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            
            setTimeout(hideLoading, 1000);
        } catch (e) {
            console.error('Error handling complete event:', e);
            showError('Failed to process download');
            hideLoading();
        }
    }

    function handleSSEError() {
        console.error('SSE connection error');
        if (state.eventSource) {
            state.eventSource.close();
            state.eventSource = null;
        }
        showError('Connection to server was interrupted');
    }

    function setupSSEConnection(jobId) {
        if (state.eventSource) {
            state.eventSource.close();
        }

        const progressUrl = `/progress/${jobId}`;
        state.eventSource = new EventSource(progressUrl);

        state.eventSource.onopen = () => {
            console.log('SSE connection established');
            updateStatus('Connected to server...');
        };

        state.eventSource.onerror = handleSSEError;
        state.eventSource.addEventListener('title', handleTitleEvent);
        state.eventSource.addEventListener('progress', handleProgressEvent);
        state.eventSource.addEventListener('complete', handleCompleteEvent);
    }

    function validateTimeFormat(timeStr) {
        // Validates time in HH:MM:SS or MM:SS format
        return /^(\d{1,2}:)?\d{1,2}:\d{1,2}$/.test(timeStr);
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
        try {
            const startTime = getFormElement('start-time').value;
            const endTime = getFormElement('end-time').value;
            
            if (!startTime || !endTime) {
                document.getElementById('duration-value').textContent = '0 sec';
                return;
            }
            
            const startSeconds = timeToSeconds(startTime);
            const endSeconds = timeToSeconds(endTime);
            
            if (isNaN(startSeconds) || isNaN(endSeconds) || startSeconds >= endSeconds) {
                document.getElementById('duration-value').textContent = '0 sec';
                return;
            }
            
            const duration = endSeconds - startSeconds;
            const durationString = secondsToTimeString(duration);
            document.getElementById('duration-value').textContent = durationString;
            
        } catch (error) {
            console.error('Error updating duration display:', error);
            document.getElementById('duration-value').textContent = '0 sec';
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
            
            // Maximum clip duration: 10 minutes (600 seconds)
            if ((endSeconds - startSeconds) > 600) {
                throw new Error('Maximum clip duration is 10 minutes');
            }
            
            showLoading();
            updateStatus('Preparing your clip...');
            updateProgress(0);
            
            // Add timeout for the fetch request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            try {
                const response = await fetch('/submit', {
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
                        throw new Error('Rate limit exceeded. Please try again in a few minutes.');
                    }
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.message || `Server error: ${response.status} ${response.statusText}`);
                }
                
                const data = await response.json();
                if (data.status !== 'started' || !data.processId) {
                    throw new Error('Invalid response from server: Missing process ID');
                }
                
                console.log('Processing started with ID:', data.processId);
                setupSSEConnection(data.processId);
                
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('Request timed out. Please check your connection and try again.');
                }
                throw fetchError;
            }
            
        } catch (error) {
            console.error('Error in handleSubmit:', {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            showError(error.message || 'Failed to process your request. Please try again.');
            hideLoading();
        }
    }

    function setupPasteButton() {
        const pasteButton = document.getElementById('paste-button');
        const videoUrlInput = document.getElementById('video-url');
        
        if (!pasteButton || !videoUrlInput) return;
        
        pasteButton.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    videoUrlInput.value = text;
                    videoUrlInput.dispatchEvent(new Event('input'));
                }
            } catch (err) {
                console.error('Failed to read from clipboard:', err);
                videoUrlInput.focus();
                showError('Please paste the URL manually');
            }
        });
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
        
        timeInputs.forEach(input => {
            let isDeleting = false;
            
            // Format on blur
            input.addEventListener('blur', (e) => {
                const formatted = formatTimeInput(e.target.value);
                if (formatted !== e.target.value) {
                    e.target.value = formatted;
                }
                updateDurationDisplay();
            });
            
            // Initialize if empty on focus
            input.addEventListener('focus', (e) => {
                if (!e.target.value) {
                    e.target.value = '00:00:00';
                }
                isDeleting = false;
            });
            
            // Handle keydown to detect backspace/delete
            input.addEventListener('keydown', (e) => {
                isDeleting = (e.key === 'Backspace' || e.key === 'Delete');
            });
            
            // Handle input
            input.addEventListener('input', (e) => {
                // Don't format while deleting
                if (!isDeleting) {
                    const formatted = formatTimeInput(e.target.value);
                    if (formatted !== e.target.value) {
                        const cursorPos = e.target.selectionStart;
                        e.target.value = formatted;
                        // Try to maintain cursor position
                        requestAnimationFrame(() => {
                            const newPos = Math.min(cursorPos + (formatted.length - e.target.value.length), formatted.length);
                            e.target.setSelectionRange(newPos, newPos);
                        });
                    }
                }
                
                updateDurationDisplay();
            });
        });
        
        // Initial update
        updateDurationDisplay();
    }

    function createProgressElements() {
        if (!state.progressContainer) {
            state.progressContainer = document.createElement('div');
            state.progressContainer.className = 'progress-container';
            state.progressContainer.style.cssText = `
                margin: 1.5rem 0;
                width: 100%;
                opacity: 0;
                transition: opacity 0.3s ease-in-out;
                display: none;
            `;
            
            state.statusText = document.createElement('div');
            state.statusText.className = 'status-text';
            state.statusText.style.cssText = `
                margin-bottom: 0.5rem;
                text-align: center;
                font-weight: 500;
                color: #4b5563;
            `;
            
            const progressBarContainer = document.createElement('div');
            progressBarContainer.className = 'progress-bar-container';
            progressBarContainer.style.cssText = `
                width: 100%;
                height: 8px;
                background-color: #e9ecef;
                border-radius: 4px;
                overflow: hidden;
            `;
            
            state.progressBar = document.createElement('div');
            state.progressBar.className = 'progress-bar';
            state.progressBar.style.cssText = `
                height: 100%;
                width: 0%;
                background-color: #4f46e5;
                transition: width 0.3s ease-out, background-color 0.3s ease;
                will-change: width, transform;
            `;
            
            progressBarContainer.appendChild(state.progressBar);
            state.progressContainer.appendChild(state.statusText);
            state.progressContainer.appendChild(progressBarContainer);
            
            const form = document.getElementById('clip-form');
            if (form) {
                form.parentNode.insertBefore(state.progressContainer, form.nextSibling);
            }
        }
    }

    // Public API
    return {
        init: function() {
            state.form = document.getElementById('clip-form');
            if (!state.form) return;
            
            state.actionButtons = state.form.querySelector('.action-buttons');
            
            createProgressElements();
            setupPasteButton();
            setupTimeInputs();
            
            state.form.addEventListener('submit', handleSubmit);
            
            console.log('Video Clipper initialized');
        }
    };
})();

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => VideoClipper.init());
} else {
    VideoClipper.init();
}
