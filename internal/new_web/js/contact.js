document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = {
                name: document.getElementById('name').value.trim(),
                email: document.getElementById('email').value.trim(),
                subject: document.getElementById('subject').value.trim(),
                message: document.getElementById('message').value.trim()
            };
            
            // Simple validation
            if (!formData.name || !formData.email || !formData.subject || !formData.message) {
                showAlert('Please fill in all fields.', 'error');
                return;
            }
            
            if (!isValidEmail(formData.email)) {
                showAlert('Please enter a valid email address.', 'error');
                return;
            }
            
            // Here you would typically send the form data to a server
            // For this example, we'll just show a success message
            console.log('Form submitted:', formData);
            
            // Show success message
            showAlert('Your message has been sent successfully! We\'ll get back to you soon.', 'success');
            
            // Reset form
            contactForm.reset();
        });
    }
    
    // Email validation helper function
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }
    
    // Show alert message
    function showAlert(message, type) {
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
        const form = document.querySelector('form');
        if (form) {
            form.parentNode.insertBefore(alert, form);
            
            // Remove alert after 5 seconds
            setTimeout(() => {
                alert.style.opacity = '0';
                alert.style.transition = 'opacity 0.5s ease';
                setTimeout(() => {
                    alert.remove();
                }, 500);
            }, 5000);
        }
    }
});
