export const money = (value) => new Intl.NumberFormat('es-BO', {
  style: 'currency', currency: 'BOB',
}).format(Number(value) || 0)

export const localDate = (value) => value
  ? new Date(value).toLocaleString('es-BO')
  : ''
