import { InternalServerError } from '../utils/error.util.js';

type PaystackBank = {
  name: string;
  active?: boolean;
};

export type BankOption = {
  label: string;
  value: string;
};

const PAYSTACK_BANKS_URL = 'https://api.paystack.co/bank?country=nigeria';

export const getBankOptions = async (): Promise<BankOption[]> => {
  const response = await fetch(PAYSTACK_BANKS_URL, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const payload = (await response.json()) as {
    status?: boolean;
    message?: string;
    data?: PaystackBank[];
  };

  if (!response.ok || payload.status !== true || !Array.isArray(payload.data)) {
    throw new InternalServerError(payload.message || 'Unable to retrieve banks');
  }

  return payload.data
    .filter(bank => bank?.name && bank.active !== false)
    .map(bank => ({
      label: bank.name,
      value: bank.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};
