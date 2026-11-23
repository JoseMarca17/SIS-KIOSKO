import { money } from '../../utils/formatters'

export default function CartDialog({ cart, total, user, onRemove }) {
  return <dialog id="cart"><div className="dialog-heading"><h2>Tu carrito</h2><button onClick={() => document.getElementById('cart').close()}>×</button></div>{!cart.length ? <p>Tu carrito está vacío.</p> : <>{cart.map((item) => <div className="cart-row" key={item.id}><span>{item.nombre} × {item.quantity}</span><strong>{money(item.precio_actual * item.quantity)}</strong><button onClick={() => onRemove(item.id)}>×</button></div>)}<div className="total"><span>Total</span><strong>{money(total)}</strong></div><button className="primary full" onClick={() => { document.getElementById('cart').close(); window.location.hash = '#checkout' }}>Procesar compra</button></>}</dialog>
}
