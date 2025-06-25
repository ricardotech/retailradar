const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Dynamic brand products endpoint using Puppeteer
app.get('/api/v1/radar/:brandName/below-retail', async (req, res) => {
  let browser;
  
  try {
    const brandName = req.params.brandName;
    if (!brandName) {
      return res.status(400).json({
        success: false,
        error: 'Brand name is required',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`Starting ${brandName} product scraping...`);
    
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=VizDisplayCompositor'
      ],
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    });
    
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    });

    console.log(`Navigating to StockX ${brandName} page...`);
    await page.goto(`https://stockx.com/brands/${brandName.toLowerCase()}?below-retail=true&sort=recent_asks`, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });

    console.log('Waiting for page to load...');
    await page.waitForSelector('[data-testid="Results"]', { timeout: 30000 });
    
    await page.waitForFunction(
      () => {
        return document.querySelectorAll('[data-testid="ProductTile"]').length > 0;
      },
      { timeout: 20000 }
    );
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('Scraping products...');
    const products = await page.evaluate((brandName) => {
      const productElements = document.querySelectorAll('[data-testid="ProductTile"]');
      const results = [];

      productElements.forEach((element, index) => {
        try {
          const nameElement = element.querySelector('[data-testid="product-tile-title"]');
          if (!nameElement) return;

          const name = nameElement.textContent?.trim();
          if (!name || !name.toLowerCase().includes(brandName.toLowerCase())) return;

          const priceElement = element.querySelector('[data-testid="product-tile-lowest-ask-amount"]');
          if (!priceElement) return;

          const priceText = priceElement.textContent?.trim();
          const currentPrice = priceText ? parseInt(priceText.replace(/[^\d]/g, '')) : 0;
          if (currentPrice <= 0) return;

          const linkElement = element.querySelector('a[data-testid="productTile-ProductSwitcherLink"]');
          if (!linkElement) return;

          const href = linkElement.getAttribute('href');
          const stockxUrl = href?.startsWith('http') ? href : `https://stockx.com${href}`;

          const imageElement = element.querySelector('img');
          const imageUrl = imageElement?.getAttribute('src') || '';

          let estimatedRetailPrice = 0;
          
          // Adjust pricing estimation based on brand
          if (brandName.toLowerCase() === 'supreme') {
            if (name.toLowerCase().includes('hooded sweatshirt') || name.toLowerCase().includes('hoodie')) {
              estimatedRetailPrice = Math.max(currentPrice * 1.2, 148);
            } else if (name.toLowerCase().includes('jacket') || name.toLowerCase().includes('coat')) {
              estimatedRetailPrice = Math.max(currentPrice * 1.3, 298);
            } else if (name.toLowerCase().includes('t-shirt') || name.toLowerCase().includes('tee')) {
              estimatedRetailPrice = Math.max(currentPrice * 1.25, 48);
            } else if (name.toLowerCase().includes('crewneck') || name.toLowerCase().includes('sweater')) {
              estimatedRetailPrice = Math.max(currentPrice * 1.2, 138);
            } else if (name.toLowerCase().includes('pants') || name.toLowerCase().includes('shorts')) {
              estimatedRetailPrice = Math.max(currentPrice * 1.25, 118);
            } else {
              estimatedRetailPrice = Math.max(currentPrice * 1.3, 50);
            }
          } else {
            // Generic estimation for other brands
            estimatedRetailPrice = Math.max(currentPrice * 1.4, 100);
          }

          if (currentPrice >= estimatedRetailPrice) return;

          const discountPercentage = ((estimatedRetailPrice - currentPrice) / estimatedRetailPrice) * 100;

          const nameWords = name.split(' ');
          const colorway = nameWords[nameWords.length - 1] || '';

          results.push({
            name: name,
            belowRetail: `${discountPercentage.toFixed(2)}%`,
            retail: `$${estimatedRetailPrice}`,
            current: `$${currentPrice}`,
            link: stockxUrl
          });
        } catch (error) {
          console.warn('Error parsing product element:', error);
        }
      });

      return results;
    }, brandName);
    
    console.log(`Found ${products.length} ${brandName} products below retail`);
    
    res.json({
      success: true,
      data: products,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`Error scraping ${req.params.brandName || 'brand'} products:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to scrape ${req.params.brandName || 'brand'} products`,
      timestamp: new Date().toISOString()
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.listen(port, () => {
  console.log(`🚀 RetailRadar server running on http://localhost:${port}`);
  console.log(`📊 API endpoints:`);
  console.log(`   GET /healthz - Health check`);
  console.log(`   GET /api/v1/radar/:brandName/below-retail - Brand products below retail`);
  console.log(`   Example: GET /api/v1/radar/supreme/below-retail - Supreme products below retail`);
  console.log(`   Example: GET /api/v1/radar/nike/below-retail - Nike products below retail`);
});