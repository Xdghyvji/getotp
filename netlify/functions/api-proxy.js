// --- ROBUST Netlify Function: for Admin Panel ---
// This version uses 'axios' for stable and reliable HTTP requests.

const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin SDK
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
let apiProvidersCache = null;

async function getApiProviders() {
    if (apiProvidersCache) return apiProvidersCache;
    const providersSnapshot = await db.collection('api_providers').get();
    const providers = providersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    apiProvidersCache = providers;
    setTimeout(() => { apiProvidersCache = null; }, 300000); // Cache for 5 minutes
    return providers;
}

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  if (!admin.apps.length) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error.' }) };
  }

  try {
    const { provider, endpoint, method = 'GET', body = null } = JSON.parse(event.body);

    if (!provider || !endpoint) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Provider and endpoint are required.' }) };
    }

    const providers = await getApiProviders();
    const targetProvider = providers.find(p => p.name === provider);

    if (!targetProvider) {
      return { statusCode: 400, body: JSON.stringify({ error: `Unsupported provider: ${provider}` }) };
    }
    
    const { apiKey, baseUrl } = targetProvider;
    const apiUrl = `${baseUrl}${endpoint}`;
    
    const config = {
      method: method.toLowerCase(),
      url: apiUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      }
    };

    if (method.toUpperCase() !== 'GET' && body) {
      config.data = body;
      config.headers['Content-Type'] = 'application/json';
    }

    const response = await axios(config);

    return {
      statusCode: response.status,
      body: JSON.stringify(response.data),
    };

  } catch (error) {
    console.error('Admin Proxy Error:', error.response ? error.response.data : error.message);
    return { 
        statusCode: error.response ? error.response.status : 500,
        body: JSON.stringify({ error: error.response ? error.response.data : 'An internal server error occurred.' }) 
    };
  }
};
