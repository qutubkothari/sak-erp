import nodemailer from 'nodemailer';

// Email configuration
export const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

// Create reusable transporter
export const transporter = nodemailer.createTransport(emailConfig);

// Email sender details
export const emailFrom = {
  name: 'SAK HR System',
  address: process.env.SMTP_FROM || 'hr@sak.ae',
};

// Verify connection on startup (only in development)
if (process.env.NODE_ENV === 'development') {
  transporter.verify((error, success) => {
    if (error) {
      console.log('❌ Email configuration error:', error);
    } else {
      console.log('✅ Email server ready');
    }
  });
}
