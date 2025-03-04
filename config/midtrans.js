/**
 * Konfigurasi Midtrans
 */

module.exports = {
    isProduction: process.env.NODE_ENV === 'production',
    clientKey: process.env.MIDTRANS_CLIENT_KEY || 'SB-Mid-client-xxxxxxxxxxxxxxxx',
    serverKey: process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-xxxxxxxxxxxxxxxx',
    merchantId: process.env.MIDTRANS_MERCHANT_ID || 'XXXXXXXXXX',
    
    // Endpoints
    getSnapURL: function() {
        return this.isProduction 
            ? 'https://app.midtrans.com/snap/v1/transactions'
            : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
    },
    
    getApiURL: function() {
        return this.isProduction
            ? 'https://api.midtrans.com'
            : 'https://api.sandbox.midtrans.com';
    },
    
    // Get basic auth token
    getAuthString: function() {
        const authString = Buffer.from(this.serverKey + ':').toString('base64');
        return `Basic ${authString}`;
    }
};