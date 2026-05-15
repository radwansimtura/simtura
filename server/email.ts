import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = "Simtura <noreply@simtura.ai>";
const ADMIN_EMAIL = "radwan@simtura.ai";

async function send(payload: Parameters<Resend["emails"]["send"]>[0]): Promise<void> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email to", payload.to);
    return;
  }
  try {
    await resend.emails.send(payload);
  } catch (err: any) {
    console.error("[email] send failed:", err?.message ?? err);
  }
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  await send({
    from: FROM,
    to,
    subject: "Welcome to Simtura",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;padding:24px">
        <h2 style="margin-bottom:8px">Welcome, ${name}!</h2>
        <p>You're set up on Simtura — AI-powered scenario training for EMS and nursing students.</p>
        <p><strong>How it works:</strong> Each scenario pauses at critical decision points and asks what you'd do next. You get immediate AI feedback graded against clinician-validated answers.</p>
        <p>You get <strong>1 free scenario per day</strong>. Upgrade to Pro anytime for unlimited access.</p>
        <a href="https://simtura.ai/ems" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Start Your First Scenario</a>
        <p style="margin-top:32px;color:#888;font-size:13px">— The Simtura Team</p>
      </div>
    `,
  });
}

export async function sendUpgradeNudgeEmail(to: string, name: string): Promise<void> {
  await send({
    from: FROM,
    to,
    subject: "You've used today's free scenario — keep the momentum going",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;padding:24px">
        <h2 style="margin-bottom:8px">You've hit today's limit, ${name}.</h2>
        <p>Good work completing your free scenario. Come back tomorrow for another free one — or upgrade now and keep going today.</p>
        <p><strong>Simtura Pro — $19/month:</strong></p>
        <ul style="padding-left:20px;line-height:1.8">
          <li>Unlimited scenarios every day</li>
          <li>Full EMS and Nursing libraries</li>
          <li>AI elaboration grading and detailed feedback</li>
          <li>Cancel anytime</li>
        </ul>
        <a href="https://simtura.ai/ems" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Upgrade to Pro</a>
        <p style="margin-top:32px;color:#888;font-size:13px">— The Simtura Team</p>
      </div>
    `,
  });
}

export async function sendContactEmail(fromName: string, fromEmail: string, message: string): Promise<void> {
  await send({
    from: FROM,
    to: ADMIN_EMAIL,
    replyTo: fromEmail,
    subject: `Contact form: ${fromName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <p><strong>From:</strong> ${fromName} &lt;${fromEmail}&gt;</p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
        <p style="white-space:pre-wrap;color:#333">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
      </div>
    `,
  });
}

export async function sendPasswordResetConfirmationEmail(to: string, name: string): Promise<void> {
  await send({
    from: FROM,
    to,
    subject: "Your Simtura password has been changed",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;padding:24px">
        <h2 style="margin-bottom:8px">Password changed</h2>
        <p>Hi ${name}, your Simtura password was just reset. If you did this, no action needed.</p>
        <p>If you didn't request this change, contact us at radwan@simtura.ai immediately.</p>
        <p style="margin-top:32px;color:#888;font-size:13px">— The Simtura Team</p>
      </div>
    `,
  });
}

export async function sendNotifyInterestEmail(discipline: string, email: string): Promise<void> {
  await send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Waitlist signup: ${discipline} — ${email}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <p><strong>${email}</strong> signed up to be notified when <strong>${discipline}</strong> launches on Simtura.</p>
      </div>
    `,
  });
}

export async function sendProWelcomeEmail(to: string, name: string): Promise<void> {
  await send({
    from: FROM,
    to,
    subject: "You're on Simtura Pro",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;padding:24px">
        <h2 style="margin-bottom:8px">Welcome to Pro, ${name}.</h2>
        <p>Your subscription is active. You now have:</p>
        <ul style="padding-left:20px;line-height:1.8">
          <li>Unlimited scenarios every day</li>
          <li>Full EMS and Nursing libraries</li>
          <li>AI-graded open-response mode</li>
          <li>Detailed performance analytics</li>
        </ul>
        <a href="https://simtura.ai/ems" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Start Training</a>
        <p style="margin-top:32px;color:#888;font-size:13px">Manage your subscription anytime from your profile. Questions? radwan@simtura.ai</p>
        <p style="color:#888;font-size:13px">— The Simtura Team</p>
      </div>
    `,
  });
}

export async function sendOrgPaymentConfirmationEmail(to: string, orgName: string, seats: number, codes: string[]): Promise<void> {
  const codeList = codes.slice(0, 5).map(c => `<li style="font-family:monospace;font-size:15px;letter-spacing:0.05em">${c}</li>`).join('');
  const remaining = codes.length > 5 ? `<p style="color:#555;font-size:13px">...and ${codes.length - 5} more codes available in your dashboard.</p>` : '';
  await send({
    from: FROM,
    to,
    subject: `Your Simtura order is confirmed — ${seats} seats for ${orgName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;padding:24px">
        <h2 style="margin-bottom:8px">Payment confirmed.</h2>
        <p>Thanks for your order. Your organization <strong>${orgName}</strong> now has <strong>${seats} Pro seats</strong> on Simtura.</p>
        <p>Here are the first few access codes to distribute to your students:</p>
        <ul style="padding-left:20px;line-height:2.2">${codeList}</ul>
        ${remaining}
        <p>All codes are available in your <a href="https://simtura.ai/org-dashboard">organization dashboard</a>.</p>
        <p style="margin-top:24px;color:#555;font-size:13px">Each code is single-use. Students enter it on their profile page after signing up.</p>
        <p style="color:#888;font-size:13px">— The Simtura Team</p>
      </div>
    `,
  });
}

export async function sendDay3ReEngagementEmail(to: string, name: string): Promise<void> {
  await send({
    from: FROM,
    to,
    subject: "Your next scenario is waiting",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;padding:24px">
        <h2 style="margin-bottom:8px">Keep the momentum going, ${name}.</h2>
        <p>You signed up for Simtura a few days ago. The best way to build clinical decision-making is consistent reps — even one scenario today makes a difference.</p>
        <a href="https://simtura.ai/ems" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Run a Scenario</a>
        <p style="margin-top:32px;color:#888;font-size:13px">You get one free scenario per day. Upgrade for unlimited.</p>
        <p style="color:#888;font-size:13px">— The Simtura Team</p>
      </div>
    `,
  });
}

export async function sendDay7ReEngagementEmail(to: string, name: string): Promise<void> {
  await send({
    from: FROM,
    to,
    subject: "Still thinking about your training?",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;padding:24px">
        <h2 style="margin-bottom:8px">It's been a week, ${name}.</h2>
        <p>A lot of EMS and nursing students use Simtura the week before clinicals or their NREMT. If that's coming up for you, now's the time to start building your decision-making reps.</p>
        <a href="https://simtura.ai/ems" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Pick Up Where You Left Off</a>
        <p style="margin-top:32px;color:#888;font-size:13px">— The Simtura Team</p>
      </div>
    `,
  });
}
