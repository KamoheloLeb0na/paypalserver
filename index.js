const admin = require('firebase-admin');
const express = require('express');
const serviceAccount = require('./config/arbitrex.json'); // Replace with the path to your service account key

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();
const app = express();

// Endpoint to check server status
app.get('/', (req, res) => {
  res.send('Server running');
});

// Function to update 'uid' field in a document
async function updateUidField(doc) {
  try {
    if (!doc.data().hasOwnProperty('uid')) {
      // Add 'uid' field with null value
      await doc.ref.set({ uid: null }, { merge: true });
      console.log(`Added 'uid' field to document ${doc.id}`);
    }
  } catch (error) {
    console.error('Error updating document:', error);
  }
}

// Real-time listener for 'posts' collection
firestore.collection('posts').onSnapshot((snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === 'added') {
      // Document added, update 'uid' field
      updateUidField(change.doc);
    }
  });
});

// Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
