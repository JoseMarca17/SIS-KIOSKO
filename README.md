# GoSnack — React + Vite + Django + Supabase

Nueva versión separada del proyecto original `kiosko`. El original no se modifica.

## Arquitectura

- `frontend/`: React + Vite. Consume la API de Django y no contiene secretos de Supabase.
- `backend/apps/` y `backend/kiosko_project/`: Django, autenticación, reglas de negocio, admin y API JSON.
- `backend/supabase/schema.sql`: esquema SQL completo de referencia.
- `backend/supabase/seed.sql`: datos del fixture `datos_limpios.json` para usar después de las migraciones de Django.
- Supabase se usa como PostgreSQL administrado; Django sigue siendo el backend y dueño de las reglas.

### Estructura del frontend

```text
frontend/src/
├── assets/                 # recursos importables de Vite
├── components/
│   ├── atoms/              # Button, Field, Feedback
│   ├── molecules/          # ProductCard, SectionHeading
│   └── organisms/          # Header, carrito, modales y Footer
├── pages/                  # pantallas de tienda y administración
├── routers/                # navegación basada en hash
├── services/               # cliente HTTP de la API Django
├── store/                  # estado persistente del carrito
├── styles/                 # estilos globales y tokens visuales
├── supabase/               # límite documentado de integración
├── utils/                  # moneda, fechas y utilidades
├── App.jsx
└── main.jsx
```

## Instalación

1. Crea un proyecto en Supabase y copia la URI de `Project Settings > Database > Connection string`.
2. Entra a `backend/`, copia `.env.example` a `.env` y completa `DATABASE_URL`.
3. Backend:

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py loaddata datos_limpios.json
python manage.py runserver
```

En Windows activa el entorno con `venv\Scripts\activate`.

> Si usas las migraciones de Django, después puedes ejecutar `backend/supabase/seed.sql` desde el SQL Editor para cargar los datos. `schema.sql` es la alternativa SQL completa para revisar/crear el esquema de negocio; no ejecutes ambos archivos sobre la misma base.

4. Frontend:

```bash
cd kiosko-react-supabase/frontend
npm install
npm run dev
```

Abre `http://localhost:5173`. Vite redirige `/api` y `/media` al backend en `localhost:8000`.

## Diagnóstico del proyecto anterior

- El frontend estaba acoplado a plantillas Django y JavaScript global; ahora queda separado y componible.
- La configuración anterior estaba atada a MySQL; ahora admite Supabase PostgreSQL mediante `DATABASE_URL`.
- Se agregó CORS/CSRF para desarrollo React + Django.
- Se conservaron los modelos y módulos de pedidos, pagos, inventario y dashboard para no perder reglas de negocio.
- La API pública de catálogo, autenticación, registro, pedidos, checkout y comprobantes ya está disponible en `/api/`.

## Siguiente paso recomendado

Agregar pruebas automatizadas de API y migrar el panel administrativo completo a pantallas React con endpoints CRUD dedicados. No conviene poner la `service_role` de Supabase en React.
