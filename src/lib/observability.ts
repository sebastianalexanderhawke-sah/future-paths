/**
 * Centralized error reporting for background work.
 *
 * Every background pipeline in Reflection deliberately swallows failures so
 * that post-response enrichment can never fail a user request. That swallow
 * semantic is correct — but before this module, swallowed meant invisible.
 * Every swallowed exception now flows through reportError(), which:
 *
 *   1. always emits one structured `[error-report]` JSON line to stderr —
 *      greppable in platform logs and forwardable via a log drain;
 *   2. optionally POSTs the same payload to ERROR_REPORTING_WEBHOOK_URL
 *      (Slack, Discord, or any collector) for real-time alerting, with a
 *      short timeout so a slow webhook can never stall background work.
 *
 * Reporting itself must never throw and never rejects.
 */

const WEBHOOK_TIMEOUT_MS = 3_000;

type Extra = Record<string, unknown>;

function serializePayload(context: string, error: unknown, extra?: Extra): string {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : String(error);

  try {
    return JSON.stringify({
      context,
      message,
      ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
      ...(extra ? { extra } : {}),
      at: new Date().toISOString(),
    });
  } catch {
    // extra contained something unserializable; report what we safely can.
    return JSON.stringify({ context, message, at: new Date().toISOString() });
  }
}

export async function reportError(
  context: string,
  error: unknown,
  extra?: Extra,
): Promise<void> {
  try {
    const payload = serializePayload(context, error, extra);
    console.error(`[error-report] ${payload}`);

    const webhookUrl = process.env.ERROR_REPORTING_WEBHOOK_URL?.trim();
    if (!webhookUrl) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Reporting must never throw: the console line (already emitted above on
    // the happy path) is the guaranteed channel; the webhook is best-effort.
  }
}

/**
 * Drop-in replacement for the bare `.catch(() => {})` used by fire-and-forget
 * background calls: same swallow semantics, but the failure is reported first.
 * The report is part of the returned promise chain, so `after()` keeps the
 * invocation alive until delivery completes.
 */
export function swallowReporting(
  context: string,
  extra?: Extra,
): (error: unknown) => Promise<undefined> {
  return (error) => reportError(context, error, extra).then(() => undefined);
}

/**
 * Most pipeline functions signal failure by resolving to `{ error: string }`
 * rather than throwing. When such a result is discarded by a background
 * caller, the failure would otherwise vanish — report it, changing nothing
 * about the result's handling.
 */
export async function reportDiscardedResultError(
  context: string,
  result: unknown,
  extra?: Extra,
): Promise<void> {
  if (
    result &&
    typeof result === "object" &&
    "error" in result &&
    typeof (result as { error: unknown }).error === "string" &&
    (result as { error: string }).error
  ) {
    await reportError(context, (result as { error: string }).error, extra);
  }
}
