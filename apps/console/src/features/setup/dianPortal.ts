/** The DIAN portal where an issuer registers its software and finds its test set. */
export const habilitacionPortal = "https://catalogo-vpfe-hab.dian.gov.co";

/** A screenshot of the DIAN portal, with every identifying value covered. */
export type PortalCapture = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** When it was taken, as shown to the person: the portal changes often. */
  capturedAt: string;
};

const capturedAt = "noviembre de 2026";

export const portalCaptures = {
  contributor: {
    src: "/images/dian/facturador-electronico.webp",
    width: 1200,
    height: 461,
    alt: "Página «Facturador electrónico» del portal de habilitación, con el botón «Configurar modos de operación».",
    capturedAt,
  },
  operationModes: {
    src: "/images/dian/modos-operacion.webp",
    width: 1200,
    height: 510,
    alt: "Página «Configurar modos de operación» con «Software propio» elegido, los campos del software y el listado de modos de operación asociados.",
    capturedAt,
  },
  testRanges: {
    src: "/images/dian/rangos-prueba.webp",
    width: 1200,
    height: 315,
    alt: "Página «Rangos de numeración de prueba» con el rango SETP y su llave técnica.",
    capturedAt,
  },
} satisfies Record<string, PortalCapture>;
