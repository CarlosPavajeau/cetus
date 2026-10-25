import { REGEXP_ONLY_DIGITS, REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import type { ComponentProps } from "react";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "~/components/ui/input-otp";

type CodeInputProps = Omit<
  ComponentProps<typeof InputOTP>,
  "maxLength" | "pattern" | "render" | "children"
>;

function Slots({ from, to, invalid }: { from: number; to: number; invalid?: boolean }) {
  return (
    <InputOTPGroup className="min-w-0 flex-1">
      {Array.from({ length: to - from }, (_, offset) => (
        <InputOTPSlot
          key={from + offset}
          index={from + offset}
          aria-invalid={invalid}
          className="h-10 min-w-0 flex-1 font-mono text-base"
        />
      ))}
    </InputOTPGroup>
  );
}

/** The 6 digits of an authenticator app, in two groups of three. */
export function TotpCodeInput(props: CodeInputProps) {
  const invalid = props["aria-invalid"] === true;
  return (
    <InputOTP
      {...props}
      maxLength={6}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      autoComplete="one-time-code"
      pasteTransformer={(pasted) => pasted.replace(/\s/g, "")}
      containerClassName="w-full max-w-64"
    >
      <Slots from={0} to={3} invalid={invalid} />
      <InputOTPSeparator />
      <Slots from={3} to={6} invalid={invalid} />
    </InputOTP>
  );
}

/**
 * A Better Auth backup code, shown as its two halves of five characters. The dash between them is
 * not typed: the value holds the 10 characters, and pasting a code with its dash still works.
 */
export function BackupCodeInput(props: CodeInputProps) {
  const invalid = props["aria-invalid"] === true;
  return (
    <InputOTP
      {...props}
      maxLength={10}
      pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
      inputMode="text"
      autoComplete="off"
      pasteTransformer={(pasted) => pasted.replace(/[\s-]/g, "")}
      containerClassName="w-full"
    >
      <Slots from={0} to={5} invalid={invalid} />
      <InputOTPSeparator />
      <Slots from={5} to={10} invalid={invalid} />
    </InputOTP>
  );
}
