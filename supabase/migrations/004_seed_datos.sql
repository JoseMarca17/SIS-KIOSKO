BEGIN;

-- Usuarios iniciales para desarrollo y verificación.
-- ADMIN: admin / Admin123!
-- PERSONAL: personal / Personal123!
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES
(
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'admin@kiosko.local',
  extensions.crypt('Admin123!', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-4222-8222-222222222222',
  'authenticated', 'authenticated', 'personal@kiosko.local',
  extensions.crypt('Personal123!', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
);

INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES
(
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  '{"sub":"11111111-1111-4111-8111-111111111111","email":"admin@kiosko.local","email_verified":true}'::jsonb,
  'email', now(), now(), now()
),
(
  '22222222-2222-4222-8222-222222222222',
  '22222222-2222-4222-8222-222222222222',
  '{"sub":"22222222-2222-4222-8222-222222222222","email":"personal@kiosko.local","email_verified":true}'::jsonb,
  'email', now(), now(), now()
);

INSERT INTO public.perfiles (id, nombre_completo, usuario_login, rol) VALUES
('11111111-1111-4111-8111-111111111111', 'Administrador del Kiosko', 'admin', 'ADMIN'),
('22222222-2222-4222-8222-222222222222', 'María Fernanda Rojas', 'personal', 'PERSONAL');

INSERT INTO public.categorias (nombre) VALUES
('Bebidas'), ('Lácteos'), ('Snacks'), ('Artículos varios');

INSERT INTO public.proveedores (nombre, nit_ci, telefono, email) VALUES
('EMBOL Bolivia', '1023456025', '+591 4 4402020', 'pedidos@embol.bo'),
('PIL Andina', '2012345028', '+591 2 2772222', 'distribucion@pil.bo'),
('Distribuidora La Chiquitana', '7894561', '+591 70012345', NULL);

INSERT INTO public.productos (
  categoria_id, codigo_barras, nombre, unidad_medida,
  stock_minimo, stock_maximo, dias_alerta_vencimiento
) VALUES
((SELECT id FROM public.categorias WHERE nombre = 'Bebidas'), '7790895005003', 'Coca-Cola 500ml', 'UNIDAD', 18, 96, 15),
((SELECT id FROM public.categorias WHERE nombre = 'Bebidas'), '7771234562002', 'Pilfrut 200ml', 'UNIDAD', 12, 72, 10),
((SELECT id FROM public.categorias WHERE nombre = 'Lácteos'), '7771234561005', 'Yogurt PIL 1L', 'UNIDAD', 8, 48, 7),
((SELECT id FROM public.categorias WHERE nombre = 'Snacks'), '7771234563009', 'Papas Chip', 'BOLSA', 15, 60, 12),
((SELECT id FROM public.categorias WHERE nombre = 'Snacks'), '7771234564006', 'Galletas Wafer', 'PAQUETE', 12, 72, 20),
((SELECT id FROM public.categorias WHERE nombre = 'Artículos varios'), '070330661601', 'Encendedor BIC', 'UNIDAD', 8, 40, 0);

INSERT INTO public.producto_proveedor (
  producto_id, proveedor_id, costo_adquisicion, tiempo_entrega_dias, es_principal
) VALUES
((SELECT id FROM public.productos WHERE nombre = 'Coca-Cola 500ml'), (SELECT id FROM public.proveedores WHERE nombre = 'EMBOL Bolivia'), 4.20, 1, true),
((SELECT id FROM public.productos WHERE nombre = 'Pilfrut 200ml'), (SELECT id FROM public.proveedores WHERE nombre = 'PIL Andina'), 1.80, 1, true),
((SELECT id FROM public.productos WHERE nombre = 'Yogurt PIL 1L'), (SELECT id FROM public.proveedores WHERE nombre = 'PIL Andina'), 9.50, 1, true),
((SELECT id FROM public.productos WHERE nombre = 'Papas Chip'), (SELECT id FROM public.proveedores WHERE nombre = 'Distribuidora La Chiquitana'), 3.75, 2, true),
((SELECT id FROM public.productos WHERE nombre = 'Galletas Wafer'), (SELECT id FROM public.proveedores WHERE nombre = 'Distribuidora La Chiquitana'), 2.60, 2, true),
((SELECT id FROM public.productos WHERE nombre = 'Encendedor BIC'), (SELECT id FROM public.proveedores WHERE nombre = 'Distribuidora La Chiquitana'), 8.50, 3, true);

INSERT INTO public.lotes (
  producto_id, proveedor_id, codigo_lote, fecha_vencimiento,
  cantidad_inicial, cantidad_actual, costo_unitario
) VALUES
((SELECT id FROM public.productos WHERE nombre = 'Coca-Cola 500ml'), (SELECT id FROM public.proveedores WHERE nombre = 'EMBOL Bolivia'), 'CC-2026-A', CURRENT_DATE + 120, 72, 72, 4.20),
((SELECT id FROM public.productos WHERE nombre = 'Pilfrut 200ml'), (SELECT id FROM public.proveedores WHERE nombre = 'PIL Andina'), 'PF-2026-C', CURRENT_DATE + 5, 36, 36, 1.80),
((SELECT id FROM public.productos WHERE nombre = 'Yogurt PIL 1L'), (SELECT id FROM public.proveedores WHERE nombre = 'PIL Andina'), 'YP-2026-V', CURRENT_DATE - 7, 12, 12, 9.50),
((SELECT id FROM public.productos WHERE nombre = 'Yogurt PIL 1L'), (SELECT id FROM public.proveedores WHERE nombre = 'PIL Andina'), 'YP-2026-B', CURRENT_DATE + 15, 24, 24, 9.50),
((SELECT id FROM public.productos WHERE nombre = 'Papas Chip'), (SELECT id FROM public.proveedores WHERE nombre = 'Distribuidora La Chiquitana'), 'PC-2026-A', CURRENT_DATE + 45, 10, 10, 3.75),
((SELECT id FROM public.productos WHERE nombre = 'Galletas Wafer'), (SELECT id FROM public.proveedores WHERE nombre = 'Distribuidora La Chiquitana'), 'GW-2026-A', CURRENT_DATE + 90, 48, 48, 2.60),
((SELECT id FROM public.productos WHERE nombre = 'Encendedor BIC'), (SELECT id FROM public.proveedores WHERE nombre = 'Distribuidora La Chiquitana'), 'BIC-2026-A', NULL, 30, 30, 8.50);

INSERT INTO public.movimientos_inventario (
  lote_id, usuario_id, tipo, cantidad, saldo_lote_posterior, motivo
)
SELECT l.id, '11111111-1111-4111-8111-111111111111', 'ENTRADA',
  l.cantidad_inicial, l.cantidad_actual, 'Inventario inicial del kiosko'
FROM public.lotes l;

INSERT INTO public.reportes_incidentes (
  lote_id, solicitado_por, motivo, cantidad, observacion
) VALUES
((SELECT id FROM public.lotes WHERE codigo_lote = 'GW-2026-A'), '22222222-2222-4222-8222-222222222222', 'DANADO', 2, 'Dos paquetes aplastados durante la reorganización del estante.'),
((SELECT id FROM public.lotes WHERE codigo_lote = 'PC-2026-A'), '22222222-2222-4222-8222-222222222222', 'PERDIDA', 1, 'No se encontró una bolsa durante el conteo físico.');

INSERT INTO public.alertas (producto_id, lote_id, incidente_id, tipo, mensaje)
SELECT p.id, l.id, i.id, 'INCIDENTE',
  FORMAT('María Fernanda Rojas reportó %s unidad(es) de %s por %s.', i.cantidad, p.nombre, i.motivo)
FROM public.reportes_incidentes i
JOIN public.lotes l ON l.id = i.lote_id
JOIN public.productos p ON p.id = l.producto_id;

INSERT INTO public.alertas (producto_id, tipo, mensaje)
SELECT id, 'STOCK_BAJO', 'Stock bajo: Papas Chip tiene 10 unidad(es) vigente(s); mínimo 15.'
FROM public.productos WHERE nombre = 'Papas Chip';

INSERT INTO public.alertas (producto_id, lote_id, tipo, mensaje)
SELECT p.id, l.id, 'VENCIDO',
  FORMAT('Lote %s de %s venció el %s con %s unidad(es).', l.codigo_lote, p.nombre, TO_CHAR(l.fecha_vencimiento, 'DD/MM/YYYY'), l.cantidad_actual)
FROM public.lotes l JOIN public.productos p ON p.id = l.producto_id
WHERE l.codigo_lote = 'YP-2026-V';

INSERT INTO public.alertas (producto_id, lote_id, tipo, mensaje)
SELECT p.id, l.id, 'PROXIMO_VENCER',
  FORMAT('Lote %s de %s vence el %s con %s unidad(es).', l.codigo_lote, p.nombre, TO_CHAR(l.fecha_vencimiento, 'DD/MM/YYYY'), l.cantidad_actual)
FROM public.lotes l JOIN public.productos p ON p.id = l.producto_id
WHERE l.codigo_lote = 'PF-2026-C';

COMMIT;
