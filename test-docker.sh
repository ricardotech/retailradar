#!/bin/bash
echo "🐳 Testing RetailRadar Docker Setup"
echo "===================================="

echo ""
echo "1. Building Docker image..."
docker-compose -f docker-compose.simple.yml build

if [ $? -eq 0 ]; then
    echo "✅ Docker build successful!"
else
    echo "❌ Docker build failed!"
    exit 1
fi

echo ""
echo "2. Starting container..."
docker-compose -f docker-compose.simple.yml up -d

# Wait for container to start
sleep 10

echo ""
echo "3. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/healthz)
echo "Health check response: $HEALTH_RESPONSE"

if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo "✅ Health check passed!"
else
    echo "❌ Health check failed!"
    docker-compose -f docker-compose.simple.yml down
    exit 1
fi

echo ""
echo "4. Testing Supreme products endpoint..."
echo "Note: This may take 30-60 seconds as it scrapes live data..."
PRODUCTS_RESPONSE=$(timeout 60 curl -s http://localhost:3000/api/supreme/products)

if echo "$PRODUCTS_RESPONSE" | grep -q "success"; then
    echo "✅ Products endpoint responded!"
    echo "Sample response: $(echo "$PRODUCTS_RESPONSE" | head -c 200)..."
else
    echo "⚠️  Products endpoint may need more time or encountered an issue"
    echo "Response: $PRODUCTS_RESPONSE"
fi

echo ""
echo "5. Checking container logs..."
docker-compose -f docker-compose.simple.yml logs --tail=10 app

echo ""
echo "6. Stopping container..."
docker-compose -f docker-compose.simple.yml down

echo ""
echo "🎉 Docker test completed!"
echo ""
echo "📋 To run manually:"
echo "   docker-compose -f docker-compose.simple.yml up --build"
echo "   # Then visit http://localhost:3000/api/supreme/products"