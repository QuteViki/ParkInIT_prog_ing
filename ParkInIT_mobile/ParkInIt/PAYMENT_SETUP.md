# Payment Integration Setup Guide

## Overview
This guide explains how to set up the payment system for ParkInIT with test mode and WSpay integration.

## Current Implementation Status

### ✅ What's Ready
- Backend payment initiation endpoint (`POST /api/payments/initiate`)
- Backend payment verification endpoint (`POST /api/payments/verify`)
- Server-to-server notification handler (`POST /api/payments/notify`)
- Frontend payment flow with test mode support
- Database schema for parking orders
- React Router with payment test page

### 🔄 Test Mode (Current)
The system currently redirects to a test payment page where users can simulate:
- ✓ Successful payment
- ✗ Failed payment

This allows you to test the complete payment flow without WSpay credentials.

### 🚀 WSpay Integration (Next Step)
Once you have WSpay credentials, you can integrate real payments.

---

## Setup Instructions

### Step 1: Database Setup

Run the SQL migration to create the `parking_orders` table:

```bash
# In your database client (MySQL Workbench, DBeaver, phpMyAdmin, etc.)
# Open: backend/migrations/001_create_parking_orders.sql
# Execute the SQL file
```

Or run manually:
```sql
-- Copy the entire SQL from: backend/migrations/001_create_parking_orders.sql
-- Paste and execute in your database
```

### Step 2: Environment Configuration

Update `backend/.env`:

```
FRONTEND_URL=http://localhost:9000        # Your frontend URL (localhost for development)
PORT=3000                                  # Backend port
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASS=your_database_password
DB_NAME=your_database_name
JWT_SECRET=your_jwt_secret

# WSpay Credentials (get from WSpay merchant dashboard)
# Leave as default for test mode; update when ready for production
WSPAY_MERCHANT_ID=YOUR_MERCHANT_ID         # Replace when you have WSpay account
WSPAY_KEY=YOUR_KEY                         # Replace when you have WSpay account
```

### Step 3: Test the Payment Flow

1. **Start your backend** (if not already running):
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **Start your frontend** (in a different terminal):
   ```bash
   npm start
   ```

3. **Test the payment flow**:
   - Navigate to: `http://localhost:9000/reservation-confirm`
   - Fill in reservation details
   - Click "PAY" button
   - You'll be redirected to the test payment page
   - Click either success or failure button
   - See the result on the payment callback page

---

## Payment Flow (Test Mode)

```
User clicks "PAY"
    ↓
Frontend validates reservation data
    ↓
Frontend calls: POST /api/payments/initiate
    ↓
Backend creates order record + generates test payment URL
    ↓
Frontend redirects to: /payment-test?orderId=...&bookingCode=...&amount=...
    ↓
User chooses: Simulate Success OR Simulate Failure
    ↓
Test page calls: POST /api/payments/verify
    ↓
Backend verifies and updates order status
    ↓
Redirects to: /payment-callback?code=...&Status=...
    ↓
PaymentCallbackPage verifies and shows result
    ↓
On success: Redirects to /payment-success with ticket
```

---

## WSpay Integration (When Ready)

### Step 1: Get WSpay Credentials

1. Visit [WSpay Developer Portal](https://www.wspay.com/developers/)
2. Create a merchant account
3. Get credentials:
   - Merchant ID
   - Merchant Key
   - Test Base URL: `https://test.wspay.com`
   - Production Base URL: `https://wspay.com`

### Step 2: Update Backend Configuration

Update `backend/.env`:
```
WSPAY_MERCHANT_ID=YOUR_MERCHANT_ID
WSPAY_KEY=YOUR_KEY
```

### Step 3: Implement WSpay Request Signing

In `backend/server.js`, add crypto module and signing function:

```javascript
const crypto = require('crypto');

function generateWSpaySignature(orderId, amount, key) {
  // WSpay signature format: MD5(OrderNumber + Amount + Key)
  const signString = orderId + amount + key;
  return crypto.createHash('md5').update(signString).digest('hex');
}
```

### Step 4: Update Payment Initiation Endpoint

Replace the mock payment URL with actual WSpay URL:

```javascript
// In POST /api/payments/initiate endpoint
const signature = generateWSpaySignature(orderId, amount, process.env.WSPAY_KEY);

const paymentUrl = 
  `https://test.wspay.com/checkout?` +
  `ShopID=${process.env.WSPAY_MERCHANT_ID}` +
  `&OrderNumber=${orderId}` +
  `&Amount=${amount}` +
  `&Currency=191` +
  `&Signature=${signature}` +
  `&ReturnURL=${encodeURIComponent(returnUrl)}` +
  `&NotifyURL=${encodeURIComponent(notifyUrl)}`;
```

### Step 5: Configure Callback URLs

In WSpay merchant dashboard, set:
- **ReturnURL**: `http://localhost:9000/payment-callback`
- **NotifyURL**: `http://192.168.146.153:3000/api/payments/notify`

(Update with your actual domain in production)

### Step 6: Test WSpay Integration

1. Switch frontend to production payment mode
2. Use WSpay test cards (provided in their documentation)
3. Complete test transactions
4. Verify orders appear in `parking_orders` table with `status='confirmed'`

---

## API Endpoints Reference

### POST /api/payments/initiate
Initiates a payment.

**Request:**
```json
{
  "bookingCode": "PKIT-2026-RE12345",
  "amount": 1500,
  "reservation": {
    "address": "Starčević - UL. Ante Starčevića 1, Rijeka",
    "spaceNumber": "7",
    "vehicle": "RI-123-AB",
    "date": "2026-03-22",
    "startTime": "13:00",
    "endTime": "15:00"
  }
}
```

**Response (Test Mode):**
```json
{
  "success": true,
  "orderId": "ORD-1705858234-abc123",
  "paymentUrl": "http://localhost:9000/payment-test?orderId=...",
  "bookingCode": "PKIT-2026-RE12345"
}
```

**Response (WSpay Mode):**
```json
{
  "success": true,
  "orderId": "ORD-1705858234-abc123",
  "paymentUrl": "https://test.wspay.com/checkout?ShopID=...",
  "bookingCode": "PKIT-2026-RE12345"
}
```

### POST /api/payments/verify
Verifies a payment (called after user returns from payment gateway).

**Request:**
```json
{
  "paymentCode": "ORD-1705858234-abc123",
  "status": "success",
  "transactionId": "TRX-123456"
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "TRX-123456",
  "orderId": "ORD-1705858234-abc123",
  "status": "approved"
}
```

### POST /api/payments/notify
Server-to-server notification from WSpay (optional, called by WSpay backend).

---

## Database Queries

### Get user's orders
```sql
SELECT * FROM parking_orders 
WHERE user_id = ? 
ORDER BY created_at DESC;
```

### Get confirmed reservations for today
```sql
SELECT * FROM parking_orders 
WHERE DATE(reservation_date) = CURDATE() 
AND status = 'confirmed';
```

### Get order details
```sql
SELECT * FROM parking_orders 
WHERE booking_code = ?;
```

---

## Troubleshooting

### "Failed to fetch" Error
- Check if backend is running on port 3000
- Verify FRONTEND_URL is correct in backend/.env
- Check browser console for exact error

### Payment page shows blank
- Ensure route `/payment-test` is added to router
- Check if PaymentTestPage.vue exists
- Verify authentication token is valid

### Order not saved to database
- Check if `parking_orders` table exists
- Verify database credentials in .env
- Check MySQL connection pool settings

### WSpay integration not working
- Verify Merchant ID and Key are correct
- Test signature generation algorithm
- Check transaction logs in WSpay dashboard
- Verify callback URLs are public (not localhost)

---

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit credentials** - Keep API keys in .env files, never in code
2. **HTTPS only** - Use HTTPS in production, never HTTP
3. **Validate amounts** - Always validate payment amounts on backend
4. **Signature verification** - Always verify WSpay signatures
5. **Rate limiting** - Add rate limiting to payment endpoints
6. **Audit logging** - Log all payment attempts for compliance

---

## Production Checklist

- [ ] Database migration applied
- [ ] WSpay merchant account created
- [ ] Credentials added to .env
- [ ] Return URLs configured in WSpay dashboard
- [ ] HTTPS enabled on frontend and backend
- [ ] Payment endpoint tested with real transactions
- [ ] Order confirmation emails implemented
- [ ] Payment logs reviewed
- [ ] Error handling tested
- [ ] Rate limiting added
- [ ] Audit logging configured
- [ ] Load testing performed

---

## Support Resources

- **WSpay Documentation**: https://www.wspay.com/en/developers/
- **WSpay Test Cards**: Provided in merchant dashboard
- **API Documentation**: See individual endpoint sections

---

## Next Steps

1. ✅ Run database migration
2. ✅ Update .env with FRONTEND_URL
3. ✅ Test payment flow in test mode
4. ⏭️ Get WSpay credentials
5. ⏭️ Implement WSpay signature generation
6. ⏭️ Update payment initiation endpoint
7. ⏭️ Test with WSpay test environment
8. ⏭️ Go live with production credentials
