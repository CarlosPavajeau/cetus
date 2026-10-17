import type { ReactNode } from "react";

export function AuthLayout({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  return (
    <main className="auth">
      <section className="auth-panel">
        <p className="brand">Cetus</p>
        <h1>{title}</h1>
        <p className="lead">{lead}</p>
        {children}
      </section>
      <aside className="auth-aside" aria-hidden="true">
        <p className="aside-quote">
          Factura electrónica para Colombia, como una API. Tú construyes el producto; nosotros hablamos con la DIAN.
        </p>
      </aside>
    </main>
  );
}
