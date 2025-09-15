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
        domCache.bottomContainer = document.querySelector('.tool-suggestion .suggestion-content');
    }
    return {
        leftPanel: domCache.sidePanels.left,
        rightPanel: domCache.sidePanels.right,
        bottomContainer: domCache.bottomContainer
    };
}

// Function to rotate content
function rotateContent() {
    const { leftPanel, rightPanel, bottomContainer } = initRotationElements();

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
            html: `<a href="https://www.mvvitrk.com/bDig55" 
            rel="noopener sponsored" 
            onclick="gtag('event', 'ad_click', { ad_name: 'Movavi', ad_position: 'side' }); setTimeout(() => { window.open(this.href, '_blank'); }, 100); return false;">
            <img src="https://res.cloudinary.com/ddozq3vu5/image/upload/f_auto,q_auto/v1753699762/300x600_tazs11.png" alt="Movavi Video Editor" style="width: 100%; height: 100%; object-fit: contain;"></a>`
        },
        {
            html: `<a href="https://flixier.com?fpr=mh1619"
            rel="noopener sponsored"
            onclick="gtag('event', 'ad_click', { ad_name: 'Flixier', ad_position: 'side' }); setTimeout(() => { window.open(this.href, '_blank'); }, 100); return false;">
            <img src="https://d2gdx5nv84sdx2.cloudfront.net/uploads/gjzkybfs/marketing_asset/banner/24623/120x600px-4.png" alt="Flixier Video Editor" style="width: 100%; height: 100%; object-fit: contain;"></a>`
        },
        {
            html: `<a rel="sponsored"
           href="https://renderforest.pxf.io/c/6416428/1957251/14885"
            target="_blank" id="1957251"
            onclick="gtag('event', 'ad_click', { ad_name: 'Renderforest', ad_position: 'side' })">
            <img src="//a.impactradius-go.com/display-ad/14885-1957251" border="0" alt="" width="300" height="600"/></a><img height="0" width="0" src="https://imp.pxf.io/i/6416428/1957251/14885" style="position:absolute;visibility:hidden;" border="0" />`
        },
        {
            html: `<a rel="sponsored"
           href="https://1.envato.market/c/6416428/3249424/4662?subId1=ULVG" 
           target="_blank" 
           id="3249424"
           onclick="gtag('event', 'ad_click', { ad_name: 'Envato', ad_position: 'side' })"> 
<img src="//a.impactradius-go.com/display-ad/4662-3249424" border="0" alt="" width="300" height="600"/></a><img height="0" width="0" src="https://1.envato.market/i/6416428/3249424/4662" style="position:absolute;visibility:hidden;" border="0" />`
        }
    ],
    bottom: [
        {
            html: `<a href="https://partner.pcloud.com/r/146969" 
            title="pCloud Premium" 
            rel="sponsored"
            onclick="gtag('event', 'ad_click', { ad_name: 'Pcloud', ad_position: 'bottom' }); setTimeout(() => { window.open(this.href, '_blank'); }, 100); return false;">
            <img src="https://partner.pcloud.com/media/banners/lifetime/lifetime00772890.jpg" alt="pCloud Premium"/></a>`
        },
        {
            html: `<a href="https://go.nordvpn.net/aff_c?offer_id=15&amp;aff_id=127970&amp;url_id=902"
    
            rel="noopener sponsored"
            onclick="gtag('event', 'ad_click', { ad_name: 'NordVPN', ad_position: 'bottom' }); setTimeout(() => { window.open(this.href, '_blank'); }, 100); return false;">
               <img src="https://res.cloudinary.com/ddozq3vu5/image/upload/f_auto,q_auto/v1756161613/nordvpn-728x90-en-us_wc4ng1.png" alt="NordVPN" style="width: 100%; max-height: 90px; object-fit: contain;" /></a>`
        },
        {
            html: `<a href="https://privadovpn.com/resources/best-vpn-for-gaming#a_aid=1619&a_bid=203d5f79"
            rel="noopener sponsored"
            onclick="gtag('event', 'ad_click', { ad_name: 'PrivadoVPN', ad_position: 'bottom' }); setTimeout(() => { window.open(this.href, '_blank'); }, 100); return false;">
               <img src="https://res.cloudinary.com/ddozq3vu5/image/upload/f_auto,q_auto/v1753306325/728x90_c9y6b3.png" alt="PrivadoVPN" style="width: 100%; max-height: 90px; object-fit: contain;"></a>`
        }

    ]
};



// Initialize content rotation when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function () {
    // Initial rotation
    rotateContent();

    // Set up intervals for rotations
    setInterval(rotateContent, 15000); // Side ads rotation (15 seconds)

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

    // Set interval for bottom rotation (15 seconds)
    setInterval(rotateBottomContent, 15000);
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

    const trackingOnClick = `onclick="gtag('event', 'ad_click', { ad_name: '${tool.name}', ad_position: 'recommended_tool' }); setTimeout(() => { window.open(this.href, '_blank'); }, 100); return false;"`;

    card.innerHTML = `
        <div class="recommended-card-inner" style="display: flex; flex-direction: column; height: 100%;">
            <a href="${tool.link}" rel="noopener sponsored" class="image-link" ${trackingOnClick}>
                <div class="image-wrapper">
                    <img src="${tool.image}" alt="${tool.header}" loading="lazy">
                </div>
            </a>
            <div class="recommended-content" style="padding: 1.25rem !important;">
                <h3 class="recommended-title" style="
                    font-size: 1.1rem !important;
                    font-weight: 600 !important;
                    color: #1f2937 !important;
                    margin: 0 0 0.75rem 0 !important;
                    line-height: 1.3 !important;
                ">
                    ${tool.header}
                </h3>
                <div class="recommended-desc">
                    <p class="recommended-description" style="
                        font-size: 1.05rem !important;
                        color: #1f2937 !important;
                        margin: 0.5rem 0 1.5rem 0 !important;
                        line-height: 1.7 !important;
                        font-weight: 420 !important;
                        letter-spacing: 0.02em !important;
                        text-rendering: optimizeLegibility !important;
                        -webkit-font-smoothing: antialiased !important;
                    ">
                        ${descriptionHtml}
                    </p>
                </div>
                <a href="${tool.link}" rel="noopener sponsored" class="learn-more-btn" ${trackingOnClick} style="
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    padding: 0.6rem 1.25rem !important;
                    background-color: #4f46e5 !important;
                    color: white !important;
                    border-radius: 0.375rem !important;
                    font-weight: 500 !important;
                    font-size: 0.95rem !important;
                    text-decoration: none !important;
                    transition: background-color 0.2s ease !important;
                    margin-top: auto !important;
                    margin-left: auto !important;
                    margin-right: auto !important;
                    width: fit-content !important;
                ">
                    Learn more about ${tool.name} <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        </div>
    `;

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
        "name": "Movavi",
        "header": "Your do-it-all video-making bundle",
        "link": "https://www.mvvitrk.com/bDig55",
        "image": "https://res.cloudinary.com/ddozq3vu5/image/upload/f_auto,q_auto/v1756326278/336x280-v3_ciesw3.png",
        "description": "Auto subtitles with one click, ready-made templates\nHandy video editing, file conversion, and screen recording\nHundreds of drag-and-drop filters, transitions, titles, and overlays\nUse code (PTNAFFDIS010925ALLAFS15) for 15% discount on yearly subscription (valid till 15th October 2025)"
    },
    {
        "name": "Envato",
        "header": "Top-Quality Assets for Designers & Video Editors",
        "link": "https://1.envato.market/WyQOdP",
        "image": "https://app.impact.com/display-ad/4662-377341?v=3",
        "description": "Access motion graphics, Premiere Pro templates, royalty-free music, and more.\nCut production time with ready-to-use tools for every project.\nIdeal for freelancers, agencies, and creatives on a deadline."

    },
    {
        "name": "Flixier",
        "header": "Your Cloud-Powered Video Studio",
        "link": "https://flixier.com?fpr=mh1619",
        "image": "https://d2gdx5nv84sdx2.cloudfront.net/uploads/gjzkybfs/marketing_asset/banner/24602/720x300px.png",
        "description": "AI subtitle, voiceover & translation tools—all built right into your browser.\nCloud rendering delivers full‑HD or 4K videos in minutes, no high-end PC needed.\nCollaborative editing, stock media & templates—team up and produce faster."
    },
    {
        "name": "Renderforest",
        "header": "Bring Your Ideas to Life—Animated, Branded & Ready",
        "link": "https://renderforest.pxf.io/qzvzVj",
        "image": "https://app.impact.com/display-ad/14885-1957252?v=1",
        "description": "Pick a template, type your script, and let AI do the rest.\nCustomize colors, fonts & music with drag‑and‑drop ease.\nExport in HD or 4K with advanced features available on premium plans."
    },
    {
        "name": "Pcloud",
        "header": "Smart Virtual Drive—Cloud Storage That Works Like Local",
        "link": "https://partner.pcloud.com/r/146969",
        "image": "https://partner.pcloud.com/media/banners/personal/personal008300250.jpg",
        "description": "Start with free 10GB, expand easily, or lock in lifetime access for one fee.\nEnjoy built-in media streaming, automatic cross‑platform backups, and file previews.\nOptional Crypto encryption gives you exclusive control over sensitive files."
    },
    {
        "name": "NordVPN",
        "header": "Trusted by Millions, Audited for Privacy – Take your online security to the next level with NordVPN",
        "link": "https://go.nordvpn.net/aff_c?offer_id=15&aff_id=127970&url_id=902",
        "image": "https://res.cloudinary.com/ddozq3vu5/image/upload/f_auto,q_auto/v1756161613/nordvpn-480x320-en-us_cgexjk.jpg",
        "description": "Threat Protection Pro blocks malware, trackers, and phishing sites in real-time.\nDark Web Monitor alerts you if your credentials appear in data breaches.\nSplit tunneling, dedicated IP, and Meshnet secure all your devices—even across continents."
    },
    {
        "name": "PrivadoVPN",
        "header": "Budget VPN Built for Privacy & Streaming",
        "link": "https://privadovpn.com/getprivadovpn/#a_aid=1619",
        "image": "https://affiliates.privadovpn.com/accounts/default1/3abd4o9y/fb34eb50.png?t=1632790058",
        "description": "Deep discounts with long-term plans: ultra-low pricing from $1.11/month*.\nReliable speeds for HD streaming and browsing on global servers.\nPremium features like unlimited devices, streaming unblock & ad blocking."
    }
];



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

