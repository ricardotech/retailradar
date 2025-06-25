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

// Supreme products endpoint using Puppeteer
app.get('/api/supreme/products', async (req, res) => {
  const adapter = new PuppeteerAdapter();
  
  try {
    console.log('Starting Supreme product scraping...');
    const products = await adapter.getSupremeProducts();
    
    // Format response as requested
    const formattedProducts = products.map(product => ({
      name: product.name,
      belowRetail: `${product.discountPercentage.toFixed(2)}%`,
      retail: `$${product.retailPrice}`,
      current: `$${product.currentPrice}`,
      link: product.stockxUrl
    }));
    
    res.json({
      success: true,
      data: formattedProducts,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error scraping Supreme products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scrape Supreme products',
      timestamp: new Date().toISOString()
    });
  } finally {
    await adapter.close();
  }
});

app.listen(port, () => {
  console.log(`🚀 RetailRadar server running on http://localhost:${port}`);
  console.log(`📊 API endpoints:`);
  console.log(`   GET /healthz - Health check`);
  console.log(`   GET /api/supreme/products - Supreme products below retail`);
});