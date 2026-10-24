import { SearchIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/components/ui/input-group";
import { Spinner } from "~/components/ui/spinner";

/** Searches the catalog on the server; the list shows what matches, page by page. */
export function CatalogSearch({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <search>
      <InputGroup className="md:w-72">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={100}
          placeholder={placeholder}
          aria-label={placeholder}
        />
      </InputGroup>
    </search>
  );
}

export function LoadMore({
  hasMore,
  loading,
  onLoad,
}: {
  hasMore: boolean;
  loading: boolean;
  onLoad: () => void;
}) {
  if (!hasMore) {
    return null;
  }
  return (
    <div className="flex justify-center">
      <Button variant="outline" onClick={onLoad} disabled={loading}>
        {loading && <Spinner data-icon="inline-start" />}
        {loading ? "Cargando…" : "Ver más"}
      </Button>
    </div>
  );
}
