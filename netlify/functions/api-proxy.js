// --- STABLE Netlify Function: /netlify/functions/api-proxy.js (for Admin Panel) ---
// This version uses Node.js's native fetch and removes the external 'node-fetch' dependency.

const admin = require('firebase-admin');

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
    if (apiProvidersCache) {
        return apiProvidersCache;
    }
    
    const providersSnapshot = await db.collection('api_providers').get();
    const providers = providersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    apiProvidersCache = providers;
    setTimeout(() => { apiProvidersCache = null; }, 300000); 

    return providers;
}

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  if (!admin.apps.length) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error: Firebase Admin not initialized.' }) };
  }

  try {
    const { provider, endpoint, method = 'GET', body = null } = JSON.parse(event.body);

    if (!provider || !endpoint) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Provider and endpoint are required.' }) };
    }

    const providers = await getApiProviders();
    const targetProvider = providers.find(p => p.name === provider);

    if (!targetProvider) {
      return { statusCode: 400, body: JSON.stringify({ error: `Unsupported or unconfigured provider: ${provider}` }) };
    }
    
    const { apiKey, baseUrl } = targetProvider;
    const apiUrl = `${baseUrl}${endpoint}`;
    
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
