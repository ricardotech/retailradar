#!/bin/bash
echo "🏗️  Building RetailRadar for Docker"
echo "=================================="

echo ""
echo "1. Building application locally..."
npm run build:simple

if [ $? -eq 0 ]; then
    echo "✅ Local build successful!"
else
    echo "❌ Local build failed!"
    exit 1
fi

echo ""
echo "2. Building Docker image..."
docker build -f Dockerfile.simple -t retailradar:simple .

if [ $? -eq 0 ]; then
    echo "✅ Docker build successful!"
else
    echo "❌ Docker build failed!"
    exit 1
fi

echo ""
echo "3. Testing Docker container..."
docker run -d --name retailradar-test -p 3000:3000 --cap-add=SYS_ADMIN retailradar:simple

# Wait for container to start
sleep 10

echo ""
echo "4. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/healthz)
echo "Health check response: $HEALTH_RESPONSE"

if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo "✅ Health check passed!"
else
    echo "❌ Health check failed!"
fi

echo ""
echo "5. Cleaning up test container..."
docker stop retailradar-test >/dev/null 2>&1
docker rm retailradar-test >/dev/null 2>&1

echo ""
echo "🎉 Docker build completed!"
echo ""
echo "📋 To run the container:"
echo "   docker run -p 3000:3000 --cap-add=SYS_ADMIN retailradar:simple"
echo ""
echo "📋 Or use the simple docker-compose:"
echo "   docker-compose -f docker-compose.simple.yml up"