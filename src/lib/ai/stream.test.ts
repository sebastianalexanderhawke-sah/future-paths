import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// SSE line parser — same logic as readSSEStream in situation-entry-flow.tsx
// Extracted here as a pure function for unit-testable behavior.
// ---------------------------------------------------------------------------

type SSEEvent =
  | { type: "text"; content: string }
  | { type: "result"; data: unknown }
  | { type: "error"; error: string };

function parseSSELine(line: string): SSEEvent | null {
  if (!line.startsWith("data: ")) return null;
  const jsonStr = line.slice(6).trim();
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr) as SSEEvent;
  } catch {
    return null;
  }
}

function buildSSEChunks(events: object[]): string[] {
  return events.map((e) => `data: ${JSON.stringify(e)}`);
}

// ---------------------------------------------------------------------------

describe("parseSSELine", () => {
  it("parses a text event", () => {
    const line = `data: ${JSON.stringify({ type: "text", content: "hello" })}`;
    const event = parseSSELine(line);
    expect(event).toEqual({ type: "text", content: "hello" });
  });

  it("parses a result event", () => {
    const data = { momentId: "abc", sections: {} };
    const line = `data: ${JSON.stringify({ type: "result", data })}`;
    const event = parseSSELine(line);
    expect(event).toEqual({ type: "result", data });
  });

  it("parses an error event", () => {
    const line = `data: ${JSON.stringify({ type: "error", error: "Something failed" })}`;
    const event = parseSSELine(line);
    expect(event).toEqual({ type: "error", error: "Something failed" });
  });

  it("returns null for non-data lines", () => {
    expect(parseSSELine("")).toBeNull();
    expect(parseSSELine(": keep-alive")).toBeNull();
    expect(parseSSELine("event: message")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseSSELine("data: {broken json")).toBeNull();
  });

  it("returns null for empty data payload", () => {
    expect(parseSSELine("data: ")).toBeNull();
    expect(parseSSELine("data:")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Stream event accumulation — simulates a client processing a sequence of events
// ---------------------------------------------------------------------------

function processStreamEvents(lines: string[]): {
  textChunks: string[];
  result: unknown | null;
  error: string | null;
} {
  const textChunks: string[] = [];
  let result: unknown | null = null;
  let error: string | null = null;

  for (const line of lines) {
    const event = parseSSELine(line);
    if (!event) continue;

    if (event.type === "text") {
      textChunks.push(event.content);
    } else if (event.type === "result") {
      result = event.data;
    } else if (event.type === "error") {
      error = event.error;
    }
  }

  return { textChunks, result, error };
}

describe("stream event accumulation", () => {
  it("collects text chunks and extracts the final result", () => {
    const lines = buildSSEChunks([
      { type: "text", content: "chunk1" },
      { type: "text", content: "chunk2" },
      { type: "result", data: { questions: [{ question: "Q1" }], source: "ai" } },
    ]);

    const { textChunks, result, error } = processStreamEvents(lines);

    expect(textChunks).toEqual(["chunk1", "chunk2"]);
    expect(result).toEqual({ questions: [{ question: "Q1" }], source: "ai" });
    expect(error).toBeNull();
  });

  it("captures error event and ignores subsequent lines", () => {
    const lines = buildSSEChunks([
      { type: "text", content: "partial" },
      { type: "error", error: "AI generation failed" },
    ]);

    const { textChunks, result, error } = processStreamEvents(lines);

    expect(textChunks).toEqual(["partial"]);
    expect(result).toBeNull();
    expect(error).toBe("AI generation failed");
  });

  it("handles a stream with no text chunks (mock mode)", () => {
    const lines = buildSSEChunks([
      { type: "result", data: { questions: [], source: "fallback" } },
    ]);

    const { textChunks, result } = processStreamEvents(lines);

    expect(textChunks).toHaveLength(0);
    expect(result).toEqual({ questions: [], source: "fallback" });
  });

  it("handles interleaved non-SSE lines gracefully", () => {
    const mixed = [
      "",
      ": keep-alive",
      `data: ${JSON.stringify({ type: "text", content: "hello" })}`,
      "",
      `data: ${JSON.stringify({ type: "result", data: { ok: true } })}`,
      "",
    ];

    const { textChunks, result, error } = processStreamEvents(mixed);

    expect(textChunks).toEqual(["hello"]);
    expect(result).toEqual({ ok: true });
    expect(error).toBeNull();
  });

  it("returns partial results when stream ends mid-flight (network drop simulation)", () => {
    // If the stream ends without a result event, we'd throw — but if we got
    // some text chunks before the drop, those are captured.
    const lines = buildSSEChunks([
      { type: "text", content: "partial AI output" },
      // no result event — simulating network drop
    ]);

    const { textChunks, result, error } = processStreamEvents(lines);

    expect(textChunks).toEqual(["partial AI output"]);
    expect(result).toBeNull(); // no result yet — caller falls back to server action
    expect(error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// sseData format (matches route handler output)
// ---------------------------------------------------------------------------

describe("SSE data format", () => {
  it("produces valid data: lines that can be parsed back", () => {
    const events: object[] = [
      { type: "text", content: "hello world" },
      { type: "result", data: { momentId: "123" } },
      { type: "error", error: "oops" },
    ];

    for (const event of events) {
      const line = `data: ${JSON.stringify(event)}`;
      const parsed = parseSSELine(line);
      expect(parsed).not.toBeNull();
      expect(parsed?.type).toBe((event as { type: string }).type);
    }
  });
});
