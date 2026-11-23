export function Alert({ children }) { return <div className="alert" role="alert">{children}</div> }
export function Loading({ children = 'Cargando...' }) { return <div className="state-page" aria-live="polite">{children}</div> }
