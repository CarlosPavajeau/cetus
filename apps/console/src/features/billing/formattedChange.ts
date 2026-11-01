import type { ChangeEvent } from "react";
import { flushSync } from "react-dom";

import { reformat } from "./cardInput";

/**
 * An onChange that formats the input's value and puts the caret back on the digit it was on, once React has
 * rendered the formatted value.
 */
export function formattedChange(
  format: (value: string) => string,
  previous: string,
  onChange: (value: string) => void,
) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const inputType = event.nativeEvent instanceof InputEvent ? event.nativeEvent.inputType : null;
    const deletion =
      inputType === "deleteContentBackward"
        ? "backward"
        : inputType === "deleteContentForward"
          ? "forward"
          : null;
    const next = reformat(
      input.value,
      input.selectionStart ?? input.value.length,
      previous,
      format,
      deletion,
    );
    // Rendered now, not on a later frame: the next key may already be on its way.
    flushSync(() => onChange(next.value));
    input.setSelectionRange(next.caret, next.caret);
  };
}
