import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const TERMII_API_URL = 'https://v3.api.termii.com/api/sms/send';

export type SmsChannel = 'dnd' | 'whatsapp' | 'generic';

export interface SendSmsOptions {
  to: string;
  message: string;
  senderId?: string;         // Override default sender ID
  channel?: SmsChannel;      // Default: 'dnd'
}

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an SMS via Termii.
 * Reusable for OTP, notifications, alerts, or any SMS use case.
 */
export const sendSms = async (options: SendSmsOptions): Promise<SendSmsResult> => {
  const { to, message, senderId, channel = 'dnd' } = options;

  if (!env.TERMII_API_KEY) {
    logger.warn('Termii API key not configured. SMS not sent.', { to });
    return { success: false, error: 'SMS provider not configured' };
  }

  // Normalize phone: strip leading + so Termii gets e.g. "2348012345678"
  const normalizedTo = to.replace(/^\+/, '');

  const payload = {
    to: normalizedTo,
    from: senderId || env.TERMII_SENDER_ID || 'N-Alert',
    sms: message,
    type: 'plain',
    api_key: env.TERMII_API_KEY,
    channel,
  };

  try {
    const response = await fetch(TERMII_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as any;

    if (!response.ok) {
      logger.error('Termii SMS send failed', { to: normalizedTo, status: response.status, data });
      return { success: false, error: data?.message || 'SMS delivery failed' };
    }

    logger.info('SMS sent successfully', { to: normalizedTo, messageId: data.message_id });
    return { success: true, messageId: data.message_id };
  } catch (error: any) {
    logger.error('Error sending SMS via Termii', { error: error.message, to: normalizedTo });
    return { success: false, error: error.message };
  }
};

/**
 * Send an OTP code via SMS
 */
export const sendOtpSms = async (phone: string, otp: string): Promise<void> => {
  const result = await sendSms({
    to: phone,
    message: `Your UFarmX verification code is ${otp}. It expires in 10 minutes. Do not share this code with anyone.`,
  });

  if (!result.success) {
    logger.warn('OTP SMS delivery failed — continuing silently', { phone, error: result.error });
  }
};

/**
 * Send a generic notification SMS
 */
export const sendNotificationSms = async (phone: string, message: string): Promise<SendSmsResult> => {
  return sendSms({ to: phone, message });
};
