import { useState } from 'react'
import { register } from '../../services/api'
import Button from '../atoms/Button'

export default function RegisterModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ nombre_completo: '', email: '', telefono: '', password: '', password2: '' })
  const [error, setError] = useState('')
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value })
  async function submit(event) { event.preventDefault(); try { await register(form); onSuccess() } catch (err) { setError(err.message) } }
  return <div className="modal-backdrop"><form className="login-card" onSubmit={submit}><button type="button" className="close" onClick={onClose}>×</button><p className="eyebrow">GOSNACK EMI</p><h2>Crear cuenta</h2>{[['nombre_completo','Nombre completo','text'],['email','Correo','email'],['telefono','Teléfono','tel'],['password','Contraseña','password'],['password2','Confirmar contraseña','password']].map(([key,label,type]) => <label key={key}>{label}<input type={type} required={key !== 'telefono'} value={form[key]} onChange={update(key)} /></label>)}{error && <div className="alert">{error}</div>}<Button className="full">Registrar cuenta</Button></form></div>
}
