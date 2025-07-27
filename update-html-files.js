const fs = require('fs');
const path = require('path');

// Configuration
const rootDir = path.join(__dirname, 'internal', 'web');
const pagesDir = path.join(rootDir, 'pages');
const scriptTag = '\n    <!-- Floating Button Component -->\n    <script type="module" src="/js/floating-button.js"></script>\n';

// Function to process a single HTML file
function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Check if the script is already included
        if (content.includes('floating-button.js')) {
            console.log(`✓ Already updated: ${path.relative(rootDir, filePath)}`);
            return false;
        }
        
        // Add the script before the closing body tag
        if (content.includes('</body>')) {
            content = content.replace('</body>', scriptTag + '</body>');
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✓ Updated: ${path.relative(rootDir, filePath)}`);
            return true;
        } else {
            console.log(`⚠️ No </body> tag found in: ${path.relative(rootDir, filePath)}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error processing ${path.relative(rootDir, filePath)}:`, error.message);
        return false;
    }
}

// Process all HTML files in the pages directory
function processPages() {
    try {
        const files = fs.readdirSync(pagesDir);
        const htmlFiles = files.filter(file => file.endsWith('.html'));
        
        console.log('\nUpdating HTML files in /pages directory...\n');
        
        let updatedCount = 0;
        htmlFiles.forEach(file => {
            const filePath = path.join(pagesDir, file);
            if (processFile(filePath)) {
                updatedCount++;
            }
        });
        
        // Also update the main index.html
        const indexPath = path.join(rootDir, 'index.html');
        if (fs.existsSync(indexPath)) {
            if (processFile(indexPath)) {
                updatedCount++;
            }
        }
        
        console.log(`\n✅ Successfully updated ${updatedCount} files with the floating button component.`);
        return updatedCount;
    } catch (error) {
        console.error('Error processing pages directory:', error);
        return 0;
    }
}

// Run the script
if (require.main === module) {
    processPages();
}

module.exports = { processFile, processPages };
