// Supported sites data
const supportedSites = [
    {
        name: 'YouTube',
        description: 'Download and clip videos from YouTube - the world\'s largest video platform with billions of videos, tutorials, music, and entertainment content. Extract video clips from YouTube URLs easily.',
        icon: 'youtube',
        hasIcon: true
    },
    {
        name: 'Facebook',
        description: 'Download and clip Facebook videos, live streams, and Reels. Extract video content from Facebook posts, stories, and video sharing. Free online video clipper for Facebook.',
        icon: 'facebook',
        hasIcon: true
    },
    {
        name: 'Instagram',
        description: 'Download and clip Instagram videos, Stories, Reels, and IGTV content. Extract video clips from Instagram posts and stories. Free Instagram video downloader and clipper.',
        icon: 'instagram',
        hasIcon: true
    },
    {
        name: 'TikTok',
        description: 'Download and clip TikTok videos and short-form content. Extract video clips from TikTok posts, trends, and viral videos. Free TikTok video downloader and clipper tool.',
        icon: 'tiktok',
        hasIcon: true
    },
    {
        name: 'Twitter/X',
        description: 'Download and clip Twitter/X videos, live streams, and video posts. Extract video content from Twitter tweets and spaces. Free Twitter video downloader and clipper.',
        icon: 'twitter',
        hasIcon: true
    },
    {
        name: 'Reddit',
        description: 'Download and clip Reddit videos from subreddits, posts, and comments. Extract video content from Reddit communities. Free Reddit video downloader and clipper tool.',
        icon: 'reddit',
        hasIcon: true
    },
    {
        name: 'Twitch',
        description: 'Download and clip Twitch live streams, VODs, and highlights. Extract video content from Twitch channels and gaming streams. Free Twitch video downloader and clipper.',
        icon: 'twitch',
        hasIcon: true
    },
    {
        name: 'LinkedIn',
        description: 'Download and clip LinkedIn videos from professional content and business posts. Extract video content from LinkedIn articles and company pages. Free LinkedIn video clipper.',
        icon: 'linkedin',
        hasIcon: true
    },
    {
        name: 'Vimeo',
        description: 'Download and clip Vimeo videos from creators and businesses. Extract video content from Vimeo channels and portfolios. Free Vimeo video downloader and clipper.',
        icon: 'vimeo-v',
        hasIcon: true
    },
    {
        name: 'Dailymotion',
        description: 'Download and clip Dailymotion videos from diverse content creators. Extract video clips from Dailymotion channels and playlists. Free Dailymotion video downloader.',
        icon: 'dailymotion',
        hasIcon: true
    },
    {
        name: 'CNN',
        description: 'Download and clip CNN news videos and live coverage. Extract video content from CNN articles and breaking news. Free CNN video downloader and clipper tool.',
        logo: 'https://www.cnn.com/favicon.ico',
        hasIcon: false
    },
    {
        name: 'BBC',
        description: 'Download and clip BBC news and entertainment videos. Extract video content from BBC articles and TV shows. Free BBC video downloader and clipper.',
        logo: 'https://www.bbc.com/favicon.ico',
        hasIcon: false
    },
    {
        name: 'Fox News',
        description: 'Download and clip Fox News conservative news channel videos. Extract video content from Fox News articles and political coverage. Free Fox News video downloader.',
        logo: 'https://www.foxnews.com/favicon.ico',
        hasIcon: false
    },
    {
        name: 'TED',
        description: 'Download and clip TED talks and inspiring presentations. Extract video content from TED conferences and speaker presentations. Free TED video downloader and clipper.',
        logo: 'https://www.ted.com/favicon.ico',
        hasIcon: false
    },
    {
        name: 'Udemy',
        description: 'Download and clip Udemy course videos and tutorials. Extract video content from Udemy online courses and skill development. Free Udemy video downloader and clipper.',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Udemy_logo.svg/2560px-Udemy_logo.svg.png',
        hasIcon: false
    },
    {
        name: 'Khan Academy',
        description: 'Download and clip Khan Academy educational videos and courses. Extract video content from Khan Academy lessons and tutorials. Free educational video downloader.',
        logo: 'https://www.khanacademy.org/favicon.ico',
        hasIcon: false
    },
    {
        name: 'Bilibili',
        description: 'Download and clip Bilibili videos from Chinese anime, gaming, and entertainment platform. Extract video content from Bilibili channels and playlists. Free Bilibili video downloader.',
        logo: 'https://www.bilibili.com/favicon.ico',
        hasIcon: false
    },
    {
        name: 'Youku',
        description: 'Download and clip Youku videos from Chinese streaming platform. Extract video content from Youku movies, TV shows, and user content. Free Youku video downloader.',
        logo: 'https://www.youku.com/favicon.ico',
        hasIcon: false
    },
    {
        name: 'VK',
        description: 'Download and clip VK videos from Russian social networking platform. Extract video content from VKontakte posts and communities. Free VK video downloader.',
        icon: 'vk',
        hasIcon: true
    },
    {
        name: 'Weibo',
        description: 'Download and clip Weibo videos from Chinese microblogging platform. Extract video content from Weibo posts and trends. Free Weibo video downloader and clipper.',
        icon: 'weibo',
        hasIcon: true
    },
];

// Function to display sites in a simple grid
function displaySites() {
    const container = document.getElementById('sites-container');
    if (!container) return;

    // Clear any existing content
    container.innerHTML = '';
    
    // Add all sites to the container
    supportedSites.forEach(site => {
        const siteCard = document.createElement('div');
        siteCard.className = 'site-card';
        
        // Determine if we should use a Font Awesome icon or an online logo
        const logoHtml = site.hasIcon 
            ? `<i class="fab fa-${site.icon}"></i>`
            : `<img src="${site.logo}" alt="${site.name} logo" class="site-logo-img">`;
        
        siteCard.innerHTML = `
            <a href="/" class="site-logo-link">
                <div class="site-logo">
                    ${logoHtml}
                </div>
            </a>
            <h3>${site.name}</h3>
            <p class="site-description">${site.description}</p>
        `;
        container.appendChild(siteCard);
    });
}

// Initialize the page when DOM is fully loaded
document.addEventListener('DOMContentLoaded', displaySites);
