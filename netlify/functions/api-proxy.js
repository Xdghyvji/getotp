const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
    });
}

// Handler for the Netlify Function
exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { authorization } = event.headers;
        const idToken = authorization?.split('Bearer ')[1];
        
        if (!idToken) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Authentication token is required.' }) };
        }
        
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;
        
        const { action, payload } = JSON.parse(event.body);

        let apiUrl = '';
        let apiHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.FIVESIM_API_KEY}`,
            'Accept': 'application/json'
        };

        let responseData;
        
        switch (action) {
            case 'getPrices':
                // Endpoint: /v1/guest/prices?country=$country&product=$product
                // Note: guest endpoints do not require the Authorization header
                const { country, product } = payload;
                const priceQuery = new URLSearchParams();
                if (country) priceQuery.append('country', country);
                if (product) priceQuery.append('product', product);
                apiUrl = `https://5sim.net/v1/guest/prices?${priceQuery.toString()}`;
                apiHeaders = { 'Accept': 'application/json' };
                responseData = await fetch(apiUrl, { headers: apiHeaders }).then(res => res.json());
                break;

            case 'buyNumber':
                // Endpoint: /v1/user/buy/activation/$country/$operator/$product
                const { service, server, operator } = payload;
                apiUrl = `https://5sim.net/v1/user/buy/activation/${server.name}/${operator.name}/${service.name.toLowerCase()}`;
                responseData = await fetch(apiUrl, { headers: apiHeaders }).then(res => res.json());
                break;

            case 'checkOrder':
                // Endpoint: /v1/user/check/$id
                const { orderId } = payload;
                apiUrl = `https://5sim.net/v1/user/check/${orderId}`;
                responseData = await fetch(apiUrl, { headers: apiHeaders }).then(res => res.json());
                break;
                
            case 'cancelOrder':
                // Endpoint: /v1/user/cancel/$id
                apiUrl = `https://5sim.net/v1/user/cancel/${payload.orderId}`;
                responseData = await fetch(apiUrl, { headers: apiHeaders }).then(res => res.json());
                break;
                
            case 'finishOrder':
                // Endpoint: /v1/user/finish/$id
                apiUrl = `https://5sim.net/v1/user/finish/${payload.orderId}`;
                responseData = await fetch(apiUrl, { headers: apiHeaders }).then(res => res.json());
                break;

            default:
                return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action specified.' }) };
        }

        // Check for common API errors from 5sim.net
        if (responseData && responseData.status === '400') {
             throw new Error(responseData.error || '5sim.net API returned an error.');
        }``

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
};
