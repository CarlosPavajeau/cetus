import { queryOptions } from "@tanstack/react-query";

import { canManageContacts, listContacts } from "./server";

export const contactsQuery = queryOptions({
  queryKey: ["contacts"],
  queryFn: () => listContacts(),
});

export const canManageContactsQuery = queryOptions({
  queryKey: [...contactsQuery.queryKey, "can-manage"],
  queryFn: () => canManageContacts(),
});
