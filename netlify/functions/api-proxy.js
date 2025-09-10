// --- CORRECTED Netlify Function: /netlify/functions/api-proxy.js ---
// This version uses a consistent ES Module import style to prevent runtime errors.

export async function handler(event, context) {
    // Dynamically import dependencies using a modern ES Module approach
    const { default: admin } = await import('firebase-admin');
    const { default: fetch } = await import('node-fetch');

    // Initialize Firebase Admin SDK (ensuring it only runs once)
    if (!admin.apps.length) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                }),
            });
        } catch (e) {
            console.error('Firebase Admin initialization error:', e);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Server configuration error.' })
            };
        }
    }

    const db = admin.firestore();

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { authorization } = event.headers;
        const idToken = authorization?.split('Bearer ')[1];
        
        if (!idToken) {
            // For guest actions, we don't need a token, so we proceed.
            // A check will be done within the switch case for protected actions.
        } else {
            // If a token is provided, verify it.
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            // You can use decodedToken.uid if needed for protected routes.
        }
        
        const { action, payload } = JSON.parse(event.body);

        // Fetch API provider details from Firestore
        const providerRef = db.collection('api_providers').doc(payload.provider || '5sim');
        const providerDoc = await providerRef.get();
        if (!providerDoc.exists) {
            return { statusCode: 404, body: JSON.stringify({ error: `API provider '${payload.provider || '5sim'}' not found.` }) };
        }
        const providerData = providerDoc.data();
        
        let apiUrl = '';
        let apiHeaders = {};
        let responseData;
        
        switch (action) {
            case 'getOperatorsAndPrices': {
                const { country, product } = payload;
                apiUrl = `${providerData.baseUrl}/guest/prices?country=${country}&product=${product}`;
                apiHeaders = { 'Accept': 'application/json' };
                const apiResponse = await fetch(apiUrl, { headers: apiHeaders });
                 if (!apiResponse.ok) {
                    const errorText = await apiResponse.text();
                    throw new Error(`External API Error: ${apiResponse.status} ${apiResponse.statusText} - ${errorText}`);
                }
                responseData = await apiResponse.json();
                break;
            }

            case 'buyNumber': {
                 // This is a protected action, ensure token was valid
                if (!idToken) return { statusCode: 401, body: JSON.stringify({ error: 'Authentication is required for this action.' }) };
                const { service, server, operator } = payload;
                apiUrl = `${providerData.baseUrl}/user/buy/activation/${server.name}/${operator.name}/${service.name.toLowerCase()}`;
                apiHeaders = {
                    'Authorization': `Bearer ${providerData.apiKey}`,
                    'Accept': 'application/json'
                };
                const apiResponse = await fetch(apiUrl, { headers: apiHeaders });
                responseData = await apiResponse.json();
                break;
            }

            case 'checkOrder': {
                if (!idToken) return { statusCode: 401, body: JSON.stringify({ error: 'Authentication is required for this action.' }) };
                const { orderId } = payload;
                apiUrl = `${providerData.baseUrl}/user/check/${orderId}`;
                apiHeaders = {
                    'Authorization': `Bearer ${providerData.apiKey}`,
                    'Accept': 'application/json'
                };
                const apiResponse = await fetch(apiUrl, { headers: apiHeaders });
                responseData = await apiResponse.json();
                break;
            }
                
            case 'cancelOrder': {
                if (!idToken) return { statusCode: 401, body: JSON.stringify({ error: 'Authentication is required for this action.' }) };
                apiUrl = `${providerData.baseUrl}/user/cancel/${payload.orderId}`;
                apiHeaders = {
                    'Authorization': `Bearer ${providerData.apiKey}`,
                    'Accept': 'application/json'
                };
                const apiResponse = await fetch(apiUrl, { headers: apiHeaders });
                responseData = await apiResponse.json();
                break;
            }
                
            case 'finishOrder': {
                if (!idToken) return { statusCode: 401, body: JSON.stringify({ error: 'Authentication is required for this action.' }) };
                apiUrl = `${providerData.baseUrl}/user/finish/${payload.orderId}`;
                apiHeaders = {
                    'Authorization': `Bearer ${providerData.apiKey}`,
                    'Accept': 'application/json'
                };
                const apiResponse = await fetch(apiUrl, { headers: apiHeaders });
                responseData = await apiResponse.json();
                break;
            }
          
            default:
                return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action specified.' }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(responseData),
        };

    } catch (error) {
        console.error('API Proxy error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'An internal error occurred.' }),
        };
    }
}
