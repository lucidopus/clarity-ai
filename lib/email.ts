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

export async function sendVerificationEmail({ to, otp, name }: SendVerificationEmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY is not defined. Email sending skipped.');
    console.log(`[DEV MODE] Verification OTP for ${to}: ${otp}`);
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
        <p>Hello ${name},</p>
        <p>Thank you for signing up for Clarity AI. Please use the following code to verify your email address:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
          <h1 style="color: #000; letter-spacing: 5px; margin: 0;">${otp}</h1>
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
    // Fallback for development/testing: log the OTP so we can still verify
    console.log(`[EMAIL FAIL FALLBACK] Verification OTP for ${to}: ${otp}`);
    return false;
  }
}
