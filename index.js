const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const paypal = require('@paypal/checkout-server-sdk');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (ensure it only initializes once)
if (!admin.apps.length) {
  const serviceAccount = require('./path_to_your_service_account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// PayPal configuration
const environment = new paypal.core.SandboxEnvironment('YOUR_PAYPAL_CLIENT_ID', 'YOUR_PAYPAL_SECRET_KEY');
const client = new paypal.core.PayPalHttpClient(environment);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Endpoint for payment validation
app.post("/checkout", async (req, res) => {
  const { payment_method_nonce, start_date, end_date, tier, amount, location } = req.body;

  if (!payment_method_nonce) {
    console.error("Payment method nonce is required");
    return res.status(400).send({ error: "Payment method nonce is required" });
  }

  try {
    // Create PayPal order
    const request = new paypal.orders.OrdersCreateRequest();
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: amount.toString(),
        },
      }],
    });

    const order = await client.execute(request);
    
    // Capture payment after creating order
    const captureRequest = new paypal.orders.OrdersCaptureRequest(order.result.id);
    const capture = await client.execute(captureRequest);

    if (capture.status === "COMPLETED") {
      // Store gig data in Firestore
      const email = capture.result.payer.email_address;

      const gigData = {
        email: email,
        status: false,
        personnel: null,
        complete: false,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        tier: tier,
        amount: amount,
        location: location,
      };

      // Save gig data to Firestore
      await db.collection('gigs').add(gigData);

      res.send({ success: true, orderID: order.result.id, message: 'Payment processed and gig saved.' });
    } else {
      res.status(400).send({ error: 'Payment capture failed.' });
    }
  } catch (error) {
    console.error("Error during PayPal order processing:", error);
    res.status(500).send({ error: 'Internal server error', message: error.message });
  }
});

// Route to show "Arbitrex server"
app.get("/", (req, res) => {
  res.send("Flutter app Arbitrex server is running");
});

// Listen on the appropriate port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
