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

// Dynamic Ad Loading for index.html
function injectAds() {
    console.log('injectAds function called');
    // Only run on index.html
    const adLeft = document.getElementById('adLeft');
    const adRight = document.getElementById('adRight');
    const adBottom = document.getElementById('adBottom');
    
    if (!adLeft) {
        console.error('adLeft element not found');
        return;
    }
    
    console.log('Fetching ads from /static/affiliate.json');
    fetch('/static/affiliate.json')
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            console.log('Successfully loaded affiliate data:', data);
            // LEFT: Video Editors
            const adLeft = document.getElementById('adLeft');
            if (adLeft && data.video_editors) {
                adLeft.innerHTML = '';
                data.video_editors.forEach(editor => {
                    let banner = null;
                    if (editor.banners) {
                        // Prefer largest banners first
                        banner = editor.banners.find(b => b.size === '820*461')
                              || editor.banners.find(b => b.size === '820*312')
                              || editor.banners.find(b => b.size === '728*90')
                              || editor.banners.find(b => b.size === '600*400')
                              || editor.banners.find(b => b.size === '600*315')
                              || editor.banners.find(b => b.size === '300*600')
                              || editor.banners.find(b => b.size === '300*300')
                              || editor.banners.find(b => b.size === '300*250')
                              || editor.banners.find(b => b.size === '300*169')
                              || editor.banners.find(b => b.size === '300*160')
                              || editor.banners.find(b => b.size === '250*250')
                              || editor.banners.find(b => b.size === '200*200')
                              || editor.banners.find(b => b.size === '125*125')
                              || editor.banners[0];
                    }
                    if (banner) {
                        const div = document.createElement('div');
                        div.className = 'ad-container';
                        div.innerHTML = banner.html;
                        adLeft.appendChild(div);
                        div.querySelectorAll('img').forEach(img => {
                            img.style.width = '100%';
                            img.style.height = 'auto';
                            img.removeAttribute('width');
                            img.removeAttribute('height');
                        });
                        console.log('Injected video editor ad:', editor.name, banner.size, 'HTML:', banner.html);
                        console.log('adLeft content after injection:', adLeft.innerHTML);
                    } else {
                        console.warn('No banner found for video editor:', editor.name);
                    }
                });
            }
            // RIGHT: VPNs
            const adRight = document.getElementById('adRight');
            if (adRight && data.vpn) {
                adRight.innerHTML = '';
                data.vpn.forEach(vpn => {
                    let banner = null;
                    if (vpn.banners) {
                        // Prefer 728x90, then 300x600, 300x300, 300x250, 200x200
                        banner = vpn.banners.find(b => b.size === '728*90')
                              || vpn.banners.find(b => b.size === '300*600')
                              || vpn.banners.find(b => b.size === '300*300')
                              || vpn.banners.find(b => b.size === '300*250')
                              || vpn.banners.find(b => b.size === '200*200')
                              || vpn.banners[0];
                    }
                    if (banner) {
                        const div = document.createElement('div');
                        div.className = 'ad-container';
                        div.innerHTML = banner.html;
                        adRight.appendChild(div);
                        div.querySelectorAll('img').forEach(img => {
                            img.style.width = '100%';
                            img.style.height = 'auto';
                            img.removeAttribute('width');
                            img.removeAttribute('height');
                        });
                        console.log('Injected VPN ad:', vpn.name, banner.size, 'HTML:', banner.html);
                        console.log('adRight content after injection:', adRight.innerHTML);
                    } else {
                        console.warn('No banner found for VPN:', vpn.name);
                    }
                });
            }
            // BOTTOM: Cloud Storage
            const adBottom = document.getElementById('adBottom');
            if (adBottom && data.cloud_storage && data.cloud_storage[0] && data.cloud_storage[0].banners) {
                const banner = data.cloud_storage[0].banners.find(b => b.size === '728*90') || data.cloud_storage[0].banners[0];
                if (banner) {
                    adBottom.innerHTML = banner.html;
                    adBottom.querySelectorAll('img').forEach(img => {
                        img.style.width = '100%';
                        img.style.height = 'auto';
                        img.removeAttribute('width');
                        img.removeAttribute('height');
                    });
                    console.log('Injected cloud storage ad:', banner.size, 'HTML:', banner.html);
                    console.log('adBottom content after injection:', adBottom.innerHTML);
                } else {
                    console.warn('No banner found for cloud storage');
                }
            }
        })
        .catch(error => {
            console.error('Error loading affiliate data:', error);
            // Show error message in ad containers
            const errorMessage = 'Failed to load ads. Please try again later.';
            if (adLeft) adLeft.innerHTML = `<div class="ad-error">${errorMessage}</div>`;
            if (adRight) adRight.innerHTML = `<div class="ad-error">${errorMessage}</div>`;
            if (adBottom) adBottom.innerHTML = `<div class="ad-error">${errorMessage}</div>`;
        });
}
document.addEventListener('DOMContentLoaded', injectAds); 