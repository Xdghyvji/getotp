// Netlify Scheduled Function: functions/cleanup-orders.js
// Description: Runs on a schedule to find and mark expired orders.
// To schedule this, add the following to your `netlify.toml` file:
// [functions]
//   [functions.cleanup-orders]
//   schedule = "*/5 * * * *" 

const admin = require('firebase-admin');

// --- Initialize Firebase Admin SDK ---
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }
} catch (e) {
  console.error('Firebase admin initialization error', e);
}

const db = admin.firestore();

exports.handler = async function() {
  console.log("Running scheduled job: cleanup-orders");

  try {
    const now = new Date();
    
    // 1. Query for all PENDING orders across all users where the expiry time is in the past
    const expiredOrdersQuery = db.collectionGroup('orders')
      .where('status', '==', 'PENDING')
      .where('expires', '<=', now);

    const snapshot = await expiredOrdersQuery.get();

    if (snapshot.empty) {
      console.log("No expired orders found.");
      return { statusCode: 200, body: "No expired orders found." };
    }

    // 2. Create a batch write to update all found documents efficiently
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      console.log(`Marking order ${doc.id} as EXPIRED.`);
      batch.update(doc.ref, { status: 'EXPIRED' });
    });

    // 3. Commit the batch update
    await batch.commit();

    console.log(`Successfully processed ${snapshot.size} expired orders.`);
    return {
      statusCode: 200,
      body: `Successfully processed ${snapshot.size} expired orders.`,
    };

  } catch (error) {
    console.error('Error during cleanup-orders job:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process expired orders.' }),
    };
  }
};
