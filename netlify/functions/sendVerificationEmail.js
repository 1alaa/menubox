const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }
    const { to, code, appName } = JSON.parse(event.body || "{}");
    if (!to || !code) return { statusCode: 400, body: "Missing to/code" };

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;

    if (!host || !user || !pass) {
      return {
        statusCode: 500,
        body: "SMTP env vars not configured (SMTP_HOST/SMTP_USER/SMTP_PASS)",
      };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const title = appName || "Menubox";
    const subject = `${title} verification code`;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2 style="margin:0 0 8px 0">${title} – Verification Code</h2>
        <p>Use this 6-digit code to verify your account:</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:6px;margin:12px 0;padding:12px 16px;background:#f5f5f5;border-radius:12px;display:inline-block">
          ${code}
        </div>
        <p style="color:#666;font-size:12px">If you didn't request this, you can ignore this email.</p>
      </div>
    `;

    await transporter.sendMail({ from, to, subject, html });

    return { statusCode: 200, body: "OK" };
  } catch (e) {
    return { statusCode: 500, body: e?.message || "Send failed" };
  }
};
