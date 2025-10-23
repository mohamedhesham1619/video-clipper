// Cache DOM elements
const domCache = {
    headerLogo: null,
    navLinks: null,
    sidePanels: {
        left: null,
        right: null
    },
    bottomContainer: null,
    mobileMenu: {
        toggle: null,
        nav: null
    }
};

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
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
    const currentLocation = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links .nav-link');
    const currentPageFromPath = currentLocation.split('/').pop() || 'index.html';

    navLinks.forEach(link => {
        // Remove active class from all links
        link.classList.remove('active');

        // Get the link's target page
        const linkHref = link.getAttribute('href');
        const linkPage = linkHref ? linkHref.split('/').pop() : '';
        const linkPageName = link.getAttribute('data-page');

        // Add active class if this link's page matches the current page
        if ((currentPage === '' && linkPage === 'index.html') ||
            (currentPage === linkPage) ||
            (currentPage === '' && linkHref.endsWith('/')) ||
            (pageName === linkPageName) ||
            (pageName === 'index' && linkPageName === 'home') ||
            (currentPageFromPath === linkPage)) {
            link.classList.add('active');
        }
    });
}

// Mobile menu toggle
function setupMobileMenu() {
    domCache.mobileMenu.toggle = document.querySelector('.mobile-menu-toggle');
    domCache.mobileMenu.nav = document.querySelector('.nav-links');

    if (!domCache.mobileMenu.toggle || !domCache.mobileMenu.nav) return;

    // Store references to clean up later
    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        domCache.mobileMenu.nav.classList.toggle('active');
        domCache.mobileMenu.toggle.classList.toggle('active');
        document.body.classList.toggle('menu-open');
    };

    const closeMenu = () => {
        domCache.mobileMenu.nav.classList.remove('active');
        domCache.mobileMenu.toggle.classList.remove('active');
        document.body.classList.remove('menu-open');
    };

    // Add event listeners
    domCache.mobileMenu.toggle.addEventListener('click', handleClick);

    // Close when clicking on nav links
    const menuLinks = domCache.mobileMenu.nav.querySelectorAll('a');
    menuLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (domCache.mobileMenu.nav.classList.contains('active') &&
            !domCache.mobileMenu.toggle.contains(e.target) &&
            !domCache.mobileMenu.nav.contains(e.target)) {
            closeMenu();
        }
    });

    // Cleanup function
    return () => {
        domCache.mobileMenu.toggle.removeEventListener('click', handleClick);
        menuLinks.forEach(link => {
            link.removeEventListener('click', closeMenu);
        });
    };

    // Removed duplicate event listener setup
}

// Track intervals for cleanup
const activeIntervals = [];

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    // Cache header elements
    domCache.headerLogo = document.getElementById('header-logo');
    domCache.navLinks = document.querySelectorAll('.nav-links .nav-link');

    // Update paths in the header
    updateHeaderPaths();

    // Setup mobile menu with cleanup
    const cleanupMobileMenu = setupMobileMenu();

    // Set active link in navigation
    setActiveLink();

    // Add throttled scroll handler
    const throttledScroll = throttle(handleScroll, 100);
    window.addEventListener('scroll', throttledScroll);

    // Cleanup function
    return () => {
        // Clear intervals
        activeIntervals.forEach(clearInterval);
        activeIntervals.length = 0;

        // Cleanup mobile menu
        if (cleanupMobileMenu) cleanupMobileMenu();

        // Remove scroll listener
        window.removeEventListener('scroll', throttledScroll);
    };
});

// Throttled scroll handler
function handleScroll() {
    // Add any scroll-related logic here
    // This is throttled to improve performance
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

// Function to shuffle an array in place using Fisher-Yates algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Cache DOM elements for rotation
function initRotationElements() {
    if (!domCache.sidePanels.left) {
        domCache.sidePanels.left = document.querySelector('.box-left');
        domCache.sidePanels.right = document.querySelector('.box-right');
    }
    return {
        leftPanel: domCache.sidePanels.left,
        rightPanel: domCache.sidePanels.right
    };
}

// Function to rotate content
function rotateContent() {
    const { leftPanel, rightPanel } = initRotationElements();

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
                    pair.push({ ...items[i] });
                }
                pairs.push(pair);
            }
            return pairs;
        };

        // Shuffle side and bottom ads once
        const shuffledSideItems = shuffleArray([...sideItems]);

        // Initialize content rotation with pre-shuffled ad pairs
        window.contentRotation = {
            isRotating: false,
            // Store shuffled items - these won't be re-shuffled
            originalSideItems: [...shuffledSideItems],
            // Create pairs from the pre-shuffled items
            adPairs: createAdPairs([...shuffledSideItems]),
            // Track current pair index
            currentPairIndex: 0
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
            innerContainer.style.cssText = 'max-width: 100%; max-height: 100%; width: 100%; box-sizing: border-box;';
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

            // Reset rotation flag
            window.contentRotation.isRotating = false;

        }).catch(error => {
            console.error('Rotation error:', error);
            window.contentRotation.isRotating = false;
        });
    };


    // Start the rotation sequence
    rotateSideContent();
}

// Content suggestions data
const contentSuggestions = {
    sides: [
        {
            html: `<a rel="noopener sponsored"
           href="https://renderforest.pxf.io/c/6416428/1275476/14885?u=https%3A%2F%2Fwww.renderforest.com%2F" target="_blank" id="1275476"
           onclick="gtag('event', 'ad_click', {
                ad_name: 'Renderforest',
                ad_position: 'side',
                transport: 'beacon'
            });">
            <img src="//a.impactradius-go.com/display-ad/14885-1275476" border="0" alt="" width="300" height="600"/></a><img height="0" width="0" src="https://imp.pxf.io/i/6416428/1275476/14885" style="position:absolute;visibility:hidden;" border="0" />`
        },
        {
            html: `<a rel="noopener sponsored"
            href="https://1.envato.market/c/6416428/3279856/4662?subId1=ulvg&subId2=october" target="_blank" id="3279856"
            onclick="gtag('event', 'ad_click', {
                ad_name: 'Envato',
                ad_position: 'side',
                transport: 'beacon'
            });">
            <img src="//a.impactradius-go.com/display-ad/4662-3279856" border="0" alt="" width="300" height="600"/></a><img height="0" width="0" src="https://1.envato.market/i/6416428/3279856/4662" style="position:absolute;visibility:hidden;" border="0" />`
        },
        {
            html: `
            <a rel="noopener sponsored"
            href="https://capcutaffiliateprogram.pxf.io/c/6416428/3069242/22474" 
            target="_blank" id="3069242"
            onclick="gtag('event', 'ad_click', {
                ad_name: 'CapCut',
                ad_position: 'side',
                transport: 'beacon'
            });">
            <img src="//a.impactradius-go.com/display-ad/22474-3069242" border="0" alt="" width="160" height="600"/></a><img height="0" width="0" src="https://imp.pxf.io/i/6416428/3069242/22474" style="position:absolute;visibility:hidden;" border="0" />
            `
        },
        {
            html: `<a href="https://partner.pcloud.com/r/146969" title="pCloud Premium" target="_blank" 
            onclick="gtag('event', 'ad_click', {
                ad_name: 'pCloud Premium',
                ad_position: 'side',
                transport: 'beacon'
            });"><img src="https://partner.pcloud.com/media/banners/lifetime/lifetime008160600.jpg" alt="pCloud Premium"/></a>`
        }
    ]
};



// Initialize content rotation when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function () {
    // Initial rotation for side panels
    rotateContent();

    // Set up interval for side ads rotation (30 seconds)
    setInterval(rotateContent, 30000);
});

// Recommended tools data
// Function to create a tool card element
function createToolCard(tool) {
    const card = document.createElement('div');
    card.className = 'recommended-card';
    card.style.cssText = `
        width: 300px !important;
        height: 250px !important;
        overflow: hidden;
        position: relative;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        flex: 0 0 auto;
        margin: 0 10px 20px;
    `;

    const trackingOnClick = `onclick="gtag('event', 'ad_click', {
        ad_name: '${tool.name}',
        ad_position: 'recommended_tool',
        transport: 'beacon'
    });"`;

    card.innerHTML = `
        <a href="${tool.link}" rel="noopener sponsored" target="_blank" class="card-link" ${trackingOnClick} style="
            display: block;
            width: 100%;
            height: 100%;
            position: relative;
            overflow: hidden;
            text-decoration: none;
        ">
            <div class="image-wrapper" style="
                width: 100%;
                height: 100%;
                overflow: hidden;
            ">
                <img src="${tool.image}" alt="${tool.header}" loading="lazy" style="
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.5s ease;
                ">
            </div>
            <div class="card-overlay" style="
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%);
                padding: 1.5rem;
                transform: translateY(100%);
                transition: transform 0.3s ease;
                color: white;
            ">
                <h3 class="card-title" style="
                    margin: 0;
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    text-shadow: 0 1px 3px rgba(0,0,0,0.3);
                ">
                    ${tool.header}
                </h3>
            </div>
        </a>
    `;

    // Add hover effects
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-5px)';
        card.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.15)';
        const img = card.querySelector('img');
        const overlay = card.querySelector('.card-overlay');
        if (img) img.style.transform = 'scale(1.05)';
        if (overlay) overlay.style.transform = 'translateY(0)';
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        const img = card.querySelector('img');
        const overlay = card.querySelector('.card-overlay');
        if (img) img.style.transform = 'scale(1)';
        if (overlay) overlay.style.transform = 'translateY(100%)';
    });

    return card;
}

// Function to render recommended tools
document.addEventListener('DOMContentLoaded', function () {
    const recommendedGrid = document.querySelector('.recommended-grid');

    if (recommendedGrid) {
        // Clear any existing content
        recommendedGrid.innerHTML = '';

        // Create and append cards for each tool
        recommended_tools.forEach((tool) => {
            const card = createToolCard(tool);
            recommendedGrid.appendChild(card);
        });
    }
});

const recommended_tools = [
    {
        "name": "CapCut",
        "header": "Create Stunning Videos—Fast, Fun & Free",
        "link": "https://capcutaffiliateprogram.pxf.io/c/6416428/3069221/22474",
        "image": "https://app.impact.com/display-ad/22474-3069221?v=0"
    },
    {
        "name": "Renderforest",
        "header": "Bring Your Ideas to Life—Animated, Branded & Ready",
        "link": "https://renderforest.pxf.io/c/6416428/1476990/14885",
        "image": "https://app.impact.com/display-ad/14885-1476990?v=0"
    },
    {
        "name": "Envato",
        "header": "Top-Quality Assets for Designers & Video Editors",
        "link": "https://1.envato.market/c/6416428/3323986/4662",
        "image": "https://app.impact.com/display-ad/4662-3323986?v=0"

    },
    {
        "name": "Pcloud",
        "header": "Smart Virtual Drive—Cloud Storage That Works Like Local",
        "link": "https://partner.pcloud.com/r/146969",
        "image": "https://partner.pcloud.com/media/banners/lifetime/lifetime006300250.png"
    }
];


