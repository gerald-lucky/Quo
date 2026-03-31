"use client";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <html>
      <body style={{ fontFamily: "monospace", padding: "2rem" }}>
        <h2>Something went wrong</h2>
        <p><strong>Digest:</strong> {error.digest}</p>
        <p><strong>Message:</strong> {error.message}</p>
      </body>
    </html>
  );
}
