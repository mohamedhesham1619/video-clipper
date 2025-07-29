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
document.addEventListener('DOMContentLoaded', function () {
    // Update paths in the header
    updateHeaderPaths();

    // Adjust side ads on load, window resize, and scroll
    if (document.querySelector('.video-clipper')) {
        adjustSideAds();
        window.addEventListener('resize', adjustSideAds);
        // Add scroll event listener to ensure ads stay fixed
        window.addEventListener('scroll', function () {
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
window.addEventListener('load', function () {
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
        menuToggle.addEventListener('click', function () {
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
            item.addEventListener('click', function () {
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

// Function to shuffle an array using Fisher-Yates algorithm
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Function to rotate content
function rotateContent() {
    // Get DOM elements
    const leftPanel = document.querySelector('.box-left');
    const rightPanel = document.querySelector('.box-right');
    const bottomContainer = document.querySelector('.tool-suggestion .suggestion-content');
    
    // Initialize content arrays if they don't exist
    if (!window.contentRotation) {
        // Make sure we have at least 2 items for side content
        let sideItems = [...contentSuggestions.sides];
        if (sideItems.length === 1) {
            // If only one item, duplicate it to ensure both sides have content
        }
        // Shuffle function for one-time initialization
        const shuffleArray = (array) => {
            const newArray = [...array];
            for (let i = newArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
            }
            return newArray;
        };
        
        // Create pairs of ads that will always appear together
        const createAdPairs = (items) => {
            const pairs = [];
            for (let i = 0; i < items.length; i += 2) {
                const pair = [items[i]];
                if (i + 1 < items.length) {
                    pair.push(items[i + 1]);
                } else {
                    // If odd number of items, duplicate the last item to make a pair
                    pair.push({...items[i]});
                }
                pairs.push(pair);
            }
            return pairs;
        };
        
        // Shuffle side and bottom ads once
        const shuffledSideItems = shuffleArray([...sideItems]);
        const shuffledBottomContent = shuffleArray([...contentSuggestions.bottom]);
        
        // Initialize content rotation with pre-shuffled ad pairs
        window.contentRotation = {
            isRotating: false,
            // Store shuffled items - these won't be re-shuffled
            originalSideItems: [...shuffledSideItems],
            // Create pairs from the pre-shuffled items
            adPairs: createAdPairs([...shuffledSideItems]),
            // Track current pair index
            currentPairIndex: 0,
            // Bottom content - use pre-shuffled array
            bottomContent: [...shuffledBottomContent],
            currentBottomIndex: 0,
            // Remove reshuffling flag since we're not doing it anymore
            isRotatingBottom: false
        };
    }
    
    // Don't start a new rotation if one is already in progress
    if (window.contentRotation.isRotating) return;
    window.contentRotation.isRotating = true;
    
    // Function to update a single panel with smooth crossfade
    const updatePanel = (panel, content) => {
        return new Promise((resolve) => {
            if (!panel) {
                resolve();
                return;
            }
            
            // Create container for new content
            const newContent = document.createElement('div');
            newContent.className = 'content-item';
            newContent.style.cssText = 'opacity: 0; position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;';
            
            // Create inner container for consistent sizing
            const innerContainer = document.createElement('div');
            innerContainer.style.cssText = 'max-width: 100%; max-height: 100%; width: 100%; padding: 10px; box-sizing: border-box;';
            innerContainer.innerHTML = content;
            
            // Ensure images maintain aspect ratio
            const images = innerContainer.getElementsByTagName('img');
            Array.from(images).forEach(img => {
                img.style.maxWidth = '100%';
                img.style.maxHeight = '100%';
                img.style.width = 'auto';
                img.style.height = 'auto';
                img.style.objectFit = 'contain';
                img.style.display = 'block';
                img.style.margin = '0 auto';
            });
            
            newContent.appendChild(innerContainer);
            panel.appendChild(newContent);
            
            // Force reflow to ensure new content is in the DOM
            void newContent.offsetHeight;
            
            // Fade in new content (0.5s fade-in with ease-in timing function)
            newContent.style.transition = 'opacity 0.5s ease-in';
            newContent.style.opacity = '1';
            
            // Fade out and remove current content if it exists (0.5s fade-out with ease-out timing function)
            const currentContent = panel.querySelector('.content-item:not([style*="opacity: 0"])');
            if (currentContent && currentContent !== newContent) {
                currentContent.style.transition = 'opacity 0.5s ease-out';
                currentContent.style.opacity = '0';
                
                // Remove old content after transition
                currentContent.addEventListener('transitionend', function handler() {
                    if (currentContent.parentNode === panel) {
                        panel.removeChild(currentContent);
                    }
                    currentContent.removeEventListener('transitionend', handler);
                    resolve();
                }, { once: true });
            } else {
                resolve();
            }
        });
    };
    
    // Rotate side content with consistent pairs
    const rotateSideContent = () => {
        const { adPairs } = window.contentRotation;
        
        // Get the current pair of ads
        const currentPair = adPairs[window.contentRotation.currentPairIndex];
        
        if (!currentPair) {
            window.contentRotation.isRotating = false;
            return;
        }
        
        // Update both panels with the current pair
        Promise.all([
            leftPanel ? updatePanel(leftPanel, currentPair[0]?.html) : Promise.resolve(),
            rightPanel ? updatePanel(rightPanel, currentPair[1]?.html) : Promise.resolve()
        ]).then(() => {
            // Move to next pair for next rotation
            window.contentRotation.currentPairIndex = 
                (window.contentRotation.currentPairIndex + 1) % adPairs.length;
            
            // No need to reshuffle, just loop back to the start
            // We're using the same shuffled list for all rotations
            
            // Rotate bottom content
            rotateBottomContent();
            
        }).catch(error => {
            console.error('Rotation error:', error);
            window.contentRotation.isRotating = false;
        });
    };
    
    // Rotate bottom content
    const rotateBottomContent = () => {
        if (bottomContainer && window.contentRotation.bottomContent.length > 0) {
            // First fade out (slower fade out) and update content immediately
            bottomContainer.style.transition = 'opacity 1.5s ease-out';
            bottomContainer.style.opacity = '0';
            
            // Update content immediately after starting fade out
            const currentContent = window.contentRotation.bottomContent[window.contentRotation.currentBottomIndex];
            if (currentContent?.html) {
                bottomContainer.style.display = 'flex';
                bottomContainer.innerHTML = `<div class="content-item">${currentContent.html}</div>`;
                bottomContainer.style.transition = 'opacity 0s, transform 0s';
                bottomContainer.style.opacity = '0';
                bottomContainer.style.transform = 'translateY(10px)';
            }
            
            // After fade out completes, start fade in
            setTimeout(() => {
                if (!bottomContainer) {
                    window.contentRotation.isRotating = false;
                    return;
                }
                
                if (!currentContent?.html) {
                    bottomContainer.style.display = 'none';
                    window.contentRotation.isRotating = false;
                    return;
                }
                
                // Force reflow
                void bottomContainer.offsetHeight;
                
                // Fade in with slide up
                bottomContainer.style.opacity = '1';
                bottomContainer.style.transform = 'translateY(0)';
                
                // Update index for next rotation
                window.contentRotation.currentBottomIndex = (window.contentRotation.currentBottomIndex + 1) % window.contentRotation.bottomContent.length;
                
                // No need to reshuffle, just loop back to the start
                // We're using the same shuffled list for all rotations
                
                // Reset rotation flag after all animations complete
                setTimeout(() => {
                    window.contentRotation.isRotating = false;
                }, 500);
            }, 1500); // Wait for fade out to complete (1.5s)
        } else {
            if (bottomContainer) {
                bottomContainer.style.display = 'none';
            }
            window.contentRotation.isRotating = false;
        }
    };
    
    // Start the rotation sequence
    rotateSideContent();
}

// Content suggestions data
const contentSuggestions = {
    sides: [
        {
            html: "<a href=\"https://www.mvvitrk.com/bDig55\" target=\"_blank\" rel=\"noopener noreferrer\"><img src=\"https://res.cloudinary.com/ddozq3vu5/image/upload/v1753699762/300x600_tazs11.png\" alt=\"\" style=\"width: 100%; height: 100%; object-fit: contain;\"></a>"
        },
        {
            html: "<a href=\"https://akool.com/?via=mh1619\" target=\"_blank\" rel=\"noopener noreferrer\"><img src=\"https://res.cloudinary.com/ddozq3vu5/image/upload/v1753718205/screen-0_cbfutf.jpg\" alt=\"\" style=\"width: 100%; height: 100%; object-fit: contain;\"></a>"
        },
        {
            html: "<a href=\"https://flixier.com?fpr=mh1619\" target=\"_blank\"><img src=\"https://d2gdx5nv84sdx2.cloudfront.net/uploads/gjzkybfs/marketing_asset/banner/24623/120x600px-4.png\" alt=\"\" style=\"width: 100%; height: 100%; object-fit: contain;\"></a>"
        },
        {
            html: "<a rel=\"sponsored\" href=\"https://renderforest.pxf.io/c/6416428/1957251/14885\" target=\"_top\" id=\"1957251\"><img src=\"https://a.impactradius-go.com/display-ad/14885-1957251\" alt=\"\" style=\"width: 100%; height: 100%; object-fit: contain;\"></a>"
        }
    ],
    bottom: [
        {
            html: '<a href="https://partner.pcloud.com/r/146969" title="pCloud Premium" target="_blank"><img src="https://partner.pcloud.com/media/banners/personal/personal00272890.jpg" alt="pCloud Premium"/></a>'
        },
        {
            html: "<a href=\"https://go.nordvpn.net/aff_c?offer_id=15&amp;aff_id=127970&amp;url_id=902\" target=\"_blank\" rel=\"sponsored\"><img src=\"https://res.cloudinary.com/ddozq3vu5/image/upload/v1753394990/728x90_baajhd.png\" alt=\"\" style=\"width: 100%; max-height: 90px; object-fit: contain;\" /></a>"
        },
        {
            html: "<a href=\"https://privadovpn.com/getprivadovpn/#a_aid=1619\" target=\"_blank\" rel=\"noopener noreferrer\"><img src=\"https://res.cloudinary.com/ddozq3vu5/image/upload/v1753306325/728x90_c9y6b3.png\" alt=\"\" style=\"width: 100%; max-height: 90px; object-fit: contain;\"></a>"
        }
    ]
};

// Initialize content rotation when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function () {
    // Initial rotation
    rotateContent();

    // Set up intervals for rotations
    setInterval(rotateContent, 12000); // Side ads rotation (12 seconds)
    
    // Set up separate interval for bottom ads (every 10 seconds)
    const rotateBottomContent = () => {
        const bottomContainer = document.querySelector('.tool-suggestion .suggestion-content');
        if (!bottomContainer || !window.contentRotation?.bottomContent?.length) return;
        
        if (window.contentRotation.isRotatingBottom) return;
        window.contentRotation.isRotatingBottom = true;
        
        // Fade out
        bottomContainer.style.transition = 'opacity 0.5s ease-out';
        bottomContainer.style.opacity = '0';
        
        // Update content after fade out
        setTimeout(() => {
            const currentContent = window.contentRotation.bottomContent[window.contentRotation.currentBottomIndex];
            if (currentContent?.html) {
                bottomContainer.style.display = 'flex';
                bottomContainer.innerHTML = `<div class="content-item">${currentContent.html}</div>`;
                bottomContainer.style.transition = 'opacity 0s, transform 0s';
                bottomContainer.style.opacity = '0';
                bottomContainer.style.transform = 'translateY(10px)';
                
                // Force reflow
                void bottomContainer.offsetHeight;
                
                // Fade in
                bottomContainer.style.transition = 'opacity 0.5s ease-in, transform 0.5s ease-in';
                bottomContainer.style.opacity = '1';
                bottomContainer.style.transform = 'translateY(0)';
                
                // Update index for next rotation (loop back to start if we reach the end)
                // We update it here but after a delay to ensure the current ad is shown
                setTimeout(() => {
                    window.contentRotation.currentBottomIndex = 
                        (window.contentRotation.currentBottomIndex + 1) % window.contentRotation.bottomContent.length;
                }, 100);
            }
            
            window.contentRotation.isRotatingBottom = false;
        }, 500); // Wait for fade out to complete
    };
    
    // Initial bottom rotation
    if (window.contentRotation) {
        rotateBottomContent();
    }
    
    // Set interval for bottom rotation (12 seconds)
    setInterval(rotateBottomContent, 12000);
});

// Recommended tools data
// Function to create a tool card element
function createToolCard(tool) {
    const card = document.createElement('div');
    card.className = 'recommended-card';
    
    // Process description
    const description = tool.description.trim();
    const hasNewlines = description.includes('\n');
    const descriptionHtml = hasNewlines 
        ? description.split('\n').filter(line => line.trim() !== '').join('<br>')
        : description;
    
    card.innerHTML = `
        <div class="recommended-card-inner">
            <a href="${tool.link}" target="_blank" rel="noopener noreferrer" class="recommended-image">
                <img src="${tool.image}" alt="${tool.header}" loading="lazy">
            </a>
            <div class="recommended-content">
                <h3>${tool.header}</h3>
                <div class="recommended-desc">
                    <p class="description">${descriptionHtml}</p>
                </div>
                <a href="${tool.link}" target="_blank" rel="noopener noreferrer" class="learn-more-btn">
                    Learn More <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        </div>
    `;
    
    // No need for Read More functionality anymore
    
    return card;
}

// Function to render recommended tools
document.addEventListener('DOMContentLoaded', function() {
    const recommendedGrid = document.querySelector('.recommended-grid');
    
    if (recommendedGrid) {
        // Clear any existing content
        recommendedGrid.innerHTML = '';
        
        // Create and append cards for each tool
        recommended_tools.forEach(tool => {
            const card = createToolCard(tool);
            recommendedGrid.appendChild(card);
        });
    }
});

const recommended_tools = [
    {
        "header": "Your do-it-all video-making bundle",
        "link": "https://www.mvvitrk.com/bDig55",
        "image": "https://res.cloudinary.com/ddozq3vu5/image/upload/v1753291631/300x250_ewu5d8.png",
        "description": "Auto subtitles with one click, ready-made templates\nHandy video editing, file conversion, and screen recording\nHundreds of drag-and-drop filters, transitions, titles, and overlays"
    },
    {
        "header": "Transform Your Content with AI Magic",
        "link": "https://akool.com/?via=mh1619",
        "image": "https://pbs.twimg.com/media/GutshQgWUAA21xd?format=jpg&name=large",
        "description": "Realistic face‑swaps, live avatars, and talking photos—just upload & go.\nTranslate & clone your voice into multilingual videos in seconds.\nPerfect for creators, marketers, and global campaigns."
    },
    {
        "header": "Your Cloud-Powered Video Studio",
        "link": "https://flixier.com?fpr=mh1619",
        "image": "https://d2gdx5nv84sdx2.cloudfront.net/uploads/gjzkybfs/marketing_asset/banner/24598/300x160px.png",
        "description": "AI subtitle, voiceover & translation tools—all built right into your browser.\nCloud rendering delivers full‑HD or 4K videos in minutes, no high-end PC needed.\nCollaborative editing, stock media & templates—team up and produce faster."
    },
    {
        "header": "Bring Your Ideas to Life—Animated, Branded & Ready",
        "link": "https://renderforest.pxf.io/c/6416428/1957251/14885",
        "image": "https://res.cloudinary.com/ddozq3vu5/image/upload/v1753734800/1-300x250_upo9z2.jpg",
        "description": "Pick a template, type your script, and let AI do the rest.\nCustomize colors, fonts & music with drag‑and‑drop ease.\nExport in HD or 4K with advanced features available on premium plans."
    },
    {
        "header": "Smart Virtual Drive—Cloud Storage That Works Like Local",
        "link": "https://partner.pcloud.com/r/146969",
        "image": "https://partner.pcloud.com/media/banners/personal/personal008300250.jpg",
        "description": "Start with free 10GB, expand easily, or lock in lifetime access for one fee.\nEnjoy built-in media streaming, automatic cross‑platform backups, and file previews.\nOptional Crypto encryption gives you exclusive control over sensitive files."
    },
    {
        "header": "Trusted by Millions, Audited for Privacy – Take your online security to the next level with NordVPN",
        "link": "https://go.nordvpn.net/aff_c?offer_id=15&aff_id=127970&url_id=902",
        "image": "https://res.cloudinary.com/ddozq3vu5/image/upload/v1753303315/300x250_krlpqk.png",
        "description": "Threat Protection Pro blocks malware, trackers, and phishing sites in real-time.\nDark Web Monitor alerts you if your credentials appear in data breaches.\nSplit tunneling, dedicated IP, and Meshnet secure all your devices—even across continents."
    },
    {
        "header": "Budget VPN Built for Privacy & Streaming",
        "link": "https://privadovpn.com/getprivadovpn/#a_aid=1619",
        "image": "https://affiliates.privadovpn.com/accounts/default1/3abd4o9y/fb34eb50.png?t=1632790058",
        "description": "Deep discounts with long-term plans: ultra-low pricing from $1.11/month*.\nReliable speeds for HD streaming and browsing on global servers.\nPremium features like unlimited devices, streaming unblock & ad blocking."
    }
];
