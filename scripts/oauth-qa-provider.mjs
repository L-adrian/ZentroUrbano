// Loaded only into the isolated test child. No test endpoints exist in the application.
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = String(input);
  if (url === "https://oauth2.googleapis.com/token") {
    const body = new URLSearchParams(options?.body);
    if (!/^[\w-]{43}$/.test(body.get("code_verifier") || "")) return Response.json({ error: "invalid_grant" }, { status: 400 });
    const code = body.get("code");
    if (code === "qa-network") throw new Error("Simulated provider outage");
    if (code === "qa-token") return Response.json({ error: "invalid_grant" }, { status: 400 });
    return Response.json({ access_token: code });
  }
  if (url === "https://openidconnect.googleapis.com/v1/userinfo") {
    return Response.json({ sub: process.env.GOOGLE_QA_SUBJECT || "qa-google-subject", email: process.env.GOOGLE_QA_EMAIL, name: "Propietario QA Google", email_verified: options?.headers?.Authorization !== "Bearer qa-unverified", picture: "https://lh3.googleusercontent.com/qa-avatar" });
  }
  return originalFetch(input, options);
};
