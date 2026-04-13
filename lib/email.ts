import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key if available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface SendVerificationEmailParams {
  to: string;
  otp: string;
  name: string;
}

interface SendPasswordResetEmailParams {
  to: string;
  name: string;
  resetUrl: string;
}

/** Escape user-provided strings before interpolating into HTML email templates. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export async function sendVerificationEmail({ to, otp, name }: SendVerificationEmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY is not defined. Email sending skipped.');
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV MODE] Verification OTP for ${to}: ${otp}`);
    }
    return false;
  }

  if (!process.env.EMAIL_FROM) {
    console.warn('EMAIL_FROM is not defined. Email sending skipped.');
    return false;
  }

  const msg = {
    to,
    from: {
      email: process.env.EMAIL_FROM,
      name: 'Clarity AI', // Display name
    },
    subject: 'Verify your Clarity AI account',
    text: `Hello ${name},\n\nYour verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify your email address</h2>
        <p>Hello ${escapeHtml(name)},</p>
        <p>Thank you for signing up for Clarity AI. Please use the following code to verify your email address:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
          <h1 style="color: #000; letter-spacing: 5px; margin: 0;">${escapeHtml(otp)}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">If you didn't request this code, you can ignore this email.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    if ((error as { response?: { body: unknown } })?.response) {
      console.error((error as { response: { body: unknown } }).response.body);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[EMAIL FAIL FALLBACK] Verification OTP for ${to}: ${otp}`);
    }
    return false;
  }
}

export async function sendPasswordResetEmail({ to, name, resetUrl }: SendPasswordResetEmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY is not defined. Email sending skipped.');
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV MODE] Password reset link for ${to}: ${resetUrl}`);
    }
    return false;
  }

  if (!process.env.EMAIL_FROM) {
    console.warn('EMAIL_FROM is not defined. Email sending skipped.');
    return false;
  }

  const msg = {
    to,
    from: {
      email: process.env.EMAIL_FROM,
      name: 'Clarity AI',
    },
    subject: 'Reset your Clarity AI password',
    text: `Hello ${name},\n\nWe received a request to reset your password. Use this link to set a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request a password reset, you can safely ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reset your password</h2>
        <p>Hello ${escapeHtml(name)},</p>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${escapeHtml(resetUrl)}" style="background-color: #0ea5e9; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #666; font-size: 13px;">Or copy and paste this link into your browser:</p>
        <p style="color: #666; font-size: 13px; word-break: break-all;">${escapeHtml(resetUrl)}</p>
        <p>This link expires in 1 hour.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    if ((error as { response?: { body: unknown } })?.response) {
      console.error((error as { response: { body: unknown } }).response.body);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[EMAIL FAIL FALLBACK] Password reset link for ${to}: ${resetUrl}`);
    }
    return false;
  }
}
