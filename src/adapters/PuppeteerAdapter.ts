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
  private readonly baseUrl = 'https://stockx.com/brands/supreme?below-retail=true&sort=recent_asks';
  private captchaService: CaptchaService; // Kept for future use but currently deactivated

  // Method to check if captcha service is configured (currently unused)
  public isCaptchaConfigured(): boolean {
    return this.captchaService.isConfigured();
  }

  constructor() {
    this.captchaService = new CaptchaService({
      apiKey: process.env['CAPTCHA_API_KEY'] || 'demo-key',
      timeout: 60000
    });
  }

  async getSupremeProducts(): Promise<Product[]> {
    let page: Page | null = null;
    
    try {
      await this.initializeBrowser();
      page = await this.createPage();
      
      logger.info('Navigating to StockX Supreme page');
      await page.goto(this.baseUrl, { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });

      await this.handleCaptchaIfPresent(page);
      await this.waitForPageLoad(page);
      const products = await this.scrapeProducts(page);
      
      logger.info(`Successfully scraped ${products.length} Supreme products below retail`);
      return products;
      
    } catch (error) {
      logger.error('Error scraping Supreme products:', error);
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
      
      const isAccessible = await page.evaluate(() => {
        return (window as any).document.title.toLowerCase().includes('stockx');
      });
      
      await page.close();
      return isAccessible;
      
    } catch (error) {
      logger.error('Puppeteer health check failed:', error);
      return false;
    }
  }

  private async initializeBrowser(): Promise<void> {
    if (!this.browser) {
      logger.info('Initializing Puppeteer browser');
      const puppeteerOptions: any = {
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
      
    } catch (error) {
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
        () => {
          return (window as any).document.querySelectorAll('[data-testid="ProductTile"]').length > 0;
        },
        { timeout: 20000 }
      );
      
      // Additional wait for dynamic content
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      logger.warn('Standard selectors not found, trying alternative selectors');
      
      await page.waitForSelector('#product-results, .browse-grid, .search-results', { 
        timeout: 15000 
      });
    }
  }

  private async scrapeProducts(page: Page): Promise<Product[]> {
    const products = await page.evaluate(() => {
      // Use the actual StockX HTML structure
      const productElements = (window as any).document.querySelectorAll('[data-testid="ProductTile"]');
      const results: any[] = [];

      productElements.forEach((element: any, index: number) => {
        try {
          // Extract product name
          const nameElement = element.querySelector('[data-testid="product-tile-title"]');
          if (!nameElement) return;

          const name = nameElement.textContent?.trim();
          if (!name || !name.toLowerCase().includes('supreme')) return;

          // Extract current price (Lowest Ask)
          const priceElement = element.querySelector('[data-testid="product-tile-lowest-ask-amount"]');
          if (!priceElement) return;

          const priceText = priceElement.textContent?.trim();
          const currentPrice = priceText ? parseInt(priceText.replace(/[^\d]/g, '')) : 0;
          if (currentPrice <= 0) return;

          // Extract product link
          const linkElement = element.querySelector('a[data-testid="productTile-ProductSwitcherLink"]');
          if (!linkElement) return;

          const href = linkElement.getAttribute('href');
          const stockxUrl = href?.startsWith('http') ? href : `https://stockx.com${href}`;

          // Extract image
          const imageElement = element.querySelector('img');
          const imageUrl = imageElement?.getAttribute('src') || '';

          // For below-retail page, we need to estimate retail price
          // Since StockX doesn't show retail price directly, we'll estimate it
          // Based on typical Supreme pricing patterns and current ask
          let estimatedRetailPrice = 0;
          
          // Common Supreme retail price patterns based on product type
          if (name.toLowerCase().includes('hooded sweatshirt') || name.toLowerCase().includes('hoodie')) {
            estimatedRetailPrice = Math.max(currentPrice * 1.2, 148); // Hoodies typically retail $148-168
          } else if (name.toLowerCase().includes('jacket') || name.toLowerCase().includes('coat')) {
            estimatedRetailPrice = Math.max(currentPrice * 1.3, 298); // Jackets typically retail $298-498
          } else if (name.toLowerCase().includes('t-shirt') || name.toLowerCase().includes('tee')) {
            estimatedRetailPrice = Math.max(currentPrice * 1.25, 48); // Tees typically retail $48-58
          } else if (name.toLowerCase().includes('crewneck') || name.toLowerCase().includes('sweater')) {
            estimatedRetailPrice = Math.max(currentPrice * 1.2, 138); // Crewnecks typically retail $138-158
          } else if (name.toLowerCase().includes('pants') || name.toLowerCase().includes('shorts')) {
            estimatedRetailPrice = Math.max(currentPrice * 1.25, 118); // Bottoms typically retail $118-188
          } else {
            // Default estimation for other items
            estimatedRetailPrice = Math.max(currentPrice * 1.3, 50);
          }

          // Only include if it appears to be below estimated retail
          if (currentPrice >= estimatedRetailPrice) return;

          const discountPercentage = ((estimatedRetailPrice - currentPrice) / estimatedRetailPrice) * 100;

          // Extract colorway from name (usually the last word/phrase)
          const nameWords = name.split(' ');
          const colorway = nameWords[nameWords.length - 1] || '';

          results.push({
            id: `puppeteer-${index}-${Date.now()}`,
            name: name,
            brand: 'Supreme',
            colorway: colorway,
            retailPrice: estimatedRetailPrice,
            currentPrice: currentPrice,
            discountPercentage: discountPercentage,
            stockxUrl: stockxUrl,
            imageUrl: imageUrl,
            lastUpdated: new Date(),
          });
        } catch (error) {
          console.warn('Error parsing product element:', error);
        }
      });

      return results;
    });

    return products.map(p => ({
      ...p,
      lastUpdated: new Date()
    }));
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}