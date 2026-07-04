import { describe, expect, it, vi } from "vitest";

type TableResponse = { data?: unknown; count?: number; error?: unknown };
type TrackedCall = { table: string; method: string; args: unknown[] };

const { queueFutureSelvesGenerationMock, afterMock, getActiveStub, setActiveStub } = vi.hoisted(() => {
  let stub: { client: unknown; calls: TrackedCall[] } | null = null;
  return {
    queueFutureSelvesGenerationMock: vi.fn(async () => ({ futureSelves: [] })),
    // Mirrors next/server's after(): in the real app it defers the callback
    // until the response is sent. In tests there is no request lifecycle to
    // defer to, so it just awaits the callback immediately — this lets tests
    // assert on the scheduled work without depending on Next's request
    // context machinery.
    afterMock: vi.fn((callback: () => unknown) => {
      void callback();
    }),
    getActiveStub: () => stub,
    setActiveStub: (value: { client: unknown; calls: TrackedCall[] }) => {
      stub = value;
    },
  };
});

vi.mock("@/lib/future-selves", () => ({
  queueFutureSelvesGeneration: queueFutureSelvesGenerationMock,
}));

vi.mock("next/server", () => ({
  after: afterMock,
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
function createSupabaseStub(
  tableResponseQueues: Record<string, TableResponse[]>,
  rpcResponse: TableResponse = { data: null, error: null },
) {
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
    rpc: (name: string, args: unknown) => {
      calls.push({ table: `rpc:${name}`, method: "rpc", args: [args] });
      return Promise.resolve(rpcResponse);
    },
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }),
    },
  };

  return { client, calls };
}

describe("choosePath", () => {
  it("triggers a Future Selves regeneration when a path is chosen", async () => {
    queueFutureSelvesGenerationMock.mockClear();
    afterMock.mockClear();

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
    },
    // commit_path_choice RPC returns the updated (now-chosen) path row.
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
    });
    setActiveStub(stub);

    const result = await choosePath("moment-1", "path-1");

    expect("error" in result).toBe(false);
    // Regeneration is scheduled via after() rather than awaited before the
    // response — this asserts it was scheduled (and, since the test's after()
    // mock runs the callback immediately, that it actually ran).
    expect(afterMock).toHaveBeenCalledTimes(1);
    expect(queueFutureSelvesGenerationMock).toHaveBeenCalledTimes(1);
    expect(queueFutureSelvesGenerationMock).toHaveBeenCalledWith("moment-1");
  });

  it("does not regenerate Future Selves if choosing the path fails", async () => {
    queueFutureSelvesGenerationMock.mockClear();
    afterMock.mockClear();

    const stub = createSupabaseStub({
      moments: [{ data: { id: "moment-1", title: "A situation" }, error: null }],
      paths: [
        { data: { id: "already-chosen" }, error: null }, // a path is already chosen
      ],
    });
    setActiveStub(stub);

    const result = await choosePath("moment-1", "path-1");

    expect("error" in result).toBe(true);
    expect(afterMock).not.toHaveBeenCalled();
    expect(queueFutureSelvesGenerationMock).not.toHaveBeenCalled();
  });
});
