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

// Debounce function for resize events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
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

            // Use requestAnimationFrame to batch DOM operations
            requestAnimationFrame(() => {
                // Create container for new content
                const newContent = document.createElement('div');
                newContent.className = 'content-item';
                newContent.style.cssText = 'opacity: 0; position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; will-change: opacity;';

                // Create inner container for consistent sizing
                const innerContainer = document.createElement('div');
                innerContainer.style.cssText = 'max-width: 100%; max-height: 100%; width: 100%; box-sizing: border-box;';
                innerContainer.innerHTML = content;

                // Ensure images maintain aspect ratio
                const images = innerContainer.getElementsByTagName('img');
                Array.from(images).forEach(img => {
                    img.style.cssText = 'max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; display: block; margin: 0 auto;';
                });

                newContent.appendChild(innerContainer);
                panel.appendChild(newContent);

                // Use double RAF for reliable transition
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        // Fade in new content
                        newContent.style.transition = 'opacity 0.5s ease-in';
                        newContent.style.opacity = '1';

                        // Fade out and remove current content if it exists
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
                });
            });
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
           href="https://1.envato.market/c/6416428/3371584/4662" target="_blank" id="3371584"
           onclick="gtag('event', 'ad_click', {
                ad_name: 'Envato',
                ad_position: 'side',
                transport: 'beacon'
            });">
            <img src="//a.impactradius-go.com/display-ad/4662-3371584" border="0" alt="" width="300" height="600"/></a><img height="0" width="0" src="https://1.envato.market/i/6416428/3371584/4662" style="position:absolute;visibility:hidden;" border="0" />`
        },
        {
            html: `<a rel="noopener sponsored"
           href="https://capcutaffiliateprogram.pxf.io/c/6416428/3069242/22474?u=https%3A%2F%2Fwww.capcut.com%2F" target="_blank" id="3069242"
           onclick="gtag('event', 'ad_click', {
                ad_name: 'CapCut',
                ad_position: 'side',
                transport: 'beacon'
            });">
            <img src="//a.impactradius-go.com/display-ad/22474-3069242" border="0" alt="" width="160" height="600"/></a><img height="0" width="0" src="https://imp.pxf.io/i/6416428/3069242/22474" style="position:absolute;visibility:hidden;" border="0" />`
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
    // Only initialize rotation on desktop
    if (window.innerWidth > 768) {
        // Defer initial rotation using requestIdleCallback
        const startRotation = () => {
            rotateContent();
            // Set up interval for side ads rotation (40 seconds)
            setInterval(rotateContent, 40000);
        };
        
        if ('requestIdleCallback' in window) {
            requestIdleCallback(startRotation, { timeout: 2000 });
        } else {
            setTimeout(startRotation, 1000);
        }
    }
});

// Recommended tools data
// Function to create a tool card element
function createToolCard(tool) {
    const isMobileView = window.innerWidth <= 768;
    const card = document.createElement('div');
    card.className = 'recommended-card';
    
    const cardWidth = 300; // Same width for both mobile and desktop
    const cardHeight = isMobileView ? 215 : 250; // 215px height for mobile, 250px for desktop
    
    card.style.cssText = `
        width: ${cardWidth}px !important;
        height: ${cardHeight}px !important;
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
            position: absolute;
            top: 0;
            left: 0;
            overflow: hidden;
            text-decoration: none;
        ">
            <img src="${tool.image}" alt="${tool.header}" loading="lazy" style="
                display: block;
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center;
                transition: transform 0.5s ease;
            ">
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
    const swiperWrapper = document.querySelector('.recommended-grid .swiper-wrapper');

    if (!recommendedGrid || !swiperWrapper) return;

    // Helper to detect mobile viewport
    const isMobile = () => window.innerWidth <= 768;

    // Choose data set based on viewport
    function getToolsForViewport() {
        try {
            return isMobile() && typeof mobile_recommended_tools !== 'undefined'
                ? mobile_recommended_tools
                : recommended_tools;
        } catch (_) {
            return recommended_tools;
        }
    }

    // Render slides/cards into the wrapper
    function renderTools() {
        swiperWrapper.innerHTML = '';
        const tools = getToolsForViewport();
        tools.forEach((tool) => {
            const card = createToolCard(tool);
            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            slide.style.cssText = 'width: auto; height: auto;';
            slide.appendChild(card);
            swiperWrapper.appendChild(slide);
        });
    }

    // Initialize Swiper only on mobile
    function initSwiper() {
        if (!isMobile()) return null;
        const swiper = new Swiper('.recommended-grid.swiper', {
            slidesPerView: 1.1,
            spaceBetween: 16,
            centeredSlides: false,
            grabCursor: true,
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            breakpoints: {
                480: {
                    slidesPerView: 1.15,
                    spaceBetween: 20,
                }
            }
        });
        return swiper;
    }

    // Initial render and swiper setup
    renderTools();
    let swiperInstance = initSwiper();
    let lastIsMobile = isMobile();

    // Re-render and (re)init/destroy Swiper on breakpoint changes
    // Use debounce with longer delay to reduce INP impact
    const handleResize = debounce(function () {
        const nowIsMobile = isMobile();

        // If breakpoint changed, re-render with the appropriate dataset
        if (nowIsMobile !== lastIsMobile) {
            // Destroy existing Swiper before DOM changes
            if (swiperInstance) {
                swiperInstance.destroy(true, true);
                swiperInstance = null;
            }

            // Use requestIdleCallback for non-critical re-rendering
            const reRender = () => {
                renderTools();
                swiperInstance = initSwiper();
                lastIsMobile = nowIsMobile;
            };
            
            if ('requestIdleCallback' in window) {
                requestIdleCallback(reRender, { timeout: 500 });
            } else {
                setTimeout(reRender, 0);
            }
            return;
        }

        // If still in same mode, only init/destroy swiper as needed
        if (nowIsMobile && !swiperInstance) {
            swiperInstance = initSwiper();
        } else if (!nowIsMobile && swiperInstance) {
            swiperInstance.destroy(true, true);
            swiperInstance = null;
        }
    }, 300);
    
    window.addEventListener('resize', handleResize, { passive: true });
});

const recommended_tools = [
    {
        "name": "CapCut",
        "header": "Create Stunning Videos—Fast, Fun & Free",
        "link": "https://capcutaffiliateprogram.pxf.io/c/6416428/3069221/22474?u=https%3A%2F%2Fwww.capcut.com%2F",
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

const mobile_recommended_tools = [
    {
        "name": "CapCut",
        "link": "https://capcutaffiliateprogram.pxf.io/c/6416428/3069270/22474?u=https%3A%2F%2Fwww.capcut.com",
        "image": "https://app.impact.com/display-ad/22474-3069270?v=0"
    },
    {
        "name": "Renderforest",
        "link": "https://renderforest.pxf.io/c/6416428/1477001/14885",
        "image": "https://app.impact.com/display-ad/14885-1477001?v=0"
    },
    {
        "name": "Envato",
        "link": "https://1.envato.market/c/6416428/3371583/4662",
        "image": "https://app.impact.com/display-ad/4662-3371583?v=0"

    },
    {
        "name": "Pcloud",
        "link": "https://partner.pcloud.com/r/146969",
        "image": "https://partner.pcloud.com/media/banners/lifetime/lifetime014300250.png"
    }
]


