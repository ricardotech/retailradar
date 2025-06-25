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

  async getBrandProducts(brandName: string): Promise<Product[]> {
    let page: Page | null = null;
    
    try {
      await this.initializeBrowser();
      page = await this.createPage();
      
      const baseUrl = `https://stockx.com/brands/${brandName.toLowerCase()}?below-retail=true&sort=recent_asks`;
      logger.info(`Navigating to StockX ${brandName} page`);
      await page.goto(baseUrl, { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });

      await this.handleCaptchaIfPresent(page);
      await this.waitForPageLoad(page);
      const products = await this.scrapeProducts(page, brandName);
      
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
      };

      // In Docker environment with official Puppeteer image, 
      // Puppeteer will automatically use the bundled Chromium
      // No need to set executablePath as it's handled by the image

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
      // Captcha service is currently deactivated but code kept for future use
      // Check for Turnstile challenge
      const turnstileFrame = await page.$('iframe[src*="turnstile"]');
      if (turnstileFrame) {
        logger.info('Detected Turnstile captcha challenge - currently not solving');
        // Deactivated: if (this.captchaService.isConfigured()) {
        //   const siteKey = await page.evaluate(() => {
        //     const iframe = document.querySelector('iframe[src*="turnstile"]') as HTMLIFrameElement;
        //     return iframe?.src.match(/sitekey=([^&]+)/)?.[1] || '';
        //   });
        //   
        //   if (siteKey) {
        //     const token = await this.captchaService.solveTurnstile(siteKey, this.baseUrl);
        //     
        //     await page.evaluate((token) => {
        //       const callback = (window as any).turnstileCallback;
        //       if (callback) callback(token);
        //     }, token);
        //     
        //     await page.waitForTimeout(2000);
        //   }
        // } else {
        logger.warn('Captcha detected but service deactivated, continuing...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        // }
      }

      // Check for reCAPTCHA
      const recaptchaFrame = await page.$('iframe[src*="recaptcha"]');
      if (recaptchaFrame) {
        logger.info('Detected reCAPTCHA challenge - currently not solving');
        // Deactivated: if (this.captchaService.isConfigured()) {
        //   const siteKey = await page.$eval('.g-recaptcha', el => el.getAttribute('data-sitekey') || '');
        //   
        //   if (siteKey) {
        //     const token = await this.captchaService.solveRecaptcha(siteKey, this.baseUrl);
        //     
        //     await page.evaluate((token) => {
        //       (window as any).grecaptcha?.execute?.(token);
        //     }, token);
        //     
        //     await page.waitForTimeout(3000);
        //   }
        // } else {
        logger.warn('reCAPTCHA detected but service deactivated, continuing...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        // }
      }
      
    } catch (error: unknown) {
      logger.warn('Error handling captcha:', error);
      // Continue without failing the entire scraping process
    }
  }

  private async waitForPageLoad(page: Page): Promise<void> {
    try {
      // Wait for the product results container
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
      
    } catch (error: unknown) {
      logger.warn('Standard selectors not found, trying alternative selectors');
      
      await page.waitForSelector('#product-results, .browse-grid, .search-results', { 
        timeout: 15000 
      });
    }
  }

  private calculateDiscountPercentage(retailPrice: number, currentPrice: number): number {
    if (retailPrice <= 0) return 0;
    return Number(((retailPrice - currentPrice) / retailPrice).toFixed(4));
  }

  

  private async scrapeProducts(page: Page, brandName: string): Promise<Product[]> {
    logger.info('Scraping initial product list...');
    const initialProducts = await page.evaluate((brandName: string) => {
      const productElements = (document as any).querySelectorAll('[data-testid="ProductTile"]');
      const results: Array<{
        id: string;
        name: string;
        brand: string;
        colorway: string;
        currentPrice: number;
        stockxUrl: string;
        imageUrl: string;
      }> = [];
      productElements.forEach((element: any, index: number) => {
        try {
          const nameElement = element.querySelector('[data-testid="product-tile-title"]');
          const name = nameElement?.textContent?.trim() ?? '';
          if (!name.toLowerCase().includes(brandName.toLowerCase())) return;

          const priceElement = element.querySelector('[data-testid="product-tile-lowest-ask-amount"]');
          const priceText = priceElement?.textContent?.trim() ?? '';
          const currentPrice = priceText ? parseInt(priceText.replace(/[^\d]/g, '')) : 0;
          if (currentPrice <= 0) return;

          const linkElement = element.querySelector('a[data-testid="productTile-ProductSwitcherLink"]');
          const href = linkElement?.getAttribute('href');
          const stockxUrl = href?.startsWith('http') ? href : `https://stockx.com${href}`;

          const imageElement = element.querySelector('img');
          const imageUrl = imageElement?.getAttribute('src') ?? '';
          
          const nameWords = name.split(' ');
          const colorway = nameWords[nameWords.length - 1] ?? '';

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
      return results;
    }, brandName);

    logger.info(`Found ${initialProducts.length} potential products. Now fetching individual retail prices...`);

    const detailedProducts: Product[] = [];
    const failedScrapes: string[] = [];
    
    for (let i = 0; i < initialProducts.length; i++) {
      const product = initialProducts[i];
      logger.info(`[${i + 1}/${initialProducts.length}] Scraping retail price for: ${product.name}`);
      logger.info(`Product URL: ${product.stockxUrl}`);
      logger.info(`Current price: $${product.currentPrice}`);
      
      const retailPrice = await this.scrapeRetailPrice(page, product.stockxUrl);

      if (retailPrice > 0) {
        if (product.currentPrice < retailPrice) {
          const discountPercentage = this.calculateDiscountPercentage(retailPrice, product.currentPrice);
          const discount = ((retailPrice - product.currentPrice) / retailPrice * 100).toFixed(1);
          
          logger.info(`✅ BELOW RETAIL: ${product.name} - Retail: $${retailPrice}, Current: $${product.currentPrice}, Discount: ${discount}%`);
          
          detailedProducts.push({
            ...product,
            retailPrice,
            discountPercentage,
            lastUpdated: new Date(),
          });
        } else {
          logger.info(`❌ NOT below retail: ${product.name} - Retail: $${retailPrice}, Current: $${product.currentPrice}`);
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
        console.log('Starting retail price search...');
        
        // Method 1: Find elements with "Retail Price" text and get the next sibling
        const retailPriceElements = Array.from((document as any).querySelectorAll('p, span, div, dt, dd'))
          .filter((el: any) => {
            const text = el.textContent?.trim().toLowerCase() || '';
            return text === 'retail price' || text === 'retail' || text.includes('retail price');
          });

        console.log(`Found ${retailPriceElements.length} elements with retail price text`);

        for (const element of retailPriceElements) {
          // Try next sibling
          const nextSibling = (element as any).nextElementSibling;
          if (nextSibling && nextSibling.textContent) {
            const priceMatch = nextSibling.textContent.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
            if (priceMatch) {
              const price = parseFloat(priceMatch[1].replace(/,/g, ''));
              if (price > 0 && price < 10000) {
                console.log(`Found retail price via next sibling: $${price}`);
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
                console.log(`Found retail price via parent next sibling: $${price}`);
                return price;
              }
            }
          }
        }

        // Method 2: Look for price elements in retail context
        const allElements = Array.from((document as any).querySelectorAll('p, span, div, dt, dd'));
        for (const element of allElements) {
          const text = (element as any).textContent?.trim() || '';
          const parentText = (element as any).parentElement?.textContent?.toLowerCase() || '';
          
          // Check if element contains price and parent context mentions retail
          const priceMatch = text.match(/^\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
          if (priceMatch && (parentText.includes('retail') || parentText.includes('msrp'))) {
            const price = parseFloat(priceMatch[1].replace(/,/g, ''));
            if (price > 0 && price < 10000) {
              console.log(`Found retail price via context: $${price} from "${text}"`);
              return price;
            }
          }
        }

        // Method 3: StockX specific data attributes and classes
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
          for (const element of elements) {
            const text = (element as any).textContent?.trim() || '';
            const priceMatch = text.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
            if (priceMatch) {
              const price = parseFloat(priceMatch[1].replace(/,/g, ''));
              if (price > 0 && price < 10000) {
                console.log(`Found retail price via StockX selector: $${price}`);
                return price;
              }
            }
          }
        }

        // Method 4: Fallback - text search in entire document
        console.log('Trying fallback text search...');
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
              console.log(`Found retail price via text search: $${price}`);
              return price;
            }
          }
        }

        console.log('No retail price found');
        return 0;
      });

      if (retailPrice > 0) {
        logger.info(`Successfully scraped retail price: $${retailPrice} from ${productUrl}`);
        return retailPrice;
      } else {
        logger.warn(`Could not find retail price for ${productUrl}`);
        
        // Debug: log page content for analysis
        const pageText = await productPage.evaluate(() => (document as any).body.innerText.substring(0, 1000));
        logger.info(`Page content sample: ${pageText}`);
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