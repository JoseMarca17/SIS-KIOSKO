import { useState } from 'react'
import { login } from '../../services/api'
import Button from '../atoms/Button'
import Field from '../atoms/Field'

export default function LoginModal({ onClose, onSuccess }) {
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState('')
  async function submit(event) { event.preventDefault(); try { const result = await login(email, password); onSuccess(result.usuario) } catch (err) { setError(err.message) } }
  return <div className="modal-backdrop"><form className="login-card" onSubmit={submit}><button type="button" className="close" onClick={onClose}>×</button><p className="eyebrow">BIENVENIDO</p><h2>Inicia sesión</h2><Field label="Correo" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /><Field label="Contraseña" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />{error && <div className="alert">{error}</div>}<Button className="full">Entrar</Button></form></div>
}
