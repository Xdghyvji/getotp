// Netlify Function: functions/api-proxy.js
// Description: Securely forwards requests to third-party OTP providers.

const fetch = require('node-fetch');
const admin = require('firebase-admin');

// --- Initialize Firebase Admin SDK ---
try {
  if (!admin.apps.length) {
    // This requires a different setup for environment variables.
    // You must Base64-encode your entire Firebase service account JSON file
    // and store it as a single variable: FIREBASE_SERVICE_ACCOUNT_KEY_BASE64
    const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64, 'base64').toString('utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (e) {
  console.error('Firebase Admin initialization error:', e);
}

const db = admin.firestore();

// --- Function to get API providers from Firestore ---
async function getApiProviders() {
  const providersSnapshot = await getDocs(collection(db, 'api_providers'));
  return providersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  if (!admin.apps.length) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error: Firebase not initialized.' }) };
  }

  try {
    // 1. Parse request from your frontend
    const { providerName, endpoint, method = 'GET', body = null } = JSON.parse(event.body);

    if (!providerName || !endpoint) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Provider name and endpoint are required.' }) };
    }

    // 2. Fetch provider details securely from Firestore
    const providers = await getApiProviders();
    const targetProvider = providers.find(p => p.name === providerName);

    if (!targetProvider) {
      return { statusCode: 404, body: JSON.stringify({ error: `Provider configuration not found: ${providerName}` }) };
    }
    
    const { apiKey, baseUrl } = targetProvider;
    const apiUrl = `${baseUrl}${endpoint}`;
    
    // 3. Prepare and make the request to the third-party API
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    };

    const options = {
      method: method,
      headers: headers,
    };

    if (method !== 'GET' && body) {
      options.body = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(apiUrl, options);
    const data = await response.json();

    // 4. Return the response from the third-party API to your frontend
    return {
      statusCode: response.status,
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error('API Proxy Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'An internal server error occurred.' }) };
  }
};
