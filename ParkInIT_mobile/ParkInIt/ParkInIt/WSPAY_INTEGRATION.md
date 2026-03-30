# WSpay Payment Gateway Integration Guide

## Overview
This guide explains how to integrate WSpay payment gateway with ParkInIT application.

## Prerequisites
- WSpay merchant account
- Merchant ID and Key from WSpay
- Backend API server (Node.js, Express, or similar)

## Configuration

### 1. WSpay Credentials
Get your credentials from WSpay dashboard:
- `MERCHANT_ID`: Your merchant identifier
- `KEY`: Your merchant key
- `TEST_MODE`: true (for testing), false (for production)

### 2. Update Frontend Configuration
In `ReservationConfirmPage.vue`, update:
```javascript
const WSPAY_MERCHANT_ID = 'YOUR_MERCHANT_ID'
const WSPAY_KEY = 'YOUR_KEY'
const WSPAY_PAYMENT_URL = 'https://test.wspay.com/checkout' // Test or production URL
```

### 3. Update Callback URL
In your WSpay dashboard, set the return URLs:
- Success URL: `https://yourapp.com/payment-callback?success=true`
- Failure URL: `https://yourapp.com/payment-callback?success=false`
- Notify URL: `https://yourapp.com/api/payments/notify` (server-to-server)

## Backend API Endpoints

Your backend needs to implement these endpoints:

### 1. POST /api/payments/initiate
Initiates a WSpay payment session.

**Request:**
```json
{
  "bookingCode": "PKIT-2026-RE12345",
  "amount": 1500,
  "description": "Parking Reservation - Starčević - Space 7",
  "reservation": {
    "bookingCode": "PKIT-2026-RE12345",
    "date": "2026-03-22",
    "startTime": "13:00",
    "endTime": "15:00",
    "vehicle": "RI-123-AB",
    "spaceNumber": "7",
    "location": "Starčević",
    "isDisabledSpace": false,
    "totalPrice": 15.00
  }
}
```

**Response:**
```json
{
  "success": true,
  "paymentUrl": "https://test.wspay.com/checkout?order=...",
  "orderId": "ORDER-123456"
}
```

### 2. POST /api/payments/verify
Verifies payment after WSpay callback.

**Request:**
```json
{
  "paymentCode": "123456",
  "status": "success",
  "transactionId": "TRX-123456"
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "TRX-123456",
  "amount": 1500,
  "status": "approved"
}
```

### 3. POST /api/payments/notify (Server-to-Server)
WSpay notifies your server about payment status (optional but recommended).

## Example Backend Implementation (Node.js/Express)

```javascript
// Import necessary libraries
const crypto = require('crypto');
const express = require('express');
const router = express.Router();

const WSPAY_MERCHANT_ID = process.env.WSPAY_MERCHANT_ID;
const WSPAY_KEY = process.env.WSPAY_KEY;

// Helper function to generate WSPAY digest
function generateDigest(authorizationCode, data, key) {
  const digestString = authorizationCode + data + key;
  return crypto.createHash('md5').update(digestString).digest('hex');
}

// POST /api/payments/initiate
router.post('/initiate', async (req, res) => {
  try {
    const { bookingCode, amount, description, reservation } = req.body;
    
    // Generate unique order ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare WSPAY request
    const wspayRequest = {
      ShopID: WSPAY_MERCHANT_ID,
      OrderNumber: orderId,
      Amount: amount,
      Signature: generateDigest('', orderId + amount, WSPAY_KEY),
      Currency: 191, // EUR currency code
      ReturnURL: process.env.PAYMENT_RETURN_URL,
      NotifyURL: process.env.PAYMENT_NOTIFY_URL,
      Timeout: 900, // 15 minutes
      Language: 'HR',
      ChargebackProtectionUrl: process.env.CHARGEBACK_URL
    };

    // Save order/reservation in database
    const reservation_saved = await Reservation.create({
      booking_code: bookingCode,
      order_id: orderId,
      amount: amount / 100,
      user_id: req.user.id,
      parking_space_id: reservation.spaceNumber,
      start_time: reservation.startTime,
      end_time: reservation.endTime,
      reservation_date: reservation.date,
      vehicle: reservation.vehicle,
      status: 'pending_payment',
      metadata: JSON.stringify(reservation)
    });

    // Construct WSPAY payment URL
    const paymentUrl = `${process.env.WSPAY_URL}?${Object.keys(wspayRequest)
      .map(key => `${key}=${encodeURIComponent(wspayRequest[key])}`)
      .join('&')}`;

    res.json({
      success: true,
      paymentUrl,
      orderId
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error.message
    });
  }
});

// POST /api/payments/verify
router.post('/verify', async (req, res) => {
  try {
    const { paymentCode, status, transactionId } = req.body;

    // Find reservation by payment code
    const reservation = await Reservation.findOne({
      where: { order_id: paymentCode }
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    // Update reservation status
    if (status === 'success' || status === 'approved') {
      await reservation.update({
        status: 'confirmed',
        transaction_id: transactionId,
        payment_confirmed_at: new Date()
      });

      // Generate ticket/e-card
      // Send confirmation email with e-card
      // Update parking space availability

      res.json({
        success: true,
        transactionId,
        bookingCode: reservation.booking_code,
        status: 'approved'
      });
    } else {
      await reservation.update({
        status: 'payment_failed'
      });

      res.json({
        success: false,
        message: 'Payment was not successful',
        status: 'declined'
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed',
      error: error.message
    });
  }
});

// POST /api/payments/notify (Server-to-Server notification from WSPAY)
router.post('/notify', async (req, res) => {
  try {
    const { ShopID, OrderNumber, Amount, Signature, AuthorizationCode } = req.body;

    // Verify signature
    const expectedSignature = generateDigest(
      AuthorizationCode,
      OrderNumber + Amount,
      WSPAY_KEY
    );

    if (Signature !== expectedSignature) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    // Find and update reservation
    const reservation = await Reservation.findOne({
      where: { order_id: OrderNumber }
    });

    if (reservation) {
      await reservation.update({
        status: 'confirmed',
        authorization_code: AuthorizationCode,
        payment_confirmed_at: new Date()
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Notify error:', error);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
```

## Router Configuration

Add the payment callback route to your Vue Router configuration (`router/routes.js` or similar):

```javascript
{
  path: '/payment-callback',
  component: () => import('pages/PaymentCallbackPage.vue'),
  meta: { requiresAuth: true }
}
```

## Environment Variables

Create a `.env` file with:

```
WSPAY_MERCHANT_ID=YOUR_MERCHANT_ID
WSPAY_KEY=YOUR_KEY
WSPAY_URL=https://test.wspay.com/checkout
PAYMENT_RETURN_URL=https://yourapp.com/payment-callback
PAYMENT_NOTIFY_URL=https://api.yourapp.com/api/payments/notify
CHARGEBACK_URL=https://yourapp.com/chargeback
```

## Testing

### Test Cards (WSpay)
- Success: VISA test card number (provided by WSpay)
- Decline: Decline test card number (provided by WSpay)

### Test Flow
1. Fill in reservation details
2. Click "PAY" button
3. You'll be redirected to WSpay test payment page
4. Use test card credentials
5. After payment, you'll be redirected back to `/payment-callback`
6. The app will verify the payment and show success page

## Production Deployment

1. Switch WSPAY_URL to production: `https://wspay.com/checkout`
2. Update MERCHANT_ID and KEY to production credentials
3. Test thoroughly in staging environment
4. Update callback URLs to production domain
5. Monitor payment logs and implement retry logic for failed verifications

## Troubleshooting

### Common Issues
- **Invalid Signature**: Verify WSPAY_KEY and that you're using correct digest algorithm
- **Payment URL not generated**: Check MERCHANT_ID format
- **Callback not received**: Verify callback URLs are publicly accessible
- **Transaction verification fails**: Ensure backend can access WSpay API

### Logs to Monitor
- Payment initiation attempts
- WSpay callback requests
- Signature verification results
- Database update operations

## Support

For WSpay-specific issues, contact:
- WSpay Support: support@wspay.com
- Documentation: https://www.wspay.com/en/developers/
