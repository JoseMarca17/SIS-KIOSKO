import { useState } from 'react'
import { createOrder } from '../services/api'
const money = (value) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(value)

export default function CheckoutPage({ cart, total, user, onOrderCreated }) {
  const [notes, setNotes] = useState(''), [error, setError] = useState(''), [saving, setSaving] = useState(false)
  async function submit() { if (!user) { setError('Debes iniciar sesión antes de confirmar el pedido'); return } if (!cart.length) { setError('Tu carrito está vacío'); return } setSaving(true); try { const result = await createOrder(cart, notes); onOrderCreated(result.pedido_id) } catch (err) { setError(err.message) } finally { setSaving(false) } }
  return <main className="checkout-page"><p className="eyebrow">PASO 1 DE 3</p><h1>Confirmar pedido</h1><div className="checkout-card"><h2>Resumen de la orden</h2>{cart.length ? cart.map((item) => <div className="checkout-row" key={item.id}><span>{item.nombre} × {item.quantity}</span><strong>{money(item.precio_actual * item.quantity)}</strong></div>) : <p>Tu carrito está vacío.</p>}<div className="total"><span>Total</span><strong>{money(total)}</strong></div></div><label className="notes-label">Indicaciones especiales<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ej: sin mayonesa..." /></label>{error && <div className="alert">{error}</div>}<div className="checkout-actions"><a href="#catalogo" className="secondary">Seguir comprando</a><button className="primary" disabled={saving} onClick={submit}>{saving ? 'Procesando...' : 'Confirmar y generar pago →'}</button></div></main>
}
