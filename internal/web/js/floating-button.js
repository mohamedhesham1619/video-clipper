// Floating Button Component
class FloatingButton {
  constructor() {
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    // Create container
    const container = document.createElement('div');
    container.id = 'floating-button-container';
    document.body.appendChild(container);
    
    try {
      // Load the component HTML
      const response = await fetch('/components/floating-button.html');
      if (!response.ok) throw new Error('Failed to load floating button');
      
      const html = await response.text();
      container.innerHTML = html;
      
      // Initialize the component
      this.setupEventListeners();
      this.initialized = true;
    } catch (error) {
      console.error('Error loading floating button:', error);
    }
  }

  setupEventListeners() {
    const contactFloat = document.getElementById('contact-float');
    const contactModal = document.getElementById('contact-modal');
    const closeModal = document.querySelector('.close-modal');
    const modalForm = document.getElementById('modal-contact-form');

    if (contactFloat && contactModal) {
      // Open modal - use requestAnimationFrame for better INP
      contactFloat.addEventListener('click', (e) => {
        e.preventDefault();
        requestAnimationFrame(() => {
          contactModal.classList.add('show');
          document.body.style.overflow = 'hidden';
        });
      });

      // Close modal
      if (closeModal) {
        closeModal.addEventListener('click', () => this.closeModal(contactModal));
      }

      // Close when clicking outside - use passive for better performance
      contactModal.addEventListener('click', (e) => {
        if (e.target === contactModal) {
          this.closeModal(contactModal);
        }
      }, { passive: true });

      // Close with Escape key - use passive
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && contactModal.classList.contains('show')) {
          this.closeModal(contactModal);
        }
      }, { passive: true });

      // Form submission
      if (modalForm) {
        modalForm.addEventListener('submit', (e) => this.handleFormSubmit(e, modalForm, contactModal));
      }
    }
  }

  closeModal(modal) {
    // Use requestAnimationFrame for better INP
    requestAnimationFrame(() => {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    });
  }

  async handleFormSubmit(e, form, modal) {
    e.preventDefault();
    
    const submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton) {
      console.error('Submit button not found in form');
      return;
    }
    
    // Add loading styles if not already present
    if (!document.getElementById('floating-button-loader-styles')) {
      const style = document.createElement('style');
      style.id = 'floating-button-loader-styles';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .button-loader {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 10px;
          vertical-align: middle;
          position: relative;
          top: -1px;
        }
        .button-text {
          display: inline-block;
          vertical-align: middle;
        }
        button[type="submit"]:disabled {
          opacity: 0.8;
          cursor: not-allowed;
          pointer-events: none;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Save original button content and state
    const originalButtonHTML = submitButton.innerHTML;
    const originalButtonWidth = submitButton.offsetWidth + 'px';
    
    // Clear any existing messages
    const existingMessages = form.querySelectorAll('.success-message, .error-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Set loading state
    submitButton.disabled = true;
    submitButton.style.minWidth = originalButtonWidth;
    submitButton.innerHTML = `
      <span class="button-loader"></span>
      <span class="button-text">Sending...</span>
    `;
    
    // Force a reflow to ensure styles are applied
    void submitButton.offsetHeight;
    
    try {
      // Get form data
      const formData = new FormData(form);
      const email = formData.get('email')?.trim() || '';
      const message = formData.get('message')?.trim() || '';
      
      // Simple validation
      if (!message) {
        throw new Error('Please enter your message.');
      }
      
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Please enter a valid email address or leave it empty.');
      }
      
      // Send to server
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, message })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to send message. Please try again.');
      }
      
      // Show success message in the modal
      const successMessage = document.createElement('div');
      successMessage.className = 'success-message';
      successMessage.style.color = '#16a34a';
      successMessage.style.padding = '10px';
      successMessage.style.marginTop = '10px';
      successMessage.style.borderRadius = '4px';
      successMessage.style.backgroundColor = '#dcfce7';
      successMessage.textContent = 'Thank you for your message!';
      
      form.reset();
      form.insertBefore(successMessage, form.firstChild);
      
      // Close modal after 3 seconds
      setTimeout(() => {
        this.closeModal(modal);
      }, 3000);
      
    } catch (error) {
      console.error('Error submitting form:', error);
      
      // Show error message in the modal
      const errorMessage = document.createElement('div');
      errorMessage.className = 'error-message';
      errorMessage.style.color = '#b91c1c';
      errorMessage.style.padding = '10px';
      errorMessage.style.marginTop = '10px';
      errorMessage.style.borderRadius = '4px';
      errorMessage.style.backgroundColor = '#fee2e2';
      errorMessage.textContent = error.message || 'There was an error sending your message. Please try again.';
      
      form.insertBefore(errorMessage, form.firstChild);
      
      // Auto-remove error message after 5 seconds
      setTimeout(() => {
        if (errorMessage.parentNode === form) {
          form.removeChild(errorMessage);
        }
      }, 5000);
      
    } finally {
      // Restore button state
      if (submitButton) {
        setTimeout(() => {
          submitButton.disabled = false;
          submitButton.innerHTML = originalButtonHTML || 'Send Message';
          submitButton.style.minWidth = ''; // Reset min-width
        }, 100);
      }
    }
  }
}

// Initialize the floating button when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const floatingButton = new FloatingButton();
  floatingButton.init();
});
