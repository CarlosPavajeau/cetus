import type { ReactNode } from "react";

export function AuthLayout({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <section className="flex flex-col justify-center gap-6 p-6 md:p-10">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
          <p className="font-heading text-sm font-semibold tracking-tight">Cetus</p>
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{lead}</p>
          </div>
          {children}
        </div>
      </section>
      <aside className="hidden items-end bg-muted p-10 lg:flex" aria-hidden="true">
        <p className="max-w-md font-heading text-lg text-muted-foreground">
          Factura electrónica para Colombia, como una API. Tú construyes el producto; nosotros
          hablamos con la DIAN.
        </p>
      </aside>
    </main>
  );
}
