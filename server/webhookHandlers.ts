import Stripe from 'stripe';
import { getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import { randomBytes } from 'crypto';
import { sendProWelcomeEmail, sendOrgPaymentConfirmationEmail } from './email';

function generateCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(12);
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}

async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  // Personal Pro subscription checkout
  if (session.mode === 'subscription') {
    const userId = session.metadata?.userId;
    if (!userId) {
      console.warn('[stripe] subscription session without userId metadata; skipping');
      return;
    }
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    if (!customerId || !subscriptionId) {
      console.warn(`[stripe] subscription session ${session.id} missing customer/subscription`);
      return;
    }
    const user = await storage.activateUserSubscription(userId, customerId, subscriptionId);
    if (!user) {
      console.warn(`[stripe] activateUserSubscription failed for userId=${userId}`);
      return;
    }
    console.log(`[stripe] activated Pro subscription for user ${userId} (sub ${subscriptionId})`);
    sendProWelcomeEmail(user.email, user.name).catch(() => {});
    return;
  }

  // Org bulk-licensing one-off payment
  const orgId = session.metadata?.organizationId;
  if (!orgId) {
    console.warn('[stripe] checkout.session.completed without organizationId metadata; skipping');
    return;
  }
  if (session.payment_status !== 'paid') {
    console.log(`[stripe] session ${session.id} not paid (status=${session.payment_status}); skipping`);
    return;
  }

  const org = await storage.getOrganization(orgId);
  if (!org) {
    console.warn(`[stripe] org ${orgId} from session metadata not found`);
    return;
  }

  // Atomically transition status from pending → active. If another concurrent
  // webhook delivery already won the race, markOrganizationPaid returns
  // undefined and we skip code generation entirely.
  const transitioned = await storage.markOrganizationPaid(orgId);
  if (!transitioned) {
    console.log(`[stripe] org ${orgId} already active (lost race or redelivery); skipping fulfillment`);
    return;
  }

  const codeStrings: string[] = [];
  const seen = new Set<string>();
  while (codeStrings.length < org.seats) {
    const c = generateCode();
    if (seen.has(c)) continue;
    seen.add(c);
    codeStrings.push(c);
  }
  await storage.createOrganizationCodes(orgId, codeStrings);

  console.log(`[stripe] fulfilled org ${orgId} (${org.seats} seats, session ${session.id})`);

  if (org.ownerUserId) {
    const ownerUser = await storage.getUser(org.ownerUserId);
    if (ownerUser) {
      sendOrgPaymentConfirmationEmail(ownerUser.email, org.name, org.seats, codeStrings).catch(() => {});
    }
  }
}

export async function processWebhook(rawBody: Buffer, signature: string): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
  }

  const stripe = await getUncachableStripeClient();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    await fulfillCheckoutSession(event.data.object as Stripe.Checkout.Session);
    return;
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const user = await storage.deactivateUserSubscription(customerId);
    if (user) {
      console.log(`[stripe] deactivated Pro for user ${user.id} (sub ${sub.id} canceled)`);
    }
    return;
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const isActive = sub.status === 'active' || sub.status === 'trialing';
    if (!isActive) {
      const user = await storage.deactivateUserSubscription(customerId);
      if (user) {
        console.log(`[stripe] deactivated Pro for user ${user.id} (sub ${sub.id} status=${sub.status})`);
      }
    }
    return;
  }
}
