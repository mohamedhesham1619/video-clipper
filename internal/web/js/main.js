// Floating Button Component
class FloatingButton {
  constructor() {
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    // Create container if it doesn't exist
    let container = document.getElementById('floating-button-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'floating-button-container';
      document.body.appendChild(container);
    }
    
    // Add the floating button HTML
    container.innerHTML = `
      <button id="contact-float" class="floating-button" aria-label="Contact Us">
          <i class="fas fa-envelope"></i>
          <span>Contact Us</span>
      </button>

      <div id="contact-modal" class="modal">
          <div class="modal-content">
              <span class="close-modal">&times;</span>
              <h2>Contact Us</h2>
              <p class="subtitle">Have a question or need help? Send us a message.</p>
              
              <form id="modal-contact-form" class="minimal-contact-form">
                  <div class="form-group">
                      <label for="modal-email">Email (optional)</label>
                      <input type="email" id="modal-email" name="email" class="form-control" placeholder="your@email.com">
                  </div>
                  
                  <div class="form-group">
                      <label for="modal-message">Your Message <span class="required">*</span></label>
                      <textarea id="modal-message" name="message" class="form-control" rows="4" placeholder="How can we help you?" required></textarea>
                  </div>
                  
                  <button type="submit" class="btn-send-message">
                      Send Message
                  </button>
              </form>
          </div>
      </div>
    `;
    
    // Add styles if they don't exist
    this.addStyles();
    
    // Initialize event listeners
    this.setupEventListeners();
    this.initialized = true;
  }

  addStyles() {
    // Only add styles if they haven't been added yet
    if (document.getElementById('floating-button-styles')) return;

    const style = document.createElement('style');
    style.id = 'floating-button-styles';
    style.textContent = `
      /* Floating Button Styles */
      #floating-button-container .floating-button {
          position: fixed !important;
          bottom: 2rem !important;
          right: 2rem !important;
          background-color: var(--primary-color) !important;
          color: white !important;
          border: none !important;
          border-radius: 8px !important;
          padding: 0.75rem 1.25rem !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 0.5rem !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          transition: all 0.3s ease !important;
          z-index: 999 !important;
          width: auto !important;
          height: auto !important;
          min-width: 140px !important;
          text-align: center !important;
      }

      #floating-button-container .floating-button:hover {
          background-color: #3a56d4 !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2) !important;
      }

      #floating-button-container .floating-button i {
          font-size: 1.1rem !important;
      }

      #floating-button-container .floating-button span {
          font-size: 0.9rem !important;
          font-weight: 500 !important;
          display: inline-block !important;
      }

      /* Modal Styles */
      .modal {
          display: none;
          position: fixed;
          z-index: 1000;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          opacity: 0;
          transition: opacity 0.3s ease;
      }

      .modal.show {
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 1;
      }

      .modal-content {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      }
      
      .modal-content h2 {
          text-align: center;
          margin-bottom: 0.5rem;
          color: var(--text-color);
      }
      
      .modal-content .subtitle {
          text-align: center;
          color: #666;
          margin-bottom: 1.5rem;
          font-size: 0.95rem;
      }

      .close-modal {
          position: absolute;
          top: 1rem;
          right: 1.5rem;
          font-size: 1.5rem;
          cursor: pointer;
          color: #666;
      }

      .close-modal:hover {
          color: #333;
      }

      /* Form Styles */
      .minimal-contact-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
      }

      .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
      }

      .form-group label {
          font-weight: 500;
          color: var(--text-color);
      }

      .required {
          color: #e53e3e;
      }

      .form-control {
          padding: 0.75rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 1rem;
          transition: border-color 0.2s;
      }

      .form-control:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 1px var(--primary-color);
      }

      textarea.form-control {
          min-height: 120px;
          resize: vertical;
      }

      .btn-send-message {
          background-color: var(--primary-color);
          color: white;
          border: none;
          padding: 0.75rem 2rem;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-top: 0.5rem;
          width: 100%;
      }

      .btn-send-message:hover {
          background-color: #3a56d4;
      }

      @media (max-width: 480px) {
          #floating-button-container .floating-button {
              bottom: 1.5rem !important;
              right: 1.5rem !important;
              padding: 0.6rem 1rem !important;
              min-width: auto !important;
              width: auto !important;
              border-radius: 8px !important;
          }
          
          #floating-button-container .floating-button span {
              display: none !important;
          }
          
          .modal-content {
              padding: 1.5rem 1rem !important;
          }
      }
    `;
    document.head.appendChild(style);
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

// Function to update paths in the header
function updateHeaderPaths() {
    const isInPagesDir = window.location.pathname.includes('/pages/');
    const basePath = isInPagesDir ? '../' : '';
    
    // Update logo and navigation links
    const logoLink = document.querySelector('.logo a[data-base-href]');
    if (logoLink) {
        logoLink.href = basePath + 'index.html';
        const logoImg = document.getElementById('header-logo');
        if (logoImg) logoImg.src = basePath + 'images/scissors.svg';
    }
    
    // Update navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        const page = link.getAttribute('data-page');
        if (page) {
            const path = page === 'home' ? 'index.html' : `pages/${page}.html`;
            link.href = basePath + path;
        }
    });
    
    // Set active link
    setActiveLink();
}

// Set active navigation link
function setActiveLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const pageName = currentPage.replace('.html', '');
    
    document.querySelectorAll('.nav-link').forEach(link => {
        const linkPage = link.getAttribute('data-page');
        if ((pageName === 'index' && linkPage === 'home') || 
            (pageName === linkPage)) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Mobile menu toggle
function setupMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.nav-links');
    
    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            nav.classList.toggle('active');
            toggle.classList.toggle('active');
        });
    }
}


// Initialize the floating button immediately when the script loads
const floatingButton = new FloatingButton();

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Update paths in the header
    updateHeaderPaths();
    
    // Adjust side ads on load, window resize, and scroll
    if (document.querySelector('.video-clipper')) {
        adjustSideAds();
        window.addEventListener('resize', adjustSideAds);
        // Add scroll event listener to ensure ads stay fixed
        window.addEventListener('scroll', function() {
            // Re-apply fixed positioning on scroll
            const leftAd = document.querySelector('.ad-left');
            const rightAd = document.querySelector('.ad-right');
            
            if (leftAd) {
                leftAd.style.position = 'fixed';
                leftAd.style.zIndex = '999';
            }
            
            if (rightAd) {
                rightAd.style.position = 'fixed';
                rightAd.style.zIndex = '999';
            }
        });
    }
    
    // Set active link in navigation
    setActiveLink();
    
    // Setup mobile menu
    setupMobileMenu();
    
    // Initialize the floating button component if not already initialized
    if (!floatingButton.initialized) {
        floatingButton.init();
    }
});

// Also try to initialize the floating button when the window is fully loaded
window.addEventListener('load', function() {
    if (!floatingButton.initialized) {
        floatingButton.init();
    }
});

// Mobile menu functionality
function setupMobileMenu() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const body = document.body;

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            navLinks.classList.toggle('active');
            body.classList.toggle('menu-open');
            
            // Toggle aria-expanded
            const expanded = this.getAttribute('aria-expanded') === 'true' || false;
            this.setAttribute('aria-expanded', !expanded);
            
            // Toggle menu text
            const menuText = document.querySelector('.menu-text');
            if (menuText) {
                menuText.textContent = expanded ? 'Menu' : 'Close';
            }
        });

        // Close menu when clicking on a nav link
        const navItems = document.querySelectorAll('.nav-links a');
        navItems.forEach(item => {
            item.addEventListener('click', function() {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('active');
                body.classList.remove('menu-open');
                menuToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }
}

// Set active link based on current page
function setActiveLink() {
    const currentLocation = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links .nav-link');
    
    // Get the current page filename
    const currentPage = currentLocation.split('/').pop() || 'index.html';
    
    navLinks.forEach(link => {
        // Remove active class from all links
        link.classList.remove('active');
        
        // Get the link's target page
        const linkHref = link.getAttribute('href');
        const linkPage = linkHref.split('/').pop();
        
        // Add active class if this link's page matches the current page
        if ((currentPage === '' && linkPage === 'index.html') || 
            (currentPage === linkPage) ||
            (currentPage === '' && linkHref.endsWith('/'))) {
            link.classList.add('active');
        }
    });
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            // Calculate the offset based on the header height
            const headerOffset = 80;
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});
