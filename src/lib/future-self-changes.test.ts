import { describe, expect, it } from "vitest";

import {
  composeFutureSelfChangeRows,
  type FutureSelfChangeEvent,
  type FutureSelfChangeSource,
} from "@/lib/future-self-changes";

function makeEvent(
  overrides: Partial<FutureSelfChangeEvent> & Pick<FutureSelfChangeEvent, "event_type">,
): FutureSelfChangeEvent {
  return {
    future_self_id: "fs-1",
    percentage_before: 20,
    percentage_after: 25,
    created_at: "2026-07-10T00:00:00Z",
    ...overrides,
  };
}

const SOURCES: FutureSelfChangeSource[] = [
  { id: "fs-1", name: "Steady Builder", status: "active" },
  { id: "fs-2", name: "Quiet Craftsman", status: "active" },
  { id: "fs-3", name: "Bold Competitor", status: "faded" },
];

describe("composeFutureSelfChangeRows", () => {
  it("nets multiple grew events into one Strengthened row", () => {
    const rows = composeFutureSelfChangeRows(
      [
        makeEvent({ event_type: "grew", percentage_before: 20, percentage_after: 24 }),
        makeEvent({
          event_type: "grew",
          percentage_before: 24,
          percentage_after: 27,
          created_at: "2026-07-11T00:00:00Z",
        }),
      ],
      SOURCES,
    );

    expect(rows).toEqual([
      {
        key: "fs-1",
        name: "Steady Builder",
        detail: "Strengthened",
        delta: 7,
        kind: "up",
      },
    ]);
  });

  it("nets mixed grew and weakened events, and a negative net reads Weakened", () => {
    const rows = composeFutureSelfChangeRows(
      [
        makeEvent({ event_type: "grew", percentage_before: 30, percentage_after: 33 }),
        makeEvent({
          event_type: "weakened",
          percentage_before: 33,
          percentage_after: 26,
          created_at: "2026-07-12T00:00:00Z",
        }),
      ],
      SOURCES,
    );

    expect(rows).toEqual([
      {
        key: "fs-1",
        name: "Steady Builder",
        detail: "Weakened",
        delta: -4,
        kind: "down",
      },
    ]);
  });

  it("suppresses a zero net (grew then weakened back to the start)", () => {
    const rows = composeFutureSelfChangeRows(
      [
        makeEvent({ event_type: "grew", percentage_before: 30, percentage_after: 34 }),
        makeEvent({
          event_type: "weakened",
          percentage_before: 34,
          percentage_after: 30,
          created_at: "2026-07-12T00:00:00Z",
        }),
      ],
      SOURCES,
    );
    expect(rows).toEqual([]);
  });

  it("ignores fade decay steps (percentage_after > 0) for both qualifier and net", () => {
    const rows = composeFutureSelfChangeRows(
      [
        makeEvent({ event_type: "faded", percentage_before: 24, percentage_after: 12 }),
      ],
      SOURCES,
    );
    expect(rows).toEqual([]);
  });

  it("shows a completed fade as a Faded row with no movement value", () => {
    const rows = composeFutureSelfChangeRows(
      [
        makeEvent({
          future_self_id: "fs-3",
          event_type: "faded",
          percentage_before: 12,
          percentage_after: 0,
        }),
      ],
      SOURCES,
    );

    expect(rows).toEqual([
      {
        key: "fs-3",
        name: "Bold Competitor",
        detail: "Faded",
        delta: null,
        kind: "down",
      },
    ]);
  });

  it("gates Faded rows on the path having held some strength", () => {
    const rows = composeFutureSelfChangeRows(
      [
        makeEvent({
          future_self_id: "fs-3",
          event_type: "faded",
          percentage_before: 0,
          percentage_after: 0,
        }),
      ],
      SOURCES,
    );
    expect(rows).toEqual([]);
  });

  it("shows an emerged future as New and a returned one as Returned, without deltas", () => {
    const rows = composeFutureSelfChangeRows(
      [
        makeEvent({
          event_type: "emerged",
          percentage_before: null,
          percentage_after: 22,
        }),
        makeEvent({
          future_self_id: "fs-2",
          event_type: "returned",
          percentage_before: 0,
          percentage_after: 18,
          created_at: "2026-07-12T00:00:00Z",
        }),
      ],
      SOURCES,
    );

    expect(rows).toEqual([
      {
        key: "fs-2",
        name: "Quiet Craftsman",
        detail: "Returned",
        delta: null,
        kind: "up",
      },
      { key: "fs-1", name: "Steady Builder", detail: "New", delta: null, kind: "added" },
    ]);
  });

  it("lets lifecycle outrank movement for the same future", () => {
    const rows = composeFutureSelfChangeRows(
      [
        makeEvent({
          future_self_id: "fs-3",
          event_type: "grew",
          percentage_before: 20,
          percentage_after: 26,
        }),
        makeEvent({
          future_self_id: "fs-3",
          event_type: "faded",
          percentage_before: 26,
          percentage_after: 0,
          created_at: "2026-07-13T00:00:00Z",
        }),
      ],
      SOURCES,
    );

    expect(rows).toEqual([
      {
        key: "fs-3",
        name: "Bold Competitor",
        detail: "Faded",
        delta: null,
        kind: "down",
      },
    ]);
  });

  it("resolves a fade-then-return week to Returned (latest consistent lifecycle wins)", () => {
    const faded = { ...SOURCES[0], status: "active" as const };
    const rows = composeFutureSelfChangeRows(
      [
        makeEvent({ event_type: "faded", percentage_before: 12, percentage_after: 0 }),
        makeEvent({
          event_type: "returned",
          percentage_before: 0,
          percentage_after: 15,
          created_at: "2026-07-13T00:00:00Z",
        }),
      ],
      [faded, ...SOURCES.slice(1)],
    );

    expect(rows).toEqual([
      { key: "fs-1", name: "Steady Builder", detail: "Returned", delta: null, kind: "up" },
    ]);
  });

  it("sorts movement by absolute change and places lifecycle rows after", () => {
    const rows = composeFutureSelfChangeRows(
      [
        makeEvent({ event_type: "grew", percentage_before: 20, percentage_after: 23 }),
        makeEvent({
          future_self_id: "fs-2",
          event_type: "weakened",
          percentage_before: 40,
          percentage_after: 32,
        }),
        makeEvent({
          future_self_id: "fs-3",
          event_type: "faded",
          percentage_before: 12,
          percentage_after: 0,
        }),
      ],
      SOURCES,
    );

    expect(rows.map((row) => row.detail)).toEqual([
      "Weakened",
      "Strengthened",
      "Faded",
    ]);
    expect(rows.map((row) => row.delta)).toEqual([-8, 3, null]);
  });

  it("ignores events whose future self is unknown (legacy rows)", () => {
    const rows = composeFutureSelfChangeRows(
      [makeEvent({ future_self_id: "fs-legacy", event_type: "grew" })],
      SOURCES,
    );
    expect(rows).toEqual([]);
  });
});
