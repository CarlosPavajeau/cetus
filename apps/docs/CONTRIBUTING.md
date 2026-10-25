# Documentación de Cetus

Sitio estático con Fumadocs (guías en `content/docs`) y Scalar (`/reference`, desde
`public/openapi.public.json`). Se publica en `https://cetus-docs.cantte.com`.

## Trabajar en local

```bash
mise run docs                 # :3001, contra la API de producción
VITE_API_URL=http://localhost:8080 mise run docs   # la referencia prueba contra la API local
pnpm --filter @cetus/docs check
pnpm --filter @cetus/docs build   # prerenderiza todo; un enlace interno roto rompe el build
```

## La referencia sale del código

- Los textos de cada endpoint y campo viven en las anotaciones de `apps/api` (`@Operation`, `@Schema`), y la
  información general, las respuestas de error compartidas y los ejemplos en
  `apps/api/src/main/resources/META-INF/openapi.yaml`. Los valores de los enums del dominio se describen en
  `SchemaDescriptions`.
- Después de cambiar la API pública, regenera la especificación y súbela en el mismo PR:
  `mise run docs-spec`. El workflow de contrato falla si quedó desactualizada.
- La colección de Postman se genera en cada build (`scripts/postman.mjs`); no se versiona.

## Capturas de la consola

Las imágenes de `public/images/consola` las toma `apps/console/tests/screenshots`. Con el stack arriba
(`mise run dev`):

```bash
pnpm --filter @cetus/console screenshots
```

Vuelve a tomarlas cuando cambien las pantallas que muestran.

## Estilo

- Tutea al lector y usa oraciones cortas, en voz activa.
- Explica cada término de la DIAN la primera vez que aparece en una página (CUFE, habilitación, resolución
  de numeración).
- Escribe los identificadores tal como están en la API, en inglés: `identificationNumber`, `ACCEPTED`,
  `invoice.accepted`.
- Nombra los botones y menús de la consola en negrita y con su texto exacto: **Crear llave**.
- Todo ejemplo debe ser completo y copiable, y funcionar contra la simulación. Pruébalo antes de publicarlo.
- Marca con `<Sandbox>` lo que solo aplica al modo de simulación.
- Enlaza a la referencia con el ancla que genera Scalar, por ejemplo
  `/reference#tag/facturas/POST/v1/invoices`.
