/**
 * Utility untuk mengirim email
 */

const nodemailer = require('nodemailer');
const emailConfig = require('../config/email');

let transporter;

module.exports = {
    init: () => {
        transporter = nodemailer.createTransport({
            host: emailConfig.host,
            port: emailConfig.port,
            secure: emailConfig.secure,
            auth: {
                user: emailConfig.auth.user,
                pass: emailConfig.auth.pass
            }
        });
    },
    
    /**
     * Send OTP email
     * @param {string} email - Recipient email
     * @param {string} otp - OTP code
     * @returns {Promise} Email sending result
     */
    sendOTPEmail: async (email, otp) => {
        if (!transporter) module.exports.init();
        
        const mailOptions = {
            from: `"XtremeSoft V4.0" <${emailConfig.auth.user}>`,
            to: email,
            subject: 'Kode Verifikasi XtremeSoft V4.0',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #f0800c;">XtremeSoft V4.0</h2>
                    </div>
                    <p>Halo,</p>
                    <p>Terima kasih telah mendaftar di XtremeSoft V4.0. Berikut adalah kode verifikasi Anda:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; padding: 10px; background-color: #f5f5f5; border-radius: 5px; display: inline-block;">${otp}</div>
                    </div>
                    <p>Kode verifikasi ini berlaku selama 10 menit.</p>
                    <p>Jika Anda tidak melakukan pendaftaran di XtremeSoft V4.0, silakan abaikan email ini.</p>
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                        <p style="font-size: 12px; color: #777;">Email ini dikirim secara otomatis, mohon untuk tidak membalas email ini.</p>
                    </div>
                </div>
            `
        };
        
        return transporter.sendMail(mailOptions);
    },
    
    /**
     * Send registration success email
     * @param {string} email - Recipient email
     * @param {Object} subscriptionData - Subscription data
     * @returns {Promise} Email sending result
     */
    sendRegistrationSuccessEmail: async (email, subscriptionData) => {
        if (!transporter) module.exports.init();
        
        const mailOptions = {
            from: `"XtremeSoft V4.0" <${emailConfig.auth.user}>`,
            to: email,
            subject: 'Selamat Datang di XtremeSoft V4.0',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #f0800c;">XtremeSoft V4.0</h2>
                    </div>
                    <p>Halo,</p>
                    <p>Terima kasih telah bergabung dengan XtremeSoft V4.0. Akun Anda telah berhasil dibuat.</p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #333;">Detail Langganan:</h3>
                        <p><strong>Paket:</strong> ${subscriptionData.packageName}</p>
                        <p><strong>Mulai:</strong> ${new Date(subscriptionData.startDate).toLocaleDateString('id-ID')}</p>
                        <p><strong>Berakhir:</strong> ${new Date(subscriptionData.endDate).toLocaleDateString('id-ID')}</p>
                        <p><strong>Status Pembayaran:</strong> ${subscriptionData.paymentStatus}</p>
                    </div>
                    <p>Selamat menggunakan aplikasi XtremeSoft V4.0!</p>
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                        <p style="font-size: 12px; color: #777;">Email ini dikirim secara otomatis, mohon untuk tidak membalas email ini.</p>
                    </div>
                </div>
            `
        };
        
        return transporter.sendMail(mailOptions);
    }
};