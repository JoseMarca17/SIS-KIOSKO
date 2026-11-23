import { useEffect, useState } from 'react'
import { getOrder, getOrders } from '../services/api'
const money = (value) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(value)

export default function OrdersPage({ id }) {
  const [data, setData] = useState(null), [error, setError] = useState('')
  useEffect(() => { (id ? getOrder(id) : getOrders()).then(setData).catch((err) => setError(err.message)) }, [id])
  if (error) return <main className="state-page"><div className="alert">{error}. Inicia sesión para ver tus pedidos.</div></main>
  if (!data) return <main className="state-page">Cargando pedidos...</main>
  if (id) { const p = data.pedido; return <main className="orders-page"><a href="#pedidos">← Mis pedidos</a><h1>{p.codigo}</h1><p className="status">{p.estado.replaceAll('_', ' ')}</p>{p.detalles.map((d, index) => <div className="checkout-row" key={index}><span>{d.producto} × {d.cantidad}</span><strong>{money(d.subtotal)}</strong></div>)}<div className="total"><span>Total</span><strong>{money(p.total)}</strong></div>{p.estado === 'pendiente_pago' && <a className="primary" href={`#pagar/${p.id}`}>Pagar pedido</a>}</main> }
  return <main className="orders-page"><p className="eyebrow">HISTORIAL</p><h1>Mis pedidos</h1>{!data.pedidos.length ? <p>Aún no tienes pedidos.</p> : data.pedidos.map((p) => <a className="order-card" href={`#pedido/${p.id}`} key={p.id}><span><strong>{p.codigo}</strong><small>{new Date(p.fecha).toLocaleString('es-BO')}</small></span><span><b>{money(p.total)}</b><small className="status">{p.estado.replaceAll('_', ' ')}</small></span></a>)}</main>
}
