"use client";

import { useEffect } from "react";

// Clears the Future Selves new-notification badge from localStorage when the
// user visits the dedicated Future Selves page.
export function FutureSelvesVisitClear() {
  useEffect(() => {
    localStorage.removeItem("fp:future-selves:new");
  }, []);

  return null;
}
