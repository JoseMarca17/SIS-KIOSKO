import { useCallback, useMemo, useState } from 'react'

function readCart() {
  try { return JSON.parse(sessionStorage.getItem('carrito') || '[]') } catch { return [] }
}

export function useCartStore() {
  const [cart, setCart] = useState(readCart)
  const persist = useCallback((next) => { setCart(next); sessionStorage.setItem('carrito', JSON.stringify(next)) }, [])
  const add = useCallback((product) => persist(cart.some((item) => item.id === product.id)
    ? cart.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
    : [...cart, { ...product, quantity: 1 }]), [cart, persist])
  const remove = useCallback((id) => persist(cart.filter((item) => item.id !== id)), [cart, persist])
  const clear = useCallback(() => persist([]), [persist])
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.precio_actual * item.quantity, 0), [cart])
  const count = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart])
  return { cart, add, remove, clear, total, count }
}
