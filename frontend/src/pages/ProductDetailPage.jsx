import { useEffect, useState } from 'react'
import { getProduct } from '../services/api'
import ProductCard from '../components/molecules/ProductCard'
const money = (value) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(value)

export default function ProductDetailPage({ id, onAdd }) {
  const [data, setData] = useState(null), [error, setError] = useState('')
  useEffect(() => { getProduct(id).then(setData).catch((err) => setError(err.message)) }, [id])
  if (error) return <main className="state-page"><div className="alert">{error}</div></main>
  if (!data) return <main className="state-page">Cargando producto...</main>
  const { producto, relacionados } = data
  return <main className="detail-page"><a href="#catalogo" className="back-link">← Volver al catálogo</a><section className="detail-grid"><div className="detail-image">{producto.imagen ? <img src={producto.imagen} alt={producto.nombre} /> : <span>🍪</span>}</div><div><p className="eyebrow">{producto.categoria}</p><h1>{producto.nombre}</h1><p className="detail-description">{producto.descripcion}</p><div className="detail-price">{money(producto.precio_actual)} {producto.oferta && <del>{money(producto.precio_base)}</del>}</div><p className="stock">{producto.stock > 0 ? `${producto.stock} disponibles` : 'Agotado'}</p><button className="primary" disabled={!producto.stock} onClick={() => onAdd(producto)}>Añadir al carrito</button></div></section><h2 className="related-title">También te puede gustar</h2><div className="grid">{relacionados.map((item) => <ProductCard key={item.id} product={item} onAdd={onAdd} />)}</div></main>
}
