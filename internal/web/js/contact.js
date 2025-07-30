// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing contact form...');
    
    // Function to show alerts
    function showAlert(message, type = 'info') {
        console.log(`Showing alert: ${message} (${type})`);
        
        // Remove any existing alerts
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        // Create alert element
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        
        // Style the alert
        alert.style.padding = '1rem';
        alert.style.marginBottom = '1rem';
        alert.style.borderRadius = '4px';
        alert.style.fontWeight = '500';
        
        if (type === 'error') {
            alert.style.backgroundColor = '#fee2e2';
            alert.style.color = '#b91c1c';
            alert.style.borderLeft = '4px solid #dc2626';
        } else {
            alert.style.backgroundColor = '#dcfce7';
            alert.style.color = '#166534';
            alert.style.borderLeft = '4px solid #16a34a';
        }
        
        // Insert the alert before the form
        const form = document.getElementById('contactForm');
        if (form && form.parentNode) {
            form.parentNode.insertBefore(alert, form);
            
            // Remove alert after 5 seconds
            setTimeout(() => {
                if (document.body.contains(alert)) {
                    alert.style.opacity = '0';
                    alert.style.transition = 'opacity 0.5s ease';
                    setTimeout(() => {
                        alert.remove();
                    }, 500);
                }
            }, 5000);
        } else {
            console.error('Could not find contact form or its parent node');
            // Fallback to document body if form not found
            document.body.insertBefore(alert, document.body.firstChild);
        }
    }
    
    // Initialize the contact form
    function initContactForm() {
        const contactForm = document.getElementById('contactForm');
        
        if (!contactForm) {
            console.error('Contact form element not found');
            showAlert('Error: Could not initialize contact form. Please refresh the page and try again.', 'error');
            return;
        }
        
        console.log('Contact form found, setting up event listener...');
        
        contactForm.addEventListener('submit', async function(e) {
            console.log('Form submission started');
            e.preventDefault();
            
            try {
                // Get form data safely
                const emailInput = contactForm.querySelector('input[name="email"]');
                const messageInput = contactForm.querySelector('textarea[name="message"]');
                
                if (!emailInput || !messageInput) {
                    throw new Error('Form fields not found. Please refresh the page and try again.');
                }
                
                const email = emailInput.value ? emailInput.value.trim() : '';
                const message = messageInput.value ? messageInput.value.trim() : '';
                
                const data = { 
                    email: email,
                    message: message 
                };
                
                console.log('Form data:', data);
                
                // Simple validation
                if (!data.message) {
                    throw new Error('Please enter your message.');
                }
                
                if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
                    throw new Error('Please enter a valid email address or leave it empty.');
                }
                
                // Show loading state
                const submitButton = contactForm.querySelector('button[type="submit"]');
                let originalButtonText = 'Send Message';
                let originalButtonHTML = '';
                
                if (submitButton) {
                    originalButtonText = submitButton.textContent || originalButtonText;
                    originalButtonHTML = submitButton.innerHTML;
                    submitButton.disabled = true;
                    submitButton.innerHTML = `
                        <span class="button-loader"></span>
                        <span>Sending...</span>
                    `;
                    
                    // Add loading styles if not already present
                    if (!document.getElementById('button-loader-styles')) {
                        const style = document.createElement('style');
                        style.id = 'button-loader-styles';
                        style.textContent = `
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                            .button-loader {
                                display: inline-block;
                                width: 1em;
                                height: 1em;
                                border: 2px solid rgba(255,255,255,0.3);
                                border-radius: 50%;
                                border-top-color: #fff;
                                animation: spin 1s ease-in-out infinite;
                                margin-right: 8px;
                                vertical-align: middle;
                            }
                            button[disabled] {
                                opacity: 0.8;
                                cursor: not-allowed;
                            }
                        `;
                        document.head.appendChild(style);
                    }
                    
                    try {
                        console.log('Sending request to /feedback...');
                        const response = await fetch('/feedback', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(data)
                        });
                        
                        console.log('Response status:', response.status);
                        
                        let responseData;
                        try {
                            responseData = await response.json();
                            console.log('Response data:', responseData);
                        } catch (parseError) {
                            console.error('Error parsing JSON response:', parseError);
                            const text = await response.text();
                            console.error('Response text:', text);
                            throw new Error('Invalid response from server. Please try again.');
                        }
                        
                        if (!response.ok) {
                            throw new Error(responseData.message || `Server returned status: ${response.status}`);
                        }
                        
                        showAlert('Your message has been sent successfully!', 'success');
                        contactForm.reset();
                    } catch (error) {
                        console.error('Error in form submission:', {
                            error: error,
                            name: error.name,
                            message: error.message,
                            stack: error.stack
                        });
                        throw error; // Re-throw to be caught by outer catch
                    } finally {
                        // Restore button state
                        if (submitButton) {
                            submitButton.disabled = false;
                            submitButton.innerHTML = originalButtonHTML || originalButtonText || 'Send Message';
                        }
                    }
                } else {
                    console.error('Submit button not found in form');
                    throw new Error('Form submission error. Please try again.');
                }
            } catch (error) {
                console.error('Form submission failed:', {
                    error: error,
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
                showAlert(error.message || 'There was an error sending your message. Please try again.', 'error');
            }
        });
        
        console.log('Contact form initialization complete');
    }
    
    // Initialize the contact form
    initContactForm();
});
