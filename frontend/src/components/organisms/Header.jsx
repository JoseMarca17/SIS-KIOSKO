export default function Header({ user, onLogin, onRegister, onLogout, onCart, cartCount }) {
  return <header className="topbar">
    <a className="brand" href="#inicio">Go<span>Snack</span></a>
    <nav><a href="#catalogo">Catálogo</a><a href="#nosotros">Nosotros</a></nav>
    <div className="actions">{user ? <><a className="ghost" href="#pedidos">Mis pedidos</a>{user.rol === 'admin' && <a className="ghost" href="#admin/dashboard">Dashboard</a>}<button className="ghost" onClick={onLogout}>Salir</button></> : <><button className="ghost" onClick={onLogin}>Iniciar sesión</button><button className="ghost" onClick={onRegister}>Registrarse</button></>}<button className="cart-button" onClick={onCart}>Carrito <b>{cartCount}</b></button></div>
  </header>
}
