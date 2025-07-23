class AdManager {
    constructor() {
        this.containers = {
            left: document.getElementById('adLeft'),
            right: document.getElementById('adRight'),
            bottom: document.getElementById('adBottom')
        };
        
        // Map container IDs to ad types
        this.containerTypes = {
            left: 'video_editors',
            right: 'vpn',
            bottom: 'cloud_storage'
        };
        
        // Preferred banner sizes for each container
        this.preferredSizes = {
            left: ['300*250', '250*250', '200*200'],
            right: ['300*600', '300*250'],
            bottom: ['728*90', '468*60']
        };
        
        this.init();
    }
    
    async init() {
        try {
            const response = await fetch('/static/affiliate.json');
            if (!response.ok) throw new Error('Failed to load ads');
            
            this.adsData = await response.json();
            this.renderAllAds();
        } catch (error) {
            console.error('Error loading ads:', error);
            this.showError();
        }
    }
    
    renderAllAds() {
        Object.entries(this.containers).forEach(([position, container]) => {
            if (!container) return;
            
            const adType = this.containerTypes[position];
            const ads = this.adsData[adType];
            
            if (!ads || !ads.length) {
                this.showNoAds(container);
                return;
            }
            
            // Clear container
            container.innerHTML = '';
            
            // Get appropriate banner for this position
            ads.forEach(ad => {
                const banner = this.getBestBanner(ad, position);
                if (banner) {
                    this.renderBanner(container, banner);
                }
            });
            
            // If no banners were added, show a message
            if (container.children.length === 0) {
                this.showNoAds(container);
            }
        });
    }
    
    getBestBanner(ad, position) {
        if (!ad.banners || !ad.banners.length) return null;
        
        // Try to find preferred size first
        for (const size of this.preferredSizes[position]) {
            const banner = ad.banners.find(b => b.size === size);
            if (banner) return banner;
        }
        
        // If no preferred size found, return the first banner
        return ad.banners[0];
    }
    
    renderBanner(container, banner) {
        try {
            const wrapper = document.createElement('div');
            wrapper.className = 'ad-banner';
            wrapper.innerHTML = banner.html;
            
            // Make images responsive
            const img = wrapper.querySelector('img');
            if (img) {
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.style.display = 'block';
                img.style.margin = '0 auto';
                
                // Add loading lazy for better performance
                img.loading = 'lazy';
            }
            
            container.appendChild(wrapper);
        } catch (error) {
            console.error('Error rendering banner:', error);
        }
    }
    
    showNoAds(container) {
        container.innerHTML = `
            <div class="ad-placeholder">
                <p>No ads available</p>
            </div>
        `;
    }
    
    showError() {
        Object.values(this.containers).forEach(container => {
            if (container) {
                container.innerHTML = `
                    <div class="ad-error">
                        <p>Failed to load ads. Please try again later.</p>
                    </div>
                `;
            }
        });
    }
}

// Initialize ad manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adManager = new AdManager();
});
