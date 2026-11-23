export function parseRoute(hash = window.location.hash) {
  const product = hash.match(/^#producto\/(\d+)/)
  const order = hash.match(/^#pedido\/(\d+)/)
  const payment = hash.match(/^#pagar\/(\d+)/)
  if (product) return { name: 'product', id: product[1] }
  if (order) return { name: 'order', id: order[1] }
  if (payment) return { name: 'payment', id: payment[1] }
  if (hash === '#checkout') return { name: 'checkout' }
  if (hash === '#pedidos') return { name: 'orders' }
  if (hash.startsWith('#admin')) return { name: 'admin', section: hash.split('/')[1] || 'dashboard' }
  return { name: 'home' }
}

import { useEffect, useState } from 'react'

export function useHashRoute() {
  const [route, setRoute] = useState(() => parseRoute())
  useEffect(() => { const update = () => setRoute(parseRoute()); window.addEventListener('hashchange', update); return () => window.removeEventListener('hashchange', update) }, [])
  return route
}
