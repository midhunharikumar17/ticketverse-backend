# Setup Notes

## 1. Add to package.json scripts:
{
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js"
  }
}

## 2. Generate RS256 key pair:
mkdir keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem

## 3. Install missing packages:
npm install @socket.io/redis-adapter redis

## 4. Update .env with real MongoDB Atlas URI and Razorpay test keys

## 5. Run:
npm run dev

## Expected output:
# MongoDB connected
# Redis connected  (or warning if Redis not running locally)
# Background jobs scheduled
# Server running on port 5000

## 6. Test health check:
curl http://localhost:5000/api/health

## 7. Test auth:
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"displayName":"Test User","email":"test@test.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
