import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { Environment } from "~/lib/api/types";
import { useSettled } from "~/lib/useSettled";

import { customerSearchQuery, productSearchQuery } from "./queries";
import { searchLengthMax } from "./schema";

function useSearchText() {
  const [text, setText] = useState("");
  // The input stops at the limit; slicing here keeps a pasted text from ever reaching the server too long.
  return { q: useSettled(text.trim().slice(0, searchLengthMax), 300), setText };
}

/**
 * The saved customers that match what the person types, searched on the server. {@code saved} tells whether
 * the catalog has any, so an empty catalog shows no picker at all.
 */
export function useCustomerSearch(environment: Environment) {
  const { q, setText } = useSearchText();
  const { data } = useQuery({
    ...customerSearchQuery(environment, q),
    placeholderData: keepPreviousData,
  });
  const items = data?.items ?? [];
  return { items, saved: q !== "" || items.length > 0, setText };
}

export function useProductSearch(environment: Environment) {
  const { q, setText } = useSearchText();
  const { data } = useQuery({
    ...productSearchQuery(environment, q),
    placeholderData: keepPreviousData,
  });
  const items = data?.items ?? [];
  return { items, saved: q !== "" || items.length > 0, setText };
}
