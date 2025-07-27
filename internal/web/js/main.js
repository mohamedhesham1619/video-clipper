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
    
    // Setup floating contact button
    const contactFloat = document.getElementById('contact-float');
    if (contactFloat) {
        contactFloat.addEventListener('click', () => {
            window.location.href = 'pages/contact.html';
        });
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
