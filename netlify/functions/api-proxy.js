// --- Netlify Function: /netlify/functions/api-proxy.js ---
// This function dynamically fetches API provider details from Firestore.

// You need to add firebase-admin and node-fetch to your project's dependencies.
// Run in your terminal: npm install firebase-admin node-fetch
const fetch = require('node-fetch');
const admin = require('firebase-admin');

// --- Initialize Firebase Admin SDK ---
// IMPORTANT: You must create a service account key in your Firebase project settings.
// Then, you need to Base64-encode the entire JSON file content and store it
// as a single environment variable in Netlify named: FIREBASE_SERVICE_ACCOUNT_KEY_BASE64
try {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64, 'base64').toString('utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (e) {
  console.error('Firebase Admin initialization error:', e);
}

const db = admin.firestore();
let apiProvidersCache = null; // Cache providers to reduce Firestore reads on every call

// --- Function to get (and cache) API providers from Firestore ---
async function getApiProviders() {
    // Use cached data if it exists and is less than 5 minutes old
    if (apiProvidersCache) {
        return apiProvidersCache;
    }
    
    console.log('Fetching API providers from Firestore...');
    const providersSnapshot = await db.collection('api_providers').get();
    const providers = providersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Store in cache
    apiProvidersCache = providers;
    
    // Optional: Clear cache after 5 minutes to fetch fresh data
    setTimeout(() => { apiProvidersCache = null; }, 300000); 

    return providers;
}


exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // Check if Firebase Admin SDK was initialized correctly
  if (!admin.apps.length) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error: Firebase Admin not initialized.' }) };
  }

  try {
    const { provider, endpoint, method = 'GET', body = null } = JSON.parse(event.body);

    if (!provider || !endpoint) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Provider and endpoint are required.' }) };
    }

    // Fetch all providers from Firestore (or cache)
    const providers = await getApiProviders();
    const targetProvider = providers.find(p => p.name === provider);

    if (!targetProvider) {
      return { statusCode: 400, body: JSON.stringify({ error: `Unsupported or unconfigured provider: ${provider}` }) };
    }
    
    const { apiKey, baseUrl } = targetProvider;
    const apiUrl = `${baseUrl}${endpoint}`;
    
    // --- DEBUGGING IMPROVEMENT: Log the exact URL being called ---
    console.log(`Making API call to: ${method} ${apiUrl}`);

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

    return {
      statusCode: response.status,
      body: JSON.stringify(data),
    };

  } catch (error) {
    console.error('Proxy Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'An internal server error occurred.' }) };
  }
};
