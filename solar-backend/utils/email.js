const nodemailer = require('nodemailer');
const pool = require('../models/db');

// Create transporter with better error handling
const createTransporter = () => {
    try {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
            // Add timeout settings
            connectionTimeout: 10000, // 10 seconds
            greetingTimeout: 10000,
            socketTimeout: 10000
        });
    } catch (error) {
        console.error('Failed to create email transporter:', error);
        throw error;
    }
};

exports.sendVerificationEmail = async (email, code) => {
    const transporter = createTransporter();
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4f46e5;">Verify Your Email</h2>
                <p>Your verification code is:</p>
                <div style="font-size: 24px; font-weight: bold; letter-spacing: 2px; 
                    margin: 20px 0; padding: 10px 15px; background: #f3f4f6; 
                    display: inline-block; border-radius: 4px;">
                    ${code}
                </div>
                <p>This code will expire in 15 minutes.</p>
                <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                    If you didn't request this code, you can safely ignore this email.
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Verification email sent successfully to:', email);
    } catch (error) {
        console.error('Failed to send verification email:', error);
        throw error;
    }
};

exports.sendBidInvitations = async (fileId) => {
    try {
        const transporter = createTransporter();
        
        // Get active users who should receive notifications
        const users = await pool.query(
            `SELECT id, email, name FROM users 
             WHERE is_verified = true AND role = 'customer'`
        );
        
        // Get lots from this file
        const lots = await pool.query(
            `SELECT id, item_description, quantity, unit_awarded_price 
             FROM lots WHERE verizon_file_id = $1`,
            [fileId]
        );
        
        // Send emails
        for (const user of users.rows) {
            for (const lot of lots.rows) {
                try {
                    await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: user.email,
                        subject: `New Bidding Opportunity: ${lot.item_description}`,
                        html: `
                          <h2>New Lot Available for Bidding</h2>
                          <p>Hello ${user.name},</p>
                          <p>A new lot has been added to our platform:</p>
                          <ul>
                            <li><strong>Item:</strong> ${lot.item_description}</li>
                            <li><strong>Quantity:</strong> ${lot.quantity}</li>
                            <li><strong>Base Price:</strong> $${lot.unit_awarded_price.toFixed(2)}</li>
                          </ul>
                          <p>
                            <a href="${process.env.CLIENT_URL}/lots/${lot.id}">
                              Click here to place your bid
                            </a>
                          </p>
                        `,
                    });
                    
                    // Record notification in database
                    await pool.query(
                        `INSERT INTO email_notifications 
                         (user_id, subject, message, notification_type, is_sent, sent_at)
                         VALUES ($1, $2, $3, $4, true, NOW())`,
                        [
                            user.id,
                            `New Bidding Opportunity: ${lot.item_description}`,
                            `A new lot (${lot.item_description}) is available for bidding.`,
                            'bid_invitation'
                        ]
                    );
                } catch (emailError) {
                    console.error(`Failed to send email to ${user.email}:`, emailError);
                    // Continue with other emails even if one fails
                }
            }
        }
    } catch (error) {
        console.error('Error sending bid invitations:', error);
        throw error;
    }
};