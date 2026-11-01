import { type } from "arktype";

import type { CardSetup } from "~/lib/api/types";

import type { CardForm } from "./schema";

const tokenized = type({
  data: {
    id: "string",
    brand: "string",
    last_four: "string",
    exp_month: /^\d{1,2}$/,
    exp_year: /^\d{2,4}$/,
  },
});

export type CardToken = {
  id: string;
  brand: string;
  lastFour: string;
  expMonth: number;
  expYear: number;
};

export type TokenizeResult = { ok: true; token: CardToken } | { ok: false; message: string };

const refused = "Wompi no aceptó los datos de la tarjeta. Revísalos e inténtalo de nuevo.";
const unreachable = "No pudimos comunicarnos con Wompi. Revisa tu conexión e inténtalo de nuevo.";

/**
 * Sends the card from the browser straight to Wompi, with the public key, and returns its token: the number and
 * the security code never reach Cetus.
 */
export async function tokenizeCard(setup: CardSetup, card: CardForm): Promise<TokenizeResult> {
  let response: Response;
  try {
    response = await fetch(setup.tokenizationUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${setup.publicKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: card.number,
        cvc: card.cvc,
        exp_month: card.expiry.month,
        exp_year: card.expiry.year,
        card_holder: card.holder,
      }),
    });
  } catch {
    return { ok: false, message: unreachable };
  }
  if (!response.ok) {
    return { ok: false, message: response.status >= 500 ? unreachable : refused };
  }
  const body = tokenized(await response.json());
  if (body instanceof type.errors) {
    return { ok: false, message: unreachable };
  }
  return {
    ok: true,
    token: {
      id: body.data.id,
      brand: body.data.brand,
      lastFour: body.data.last_four,
      expMonth: Number(body.data.exp_month),
      expYear: Number(body.data.exp_year) + (body.data.exp_year.length === 2 ? 2000 : 0),
    },
  };
}
