BEGIN;

-- Los permisos por defecto de Supabase vuelven a exponer funciones nuevas a anon.
-- Las funciones de negocio ya validan sesión y rol; aquí se cierra también el acceso anon.
REVOKE EXECUTE ON FUNCTION public.usuario_activo() FROM anon;
REVOKE EXECUTE ON FUNCTION public.es_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rpc_registrar_entrada_lote(BIGINT, BIGINT, VARCHAR, DATE, INT, DECIMAL, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rpc_reportar_incidente(BIGINT, VARCHAR, INT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rpc_resolver_incidente(BIGINT, BOOLEAN, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rpc_movimiento_directo_admin(BIGINT, BIGINT, VARCHAR, INT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rpc_sincronizar_alertas() FROM anon;

CREATE INDEX idx_productos_categoria ON public.productos(categoria_id);
CREATE INDEX idx_producto_proveedor_proveedor ON public.producto_proveedor(proveedor_id);
CREATE INDEX idx_lotes_proveedor ON public.lotes(proveedor_id);
CREATE INDEX idx_incidentes_lote ON public.reportes_incidentes(lote_id);
CREATE INDEX idx_incidentes_solicitante ON public.reportes_incidentes(solicitado_por);
CREATE INDEX idx_incidentes_resuelto_por ON public.reportes_incidentes(resuelto_por);
CREATE INDEX idx_movimientos_usuario ON public.movimientos_inventario(usuario_id);
CREATE INDEX idx_movimientos_incidente ON public.movimientos_inventario(incidente_id);
CREATE INDEX idx_alertas_producto ON public.alertas(producto_id);
CREATE INDEX idx_alertas_lote ON public.alertas(lote_id);
CREATE INDEX idx_alertas_incidente ON public.alertas(incidente_id);
CREATE INDEX idx_alertas_atendida_por ON public.alertas(atendida_por);

DROP POLICY perfiles_select_propio ON public.perfiles;
DROP POLICY perfiles_admin_select ON public.perfiles;
CREATE POLICY perfiles_select ON public.perfiles
  FOR SELECT TO authenticated
  USING (
    public.usuario_activo()
    AND (id = (SELECT auth.uid()) OR public.es_admin())
  );

DROP POLICY incidentes_select_propios ON public.reportes_incidentes;
DROP POLICY incidentes_admin_select ON public.reportes_incidentes;
CREATE POLICY incidentes_select ON public.reportes_incidentes
  FOR SELECT TO authenticated
  USING (
    public.usuario_activo()
    AND (solicitado_por = (SELECT auth.uid()) OR public.es_admin())
  );

COMMIT;
