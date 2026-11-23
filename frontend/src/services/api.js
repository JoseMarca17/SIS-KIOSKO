const json = async (response) => {
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la solicitud')
  return data
}

export async function initCsrf() { await fetch('/api/csrf/', { credentials: 'include' }) }
export async function getCatalogo(params = '') { return json(await fetch(`/api/catalogo/${params}`, { credentials: 'include' })) }
export async function getCategorias() { return json(await fetch('/api/categorias/', { credentials: 'include' })) }
export async function login(email, password) {
  const token = document.cookie.match(/csrftoken=([^;]+)/)?.[1]
  return json(await fetch('/api/auth/login/', { method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json', 'X-CSRFToken': token || ''}, body: JSON.stringify({ email, password }) }))
}
export async function me() { return json(await fetch('/api/auth/me/', { credentials: 'include' })) }
export async function logout() { return json(await fetch('/api/auth/logout/', { method: 'POST', credentials: 'include' })) }
const csrf = () => document.cookie.match(/csrftoken=([^;]+)/)?.[1] || ''
export async function register(payload) { return json(await fetch('/api/auth/register/', { method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrf()}, body: JSON.stringify(payload) })) }
export async function getProduct(id) { return json(await fetch(`/api/productos/${id}/`, { credentials: 'include' })) }
export async function getOrders() { return json(await fetch('/api/pedidos/', { credentials: 'include' })) }
export async function getOrder(id) { return json(await fetch(`/api/pedidos/${id}/`, { credentials: 'include' })) }
export async function createOrder(items, notes) { return json(await fetch('/api/pedidos/checkout/', { method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrf()}, body: JSON.stringify({ items: items.map(item => ({ id: item.id, cantidad: item.quantity, notes: item.notes || '' })), notas: notes }) })) }
export async function getPayment(id) { return json(await fetch(`/api/pagos/${id}/`, { credentials: 'include' })) }
export async function uploadPayment(id, file) { const body = new FormData(); body.append('comprobante', file); return json(await fetch(`/api/pagos/${id}/`, { method: 'POST', credentials: 'include', headers: {'X-CSRFToken': csrf()}, body })) }
export async function adminGet(section) { return json(await fetch(`/api/admin/${section}/`, { credentials: 'include' })) }
export async function adminMutate(section, method, payload, id = '') { return json(await fetch(`/api/admin/${section}/${id ? `${id}/` : ''}`, { method, credentials: 'include', headers: {'Content-Type': 'application/json', 'X-CSRFToken': csrf()}, body: JSON.stringify(payload) })) }
