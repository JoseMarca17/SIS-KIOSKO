BEGIN;

CREATE OR REPLACE FUNCTION public.rpc_registrar_entrada_lote(
  p_producto_id BIGINT,
  p_proveedor_id BIGINT,
  p_codigo_lote VARCHAR,
  p_fecha_vencimiento DATE,
  p_cantidad INT,
  p_costo_unitario DECIMAL,
  p_motivo TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lote_id BIGINT;
  v_stock BIGINT;
  v_minimo INT;
BEGIN
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Solo un administrador activo puede registrar entradas.';
  END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor que cero.';
  END IF;
  IF p_costo_unitario IS NULL OR p_costo_unitario < 0 THEN
    RAISE EXCEPTION 'El costo unitario no puede ser negativo.';
  END IF;
  IF NULLIF(BTRIM(p_motivo), '') IS NULL THEN
    RAISE EXCEPTION 'El motivo es obligatorio.';
  END IF;

  SELECT stock_minimo INTO v_minimo
  FROM public.productos
  WHERE id = p_producto_id AND activo = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El producto no existe o está desactivado.';
  END IF;

  INSERT INTO public.lotes (
    producto_id, proveedor_id, codigo_lote, fecha_vencimiento,
    cantidad_inicial, cantidad_actual, costo_unitario
  ) VALUES (
    p_producto_id, p_proveedor_id, NULLIF(BTRIM(p_codigo_lote), ''),
    p_fecha_vencimiento, p_cantidad, p_cantidad, p_costo_unitario
  ) RETURNING id INTO v_lote_id;

  INSERT INTO public.movimientos_inventario (
    lote_id, usuario_id, tipo, cantidad, saldo_lote_posterior, motivo
  ) VALUES (
    v_lote_id, auth.uid(), 'ENTRADA', p_cantidad, p_cantidad, BTRIM(p_motivo)
  );

  SELECT COALESCE(SUM(cantidad_actual), 0)::BIGINT INTO v_stock
  FROM public.lotes
  WHERE producto_id = p_producto_id
    AND cantidad_actual > 0
    AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURRENT_DATE);

  IF v_stock > v_minimo THEN
    UPDATE public.alertas
    SET atendida = true, atendida_por = auth.uid(), fecha_atencion = now()
    WHERE producto_id = p_producto_id
      AND tipo = 'STOCK_BAJO'
      AND atendida = false;
  ELSE
    PERFORM public.rpc_sincronizar_alertas();
  END IF;

  RETURN v_lote_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_reportar_incidente(
  p_lote_id BIGINT,
  p_motivo VARCHAR,
  p_cantidad INT,
  p_observacion TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock INT;
  v_producto_id BIGINT;
  v_producto_nombre VARCHAR;
  v_usuario_nombre VARCHAR;
  v_incidente_id BIGINT;
BEGIN
  IF NOT public.usuario_activo() THEN
    RAISE EXCEPTION 'Debes tener una sesión activa para reportar incidentes.';
  END IF;
  IF p_motivo NOT IN ('DANADO', 'VENCIDO', 'PERDIDA', 'SALIDA') THEN
    RAISE EXCEPTION 'Motivo de incidente no válido.';
  END IF;
  IF NULLIF(BTRIM(p_observacion), '') IS NULL THEN
    RAISE EXCEPTION 'La observación es obligatoria.';
  END IF;

  SELECT l.cantidad_actual, p.id, p.nombre
  INTO v_stock, v_producto_id, v_producto_nombre
  FROM public.lotes l
  JOIN public.productos p ON p.id = l.producto_id
  WHERE l.id = p_lote_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El lote no existe.';
  END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 OR p_cantidad > v_stock THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor que cero y no superar el stock actual del lote (%).', v_stock;
  END IF;

  SELECT nombre_completo INTO v_usuario_nombre
  FROM public.perfiles WHERE id = auth.uid();

  INSERT INTO public.reportes_incidentes (
    lote_id, solicitado_por, motivo, cantidad, observacion
  ) VALUES (
    p_lote_id, auth.uid(), p_motivo, p_cantidad, BTRIM(p_observacion)
  ) RETURNING id INTO v_incidente_id;

  INSERT INTO public.alertas (
    producto_id, lote_id, incidente_id, tipo, mensaje
  ) VALUES (
    v_producto_id, p_lote_id, v_incidente_id, 'INCIDENTE',
    FORMAT('%s reportó %s unidad(es) de %s por %s.', v_usuario_nombre, p_cantidad, v_producto_nombre, p_motivo)
  );

  RETURN v_incidente_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_resolver_incidente(
  p_incidente_id BIGINT,
  p_aprobar BOOLEAN,
  p_comentario_admin TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inc public.reportes_incidentes%ROWTYPE;
  v_lote public.lotes%ROWTYPE;
  v_nuevo_saldo INT;
  v_tipo_kardex VARCHAR(20);
BEGIN
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Solo un administrador activo puede resolver incidentes.';
  END IF;
  IF p_aprobar IS NULL THEN
    RAISE EXCEPTION 'Debes indicar si apruebas o rechazas el incidente.';
  END IF;

  SELECT * INTO v_inc
  FROM public.reportes_incidentes
  WHERE id = p_incidente_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El incidente no existe.';
  END IF;
  IF v_inc.estado <> 'PENDIENTE' THEN
    RAISE EXCEPTION 'El incidente ya fue resuelto.';
  END IF;

  IF p_aprobar THEN
    SELECT * INTO v_lote
    FROM public.lotes
    WHERE id = v_inc.lote_id
    FOR UPDATE;

    IF v_inc.motivo = 'SALIDA'
      AND v_lote.fecha_vencimiento IS NOT NULL
      AND v_lote.fecha_vencimiento < CURRENT_DATE THEN
      RAISE EXCEPTION 'Un lote vencido no puede registrarse como SALIDA; debe darse de baja como MERMA.';
    END IF;
    IF v_lote.cantidad_actual < v_inc.cantidad THEN
      RAISE EXCEPTION 'Stock insuficiente en el lote';
    END IF;

    v_nuevo_saldo := v_lote.cantidad_actual - v_inc.cantidad;
    v_tipo_kardex := CASE WHEN v_inc.motivo = 'SALIDA' THEN 'SALIDA' ELSE 'MERMA' END;

    UPDATE public.lotes
    SET cantidad_actual = v_nuevo_saldo
    WHERE id = v_lote.id;

    INSERT INTO public.movimientos_inventario (
      lote_id, usuario_id, incidente_id, tipo,
      cantidad, saldo_lote_posterior, motivo
    ) VALUES (
      v_lote.id, auth.uid(), p_incidente_id, v_tipo_kardex,
      v_inc.cantidad, v_nuevo_saldo,
      FORMAT('Incidente %s: %s. %s', p_incidente_id, v_inc.motivo, COALESCE(p_comentario_admin, v_inc.observacion))
    );

    UPDATE public.reportes_incidentes
    SET estado = 'APROBADO', resuelto_por = auth.uid(),
      fecha_resolucion = now(), comentario_admin = p_comentario_admin
    WHERE id = p_incidente_id;

    UPDATE public.alertas
    SET atendida = true, atendida_por = auth.uid(), fecha_atencion = now()
    WHERE incidente_id = p_incidente_id AND atendida = false;

    IF v_nuevo_saldo = 0 THEN
      UPDATE public.alertas
      SET atendida = true, atendida_por = auth.uid(), fecha_atencion = now()
      WHERE lote_id = v_lote.id
        AND tipo IN ('VENCIDO', 'PROXIMO_VENCER')
        AND atendida = false;
    END IF;

    PERFORM public.rpc_sincronizar_alertas();
  ELSE
    UPDATE public.reportes_incidentes
    SET estado = 'RECHAZADO', resuelto_por = auth.uid(),
      fecha_resolucion = now(), comentario_admin = p_comentario_admin
    WHERE id = p_incidente_id;

    UPDATE public.alertas
    SET atendida = true, atendida_por = auth.uid(), fecha_atencion = now()
    WHERE incidente_id = p_incidente_id AND atendida = false;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_movimiento_directo_admin(
  p_producto_id BIGINT,
  p_lote_id BIGINT,
  p_tipo VARCHAR,
  p_cantidad INT,
  p_motivo TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lote public.lotes%ROWTYPE;
  v_disponible BIGINT;
  v_restante INT;
  v_descontar INT;
  v_nuevo_saldo INT;
BEGIN
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Solo un administrador activo puede registrar movimientos directos.';
  END IF;
  IF p_tipo NOT IN ('SALIDA', 'MERMA', 'AJUSTE_POS', 'AJUSTE_NEG') THEN
    RAISE EXCEPTION 'Tipo de movimiento no válido.';
  END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor que cero.';
  END IF;
  IF NULLIF(BTRIM(p_motivo), '') IS NULL THEN
    RAISE EXCEPTION 'El motivo es obligatorio.';
  END IF;

  IF p_tipo = 'SALIDA' AND p_lote_id IS NULL THEN
    IF p_producto_id IS NULL THEN
      RAISE EXCEPTION 'Selecciona un producto para la salida FEFO.';
    END IF;

    SELECT COALESCE(SUM(cantidad_actual), 0)::BIGINT INTO v_disponible
    FROM (
      SELECT cantidad_actual
      FROM public.lotes
      WHERE producto_id = p_producto_id
        AND cantidad_actual > 0
        AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURRENT_DATE)
      ORDER BY fecha_vencimiento ASC NULLS LAST
      FOR UPDATE
    ) disponibles;

    IF v_disponible < p_cantidad THEN
      RAISE EXCEPTION 'Stock vigente insuficiente: existen % unidad(es) disponibles y solicitaste %.', v_disponible, p_cantidad;
    END IF;

    v_restante := p_cantidad;
    FOR v_lote IN
      SELECT * FROM public.lotes
      WHERE producto_id = p_producto_id
        AND cantidad_actual > 0
        AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURRENT_DATE)
      ORDER BY fecha_vencimiento ASC NULLS LAST
      FOR UPDATE
    LOOP
      EXIT WHEN v_restante = 0;
      v_descontar := LEAST(v_restante, v_lote.cantidad_actual);
      v_nuevo_saldo := v_lote.cantidad_actual - v_descontar;

      UPDATE public.lotes SET cantidad_actual = v_nuevo_saldo WHERE id = v_lote.id;
      INSERT INTO public.movimientos_inventario (
        lote_id, usuario_id, tipo, cantidad, saldo_lote_posterior, motivo
      ) VALUES (
        v_lote.id, auth.uid(), 'SALIDA', v_descontar, v_nuevo_saldo, BTRIM(p_motivo)
      );
      v_restante := v_restante - v_descontar;
    END LOOP;
  ELSE
    IF p_lote_id IS NULL THEN
      RAISE EXCEPTION 'Selecciona un lote específico para este movimiento.';
    END IF;

    SELECT * INTO v_lote FROM public.lotes WHERE id = p_lote_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'El lote no existe.';
    END IF;

    IF p_tipo = 'SALIDA'
      AND v_lote.fecha_vencimiento IS NOT NULL
      AND v_lote.fecha_vencimiento < CURRENT_DATE THEN
      RAISE EXCEPTION 'Un lote vencido no puede registrarse como SALIDA; debe darse de baja como MERMA.';
    END IF;

    IF p_tipo = 'AJUSTE_POS' THEN
      v_nuevo_saldo := v_lote.cantidad_actual + p_cantidad;
    ELSE
      IF v_lote.cantidad_actual < p_cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente en el lote: existen % unidad(es).', v_lote.cantidad_actual;
      END IF;
      v_nuevo_saldo := v_lote.cantidad_actual - p_cantidad;
    END IF;

    UPDATE public.lotes SET cantidad_actual = v_nuevo_saldo WHERE id = v_lote.id;
    INSERT INTO public.movimientos_inventario (
      lote_id, usuario_id, tipo, cantidad, saldo_lote_posterior, motivo
    ) VALUES (
      v_lote.id, auth.uid(), p_tipo, p_cantidad, v_nuevo_saldo, BTRIM(p_motivo)
    );
  END IF;

  PERFORM public.rpc_sincronizar_alertas();
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_sincronizar_alertas()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.usuario_activo() THEN
    RAISE EXCEPTION 'Debes tener una sesión activa para sincronizar alertas.';
  END IF;

  UPDATE public.alertas a
  SET atendida = true, atendida_por = auth.uid(), fecha_atencion = now()
  FROM public.v_productos_stock v
  WHERE a.tipo = 'STOCK_BAJO'
    AND a.atendida = false
    AND a.producto_id = v.id
    AND v.stock_disponible > v.stock_minimo;

  UPDATE public.alertas a
  SET atendida = true, atendida_por = auth.uid(), fecha_atencion = now()
  FROM public.lotes l
  WHERE a.tipo IN ('VENCIDO', 'PROXIMO_VENCER')
    AND a.atendida = false
    AND a.lote_id = l.id
    AND l.cantidad_actual = 0;

  INSERT INTO public.alertas (producto_id, tipo, mensaje)
  SELECT v.id, 'STOCK_BAJO',
    FORMAT('Stock bajo: %s tiene %s unidad(es) vigente(s); mínimo %s.', v.nombre, v.stock_disponible, v.stock_minimo)
  FROM public.v_productos_stock v
  WHERE v.stock_disponible <= v.stock_minimo
    AND NOT EXISTS (
      SELECT 1 FROM public.alertas a
      WHERE a.producto_id = v.id AND a.tipo = 'STOCK_BAJO' AND a.atendida = false
    );

  INSERT INTO public.alertas (producto_id, lote_id, tipo, mensaje)
  SELECT p.id, l.id, 'VENCIDO',
    FORMAT('Lote %s de %s venció el %s con %s unidad(es).',
      COALESCE(l.codigo_lote, 'sin código'), p.nombre,
      TO_CHAR(l.fecha_vencimiento, 'DD/MM/YYYY'), l.cantidad_actual)
  FROM public.lotes l
  JOIN public.productos p ON p.id = l.producto_id
  WHERE l.cantidad_actual > 0
    AND l.fecha_vencimiento < CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM public.alertas a
      WHERE a.lote_id = l.id AND a.tipo = 'VENCIDO' AND a.atendida = false
    );

  INSERT INTO public.alertas (producto_id, lote_id, tipo, mensaje)
  SELECT p.id, l.id, 'PROXIMO_VENCER',
    FORMAT('Lote %s de %s vence el %s con %s unidad(es).',
      COALESCE(l.codigo_lote, 'sin código'), p.nombre,
      TO_CHAR(l.fecha_vencimiento, 'DD/MM/YYYY'), l.cantidad_actual)
  FROM public.lotes l
  JOIN public.productos p ON p.id = l.producto_id
  WHERE l.cantidad_actual > 0
    AND l.fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + p.dias_alerta_vencimiento
    AND NOT EXISTS (
      SELECT 1 FROM public.alertas a
      WHERE a.lote_id = l.id AND a.tipo = 'PROXIMO_VENCER' AND a.atendida = false
    );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_registrar_entrada_lote(BIGINT, BIGINT, VARCHAR, DATE, INT, DECIMAL, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rpc_reportar_incidente(BIGINT, VARCHAR, INT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rpc_resolver_incidente(BIGINT, BOOLEAN, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rpc_movimiento_directo_admin(BIGINT, BIGINT, VARCHAR, INT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rpc_sincronizar_alertas() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.rpc_registrar_entrada_lote(BIGINT, BIGINT, VARCHAR, DATE, INT, DECIMAL, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_reportar_incidente(BIGINT, VARCHAR, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_resolver_incidente(BIGINT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_movimiento_directo_admin(BIGINT, BIGINT, VARCHAR, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_sincronizar_alertas() TO authenticated;

COMMIT;
