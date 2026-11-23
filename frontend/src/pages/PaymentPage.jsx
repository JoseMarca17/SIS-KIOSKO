import { useEffect, useRef, useState } from 'react'
import { getPayment, uploadPayment } from '../services/api'
const money = (value) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(value)

export default function PaymentPage({ id }) {
  const [data, setData] = useState(null), [file, setFile] = useState(null), [message, setMessage] = useState(''), [error, setError] = useState(''), input = useRef()
  useEffect(() => { getPayment(id).then(setData).catch((err) => setError(err.message)) }, [id])
  async function submit(event) { event.preventDefault(); if (!file) return setError('Selecciona el comprobante'); try { await uploadPayment(id, file); setMessage('Comprobante enviado. El kiosko validará tu pago.') } catch (err) { setError(err.message) } }
  if (error && !data) return <main className="state-page"><div className="alert">{error}</div></main>
  if (!data) return <main className="state-page">Cargando pago...</main>
  return <main className="payment-page"><p className="eyebrow">PASO 2 DE 3</p><h1>Paga tu pedido</h1><div className="payment-grid"><section className="checkout-card"><h2>Transferencia QR</h2>{data.qr.imagen && <img className="qr-image" src={data.qr.imagen} alt="QR de pago" />}<h3>{data.qr.banco}</h3><p>{data.qr.titular}</p><strong>{money(data.pedido.total)}</strong></section><section className="checkout-card"><h2>Sube tu comprobante</h2><input ref={input} type="file" accept="image/*" onChange={(event) => setFile(event.target.files[0])} /><p className="help">JPG, PNG o WEBP. Máximo 5MB.</p>{file && <img className="upload-preview" src={URL.createObjectURL(file)} alt="Vista previa" />}<button className="primary full" onClick={submit}>Enviar comprobante</button>{message && <div className="success">{message}</div>}{error && <div className="alert">{error}</div>}</section></div></main>
}
