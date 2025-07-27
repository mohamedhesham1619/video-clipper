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
      // Open modal
      contactFloat.addEventListener('click', (e) => {
        e.preventDefault();
        contactModal.classList.add('show');
        document.body.style.overflow = 'hidden';
      });

      // Close modal
      if (closeModal) {
        closeModal.addEventListener('click', () => this.closeModal(contactModal));
      }

      // Close when clicking outside
      contactModal.addEventListener('click', (e) => {
        if (e.target === contactModal) {
          this.closeModal(contactModal);
        }
      });

      // Close with Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && contactModal.classList.contains('show')) {
          this.closeModal(contactModal);
        }
      });

      // Form submission
      if (modalForm) {
        modalForm.addEventListener('submit', (e) => this.handleFormSubmit(e, modalForm, contactModal));
      }
    }
  }

  closeModal(modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }

  async handleFormSubmit(e, form, modal) {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    try {
      // Here you would typically send the data to your server
      console.log('Form submitted:', data);
      alert('Thank you for your message! We will get back to you soon.');
      form.reset();
      this.closeModal(modal);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('There was an error sending your message. Please try again.');
    }
  }
}

// Initialize the floating button when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const floatingButton = new FloatingButton();
  floatingButton.init();
});
