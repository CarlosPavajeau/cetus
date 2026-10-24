import { useEffect, useState } from "react";

/** The value once it has stopped changing for a moment, so typing does not call the API on every key. */
export function useSettled<T>(value: T, delayMs: number) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}
