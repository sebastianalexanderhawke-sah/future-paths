import { describe, expect, it, vi } from "vitest";

type TableResponse = { data?: unknown; count?: number; error?: unknown };
type TrackedCall = { table: string; method: string; args: unknown[] };

const { generateFutureSelvesMock, getActiveStub, setActiveStub } = vi.hoisted(() => {
  let stub: { client: unknown; calls: TrackedCall[] } | null = null;
  return {
    generateFutureSelvesMock: vi.fn(async () => ({ futureSelves: [] })),
    getActiveStub: () => stub,
    setActiveStub: (value: { client: unknown; calls: TrackedCall[] }) => {
      stub = value;
    },
  };
});

vi.mock("@/lib/future-selves", () => ({
  generateFutureSelves: generateFutureSelvesMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => getActiveStub()!.client),
}));

const { choosePath } = await import("@/lib/paths");

const CHAINABLE_METHODS = ["select", "eq", "order", "limit", "in", "neq"] as const;

/**
 * Unlike future-selves.test.ts's single-response-per-table stub, choosePath
 * issues several distinct queries against the same "paths" table (the
 * already-chosen check, the path lookup, then the update) — so responses are
 * queued per table and consumed in call order.
 */
function createSupabaseStub(tableResponseQueues: Record<string, TableResponse[]>) {
  const calls: TrackedCall[] = [];
  const callIndex: Record<string, number> = {};

  function makeBuilder(table: string) {
    const queue = tableResponseQueues[table] ?? [];
    const index = callIndex[table] ?? 0;
    callIndex[table] = index + 1;
    const response = queue[index] ?? queue[queue.length - 1] ?? { data: null, error: null };

    const builder: Record<string, (...args: unknown[]) => unknown> = {};

    for (const method of CHAINABLE_METHODS) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return builder;
      };
    }

    builder.insert = (...args: unknown[]) => {
      calls.push({ table, method: "insert", args });
      return builder;
    };
    builder.update = (...args: unknown[]) => {
      calls.push({ table, method: "update", args });
      return builder;
    };
    builder.delete = (...args: unknown[]) => {
      calls.push({ table, method: "delete", args });
      return builder;
    };
    builder.single = () => Promise.resolve(response);
    builder.maybeSingle = () => Promise.resolve(response);
    builder.then = (
      resolve: (value: unknown) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(response).then(resolve, reject);

    return builder;
  }

  const client = {
    from: (table: string) => makeBuilder(table),
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }),
    },
  };

  return { client, calls };
}

describe("choosePath", () => {
  it("triggers a Future Selves regeneration when a path is chosen", async () => {
    generateFutureSelvesMock.mockClear();

    const stub = createSupabaseStub({
      moments: [{ data: { id: "moment-1", title: "A situation" }, error: null }],
      paths: [
        { data: null, error: null }, // no path already chosen for this moment
        {
          data: {
            id: "path-1",
            moment_id: "moment-1",
            description: "Take the new job",
            themes: ["Growth"],
            is_locked: false,
          },
          error: null,
        },
        {
          data: {
            id: "path-1",
            moment_id: "moment-1",
            description: "Take the new job",
            themes: ["Growth"],
            is_chosen: true,
            chosen_at: "2026-06-23T00:00:00.000Z",
          },
          error: null,
        },
      ],
      timeline_events: [{ data: null, error: null }],
    });
    setActiveStub(stub);

    const result = await choosePath("moment-1", "path-1");

    expect("error" in result).toBe(false);
    expect(generateFutureSelvesMock).toHaveBeenCalledTimes(1);
  });

  it("does not regenerate Future Selves if choosing the path fails", async () => {
    generateFutureSelvesMock.mockClear();

    const stub = createSupabaseStub({
      moments: [{ data: { id: "moment-1", title: "A situation" }, error: null }],
      paths: [
        { data: { id: "already-chosen" }, error: null }, // a path is already chosen
      ],
    });
    setActiveStub(stub);

    const result = await choosePath("moment-1", "path-1");

    expect("error" in result).toBe(true);
    expect(generateFutureSelvesMock).not.toHaveBeenCalled();
  });
});
