import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { productoSchema } from '../src/schemas/catalogo.schemas.js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.trimStart().startsWith('#'))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en .env');

const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const ejecucion = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
const prefijo = `TEST-F3-${ejecucion}`;
const creados = { categoriaId: null, productoId: null, proveedoresIds: [] };
let fallo = null;

const afirmar = (condicion, mensaje) => {
  if (!condicion) throw new Error(mensaje);
};

const comprobar = async (consulta, mensaje) => {
  const { data, error } = await consulta;
  if (error) throw new Error(`${mensaje}: ${error.message}`);
  return data;
};

const desactivar = async (tabla, id) => {
  if (id == null) return;
  const registro = await comprobar(
    client.from(tabla).update({ activo: false }).eq('id', id).select('id,activo').single(),
    `No se pudo desactivar ${tabla}/${id}`,
  );
  afirmar(registro.activo === false, `${tabla}/${id} no quedó desactivado`);
};

const vincularPrincipal = async (productoId, proveedorId, costo, dias) => {
  await comprobar(
    client.from('producto_proveedor').upsert({
      producto_id: productoId,
      proveedor_id: proveedorId,
      costo_adquisicion: costo,
      tiempo_entrega_dias: dias,
      es_principal: true,
    }, { onConflict: 'producto_id,proveedor_id' }).select('producto_id,proveedor_id').single(),
    'No se pudo guardar el vínculo principal',
  );
  await comprobar(
    client.from('producto_proveedor')
      .update({ es_principal: false })
      .eq('producto_id', productoId)
      .neq('proveedor_id', proveedorId)
      .eq('es_principal', true)
      .select('producto_id,proveedor_id'),
    'No se pudieron desmarcar los principales anteriores',
  );
};

const validarPrincipal = async (productoId, proveedorEsperadoId) => {
  const vinculos = await comprobar(
    client.from('producto_proveedor').select('producto_id,proveedor_id,costo_adquisicion,tiempo_entrega_dias,es_principal').eq('producto_id', productoId),
    'No se pudieron consultar los vínculos del producto temporal',
  );
  const principales = vinculos.filter((vinculo) => vinculo.es_principal);
  afirmar(principales.length === 1, `Se esperaba un único principal y se encontraron ${principales.length}`);
  afirmar(principales[0].proveedor_id === proveedorEsperadoId, 'El principal no coincide con el proveedor esperado');
  return vinculos;
};

const estadoSemillas = async () => {
  const codigos = ['7790895005003', '7771234562002', '7771234561005', '7771234563009', '7771234564006', '070330661601'];
  const nits = ['1023456025', '2012345028', '7894561'];
  const [productos, proveedores] = await Promise.all([
    comprobar(client.from('productos').select('id,codigo_barras,nombre,categoria_id,unidad_medida,stock_minimo,stock_maximo,dias_alerta_vencimiento,activo').in('codigo_barras', codigos).order('id'), 'No se pudieron leer los productos semilla'),
    comprobar(client.from('proveedores').select('id,nombre,nit_ci,telefono,email,activo').in('nit_ci', nits).order('id'), 'No se pudieron leer los proveedores semilla'),
  ]);
  afirmar(productos.length === 6 && productos.every((producto) => producto.activo), 'No están intactos y activos los 6 productos semilla');
  afirmar(proveedores.length === 3 && proveedores.every((proveedor) => proveedor.activo), 'No están intactos y activos los 3 proveedores semilla');
  return { productos, proveedores };
};

try {
  const { data: auth, error: authError } = await client.auth.signInWithPassword({ email: 'admin@kiosko.local', password: 'Admin123!' });
  if (authError || !auth.user) throw authError ?? new Error('No se recibió el usuario administrador');
  const perfil = await comprobar(client.from('perfiles').select('id,rol,activo').eq('id', auth.user.id).single(), 'No se pudo consultar el perfil ADMIN');
  afirmar(perfil.rol === 'ADMIN' && perfil.activo, 'La sesión no pertenece a un ADMIN activo');
  const semillasIniciales = await estadoSemillas();
  console.log('PASS autenticación con publishable key, perfil ADMIN activo y semillas iniciales intactas.');

  const categoria = await comprobar(
    client.from('categorias').insert({ nombre: `${prefijo}-CATEGORIA`, activo: true }).select('id,nombre,activo').single(),
    'No se pudo crear la categoría temporal',
  );
  creados.categoriaId = categoria.id;
  console.log(`PASS categoría temporal creada con id ${categoria.id}.`);

  const { error: errorDuplicado } = await client.from('categorias').insert({ nombre: categoria.nombre }).select('id').single();
  afirmar(errorDuplicado?.code === '23505', `La unicidad de categoría no devolvió 23505: ${errorDuplicado?.message ?? 'sin error'}`);
  console.log('PASS nombre duplicado de categoría rechazado por Supabase con código 23505.');

  const producto = await comprobar(
    client.from('productos').insert({
      categoria_id: categoria.id,
      codigo_barras: prefijo,
      nombre: `${prefijo}-PRODUCTO`,
      unidad_medida: 'UNIDAD',
      stock_minimo: 2,
      stock_maximo: 12,
      dias_alerta_vencimiento: 0,
      activo: true,
    }).select('id,codigo_barras,activo').single(),
    'No se pudo crear el producto temporal',
  );
  creados.productoId = producto.id;
  console.log(`PASS producto temporal creado con código único e id ${producto.id}.`);

  for (const sufijo of ['A', 'B']) {
    const proveedor = await comprobar(
      client.from('proveedores').insert({ nombre: `${prefijo}-PROVEEDOR-${sufijo}`, nit_ci: null, telefono: '+591 70000000', email: null, activo: true }).select('id,nombre,activo').single(),
      `No se pudo crear el proveedor temporal ${sufijo}`,
    );
    creados.proveedoresIds.push(proveedor.id);
  }
  console.log(`PASS dos proveedores temporales creados con ids ${creados.proveedoresIds.join(', ')}; NIT/CI y email opcionales quedaron NULL.`);

  const [proveedorA, proveedorB] = creados.proveedoresIds;
  await vincularPrincipal(producto.id, proveedorA, '12.30', 1);
  const primerosVinculos = await validarPrincipal(producto.id, proveedorA);
  afirmar(Number(primerosVinculos[0].costo_adquisicion).toFixed(2) === '12.30', `El costo no conservó dos decimales: ${primerosVinculos[0].costo_adquisicion}`);
  console.log('PASS primer vínculo creado con costo 12.30, entrega entera y único principal A.');

  await vincularPrincipal(producto.id, proveedorB, '7.89', 0);
  const segundosVinculos = await validarPrincipal(producto.id, proveedorB);
  const vinculoA = segundosVinculos.find((vinculo) => vinculo.proveedor_id === proveedorA);
  const vinculoB = segundosVinculos.find((vinculo) => vinculo.proveedor_id === proveedorB);
  afirmar(vinculoA?.es_principal === false && vinculoB?.es_principal === true, 'El cambio de principal A → B no dejó estados coherentes');
  afirmar(vinculoB.tiempo_entrega_dias === 0, 'No se aceptó un tiempo de entrega entero de 0 días');
  console.log('PASS cambio de principal A → B: exactamente un principal y principal anterior desmarcado.');

  const productoBase = {
    nombre: 'Validación temporal',
    categoria_id: categoria.id,
    codigo_barras: '',
    unidad_medida: 'UNIDAD',
    stock_minimo: 10,
    stock_maximo: 10,
    dias_alerta_vencimiento: 7,
  };
  for (const maximo of [10, 9]) {
    const validacion = productoSchema.safeParse({ ...productoBase, stock_maximo: maximo });
    afirmar(!validacion.success, `Zod aceptó stock_maximo=${maximo} con stock_minimo=10`);
    afirmar(validacion.error.issues.some((issue) => issue.path[0] === 'stock_maximo' && issue.message === 'El stock máximo debe ser mayor que el stock mínimo.'), 'Zod no devolvió el mensaje español en stock_maximo');
  }
  const valido = productoSchema.safeParse({ ...productoBase, stock_maximo: 11 });
  afirmar(valido.success && valido.data.codigo_barras === null, 'Zod no aceptó un máximo válido o no transformó el código vacío a null');
  console.log('PASS Zod rechaza stock máximo igual y menor que el mínimo; acepta uno mayor y normaliza código vacío a null.');

  await desactivar('productos', creados.productoId);
  creados.productoId = null;
  for (const proveedorId of creados.proveedoresIds) await desactivar('proveedores', proveedorId);
  creados.proveedoresIds = [];
  await desactivar('categorias', creados.categoriaId);
  creados.categoriaId = null;

  const productoDesactivado = await comprobar(client.from('productos').select('id,activo').eq('id', producto.id).single(), 'El producto temporal fue borrado físicamente');
  const categoriaDesactivada = await comprobar(client.from('categorias').select('id,activo').eq('id', categoria.id).single(), 'La categoría temporal fue borrada físicamente');
  afirmar(productoDesactivado.activo === false && categoriaDesactivada.activo === false, 'La limpieza lógica no dejó registros inactivos consultables');
  const semillasFinales = await estadoSemillas();
  afirmar(JSON.stringify(semillasFinales) === JSON.stringify(semillasIniciales), 'Algún producto o proveedor semilla cambió durante la prueba');
  console.log('PASS limpieza exclusivamente lógica de temporales; se conservan los registros y las 9 semillas activas quedaron sin cambios.');
} catch (error) {
  fallo = error;
  console.error(`FAIL ${error.message}`);
} finally {
  try {
    if (creados.productoId != null) await desactivar('productos', creados.productoId);
    for (const proveedorId of creados.proveedoresIds) await desactivar('proveedores', proveedorId);
    if (creados.categoriaId != null) await desactivar('categorias', creados.categoriaId);
    if (creados.productoId != null || creados.proveedoresIds.length || creados.categoriaId != null) {
      console.log('Limpieza de emergencia: los temporales creados quedaron desactivados, sin borrado físico.');
    }
  } catch (errorLimpieza) {
    fallo = new Error(`${fallo ? `${fallo.message}. ` : ''}Error durante la limpieza lógica: ${errorLimpieza.message}`);
    console.error(`FAIL limpieza lógica: ${errorLimpieza.message}`);
  }

  const { error: signOutError } = await client.auth.signOut();
  if (signOutError) {
    fallo = new Error(`${fallo ? `${fallo.message}. ` : ''}No se pudo cerrar sesión: ${signOutError.message}`);
    console.error(`FAIL cierre de sesión: ${signOutError.message}`);
  } else {
    console.log('PASS sesión ADMIN cerrada.');
  }
}

if (fallo) process.exitCode = 1;
else console.log('Todas las pruebas de catálogo y proveedores finalizaron correctamente.');
