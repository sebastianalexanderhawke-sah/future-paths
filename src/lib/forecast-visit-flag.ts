// Marks that a path was just chosen (and a forecast generated) for a moment,
// so the moment page can hold off on showing the check-in form for that one
// render only. Implemented as a query parameter on the post-selection
// redirect target rather than a cookie with a fixed expiry — the suppression
// applies exactly to the response that follows path selection. As soon as
// the user navigates anywhere else and returns, the parameter is gone and
// the check-in form shows normally. No timer involved.
export const JUST_CHOSEN_PATH_PARAM = "justChosenPath";

export function withJustChosenPathFlag(path: string): string {
  return `${path}?${JUST_CHOSEN_PATH_PARAM}=1`;
}
