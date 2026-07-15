"use client"; // Error boundaries must be Client Components

// Replaces the root layout when it fails to render, so it must provide its
// own <html> and <body> — and because the layout's stylesheet may not have
// loaded, everything here is styled inline. Kept deliberately dependency-free.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fafafa",
          color: "#18181b",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: "28rem" }}>
          <p
            style={{
              fontSize: "13px",
              fontWeight: 500,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "#71717a",
              margin: "0 0 12px",
            }}
          >
            Reflection
          </p>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 600,
              letterSpacing: "-0.025em",
              margin: "0 0 12px",
            }}
          >
            Something went wrong on our side
          </h1>
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.6,
              color: "#52525b",
              margin: "0 0 32px",
            }}
          >
            Your reflections and situations are safe. Trying again usually
            resolves it.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              backgroundColor: "#18181b",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p style={{ fontSize: "12px", color: "#a1a1aa", marginTop: "32px" }}>
              If this keeps happening, mention this code: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
