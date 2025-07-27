// Sample data for supported sites
const supportedSites = [
    { name: 'YouTube', category: 'Video', icon: 'youtube' },
    { name: 'Medium', category: 'Articles', icon: 'medium' },
    { name: 'GitHub', category: 'Code', icon: 'github' },
    { name: 'Twitter', category: 'Social', icon: 'twitter' },
    { name: 'Reddit', category: 'Forums', icon: 'reddit' },
    { name: 'Wikipedia', category: 'Reference', icon: 'wikipedia-w' },
    { name: 'Stack Overflow', category: 'Q&A', icon: 'stack-overflow' },
    { name: 'Dev.to', category: 'Articles', icon: 'dev' },
    { name: 'GitLab', category: 'Code', icon: 'gitlab' },
    { name: 'Dribbble', category: 'Design', icon: 'dribbble' },
    { name: 'Behance', category: 'Design', icon: 'behance' },
    { name: 'CodePen', category: 'Code', icon: 'codepen' }
];

// Function to display sites
function displaySites(sites) {
    const container = document.getElementById('sites-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (sites.length === 0) {
        container.innerHTML = '<p class="no-results">No sites found matching your search.</p>';
        return;
    }
    
    // Group sites by category
    const categories = {};
    sites.forEach(site => {
        if (!categories[site.category]) {
            categories[site.category] = [];
        }
        categories[site.category].push(site);
    });
    
    // Create HTML for each category
    for (const [category, sitesInCategory] of Object.entries(categories)) {
        const categorySection = document.createElement('div');
        categorySection.className = 'category-section';
        categorySection.innerHTML = `
            <h3>${category}</h3>
            <div class="sites-list">
                ${sitesInCategory.map(site => `
                    <div class="site-card">
                        <div class="site-icon">
                            <i class="fab fa-${site.icon}"></i>
                        </div>
                        <span class="site-name">${site.name}</span>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(categorySection);
    }
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('site-search');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredSites = supportedSites.filter(site => 
            site.name.toLowerCase().includes(searchTerm) || 
            site.category.toLowerCase().includes(searchTerm)
        );
        displaySites(filteredSites);
    });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    displaySites(supportedSites);
    setupSearch();
});
