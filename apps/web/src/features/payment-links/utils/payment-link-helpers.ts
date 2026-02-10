import type { OrderItem } from '@cetus/api-client/types/orders'
import { formatDuration, intervalToDuration } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Formats the time remaining until a payment link expires
 * @param expiresAt - ISO 8601 datetime string
 * @returns Human-readable Spanish text (e.g., "23 horas", "3 horas y 30 minutos")
 */
export function formatTimeRemaining(expiresAt: string): string {
  const now = new Date()
  const expiration = new Date(expiresAt)

  const duration = intervalToDuration({ start: now, end: expiration })

  return formatDuration(duration, {
    format: ['days', 'hours', 'minutes'],
    locale: es,
  })
}

/**
 * Calculates the total quantity of items in an order
 * @param items - Array of order items
 * @returns Sum of all item quantities
 */
export function calculateTotalQuantity(items: OrderItem[]): number {
  if (!items || items.length === 0) {
    return 0
  }

  return items.reduce((total, item) => total + item.quantity, 0)
}

/**
 * Formats a phone number for WhatsApp URLs
 * Removes non-digit characters and adds Colombian country code if missing
 * @param phone - Phone number in any format
 * @returns Formatted number for wa.me URLs (e.g., "573001234567")
 */
export function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '')

  // Add Colombian country code if missing
  if (!digitsOnly.startsWith('57')) {
    return `57${digitsOnly}`
  }

  return digitsOnly
}

/**
 * Generates a WhatsApp message template for payment link sharing
 * @param params - Message parameters
 * @returns Formatted message with emojis
 */
export function generateWhatsAppMessage(params: {
  customerName: string
  totalQuantity: number
  total: string
  paymentUrl: string
}): string {
  const { customerName, totalQuantity, total, paymentUrl } = params

  return `¡Hola ${customerName}! 👋

Aquí está el link para pagar tu pedido:

📦 ${totalQuantity} producto(s)
💰 Total: ${total}

Paga de forma segura aquí:
${paymentUrl}

El link vence en 24 horas.

¡Gracias por tu compra! 🙌`
}
