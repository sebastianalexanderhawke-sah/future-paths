import type { ForecastPipelineTrace, ForecastPipelineTraceItem } from "@/lib/ai-audit";

export type ForecastPipelineSectionKey = "active" | "hidden" | "blind_spots";

function normalizeTraceKey(title: string): string {
  return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

export class ForecastPipelineTraceCollector {
  private readonly sections: ForecastPipelineTrace = {
    active: [],
    hidden: [],
    blind_spots: [],
  };

  beginGeneratedItem(section: ForecastPipelineSectionKey, original: string): ForecastPipelineTraceItem {
    const item: ForecastPipelineTraceItem = {
      original,
      status: "preserved",
      generatedBy: "claude",
    };
    this.sections[section].push(item);
    return item;
  }

  recordAfterReality(item: ForecastPipelineTraceItem, title: string | null, reason?: string): void {
    item.afterReality = title;
    if (!title && reason) {
      item.reason = reason;
    }
  }

  recordAfterGrounding(item: ForecastPipelineTraceItem, title: string | null, reason?: string): void {
    item.afterGrounding = title;
    if (!title && reason) {
      item.reason = reason;
    }
  }

  recordAfterRewrite(item: ForecastPipelineTraceItem, title: string | null): void {
    item.afterRewrite = title;
    if (!title) {
      return;
    }

    if (normalizeTraceKey(title) === normalizeTraceKey(item.original)) {
      item.status = "preserved";
    } else {
      item.status = "rewritten";
    }
  }

  recordRemoved(item: ForecastPipelineTraceItem, reason: string, stage: string): void {
    item.status = "removed";
    item.reason = `${stage}: ${reason}`;
  }

  recordRecovered(section: ForecastPipelineSectionKey, title: string): ForecastPipelineTraceItem {
    const item: ForecastPipelineTraceItem = {
      original: title,
      afterRecovery: title,
      final: title,
      status: "recovered",
      generatedBy: "recovery",
    };
    this.sections[section].push(item);
    return item;
  }

  recordFallback(section: ForecastPipelineSectionKey, title: string): ForecastPipelineTraceItem {
    const item: ForecastPipelineTraceItem = {
      original: title,
      final: title,
      status: "fallback",
      generatedBy: "fallback",
    };
    this.sections[section].push(item);
    return item;
  }

  markFinal(item: ForecastPipelineTraceItem, title: string): void {
    item.final = title;

    if (item.status === "removed" || item.status === "recovered" || item.status === "fallback") {
      return;
    }

    if (normalizeTraceKey(title) === normalizeTraceKey(item.original)) {
      item.status = "preserved";
    } else {
      item.status = "rewritten";
    }
  }

  build(): ForecastPipelineTrace {
    return {
      active: this.sections.active.map((entry) => ({ ...entry })),
      hidden: this.sections.hidden.map((entry) => ({ ...entry })),
      blind_spots: this.sections.blind_spots.map((entry) => ({ ...entry })),
    };
  }
}

export function createForecastPipelineTraceCollector(): ForecastPipelineTraceCollector {
  return new ForecastPipelineTraceCollector();
}
