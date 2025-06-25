import { PuppeteerAdapter } from './src/adapters/PuppeteerAdapter';

async function testPuppeteerAdapter(): Promise<void> {
  console.log('🔍 Testing PuppeteerAdapter...');
  
  const adapter = new PuppeteerAdapter();
  
  try {
    // Test health check first
    console.log('📋 Checking if StockX is accessible...');
    const isHealthy = await adapter.isHealthy();
    console.log(`✅ Health check: ${isHealthy ? 'PASS' : 'FAIL'}`);
    
    if (!isHealthy) {
      console.log('❌ StockX is not accessible, skipping product scraping');
      return;
    }
    
    // Test product scraping
    console.log('🛍️ Scraping Supreme products below retail...');
    const products = await adapter.getBrandProducts('Supreme');
    
    console.log(`📦 Found ${products.length} Supreme products below retail`);
    
    if (products.length > 0) {
      console.log('\n🏆 Sample products:');
      products.slice(0, 3).forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name}`);
        console.log(`   Brand: ${product.brand}`);
        console.log(`   Colorway: ${product.colorway}`);
        console.log(`   Current Price: $${product.currentPrice}`);
        console.log(`   Estimated Retail: $${product.retailPrice}`);
        console.log(`   Discount: ${product.discountPercentage.toFixed(2)}%`);
        console.log(`   StockX URL: ${product.stockxUrl}`);
        console.log(`   Last Updated: ${product.lastUpdated.toISOString()}`);
      });
      
      // Format as requested JSON
      const exampleProduct = products[0];
      console.log('\n📋 Example JSON format:');
      console.log(JSON.stringify({
        name: exampleProduct.name,
        belowRetail: `${exampleProduct.discountPercentage.toFixed(2)}%`,
        retail: `$${exampleProduct.retailPrice}`,
        current: `$${exampleProduct.currentPrice}`,
        link: exampleProduct.stockxUrl
      }, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error testing PuppeteerAdapter:', error);
  } finally {
    console.log('🔄 Closing browser...');
    await adapter.close();
    console.log('✅ Test completed');
  }
}

// Run the test
if (require.main === module) {
  testPuppeteerAdapter().catch(console.error);
}

export { testPuppeteerAdapter };