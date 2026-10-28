import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "theme";

/**
 * Runs in the head before the first paint, so a dark page never flashes light. Without a stored choice it
 * follows the system; storage can throw (blocked cookies), and then it also follows the system.
 */
export const themeScript = `(() => {
  let stored = null;
  try { stored = localStorage.getItem("${THEME_STORAGE_KEY}"); } catch {}
  const dark = stored === "dark" || (stored !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
})();`;

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function themeCurrent(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** `null` on the server and during hydration: only the browser knows the theme. */
export function useTheme(): Theme | null {
  return useSyncExternalStore(subscribe, themeCurrent, () => null);
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    // The choice still applies to this page; it only fails to outlive it.
    console.warn("The theme could not be stored", error);
  }
  // Without this every color transition runs at once and the page smears into the new theme. Reading a
  // computed style applies the new colors while the override is still in place.
  const transitionsOff = document.createElement("style");
  transitionsOff.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.append(transitionsOff);
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  getComputedStyle(document.body).getPropertyValue("color");
  requestAnimationFrame(() => transitionsOff.remove());
}
