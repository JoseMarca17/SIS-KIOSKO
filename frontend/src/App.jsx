import { useEffect, useState } from 'react'
import { getCatalogo, getCategorias, initCsrf, logout, me } from './services/api'
import Header from './components/organisms/Header'
import CartDialog from './components/organisms/CartDialog'
import LoginModal from './components/organisms/LoginModal'
import RegisterModal from './components/organisms/RegisterModal'
import Footer from './components/organisms/Footer'
import { useCartStore } from './store/cartStore'
import { useHashRoute } from './routers/route'
import HomePage from './pages/HomePage'
import ProductDetailPage from './pages/ProductDetailPage'
import CheckoutPage from './pages/CheckoutPage'
import OrdersPage from './pages/OrdersPage'
import PaymentPage from './pages/PaymentPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const { cart, add: addToCart, remove: removeFromCart, clear: clearCart, total, count } = useCartStore()
  const [user, setUser] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initCsrf().then(() => Promise.all([getCategorias(), me()]))
      .then(([catalog, session]) => { setCategories(catalog.categorias); setUser(session.usuario) })
      .catch((err) => setError(err.message))
  }, [])
  const route = useHashRoute()

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (category) params.set('categoria', category)
    if (query) params.set('q', query)
    getCatalogo(`?${params}`).then((data) => setProducts(data.productos))
      .catch((err) => setError(err.message)).finally(() => setLoading(false))
  }, [category, query])

  async function signOut() { await logout(); setUser(null) }

  const productMatch = route.name === 'product'
  const orderMatch = route.name === 'order'
  const paymentMatch = route.name === 'payment'
  let content = <HomePage products={products} categories={categories} category={category} query={query} loading={loading} error={error} onCategory={setCategory} onQuery={setQuery} onAdd={addToCart} />
  if (productMatch) content = <ProductDetailPage id={route.id} onAdd={addToCart} />
  else if (route.name === 'checkout') content = <CheckoutPage cart={cart} total={total} user={user} onOrderCreated={(id) => { clearCart(); window.location.hash = `#pagar/${id}` }} />
  else if (route.name === 'orders') content = <OrdersPage />
  else if (orderMatch) content = <OrdersPage id={route.id} />
  else if (paymentMatch) content = <PaymentPage id={route.id} />
  else if (route.name === 'admin') content = <AdminPage section={route.section} />
  return <>
    <Header user={user} onLogin={() => setShowLogin(true)} onRegister={() => setShowRegister(true)} onLogout={signOut} onCart={() => document.getElementById('cart').showModal()} cartCount={count} />
    {content}
    <CartDialog cart={cart} total={total} user={user} onRemove={removeFromCart} />
    {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={(loggedUser) => { setUser(loggedUser); setShowLogin(false) }} />}
    {showRegister && <RegisterModal onClose={() => setShowRegister(false)} onSuccess={() => { setShowRegister(false); setShowLogin(true) }} />}
    <Footer />
  </>
}
