const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../models/db');
const nodemailer = require('nodemailer');
const { sendVerificationEmail } = require('../utils/email');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }

    // Find user
    const userQuery = await pool.query(
      'SELECT id, name, email, password, role, is_verified FROM users WHERE email = $1',
      [email]
    );
    
    const user = userQuery.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        id: user.id,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    // Return response (excluding password)
    const { password: _, ...userData } = user;
    
    res.status(200).json({
      success: true,
      token,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};


  exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    try {
        // Find user by email
        const userQuery = await pool.query(
            'SELECT id, name FROM users WHERE email = $1',
            [email]
        );
        
        const user = userQuery.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create a reset token (expires in 1 hour)
        const resetToken = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Store the token in the database
        await pool.query(
            'UPDATE users SET reset_token = $1, reset_token_expiry = NOW() + INTERVAL \'1 hour\' WHERE id = $2',
            [resetToken, user.id]
        );

        // Send email with reset link
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <p>You requested a password reset. Click the link below to set a new password:</p>
                <a href="${resetUrl}">${resetUrl}</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `,
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Password reset link sent to your email' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Error processing password reset request' });
    }
  }

  exports.resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    // 1. Validate input
    if (!token || !newPassword) {
        return res.status(400).json({ 
            success: false,
            message: 'Token and new password are required' 
        });
    }

    try {
        // 2. Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3. Check database for valid token
        const userResult = await pool.query(
            `SELECT * FROM users 
             WHERE id = $1 
             AND reset_token = $2 
             AND reset_token_expiry > NOW()`,
            [decoded.id, token]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid or expired token' 
            });
        }

        // 4. Update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
            `UPDATE users 
             SET password = $1, 
                 reset_token = NULL, 
                 reset_token_expiry = NULL 
             WHERE id = $2`,
            [hashedPassword, decoded.id]
        );

        return res.status(200).json({ 
            success: true,
            message: 'Password updated successfully' 
        });

    } catch (error) {
        console.error('Reset password error:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(400).json({ 
                success: false,
                message: 'Reset link has expired' 
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid reset link' 
            });
        }
        
        return res.status(500).json({ 
            success: false,
            message: 'Error resetting password' 
        });
    }
};


// Generate a 6-digit numeric code
const generateVerificationCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        
        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'All fields are required' 
            });
        }
        
        // Check if user already exists
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationCode = generateVerificationCode();
        const codeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiration
        
        // Insert user with verification code
        const result = await pool.query(
            `INSERT INTO users 
            (id, name, email, password, role, verification_code, code_expires_at, is_verified) 
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7) 
            RETURNING *`,
            [name, email, hashedPassword, role, verificationCode, codeExpiresAt, false]
        );

        // Send verification email with timeout and error handling
        try {
            // Set a timeout for email sending (10 seconds)
            await Promise.race([
                sendVerificationEmail(email, verificationCode),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Email timeout')), 10000)
                )
            ]);

            res.status(201).json({ 
                success: true, 
                message: 'Registration successful. Check your email for verification code.',
                user: {
                    id: result.rows[0].id,
                    name: result.rows[0].name,
                    email: result.rows[0].email,
                    role: result.rows[0].role
                }
            });
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
            
            // Still return success but inform about email issue
            res.status(201).json({ 
                success: true, 
                message: 'Registration successful, but email could not be sent. Please request a new code.',
                user: {
                    id: result.rows[0].id,
                    name: result.rows[0].name,
                    email: result.rows[0].email,
                    role: result.rows[0].role
                },
                emailWarning: true
            });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Registration failed',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;
        
        if (!email || !code) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email and verification code are required' 
            });
        }

        // Find user by email and code
        const userResult = await pool.query(
            `SELECT * FROM users 
             WHERE email = $1 AND verification_code = $2`,
            [email, code]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid verification code or email' 
            });
        }

        const user = userResult.rows[0];

        // Check if code is expired
        if (new Date(user.code_expires_at) < new Date()) {
            return res.status(400).json({ 
                success: false, 
                error: 'Verification code has expired' 
            });
        }

        // Mark as verified and clear code
        const result = await pool.query(
            `UPDATE users 
             SET is_verified = true, 
                 verification_code = NULL,
                 code_expires_at = NULL,
                 updated_at = NOW()
             WHERE email = $1 
             RETURNING *`,
            [email]
        );

        res.status(200).json({ 
            success: true, 
            message: 'Email verified successfully',
            user: result.rows[0] 
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Email verification failed' 
        });
    }
};

exports.resendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        
        // Find user by email
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ success: false, error: 'Email not found' });
        }

        if (user.is_verified) {
            return res.status(400).json({ success: false, error: 'Email is already verified' });
        }

        // Generate new code
        const verificationCode = generateVerificationCode();
        const codeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiration

        await pool.query(
            'UPDATE users SET verification_code = $1, code_expires_at = $2 WHERE email = $3',
            [verificationCode, codeExpiresAt, email]
        );

        // Resend verification email
        await sendVerificationEmail(email, verificationCode);

        res.status(200).json({ 
            success: true, 
            message: 'New verification code sent. Please check your email.',
            expiresAt: codeExpiresAt
        });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({ success: false, error: 'Failed to resend verification code' });
    }
};