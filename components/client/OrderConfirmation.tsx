'use client'

import type { Order } from '@/types'

interface Props {
  order: Order
  onClose: () => void
}

const STATUS_LABELS: Record<string, string> = {
  pending:    'En attente de confirmation',
  confirmed:  'Confirmée',
  preparing:  'En préparation',
  on_the_way: 'En route',
  delivered:  'Livrée',
  cancelled:  'Annulée',
}

export default function OrderConfirmation({ order, onClose }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-screen px-6 text-center">
      <div className="text-6xl mb-6">🎉</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Commande passée !</h1>
      <p className="text-gray-500 mb-6">
        Commande #{order.id.slice(-6).toUpperCase()}
      </p>

      <div className="bg-white rounded-2xl p-5 w-full shadow-sm mb-6 text-left space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Statut</span>
          <span className="font-medium text-blue-600">{STATUS_LABELS[order.status]}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Adresse</span>
          <span className="font-medium text-gray-900 text-right max-w-[60%]">{order.delivery_address}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Sous-total</span>
          <span className="font-medium">{Number(order.subtotal).toFixed(2)}€</span>
        </div>
        {Number(order.delivery_fee) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Livraison</span>
            <span className="font-medium">{Number(order.delivery_fee).toFixed(2)}€</span>
          </div>
        )}
        <div className="flex justify-between font-bold border-t border-gray-100 pt-3">
          <span>Total</span>
          <span>{Number(order.total).toFixed(2)}€</span>
        </div>
      </div>

      <p className="text-sm text-gray-400 mb-8">
        Tu recevras une notification Telegram quand ta commande sera prise en charge.
      </p>

      <button
        onClick={onClose}
        className="w-full bg-blue-600 text-white rounded-2xl py-4 font-semibold active:scale-95 transition-transform"
      >
        Fermer
      </button>
    </div>
  )
}
