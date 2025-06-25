#!/bin/bash
echo "🧪 Testing RetailRadar Build Process"
echo "====================================="

echo ""
echo "1. Testing NPM build..."
npm run build:simple

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "2. Testing compiled application..."
node dist/index-simple.js &
SERVER_PID=$!
sleep 5

echo ""
echo "3. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/healthz)
echo "Health check response: $HEALTH_RESPONSE"

if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo "✅ Health check passed!"
else
    echo "❌ Health check failed!"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo ""
echo "4. Stopping server..."
kill $SERVER_PID 2>/dev/null
sleep 2

echo ""
echo "🎉 All tests passed! RetailRadar is ready to run."
echo ""
echo "📋 To start the application:"
echo "   Local development: npm run dev:simple"
echo "   Production build:  npm run build:simple && npm run start"
echo "   Docker:           docker-compose up --build"