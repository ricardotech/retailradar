import express from 'express';
import { PuppeteerAdapter } from './adapters/PuppeteerAdapter';

const app = express();
const port = process.env['PORT'] || 3000;

app.use(express.json());

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Supreme products endpoint using Puppeteer with individual product page scraping
app.get('/api/v1/radar/:brandName/below-retail', async (req, res) => {
  const adapter = new PuppeteerAdapter();
  
  try {
    const brandName = req.params.brandName || 'supreme';
    console.log(`🔍 [DEBUG] Starting ${brandName} product scraping with REAL PuppeteerAdapter...`);
    console.log(`🔍 [DEBUG] Using index-simple.ts from: ${__filename}`);
    console.log(`🔍 [DEBUG] Node.js process: ${process.argv.join(' ')}`);
    console.log(`🔍 [DEBUG] Working directory: ${process.cwd()}`);
    console.log(`🔍 [DEBUG] Environment: ${process.env.NODE_ENV}`);
    
    const products = await adapter.getBrandProducts(brandName);
    
    // Format response as requested
    const formattedProducts = products.map((product: any) => ({
      name: product.name,
      belowRetail: `${(product.discountPercentage * 100).toFixed(2)}%`,
      retail: `$${product.retailPrice}`,
      current: `$${product.currentPrice}`,
      link: product.stockxUrl
    }));
    
    console.log(`Found ${formattedProducts.length} ${brandName} products below retail`);
    
    res.json({
      success: true,
      data: formattedProducts,
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
    await adapter.close();
  }
});

// Legacy endpoint for backward compatibility
app.get('/api/supreme/products', async (req, res) => {
  res.redirect('/api/v1/radar/supreme/below-retail');
});

app.listen(port, () => {
  console.log(`🚀 RetailRadar server running on http://localhost:${port}`);
  console.log(`📊 API endpoints:`);
  console.log(`   GET /healthz - Health check`);
  console.log(`   GET /api/v1/radar/:brandName/below-retail - Brand products below retail`);
  console.log(`   Example: GET /api/v1/radar/supreme/below-retail - Supreme products below retail`);
  console.log(`   Example: GET /api/v1/radar/nike/below-retail - Nike products below retail`);
});