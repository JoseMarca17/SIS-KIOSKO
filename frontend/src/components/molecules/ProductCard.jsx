import { money } from '../../utils/formatters'

export default function ProductCard({ product, onAdd }) {
  return <article className="card"><div className="product-image">{product.imagen ? <img src={product.imagen} alt={product.nombre} /> : <span>🍪</span>}{product.oferta && <small>OFERTA</small>}</div><div className="card-body"><p className="category">{product.categoria}</p><h3>{product.nombre}</h3><p className="description">{product.descripcion}</p><div className="card-footer"><strong>{money(product.precio_actual)}</strong><div className="card-actions"><a href={`#producto/${product.id}`}>Ver</a><button aria-label={`Agregar ${product.nombre}`} onClick={() => onAdd(product)}>+</button></div></div></div></article>
}
