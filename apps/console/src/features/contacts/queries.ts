import { queryOptions } from "@tanstack/react-query";

import { listContacts } from "./server";

export const contactsQuery = queryOptions({
  queryKey: ["contacts"],
  queryFn: () => listContacts(),
});
