BEGIN;

CREATE OR REPLACE FUNCTION public.usuario_activo()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfiles
    WHERE id = (SELECT auth.uid())
      AND activo = true
  );
$$;

CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfiles
    WHERE id = (SELECT auth.uid())
      AND rol = 'ADMIN'
      AND activo = true
  );
$$;

REVOKE ALL ON FUNCTION public.usuario_activo() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.es_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.usuario_activo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.es_admin() TO authenticated;

CREATE VIEW public.v_productos_stock
WITH (security_invoker = true) AS
WITH stock AS (
  SELECT
    p.id,
    COALESCE(SUM(l.cantidad_actual) FILTER (
      WHERE l.cantidad_actual > 0
        AND (l.fecha_vencimiento IS NULL OR l.fecha_vencimiento >= CURRENT_DATE)
    ), 0)::BIGINT AS stock_disponible,
    COALESCE(SUM(l.cantidad_actual) FILTER (
      WHERE l.cantidad_actual > 0
        AND l.fecha_vencimiento < CURRENT_DATE
    ), 0)::BIGINT AS stock_vencido,
    MIN(l.fecha_vencimiento) FILTER (WHERE l.cantidad_actual > 0) AS proximo_vencimiento,
    COALESCE(SUM(l.cantidad_actual * l.costo_unitario) FILTER (
      WHERE l.cantidad_actual > 0
        AND (l.fecha_vencimiento IS NULL OR l.fecha_vencimiento >= CURRENT_DATE)
    ), 0)::DECIMAL(14,2) AS valor_inventario
  FROM public.productos p
  LEFT JOIN public.lotes l ON l.producto_id = p.id
  WHERE p.activo = true
  GROUP BY p.id
)
SELECT
  p.*,
  c.nombre AS categoria_nombre,
  s.stock_disponible,
  s.stock_vencido,
  s.proximo_vencimiento,
  s.valor_inventario,
  (s.stock_disponible <= p.stock_minimo) AS stock_bajo,
  pp.proveedor_id AS proveedor_principal_id,
  pr.nombre AS proveedor_principal_nombre,
  pr.telefono AS proveedor_principal_telefono,
  pp.costo_adquisicion AS costo_referencia
FROM stock s
JOIN public.productos p ON p.id = s.id
JOIN public.categorias c ON c.id = p.categoria_id
LEFT JOIN LATERAL (
  SELECT rel.proveedor_id, rel.costo_adquisicion
  FROM public.producto_proveedor rel
  WHERE rel.producto_id = p.id
  ORDER BY rel.es_principal DESC, rel.proveedor_id ASC
  LIMIT 1
) pp ON true
LEFT JOIN public.proveedores pr ON pr.id = pp.proveedor_id;

REVOKE ALL ON public.v_productos_stock FROM PUBLIC, anon;
GRANT SELECT ON public.v_productos_stock TO authenticated;

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producto_proveedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reportes_incidentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY perfiles_select_propio ON public.perfiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) AND public.usuario_activo());
CREATE POLICY perfiles_admin_select ON public.perfiles
  FOR SELECT TO authenticated
  USING (public.es_admin());

CREATE POLICY categorias_select_activos ON public.categorias
  FOR SELECT TO authenticated USING (public.usuario_activo());
CREATE POLICY categorias_admin_insert ON public.categorias
  FOR INSERT TO authenticated WITH CHECK (public.es_admin());
CREATE POLICY categorias_admin_update ON public.categorias
  FOR UPDATE TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());

CREATE POLICY productos_select_activos ON public.productos
  FOR SELECT TO authenticated USING (public.usuario_activo());
CREATE POLICY productos_admin_insert ON public.productos
  FOR INSERT TO authenticated WITH CHECK (public.es_admin());
CREATE POLICY productos_admin_update ON public.productos
  FOR UPDATE TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());

CREATE POLICY proveedores_select_activos ON public.proveedores
  FOR SELECT TO authenticated USING (public.usuario_activo());
CREATE POLICY proveedores_admin_insert ON public.proveedores
  FOR INSERT TO authenticated WITH CHECK (public.es_admin());
CREATE POLICY proveedores_admin_update ON public.proveedores
  FOR UPDATE TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());

CREATE POLICY producto_proveedor_select_activos ON public.producto_proveedor
  FOR SELECT TO authenticated USING (public.usuario_activo());
CREATE POLICY producto_proveedor_admin_insert ON public.producto_proveedor
  FOR INSERT TO authenticated WITH CHECK (public.es_admin());
CREATE POLICY producto_proveedor_admin_update ON public.producto_proveedor
  FOR UPDATE TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());

CREATE POLICY lotes_select_activos ON public.lotes
  FOR SELECT TO authenticated USING (public.usuario_activo());

CREATE POLICY incidentes_select_propios ON public.reportes_incidentes
  FOR SELECT TO authenticated
  USING (solicitado_por = (SELECT auth.uid()) AND public.usuario_activo());
CREATE POLICY incidentes_admin_select ON public.reportes_incidentes
  FOR SELECT TO authenticated USING (public.es_admin());

CREATE POLICY kardex_admin_select ON public.movimientos_inventario
  FOR SELECT TO authenticated USING (public.es_admin());

CREATE POLICY alertas_select_activos ON public.alertas
  FOR SELECT TO authenticated USING (public.usuario_activo());
CREATE POLICY alertas_admin_update ON public.alertas
  FOR UPDATE TO authenticated
  USING (public.es_admin()) WITH CHECK (public.es_admin());

CREATE OR REPLACE FUNCTION public.impedir_mutacion_kardex()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'El Kardex es inmutable: registra un movimiento de ajuste para corregir errores.';
END;
$$;

CREATE TRIGGER trg_kardex_inmutable
BEFORE UPDATE OR DELETE ON public.movimientos_inventario
FOR EACH ROW EXECUTE FUNCTION public.impedir_mutacion_kardex();

COMMIT;
