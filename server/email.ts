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
