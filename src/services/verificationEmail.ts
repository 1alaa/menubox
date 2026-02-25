export async function sendVerificationEmail(to: string, code: string, appName?: string) {
  const res = await fetch("/.netlify/functions/sendVerificationEmail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, code, appName }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Failed to send verification email");
  }
}
