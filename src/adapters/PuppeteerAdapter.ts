import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { IStockXAdapter } from './IStockXAdapter';
import { Product } from '../types';
import { logger } from '../config/logger-simple';
import { CaptchaService } from '../utils/CaptchaService-simple';

puppeteer.use(StealthPlugin());

export class PuppeteerAdapter implements IStockXAdapter {
  private browser: Browser | null = null;
  private captchaService: CaptchaService; // Kept for future use but currently deactivated

  // Method to check if captcha service is configured (currently unused)
  public isCaptchaConfigured(): boolean {
    return this.captchaService.isConfigured();
  }

  constructor() {
    this.captchaService = new CaptchaService({
      apiKey: process.env['CAPTCHA_API_KEY'] ?? 'demo-key',
      timeout: 60000
    });
  }

  private getBrandUrl(brandName: string): string {
    const brand = brandName.toLowerCase();
    
    switch (brand) {
      case 'supreme':
        return `https://stockx.com/brands/${brand}`;
      case 'adidas':
        return 'https://stockx.com/search?s=adidas';
      case 'nike':
        return 'https://stockx.com/search?s=nike';
      case 'jordan':
        return 'https://stockx.com/search?s=jordan';
      default:
        return `https://stockx.com/search?s=${encodeURIComponent(brand)}`;
    }
  }

  async getBrandProducts(brandName: string): Promise<Product[]> {
    let page: Page | null = null;
    
    try {
      console.log(`🚀 [PUPPETEER] getBrandProducts called for: ${brandName}`);
      console.log(`🚀 [PUPPETEER] Initializing browser...`);
      
      await this.initializeBrowser();
      page = await this.createPage();
      
      const baseUrl = this.getBrandUrl(brandName);
      console.log(`🚀 [PUPPETEER] Navigating to: ${baseUrl}`);
      logger.info(`Navigating to StockX ${brandName} page`);
      
      await page.goto(baseUrl, { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });

      console.log(`🚀 [PUPPETEER] Page loaded, handling captcha...`);
      await this.handleCaptchaIfPresent(page);
      
      console.log(`🚀 [PUPPETEER] Waiting for page elements...`);
      await this.waitForPageLoad(page);
      
      console.log(`🚀 [PUPPETEER] Starting product scraping...`);
      const products = await this.scrapeProducts(page, brandName);
      
      console.log(`🚀 [PUPPETEER] Scraping completed: ${products.length} products found`);
      logger.info(`Successfully scraped ${products.length} ${brandName} products below retail`);
      return products;
      
    } catch (error) {
      logger.error(`Error scraping ${brandName} products:`, error);
      throw new Error(`Puppeteer scraping failed: ${(error as Error).message}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.initializeBrowser();
      const page = await this.createPage();
      
      await page.goto('https://stockx.com', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      const isAccessible = await page.evaluate((): boolean => {
        return (window as any).document.title.toLowerCase().includes('stockx');
      });
      
      await page.close();
      return isAccessible;
      
    } catch (error: unknown) {
      logger.error('Puppeteer health check failed:', error);
      return false;
    }
  }

  private async initializeBrowser(): Promise<void> {
    if (!this.browser) {
      logger.info('Initializing Puppeteer browser');
      const puppeteerOptions: import("puppeteer").PuppeteerLaunchOptions = {
        headless: 'new',
        args: [
          // Recommended flags for running in Docker.
          // '--no-sandbox' is NOT needed because the official image is set up to use it.
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
        defaultViewport: {
          width: 1920,
          height: 1080
        }
      };

      // When using the official Puppeteer Docker image, Puppeteer automatically
      // detects and uses the bundled Chromium browser, so 'executablePath' is not needed.
      // The sandbox is enabled by default and works because the container
      // is run with the SYS_ADMIN capability.

      this.browser = await puppeteer.launch(puppeteerOptions);
    }
  }

  private async createPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    });

    return page;
  }

  private async handleCaptchaIfPresent(page: Page): Promise<void> {
    try {
      // Check for "Just a moment..." page
      const title = await page.title();
      if (title.includes('Just a moment') || title.includes('Checking your browser')) {
        logger.info('Detected "Just a moment" page, waiting for it to resolve...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Wait for the page to redirect or update
        try {
          await page.waitForFunction(() => {
            return !document.title.includes('Just a moment') && !document.title.includes('Checking your browser');
          }, { timeout: 30000 });
        } catch (error) {
          logger.warn('Timeout waiting for "Just a moment" page to resolve');
        }
      }

      // Check for Turnstile challenge
      const turnstileFrame = await page.$('iframe[src*="turnstile"]');
      if (turnstileFrame) {
        logger.info('Detected Turnstile captcha challenge - currently not solving');
        logger.warn('Captcha detected but service deactivated, continuing...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // Check for reCAPTCHA
      const recaptchaFrame = await page.$('iframe[src*="recaptcha"]');
      if (recaptchaFrame) {
        logger.info('Detected reCAPTCHA challenge - currently not solving');
        logger.warn('reCAPTCHA detected but service deactivated, continuing...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
    } catch (error: unknown) {
      logger.warn('Error handling captcha:', error);
      // Continue without failing the entire scraping process
    }
  }

  private async waitForPageLoad(page: Page): Promise<void> {
    try {
      // Try primary StockX selectors first
      await page.waitForSelector('[data-testid="Results"]', { 
        timeout: 30000 
      });
      
      // Wait for actual product tiles to load
      await page.waitForFunction(
        (): boolean => {
          return (window as any).document.querySelectorAll('[data-testid="ProductTile"]').length > 0;
        },
        { timeout: 20000 }
      );
      
      // Additional wait for dynamic content
      await new Promise(resolve => setTimeout(resolve, 3000));
      logger.info('Successfully loaded page with primary selectors');
      
    } catch (error: unknown) {
      logger.warn('Primary selectors not found, trying alternative selectors');
      
      try {
        // Try alternative product grid selectors
        await page.waitForSelector('#product-results, .browse-grid, .search-results, .grid-container, [class*="product"], [class*="grid"]', { 
          timeout: 15000 
        });
        
        // Wait for products to appear with fallback selectors
        await page.waitForFunction(
          (): boolean => {
            const productSelectors = [
              '[data-testid="ProductTile"]',
              '.product-tile',
              '.product-card',
              '[class*="product"]',
              'a[href*="/sneakers/"]',
              'a[href*="/streetwear/"]'
            ];
            
            for (const selector of productSelectors) {
              if ((window as any).document.querySelectorAll(selector).length > 0) {
                return true;
              }
            }
            return false;
          },
          { timeout: 10000 }
        );
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        logger.info('Successfully loaded page with alternative selectors');
        
      } catch (fallbackError: unknown) {
        logger.warn('Alternative selectors also failed, continuing with current page state');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  private calculateDiscountPercentage(retailPrice: number, currentPrice: number): number {
    if (retailPrice <= 0) return 0;
    return Number(((retailPrice - currentPrice) / retailPrice).toFixed(4));
  }

  

  private async scrapeProducts(page: Page, brandName: string): Promise<Product[]> {
    logger.info('Scraping initial product list...');
    const initialProducts = await page.evaluate((brandName: string) => {
      console.log(`🔍 Looking for products for brand: ${brandName}`);
      
      // Try multiple selectors to find products
      const productSelectors = [
        '[data-testid="ProductTile"]',
        '.product-tile',
        '.product-card',
        '[class*="product"]',
        'a[href*="/sneakers/"]',
        'a[href*="/streetwear/"]'
      ];
      
      let productElements: NodeList = document.querySelectorAll('[]'); // Empty initially
      
      for (const selector of productSelectors) {
        productElements = document.querySelectorAll(selector);
        console.log(`🔍 Found ${productElements.length} elements with selector: ${selector}`);
        if (productElements.length > 0) break;
      }
      
      if (productElements.length === 0) {
        console.log('🔍 No products found with any selector, trying more generic approach');
        // Look for any links that might be products
        const allLinks = Array.from(document.querySelectorAll('a[href*="stockx.com"]')).filter((link: any) => {
          const href = link.getAttribute('href') || '';
          return href.includes('/sneakers/') || href.includes('/streetwear/') || href.includes('/trading-cards/');
        });
        productElements = allLinks as unknown as NodeList;
      }
      
      const results: Array<{
        id: string;
        name: string;
        brand: string;
        colorway: string;
        currentPrice: number;
        stockxUrl: string;
        imageUrl: string;
      }> = [];
      
      Array.from(productElements).forEach((element: any, index: number) => {
        try {
          // Try different methods to get product name
          let name = '';
          const nameSelectors = [
            '[data-testid="product-tile-title"]',
            '.product-title',
            '.product-name',
            'h3',
            'h4',
            '.title'
          ];
          
          for (const selector of nameSelectors) {
            const nameElement = element.querySelector(selector);
            if (nameElement?.textContent?.trim()) {
              name = nameElement.textContent.trim();
              break;
            }
          }
          
          // If still no name, try getting from link text or nearby text
          if (!name) {
            name = element.textContent?.trim() || '';
            // Get the first reasonable-length text content
            const textParts = name.split('\n').filter(part => part.trim().length > 5 && part.trim().length < 100);
            name = textParts[0] || name;
          }
          
          console.log(`🔍 Found product candidate: "${name}"`);
          
          // Check if name contains brand (more flexible matching)
          const nameLower = name.toLowerCase();
          const brandLower = brandName.toLowerCase();
          const brandMatches = nameLower.includes(brandLower) || 
                              (brandLower === 'adidas' && (nameLower.includes('adidas') || nameLower.includes('yeezy'))) ||
                              (brandLower === 'nike' && (nameLower.includes('nike') || nameLower.includes('jordan'))) ||
                              (brandLower === 'supreme' && nameLower.includes('supreme'));
          
          if (!brandMatches || !name || name.length < 3) {
            console.log(`🔍 Skipping product: brand mismatch or invalid name`);
            return;
          }

          // Try different methods to get price
          let currentPrice = 0;
          const priceSelectors = [
            '[data-testid="product-tile-lowest-ask-amount"]',
            '.price',
            '.current-price',
            '.ask-price',
            '[class*="price"]'
          ];
          
          for (const selector of priceSelectors) {
            const priceElement = element.querySelector(selector);
            if (priceElement?.textContent) {
              const priceText = priceElement.textContent.trim();
              const priceMatch = priceText.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
              if (priceMatch) {
                currentPrice = parseInt(priceMatch[1].replace(/,/g, ''));
                break;
              }
            }
          }
          
          if (currentPrice <= 0) {
            console.log(`🔍 Skipping product: no valid price found`);
            return;
          }

          // Get product URL
          let stockxUrl = '';
          const linkSelectors = [
            'a[data-testid="productTile-ProductSwitcherLink"]',
            'a[href*="/sneakers/"]',
            'a[href*="/streetwear/"]',
            'a'
          ];
          
          for (const selector of linkSelectors) {
            const linkElement = element.querySelector(selector);
            if (linkElement) {
              const href = linkElement.getAttribute('href');
              if (href) {
                stockxUrl = href.startsWith('http') ? href : `https://stockx.com${href}`;
                break;
              }
            }
          }
          
          // If current element is a link, use it
          if (!stockxUrl && element.tagName === 'A') {
            const href = element.getAttribute('href');
            if (href) {
              stockxUrl = href.startsWith('http') ? href : `https://stockx.com${href}`;
            }
          }
          
          if (!stockxUrl) {
            console.log(`🔍 Skipping product: no valid URL found`);
            return;
          }

          // Get image URL
          const imageElement = element.querySelector('img');
          const imageUrl = imageElement?.getAttribute('src') ?? '';
          
          // Extract colorway from name
          const nameWords = name.split(' ');
          const colorway = nameWords.length > 1 ? nameWords[nameWords.length - 1] : '';

          console.log(`✅ Found valid product: ${name} - $${currentPrice}`);
          
          results.push({
            id: `puppeteer-${index}-${Date.now()}`,
            name,
            brand: brandName,
            colorway,
            currentPrice,
            stockxUrl,
            imageUrl,
          });
        } catch (error) {
          console.warn('Error parsing product element:', error);
        }
      });
      
      console.log(`🔍 Total products found: ${results.length}`);
      return results;
    }, brandName);

    logger.info(`Found ${initialProducts.length} potential products. Now fetching individual retail prices...`);
    console.log(`DEBUG: Found ${initialProducts.length} potential products. Now fetching individual retail prices...`);
    console.log(`DEBUG: Initial products:`, JSON.stringify(initialProducts.slice(0, 2), null, 2));

    const detailedProducts: Product[] = [];
    const failedScrapes: string[] = [];
    
    for (let i = 0; i < initialProducts.length; i++) {
      const product = initialProducts[i];
      if (!product) continue;

      logger.info(`[${i + 1}/${initialProducts.length}] Scraping retail price for: ${product.name}`);
      logger.info(`Product URL: ${product.stockxUrl}`);
      logger.info(`Current price: ${product.currentPrice}`);
      console.log(`DEBUG: [${i + 1}/${initialProducts.length}] Scraping retail price for: ${product.name}`);
      console.log(`DEBUG: Product URL: ${product.stockxUrl}`);
      console.log(`DEBUG: Current price: ${product.currentPrice}`);
      
      const retailPrice = await this.scrapeRetailPrice(page, product.stockxUrl);

      if (retailPrice > 0) {
        if (product.currentPrice < retailPrice) {
          const discountPercentage = this.calculateDiscountPercentage(retailPrice, product.currentPrice);
          const discount = ((retailPrice - product.currentPrice) / retailPrice * 100).toFixed(1);
          
          logger.info(`✅ BELOW RETAIL: ${product.name} - Retail: ${retailPrice}, Current: ${product.currentPrice}, Discount: ${discount}%`);
          
          detailedProducts.push({
            ...product,
            retailPrice,
            discountPercentage,
            lastUpdated: new Date(),
          } as Product);
        } else {
          logger.info(`❌ NOT below retail: ${product.name} - Retail: ${retailPrice}, Current: ${product.currentPrice}`);
        }
      } else {
        logger.warn(`⚠️  Failed to get retail price for: ${product.name}`);
        failedScrapes.push(product.name);
      }
      
      // Small delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (failedScrapes.length > 0) {
      logger.warn(`Failed to scrape retail prices for ${failedScrapes.length} products: ${failedScrapes.join(', ')}`);
    }
    
    logger.info(`Finished scraping. Found ${detailedProducts.length} products confirmed to be below retail.`);
    return detailedProducts;
  }

  private async scrapeRetailPrice(_page: Page, productUrl: string): Promise<number> {
    const productPage = await this.browser!.newPage();
    try {
      logger.info(`Fetching retail price from: ${productUrl}`);
      await productPage.goto(productUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      await this.handleCaptchaIfPresent(productPage);

      // Wait for page to load completely
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Try multiple selectors to find retail price
      const retailPrice = await productPage.evaluate(() => {
        console.log('🔍 Starting retail price search...');
        
        // Method 1: StockX-specific product traits structure
        console.log('🔍 Trying StockX product traits structure...');
        const productTraits = (document as any).querySelectorAll('[data-component="product-trait"]');
        console.log(`🔍 Found ${productTraits.length} product traits`);
        
        for (const trait of productTraits) {
          const labelElement = trait.querySelector('span');
          const valueElement = trait.querySelector('p');
          
          if (labelElement && valueElement) {
            const label = labelElement.textContent?.trim().toLowerCase();
            const value = valueElement.textContent?.trim();
            
            console.log(`🔍 Product trait: "${label}" = "${value}"`);
            
            if (label === 'retail price' && value) {
              const priceMatch = value.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
              if (priceMatch) {
                const price = parseFloat(priceMatch[1].replace(/,/g, ''));
                if (price > 0 && price < 10000) {
                  console.log(`✅ Found retail price via StockX product traits: $${price}`);
                  return price;
                }
              }
            }
          }
        }
        
        // Method 2: Find elements with "Retail Price" text and get the next sibling
        console.log('🔍 Trying generic retail price text search...');
        const retailPriceElements = Array.from((document as any).querySelectorAll('p, span, div, dt, dd'))
          .filter((el: any) => {
            const text = el.textContent?.trim().toLowerCase() || '';
            return text === 'retail price' || text === 'retail' || text.includes('retail price');
          });

        console.log(`🔍 Found ${retailPriceElements.length} elements with retail price text`);

        for (const element of retailPriceElements) {
          // Try next sibling
          const nextSibling = (element as any).nextElementSibling;
          if (nextSibling && nextSibling.textContent) {
            const priceMatch = nextSibling.textContent.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
            if (priceMatch) {
              const price = parseFloat(priceMatch[1].replace(/,/g, ''));
              if (price > 0 && price < 10000) {
                console.log(`✅ Found retail price via next sibling: $${price}`);
                return price;
              }
            }
          }
          
          // Try parent's next sibling
          const parentNextSibling = (element as any).parentElement?.nextElementSibling;
          if (parentNextSibling && parentNextSibling.textContent) {
            const priceMatch = parentNextSibling.textContent.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
            if (priceMatch) {
              const price = parseFloat(priceMatch[1].replace(/,/g, ''));
              if (price > 0 && price < 10000) {
                console.log(`✅ Found retail price via parent next sibling: $${price}`);
                return price;
              }
            }
          }
        }

        // Method 3: Look for price elements in retail context
        console.log('🔍 Trying contextual retail price search...');
        const allElements = Array.from((document as any).querySelectorAll('p, span, div, dt, dd'));
        for (const element of allElements) {
          const text = (element as any).textContent?.trim() || '';
          const parentText = (element as any).parentElement?.textContent?.toLowerCase() || '';
          
          // Check if element contains price and parent context mentions retail
          const priceMatch = text.match(/^\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
          if (priceMatch && (parentText.includes('retail') || parentText.includes('msrp'))) {
            const price = parseFloat(priceMatch[1].replace(/,/g, ''));
            if (price > 0 && price < 10000) {
              console.log(`✅ Found retail price via context: $${price} from "${text}"`);
              return price;
            }
          }
        }

        // Method 4: StockX specific data attributes and classes
        console.log('🔍 Trying StockX-specific selectors...');
        const stockxSelectors = [
          '[data-testid*="retail"]',
          '[data-testid*="msrp"]',
          '.retail-price',
          '.msrp-price',
          '[class*="retail"]',
          '[class*="msrp"]'
        ];

        for (const selector of stockxSelectors) {
          const elements = (document as any).querySelectorAll(selector);
          console.log(`🔍 Found ${elements.length} elements for selector: ${selector}`);
          for (const element of elements) {
            const text = (element as any).textContent?.trim() || '';
            const priceMatch = text.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
            if (priceMatch) {
              const price = parseFloat(priceMatch[1].replace(/,/g, ''));
              if (price > 0 && price < 10000) {
                console.log(`✅ Found retail price via StockX selector: $${price}`);
                return price;
              }
            }
          }
        }

        // Method 5: Fallback - text search in entire document
        console.log('🔍 Trying fallback text search...');
        const bodyText = (document as any).body.innerText;
        const patterns = [
          /Retail Price[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
          /Retail[:\s]*\$(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
          /MSRP[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
          /Original Price[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i
        ];

        for (const pattern of patterns) {
          const match = bodyText.match(pattern);
          if (match) {
            const price = parseFloat(match[1].replace(/,/g, ''));
            if (price > 0 && price < 10000) {
              console.log(`✅ Found retail price via text search: $${price}`);
              return price;
            }
          }
        }

        console.log('❌ No retail price found on this page');
        return 0;
      });

      if (retailPrice > 0) {
        logger.info(`Successfully scraped retail price: $${retailPrice} from ${productUrl}`);
        return retailPrice;
      } else {
        logger.warn(`Could not find retail price for ${productUrl}`);
        
        // Debug: log page title and URL for analysis
        const pageTitle = await productPage.title();
        const currentUrl = productPage.url();
        logger.warn(`Failed to find retail price. Page title: ${pageTitle}, URL: ${currentUrl}`);
      }

    } catch (error) {
      logger.error(`Error scraping retail price for ${productUrl}:`, error);
    } finally {
      await productPage.close();
    }
    return 0;
  }


  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}