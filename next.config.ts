import type { NextConfig } from "next";

// Response security headers applied to every route.
//
// The non-CSP headers are safe to enforce outright — they don't alter what the
// app can load, only how browsers treat the responses. The Content-Security-
// Policy is shipped in *Report-Only* mode deliberately: the app relies on an
// inline theme-init script (see app/layout.tsx), inline styles (Tailwind), and
// third-party origins (Supabase, PostHog, Google Fonts), so an enforced policy
// risks silently breaking the page. Report-Only surfaces violations without
// blocking, so the policy can be tightened (add a nonce for the inline script,
// then promote to enforcing) once it has been observed clean in production.
const SUPABASE_ORIGIN = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
      : "https://*.supabase.co";
  } catch {
    return "https://*.supabase.co";
  }
})();

const POSTHOG_ORIGINS = "https://*.posthog.com https://*.i.posthog.com";

// 'unsafe-inline' is required while the theme-init script and Tailwind's inline
// styles ship without a nonce; it is the main reason this stays Report-Only
// rather than enforcing. connect-src covers Supabase (auth + data) and PostHog
// (analytics); frame-ancestors 'none' backs up X-Frame-Options.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  `connect-src 'self' ${SUPABASE_ORIGIN} ${POSTHOG_ORIGINS}`,
  "frame-src 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value: CONTENT_SECURITY_POLICY,
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
