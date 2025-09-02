// --- Netlify Function: /netlify/functions/api-proxy.js ---
// This function dynamically fetches API provider details from Firestore.

import admin from 'firebase-admin';

// Global variables that will be populated once
let db;
let apiProvidersCache = null;

const initializeLibraries = async () => {
  if (db) return;

  // Initialize Firebase Admin SDK
  try {
    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
      throw new Error("Missing one or more required Firebase Admin environment variables.");
    }
    
    // Check if a Firebase app has already been initialized to prevent multiple initializations.
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          // The private key may contain literal `\n` characters which need to be replaced with actual newlines
          privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
    }
  } catch (e) {
    console.error('Firebase Admin initialization error:', e);
    throw new Error('Server configuration error: Firebase Admin not initialized.');
  }
  db = admin.firestore();
};

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
  await initializeLibraries();
  
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
      'Content-Type': 'application/json',
    };

    const options = {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined,
    };
    
    // Use native Node.js fetch API for robust compatibility
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
