"use server";

import { redirect } from "next/navigation";

import { choosePath, generatePaths } from "@/lib/paths";
import { getMoment } from "@/lib/moments";
import { runFutureForecastAction } from "@/actions/future-forecast";
import { decodeNativePathFields } from "@/components/home/path-native-title";
import { markForecastJustGenerated } from "@/lib/forecast-visit-flag";

function redirectWithError(momentId: string, error: string): never {
  redirect(`/moments/${momentId}?error=${encodeURIComponent(error)}`);
}

export async function generatePathsAction(formData: FormData) {
  const momentId = formData.get("momentId");

  if (typeof momentId !== "string") {
    redirect("/moments");
  }

  const result = await generatePaths(momentId);

  if ("error" in result) {
    redirectWithError(momentId, result.error);
  }

  redirect(`/moments/${momentId}`);
}

export async function choosePathAction(formData: FormData) {
  const momentId = formData.get("momentId");
  const pathId = formData.get("pathId");

  if (typeof momentId !== "string" || typeof pathId !== "string") {
    redirect("/moments");
  }

  const result = await choosePath(momentId, pathId);

  if ("error" in result) {
    redirectWithError(momentId, result.error);
  }

  const momentResult = await getMoment(momentId);
  if (!("error" in momentResult)) {
    const { nativeTitle, description } = decodeNativePathFields(result.path.description);
    await runFutureForecastAction({
      situationText: momentResult.moment.title,
      contextSummary: momentResult.moment.description ?? null,
      momentId,
      selectedPath: {
        id: result.path.id,
        title: nativeTitle ?? result.path.description,
        description,
        benefits: result.path.benefits,
        consequences: result.path.consequences,
        future_shift: result.path.future_shift,
        themes: result.path.themes,
      },
    });
    await markForecastJustGenerated(momentId);
  }

  redirect(`/moments/${momentId}`);
}
