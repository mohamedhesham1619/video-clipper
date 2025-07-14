// Shared JavaScript for VideoClipper pages

// Floating contact button modal logic with validation
document.addEventListener('DOMContentLoaded', function() {
    const floatingBtn = document.getElementById('floatingContactBtn');
    const contactModal = document.getElementById('contactModal');
    const miniContactForm = document.getElementById('miniContactForm');
    
    if (floatingBtn && contactModal) {
        // Open modal
        floatingBtn.onclick = () => contactModal.style.display = 'flex';
        
        // Close modal when clicking outside
        contactModal.onclick = (e) => { 
            if (e.target === contactModal) contactModal.style.display = 'none'; 
        };
        
        // Handle form submission with validation
        if (miniContactForm) {
            miniContactForm.onsubmit = function(e) {
                e.preventDefault();
                
                const messageField = document.getElementById('miniMessage');
                const emailField = document.getElementById('miniEmail');
                
                // Check if message is empty
                if (!messageField.value.trim()) {
                    alert('Please enter a message before sending.');
                    messageField.focus();
                    return false;
                }
                
                // Here you would typically send the data to your backend
                // For now, we'll just close the modal and show a success message
                alert('Thank you for your message! We\'ll get back to you soon.');
                contactModal.style.display = 'none';
                
                // Reset form
                miniContactForm.reset();
                
                return false;
            };
        }
    }
});

// FAQ toggle functionality (for FAQ page)
document.addEventListener('DOMContentLoaded', function() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            const toggle = question.querySelector('.faq-toggle');
            
            answer.classList.toggle('active');
            toggle.classList.toggle('active');
        });
    });
}); 