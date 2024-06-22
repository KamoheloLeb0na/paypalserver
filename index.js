const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const paypal = require('@paypal/checkout-server-sdk');

// PayPal configuration
const environment = new paypal.core.SandboxEnvironment('ASr-GgV6hNF9M_QqkXswue7HNctkVyHZscapjYTQO59AaTceomyBN8BndAmJakKRa3TozzhUrViQs4e6', 'EC3qcpsmN1ldM2XkC_1K-9qzWJa8KwekwjQ9DoF4tKnURq3QgbK36U4Feyuotg8bvxAc-M2vtHMbJu3T');
const client = new paypal.core.PayPalHttpClient(environment);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.get("/client_token", (req, res) => {
  res.send({ clientId: 'ASr-GgV6hNF9M_QqkXswue7HNctkVyHZscapjYTQO59AaTceomyBN8BndAmJakKRa3TozzhUrViQs4e6' });
});

app.post("/checkout", async (req, res) => {
  const { payment_method_nonce } = req.body;
  const planId = "P-6PR072875L842443BMZ26M6Y"; // Your PayPal plan ID

  if (!payment_method_nonce) {
    console.error("Payment method nonce is required");
    return res.status(400).send({ error: "Payment method nonce is required" });
  }

  try {
    // Create order
    const request = new paypal.orders.OrdersCreateRequest();
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: '1.00'
        }
      }]
    });

    const order = await client.execute(request);
    res.send({ success: true, orderID: order.result.id });
  } catch (error) {
    console.error("Error creating PayPal order:", error);
    res.status(500).send(error);
  }
});

// Route to show "Arbitrex server"
app.get("/", (req, res) => {
  res.send("Flutter app Arbitrex server");
});

// Check subscription status
app.get("/subscription_status/:subscriptionId", async (req, res) => {
  const subscriptionId = req.params.subscriptionId;

  try {
    const request = new paypal.subscriptions.SubscriptionsGetRequest(subscriptionId);
    const subscription = await client.execute(request);

    if (subscription.statusCode === 200) {
      res.send({ nextBillingDate: subscription.result.billing_info.next_billing_time });
    } else {
      res.status(404).send({ error: "No subscriptions found" });
    }
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    res.status(500).send(error);
  }
});

// Listen on the appropriate port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
