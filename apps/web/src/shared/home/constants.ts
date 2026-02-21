export type ProductHighlight = {
  title: string
  description: string
  metric: string
  outcome: string
  className: string
}

export type PanelSnapshot = {
  sales: number
  confirmedRevenue: number
  pendingRevenue: number
  receivableSales: number
  totalDay: string
  confirmationRate: string
  orderStatus: string
  orderStatusTone: string
  orderTotal: string
}

export const productHighlights: ProductHighlight[] = [
  {
    title: 'Gestion de catálogo',
    description:
      'Centraliza productos, variantes, precios y contenido desde un panel unificado.',
    metric: '+35% velocidad de carga',
    outcome: 'Pública catálogo 2.4x más rápido en todos tus canales.',
    className: 'md:col-span-2',
  },
  {
    title: 'Inventario en tiempo real',
    description:
      'Sincroniza stock entre tienda online, WhatsApp, Messenger y puntos de venta.',
    metric: '99.9% precisión de stock',
    outcome: 'Reduce quiebres y sobreventas en una sola vista.',
    className: '',
  },
  {
    title: 'Gestión de pedidos',
    description:
      'Automatiza los estados, envíos y devoluciones con reglas personalizadas.',
    metric: '3x menos tareas manuales',
    outcome: 'Disminuye tiempos operativos y errores de seguimiento.',
    className: '',
  },
  {
    title: 'Canales de venta',
    description:
      'Responde y vende desde WhatsApp, Messenger e Instagram sin perder contexto.',
    metric: 'Vista unificada de conversaciones',
    outcome: 'Acelera cierres con historial compartido por canal.',
    className: 'md:col-span-2',
  },
  {
    title: 'Reportes y rentabilidad',
    description:
      'Mide ingresos, margen y utilidad por canal, producto y campaña en segundos.',
    metric: 'KPIs listos para acción',
    outcome: 'Decide con claridad que canal impulsa tu utilidad neta.',
    className: 'md:col-span-2 lg:col-span-1',
  },
]

export const panelSnapshots: PanelSnapshot[] = [
  {
    sales: 5,
    confirmedRevenue: 250_000,
    pendingRevenue: 0,
    receivableSales: 0,
    totalDay: '$ 250.000',
    confirmationRate: '+100,0%',
    orderStatus: 'Entregado',
    orderStatusTone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    orderTotal: '$ 50.000',
  },
  {
    sales: 6,
    confirmedRevenue: 198_000,
    pendingRevenue: 52_000,
    receivableSales: 1,
    totalDay: '$ 250.000',
    confirmationRate: '+76,0%',
    orderStatus: 'Pendiente',
    orderStatusTone: 'bg-amber-500/12 text-amber-600 dark:text-amber-300',
    orderTotal: '$ 47.000',
  },
]
