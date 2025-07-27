document.addEventListener('DOMContentLoaded', function() {
    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');
    const durationDisplay = document.getElementById('duration-display');
    const durationSpan = document.getElementById('duration-value');
    const pasteButton = document.getElementById('paste-url');
    const videoUrlInput = document.getElementById('video-url');
    
    // Add paste functionality
    if (pasteButton && videoUrlInput) {
        pasteButton.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    videoUrlInput.value = text;
                    // Trigger input event in case there are any validation or other event listeners
                    videoUrlInput.dispatchEvent(new Event('input'));
                    
                    // Show feedback
                    const originalTitle = pasteButton.title;
                    pasteButton.title = 'Pasted!';
                    pasteButton.innerHTML = '<i class="fas fa-check"></i>';
                    
                    // Reset after 2 seconds
                    setTimeout(() => {
                        pasteButton.title = originalTitle;
                        pasteButton.innerHTML = '<i class="fas fa-paste"></i>';
                    }, 2000);
                }
            } catch (err) {
                console.error('Failed to read clipboard contents:', err);
                // Fallback for older browsers or if clipboard permissions are denied
                videoUrlInput.select();
                document.execCommand('paste');
            }
        });
    }

    function calculateDuration() {
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;

        if (!startTime || !endTime) {
            durationSpan.textContent = '00:00:00';
            return;
        }

        try {
            const start = convertToSeconds(startTime);
            const end = convertToSeconds(endTime);
            
            if (end <= start) {
                durationSpan.textContent = '00:00:00';
                return;
            }

            const duration = end - start;
            durationSpan.textContent = formatDuration(duration);
        } catch (e) {
            console.error('Error calculating duration:', e);
            durationSpan.textContent = '00:00:00';
        }
    }

    function convertToSeconds(timeStr) {
        const parts = timeStr.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid time format');
        }
        
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parseInt(parts[2], 10);
        
        if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
            throw new Error('Invalid time values');
        }
        
        return hours * 3600 + minutes * 60 + seconds;
    }

    function formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes === 0) {
            return `${remainingSeconds} sec`;
        } else if (remainingSeconds === 0) {
            return `${minutes} min`;
        } else {
            return `${minutes} min ${remainingSeconds} sec`;
        }
    }

    // Add event listeners
    startTimeInput.addEventListener('input', calculateDuration);
    endTimeInput.addEventListener('input', calculateDuration);

    // Initial calculation
    calculateDuration();
});
