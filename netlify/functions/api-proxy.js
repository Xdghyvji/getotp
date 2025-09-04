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

const db = admin.firestore();

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

        // Fetch API credentials from Firestore
        const providerRef = db.collection('api_providers').doc(payload.provider || '5sim');
        const providerDoc = await providerRef.get();
        if (!providerDoc.exists) {
            return { statusCode: 404, body: JSON.stringify({ error: `API provider '${payload.provider || '5sim'}' not found.` }) };
        }
        const providerData = providerDoc.data();
        const apiKey = providerData.apiKey;
        const baseUrl = providerData.baseUrl;

        let apiUrl = '';
        const apiHeaders = {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
        };

        let responseData;
        
        switch (action) {
            case 'getPrices':
                // Endpoint: /v1/guest/prices?country=$country&product=$product
                const { country, product } = payload;
                const priceQuery = new URLSearchParams();
                if (country) priceQuery.append('country', country);
                if (product) priceQuery.append('product', product);
                apiUrl = `${baseUrl}/guest/prices?${priceQuery.toString()}`;
                responseData = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } }).then(res => res.json());
                break;

            case 'buyNumber':
                // Endpoint: /v1/user/buy/activation/$country/$operator/$product
                const { service, server, operator } = payload;
                apiUrl = `${baseUrl}/user/buy/activation/${server.name}/${operator.name}/${service.name.toLowerCase()}`;
                responseData = await fetch(apiUrl, { headers: apiHeaders }).then(res => res.json());
                break;

            case 'checkOrder':
                // Endpoint: /v1/user/check/$id
                const { orderId } = payload;
                apiUrl = `${baseUrl}/user/check/${orderId}`;
                responseData = await fetch(apiUrl, { headers: apiHeaders }).then(res => res.json());
                break;
                
            case 'cancelOrder':
                // Endpoint: /v1/user/cancel/$id
                apiUrl = `${baseUrl}/user/cancel/${payload.orderId}`;
                responseData = await fetch(apiUrl, { headers: apiHeaders }).then(res => res.json());
                break;
                
            case 'finishOrder':
                // Endpoint: /v1/user/finish/$id
                apiUrl = `${baseUrl}/user/finish/${payload.orderId}`;
                responseData = await fetch(apiUrl, { headers: apiHeaders }).then(res => res.json());
                break;
            
            case 'syncProviderData':
                const vendorApiKey = providerData.vendorApiKey;
                if (!vendorApiKey) {
                    throw new Error('FIVESIM_VENDOR_API_KEY is not set for this provider in Firestore.');
                }
                const vendorHeaders = { 'Authorization': `Bearer ${vendorApiKey}`, 'Accept': 'application/json' };
                
                const pricesResponse = await fetch(`${baseUrl}/vendor/prices`, { headers: vendorHeaders });
                const countriesResponse = await fetch(`${baseUrl}/guest/countries`, { headers: { 'Accept': 'application/json' } });
                
                if (!pricesResponse.ok || !countriesResponse.ok) {
                    const errorText = await (pricesResponse.ok ? countriesResponse.text() : pricesResponse.text());
                    throw new Error(`Failed to fetch data from provider: ${pricesResponse.status} - ${errorText}`);
                }
                
                const pricesData = await pricesResponse.json();
                const countriesData = await countriesResponse.json();

                const batch = db.batch();
                
                // 1. Process and save services
                const servicesCollectionRef = db.collection('services');
                const uniqueServices = new Set();
                pricesData.Prices.forEach(price => uniqueServices.add(price.ProductName));
        
                for (const serviceName of Array.from(uniqueServices)) {
                    const serviceRef = servicesCollectionRef.doc(serviceName);
                    batch.set(serviceRef, {
                        name: serviceName,
                        icon: null,
                        provider: providerData.name,
                        status: 'active',
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });
                }
        
                // 2. Process and save countries (servers)
                const serversCollectionRef = db.collection('servers');
                const servers = Object.keys(countriesData).map(key => ({
                    name: key,
                    location: countriesData[key].text_en,
                    iso: Object.keys(countriesData[key].iso)[0],
                    status: 'active',
                }));
                
                servers.forEach(server => {
                    const serverRef = serversCollectionRef.doc(server.name);
                    batch.set(serverRef, server, { merge: true });
                });
        
                await batch.commit();

                return { message: `Successfully synced ${uniqueServices.size} services and ${servers.length} countries.` };

            default:
                return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action specified.' }) };
        }

        // Return a response for successful calls that don't need to be handled above
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
