import type { KeyboardEvent } from "react";
import { useSyncExternalStore } from "react";

import { Kbd, KbdGroup } from "~/components/ui/kbd";

const noChanges = () => () => {};

/** ⌘ on Apple keyboards, Ctrl elsewhere; the server renders Ctrl. */
function useModifierKey() {
  return useSyncExternalStore(
    noChanges,
    () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl"),
    () => "Ctrl",
  );
}

/** The keys that send a dialog's form, shown inside its submit button. */
export function SubmitShortcut() {
  const modifier = useModifierKey();
  return (
    <KbdGroup className="ml-1 max-sm:hidden" aria-hidden>
      <Kbd>{modifier}</Kbd>
      <Kbd>↵</Kbd>
    </KbdGroup>
  );
}

/** Sends the form on ⌘ Enter or Ctrl Enter from its message box, where Enter alone adds a line. */
export function submitOnShortcut(submit: () => unknown) {
  return (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void submit();
    }
  };
}
