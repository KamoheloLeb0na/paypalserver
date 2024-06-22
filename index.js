const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const paypal = require('@paypal/checkout-server-sdk');
const { v4: uuidv4 } = require('uuid');

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
  const { cardNumber, expiryDate, cardHolderName, cvvCode } = req.body;

  if (!cardNumber || !expiryDate || !cardHolderName || !cvvCode) {
    console.error("All card details are required");
    return res.status(400).send({ error: "All card details are required" });
  }

  try {
    // Create order
    const request = new paypal.orders.OrdersCreateRequest();
    request.headers["PayPal-Request-Id"] = uuidv4(); // Add a unique PayPal-Request-Id
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: '15.00'
        }
      }],
      payment_source: {
        card: {
          number: cardNumber,
          expiry: expiryDate.replace(/-/g, ""), // Remove any dashes from expiryDate
          name: cardHolderName,
          security_code: cvvCode
        }
      }
    });

    const order = await client.execute(request);
    res.send({ success: true, orderID: order.result.id });
  } catch (error) {
    console.error("Error creating PayPal order:", error);
    res.status(500).send({ error: error.message });
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
    res.status(500).send({ error: error.message });
  }
});

// Listen on the appropriate port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
