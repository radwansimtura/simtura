import type Stripe from 'stripe';
import { getStripeSync } from './stripeClient';
import { storage } from './storage';
import { randomBytes } from 'crypto';

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
}

export async function processWebhook(rawBody: Buffer, signature: string): Promise<void> {
  const stripeSync = await getStripeSync();
  // Verifies signature against the managed webhook secret AND syncs Stripe data.
  // Throws on invalid signature, so the JSON.parse below is safe afterwards.
  await stripeSync.processWebhook(rawBody, signature);

  let event: Stripe.Event;
  try {
    event = JSON.parse(rawBody.toString('utf8')) as Stripe.Event;
  } catch (err) {
    console.error('[stripe] webhook parse failed after sync:', err);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    await fulfillCheckoutSession(event.data.object as Stripe.Checkout.Session);
  }
}
