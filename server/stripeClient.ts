import Stripe from 'stripe';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  return new Stripe(key, { apiVersion: '2026-02-25.clover' });
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  return getStripe();
}

export async function getStripePublishableKey(): Promise<string> {
  const key = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!key) throw new Error('STRIPE_PUBLISHABLE_KEY environment variable is not set');
  return key;
}

export async function getStripeSecretKey(): Promise<string> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  return key;
}
