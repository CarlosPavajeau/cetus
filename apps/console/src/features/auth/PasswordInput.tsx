import { EyeIcon, EyeOffIcon } from "lucide-react";
import { type ComponentProps, useState } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "~/components/ui/input-group";

/** Password field with an icon button that shows or hides what was typed. */
export function PasswordInput(props: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <InputGroup className="h-11">
      <InputGroupInput {...props} type={visible ? "text" : "password"} className="h-full px-3" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-controls={props.id}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
