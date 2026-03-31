"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Liberation Sans', sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "1rem", textAlign: "center" }}>
          <div style={{ fontSize: "80px", lineHeight: 1, marginBottom: "1rem" }}>💥</div>
          <h1 style={{ fontSize: "27px", color: "#232629", fontWeight: 400, marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "15px", color: "#6a737c", marginBottom: "1.5rem", maxWidth: "400px" }}>
            A critical error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={reset}
            style={{ height: "38px", padding: "0 1rem", backgroundColor: "#0a95ff", color: "white", fontSize: "13px", borderRadius: "3px", border: "1px solid #0a95ff", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
