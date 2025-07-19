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
            miniContactForm.onsubmit = async function(e) {
                e.preventDefault();
                const messageField = document.getElementById('miniMessage');
                const emailField = document.getElementById('miniEmail');
                const message = messageField.value.trim();
                const email = emailField.value.trim();
                // Check if message is empty
                if (!message) {
                    alert('Please enter a message before sending.');
                    messageField.focus();
                    return false;
                }
                try {
                    const res = await fetch('/feedback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, message })
                    });
                    const data = await res.json();
                    if (data.status === 'success') {
                        alert('Thank you for your feedback!');
                        contactModal.style.display = 'none';
                        miniContactForm.reset();
                    } else {
                        alert('Failed to send feedback. Please try again.');
                    }
                } catch (err) {
                    alert('Failed to send feedback. Please try again.');
                }
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