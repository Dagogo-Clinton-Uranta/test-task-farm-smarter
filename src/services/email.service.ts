import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Email Service
 * Handles email sending via AWS SES
 */

/**
 * Send email via AWS SES
 */
export const sendEmail = async (
  recipientEmail: string,
  recipientName: string,
  subject: string,
  mailContent: string
): Promise<{ success: boolean; messageId?: string }> => {
  // Check if AWS credentials are configured
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    logger.warn('AWS SES credentials not configured. Email not sent.', {
      recipientEmail,
      subject,
    });
    return { success: false };
  }

  // Initialize AWS SES client
  const sesClient = new SESClient({
    region: env.AWS_SES_REGION || 'eu-west-2',
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    // Strip HTML for text version
    const textContent = mailContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    const params = {
      Destination: {
        ToAddresses: [recipientEmail],
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: mailContent,
          },
          Text: {
            Charset: 'UTF-8',
            Data: textContent,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: subject,
        },
      },
      Source: env.AWS_SES_FROM_EMAIL || 'noreply@ufarmx.com',
    };

    const command = new SendEmailCommand(params);
    const result = await sesClient.send(command);

    logger.info('Email sent successfully', {
      messageId: result.MessageId,
      recipientEmail,
      subject,
    });
    return { success: true, messageId: result.MessageId };
  } catch (error: any) {
    logger.error('Error sending email', {
      error: error.message,
      stack: error.stack,
      recipientEmail,
      subject,
    });
    // Don't throw - maintain fire-and-forget pattern
    return { success: false };
  }
};

/**
 * Send password email to new agent/user
 */
export const sendPasswordEmail = async (
  recipientEmail: string,
  recipientName: string,
  role: string,
  password: string
): Promise<void> => {
  const clientUrl = env.CLIENT_URL || 'http://localhost:3000';
  const baseUrl = env.BASE_URL || 'http://localhost:8000';
  const subject = 'Welcome to UfarmX';

  let emailTemplate = '';

  if (role === 'Agent' || role === 'agent') {
    // Agent-specific template with app store links
    emailTemplate = `
    <!DOCTYPE html>
  <html>
  
  <head>
      <title>Welcome to UfarmX</title>
  
      <style>
          body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: rgb(66, 66, 66);
          }
      </style>
  
  </head>
  
  <body>
  
      <div style="display: flex; justify-content:center;">
  
  
          <div style="max-width: 500px; margin: 50px 0px">
  
              <img src="${baseUrl}/images/UfarmxLogo.png" style="max-width: 120px; margin-bottom: 20px;" alt="logo">
  
              <h1>Hi, ${recipientName}</h1>
              <p>You have been registered as an ${role} on the platform. Welcome to the team!!!!!</p>
              <p>Your account has been created. And your password is <strong>${password}</strong> </p>
              <p>Kindly login to the platform with your email and password</p>
  
              
              <p>You can get the app for your mobile phone with the links below</p>

             <div style="display: flex;gap: 50px;align-items: center; justify-content:center; margin-top: 30px">
             
             <a href="https://play.google.com/store/apps/details?id=com.ufarmx.ufarmxmobile">
            
                 <img src="${baseUrl}/images/playstore.png" style="max-width: 120px; margin-bottom: 20px;" alt="logo">
             </a>

             <a href="https://apps.apple.com/app/ufarmx/id6449930131">
                <img src="${baseUrl}/images/appstore.png" style="max-width: 120px; margin-bottom: 20px;" alt="logo">
             </a>

             </div>

  
              <p>You can choose to keep your password or reset it.</p>
  
          </div>
      </div>
  
  </body>
  
  </html>
    `;
  } else {
    // Generic template for other roles
    emailTemplate = `
  <!DOCTYPE html>
<html>

<head>
    <title>Welcome to UfarmX</title>

    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: rgb(66, 66, 66);
        }
    </style>

</head>

<body>

    <div style="display: flex; justify-content:center;">


        <div style="max-width: 500px; margin: 50px 0px">

            <img src="${baseUrl}/images/UfarmxLogo.png" style="max-width: 120px; margin-bottom: 20px;" alt="logo">

            <h1>Hi, ${recipientName}</h1>
            <p>You have been registered as an ${role} on the platform. Welcome to the team!!!!!</p>
            <p>Your account has been created. And your password is <strong>${password}</strong> </p>
            <p>Kindly login to the platform with your email and password</p>

            <a href="${clientUrl}/login">Login</a>

            <p>You can choose to keep your password or reset it.</p>

          

        </div>
    </div>

</body>

</html>
  `;
  }

  try {
    await sendEmail(recipientEmail, recipientName, subject, emailTemplate);
  } catch (error: any) {
    logger.error('Error sending password email', {
      error: error.message,
      stack: error.stack,
      recipientEmail,
      role,
    });
    // Don't throw to maintain backward compatibility with fire-and-forget pattern
  }
};

/**
 * Send password reset email
 */
export const sendResetPasswordEmail = async (
  recipientEmail: string,
  recipientName: string,
  token: string
): Promise<void> => {
  const clientUrl = env.CLIENT_URL || 'http://localhost:3000';
  const baseUrl = env.BASE_URL || 'http://localhost:8000';
  const subject = 'Password Reset Request';

  const emailTemplate = `
  <!DOCTYPE html>
<html>

<head>
    <title>Password Reset Request</title>

    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: rgb(66, 66, 66);
        }
    </style>

</head>

<body>

    <div style="display: flex; justify-content:center;">


        <div style="max-width: 500px; margin: 50px 0px">

            <img src="${baseUrl}/images/UfarmxLogo.png" style="max-width: 120px; margin-bottom: 20px;" alt="logo">

            <h1>Hi, ${recipientName}</h1>
            <p>You have requested to reset your password. Kindly click the link below to reset your password. The link expires in 30 minutes</p>

            <a href="${clientUrl}/reset-password?token=${token}">Reset Password</a>

        </div>
    </div>

</body>

</html>
  `;

  try {
    await sendEmail(recipientEmail, recipientName, subject, emailTemplate);
  } catch (error: any) {
    logger.error('Error sending reset password email', {
      error: error.message,
      stack: error.stack,
      recipientEmail,
    });
  }
};

/**
 * Send password reset confirmation email
 */
export const sendPasswordResetConfirmationEmail = async (
  recipientEmail: string,
  recipientName: string
): Promise<void> => {
  const clientUrl = env.CLIENT_URL || 'http://localhost:3000';
  const baseUrl = env.BASE_URL || 'http://localhost:8000';
  const subject = 'Password Reset Successful';

  const emailTemplate = `
  <!DOCTYPE html>
<html>

<head>
    <title>Password Reset Successful</title>

    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: rgb(66, 66, 66);
        }
    </style>

</head>

<body>

    <div style="display: flex; justify-content:center;">


        <div style="max-width: 500px; margin: 50px 0px">

            <img src="${baseUrl}/images/UfarmxLogo.png" style="max-width: 120px; margin-bottom: 20px;" alt="logo">

            <h1>Hi, ${recipientName}</h1>
            <p>You have successfully changed your password. If you don't know about this, reply this email immediately. You can ignore if this request was from you. Thanks </p>

            <p>you can log in with the link below</p>

            <br/>

            <a href="${clientUrl}/login">Login</a>

        </div>
    </div>

</body>

</html>
  `;

  try {
    await sendEmail(recipientEmail, recipientName, subject, emailTemplate);
  } catch (error: any) {
    logger.error('Error sending password reset confirmation email', {
      error: error.message,
      stack: error.stack,
      recipientEmail,
    });
  }
};
