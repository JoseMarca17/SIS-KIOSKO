BEGIN;

CREATE TABLE public.perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo VARCHAR(120) NOT NULL,
  usuario_login VARCHAR(50) UNIQUE NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('ADMIN', 'PERSONAL')),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.categorias (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre VARCHAR(80) UNIQUE NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE public.productos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  categoria_id BIGINT NOT NULL REFERENCES public.categorias(id),
  codigo_barras VARCHAR(50) UNIQUE,
  nombre VARCHAR(120) NOT NULL,
  unidad_medida VARCHAR(30) NOT NULL DEFAULT 'UNIDAD',
  stock_minimo INT NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  stock_maximo INT NOT NULL CHECK (stock_maximo > stock_minimo),
  dias_alerta_vencimiento INT NOT NULL DEFAULT 7 CHECK (dias_alerta_vencimiento >= 0),
  activo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE public.proveedores (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  nit_ci VARCHAR(30) UNIQUE,
  telefono VARCHAR(30) NOT NULL,
  email VARCHAR(120),
  activo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE public.producto_proveedor (
  producto_id BIGINT NOT NULL REFERENCES public.productos(id),
  proveedor_id BIGINT NOT NULL REFERENCES public.proveedores(id),
  costo_adquisicion DECIMAL(10,2) NOT NULL CHECK (costo_adquisicion >= 0),
  tiempo_entrega_dias INT NOT NULL DEFAULT 1 CHECK (tiempo_entrega_dias >= 0),
  es_principal BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (producto_id, proveedor_id)
);

CREATE TABLE public.lotes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  producto_id BIGINT NOT NULL REFERENCES public.productos(id),
  proveedor_id BIGINT REFERENCES public.proveedores(id),
  codigo_lote VARCHAR(50),
  fecha_ingreso TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_vencimiento DATE,
  cantidad_inicial INT NOT NULL CHECK (cantidad_inicial > 0),
  cantidad_actual INT NOT NULL CHECK (cantidad_actual >= 0),
  costo_unitario DECIMAL(10,2) NOT NULL CHECK (costo_unitario >= 0)
);

CREATE TABLE public.reportes_incidentes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lote_id BIGINT NOT NULL REFERENCES public.lotes(id),
  solicitado_por UUID NOT NULL REFERENCES public.perfiles(id),
  resuelto_por UUID REFERENCES public.perfiles(id),
  motivo VARCHAR(30) NOT NULL CHECK (motivo IN ('DANADO', 'VENCIDO', 'PERDIDA', 'SALIDA')),
  cantidad INT NOT NULL CHECK (cantidad > 0),
  observacion TEXT NOT NULL,
  comentario_admin TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')),
  fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_resolucion TIMESTAMPTZ
);

CREATE TABLE public.movimientos_inventario (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lote_id BIGINT NOT NULL REFERENCES public.lotes(id),
  usuario_id UUID NOT NULL REFERENCES public.perfiles(id),
  incidente_id BIGINT REFERENCES public.reportes_incidentes(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ENTRADA', 'SALIDA', 'MERMA', 'AJUSTE_POS', 'AJUSTE_NEG')),
  cantidad INT NOT NULL CHECK (cantidad > 0),
  saldo_lote_posterior INT NOT NULL CHECK (saldo_lote_posterior >= 0),
  motivo TEXT NOT NULL,
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.alertas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  producto_id BIGINT NOT NULL REFERENCES public.productos(id),
  lote_id BIGINT REFERENCES public.lotes(id),
  incidente_id BIGINT REFERENCES public.reportes_incidentes(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('STOCK_BAJO', 'PROXIMO_VENCER', 'VENCIDO', 'INCIDENTE')),
  mensaje TEXT NOT NULL,
  fecha_generacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  atendida BOOLEAN NOT NULL DEFAULT false,
  atendida_por UUID REFERENCES public.perfiles(id),
  fecha_atencion TIMESTAMPTZ
);

CREATE INDEX idx_productos_codigo_barras ON public.productos(codigo_barras);
CREATE INDEX idx_productos_nombre ON public.productos(nombre);
CREATE INDEX idx_lotes_fefo ON public.lotes(producto_id, fecha_vencimiento) WHERE cantidad_actual > 0;
CREATE INDEX idx_movimientos_fecha ON public.movimientos_inventario(fecha_hora DESC);
CREATE INDEX idx_movimientos_lote ON public.movimientos_inventario(lote_id);
CREATE INDEX idx_alertas_pendientes ON public.alertas(atendida, tipo);
CREATE INDEX idx_incidentes_estado ON public.reportes_incidentes(estado, fecha_solicitud DESC);

COMMIT;
