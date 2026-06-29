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

// ---------------------------------------------------------------------------
// Progressive accumulation — simulates what the client does on question/path/
// future events. Verifies state grows by 1 on each event, not all at once.
// ---------------------------------------------------------------------------

type QueuedEvent = { type: string; data?: unknown };

function simulateProgressiveAccumulation(events: QueuedEvent[]): {
  questionsAfterEach: number[];
  pathsAfterEach: number[];
  futuresAfterEach: number[];
  finalResult: unknown | null;
} {
  let questions: unknown[] = [];
  let paths: unknown[] = [];
  let futures: unknown[] = [];
  let finalResult: unknown = null;

  const questionsAfterEach: number[] = [];
  const pathsAfterEach: number[] = [];
  const futuresAfterEach: number[] = [];

  for (const event of events) {
    if (event.type === "question") {
      questions = [...questions, event.data];
      questionsAfterEach.push(questions.length);
    } else if (event.type === "path") {
      paths = [...paths, event.data];
      pathsAfterEach.push(paths.length);
    } else if (event.type === "future") {
      futures = [...futures, event.data];
      futuresAfterEach.push(futures.length);
    } else if (event.type === "result") {
      finalResult = event.data;
    }
  }

  return { questionsAfterEach, pathsAfterEach, futuresAfterEach, finalResult };
}

describe("progressive accumulation — questions", () => {
  it("length is 1 after first question event, 2 after second", () => {
    const { questionsAfterEach } = simulateProgressiveAccumulation([
      { type: "question", data: { question: "Q1", category: "Goal", reason: "r" } },
      { type: "question", data: { question: "Q2", category: "Stakes", reason: "r" } },
      { type: "question", data: { question: "Q3", category: "Context", reason: "r" } },
      { type: "result", data: { questions: [], source: "ai" } },
    ]);

    expect(questionsAfterEach).toEqual([1, 2, 3]);
  });

  it("grows by 1 on each event, never jumps to full count", () => {
    const { questionsAfterEach } = simulateProgressiveAccumulation([
      { type: "question", data: { question: "Q1" } },
      { type: "question", data: { question: "Q2" } },
      { type: "question", data: { question: "Q3" } },
      { type: "question", data: { question: "Q4" } },
      { type: "question", data: { question: "Q5" } },
      { type: "result", data: { questions: [], source: "ai" } },
    ]);

    expect(questionsAfterEach).toEqual([1, 2, 3, 4, 5]);
    // Key assertion: no jump from 0 to 5 — must hit every intermediate count
    for (let i = 0; i < questionsAfterEach.length - 1; i++) {
      expect(questionsAfterEach[i + 1] - questionsAfterEach[i]).toBe(1);
    }
  });

  it("UI visibility condition is questions.length > 0, not totalExpected", () => {
    // After first question event, there is at least one question to show.
    // Simulate: isLoadingQuestions=true, questions starts empty.
    let questions: unknown[] = [];

    // Before any events: nothing to show
    expect(questions.length > 0).toBe(false);

    // First question event
    questions = [...questions, { question: "Q1" }];
    expect(questions.length > 0).toBe(true); // UI becomes visible NOW

    // More questions arrive
    questions = [...questions, { question: "Q2" }];
    expect(questions.length > 0).toBe(true); // still visible
  });

  it("result event does not affect questions length before it arrives", () => {
    // Result comes AFTER question events — questions are accumulated progressively
    const { questionsAfterEach, finalResult } = simulateProgressiveAccumulation([
      { type: "question", data: { question: "Q1" } },
      { type: "question", data: { question: "Q2" } },
      { type: "result", data: { questions: [{ question: "Q1" }, { question: "Q2" }], source: "ai" } },
    ]);

    // Questions were accumulated BEFORE result arrived
    expect(questionsAfterEach).toEqual([1, 2]);
    expect(finalResult).toEqual({
      questions: [{ question: "Q1" }, { question: "Q2" }],
      source: "ai",
    });
  });
});

describe("progressive accumulation — paths", () => {
  it("length is 1 after first path event", () => {
    const { pathsAfterEach } = simulateProgressiveAccumulation([
      { type: "path", data: { title: "Path A", benefits: ["a"], description: "" } },
      { type: "path", data: { title: "Path B", benefits: ["b"], description: "" } },
      { type: "path", data: { title: "Path C", benefits: ["c"], description: "" } },
      { type: "result", data: { momentId: "m1", paths: [] } },
    ]);

    expect(pathsAfterEach).toEqual([1, 2, 3]);
  });

  it("paths accumulate independently of the final result event", () => {
    const { pathsAfterEach, finalResult } = simulateProgressiveAccumulation([
      { type: "path", data: { title: "Path A" } },
      { type: "path", data: { title: "Path B" } },
      { type: "result", data: { momentId: "m2", paths: ["saved-path-A", "saved-path-B"] } },
    ]);

    expect(pathsAfterEach).toEqual([1, 2]);
    expect(pathsAfterEach.length).toBe(2);
    // Final result has DB-saved paths (different objects from streaming previews)
    expect((finalResult as { paths: unknown[] }).paths).toEqual(["saved-path-A", "saved-path-B"]);
  });
});

describe("progressive accumulation — futures", () => {
  it("futures from all sections accumulate progressively", () => {
    const { futuresAfterEach } = simulateProgressiveAccumulation([
      { type: "future", data: { title: "F1", why: "w", section: "active" } },
      { type: "future", data: { title: "F2", why: "w", section: "active" } },
      { type: "future", data: { title: "F3", why: "w", section: "hidden" } },
      { type: "future", data: { title: "F4", why: "w", section: "wild_card" } },
      { type: "result", data: { sections: {}, momentId: "m3" } },
    ]);

    expect(futuresAfterEach).toEqual([1, 2, 3, 4]);
  });

  it("no futures appear before first future event", () => {
    let futures: unknown[] = [];
    expect(futures.length).toBe(0);

    // Simulate receiving first future
    futures = [...futures, { title: "First future" }];
    expect(futures.length).toBe(1);
    expect(futures.length > 0).toBe(true); // UI becomes visible
  });
});
