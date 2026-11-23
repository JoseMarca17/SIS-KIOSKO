import { z } from 'zod';

const textoOpcional = (longitudMaxima) => z.preprocess(
  (valor) => (typeof valor === 'string' && valor.trim() === '') || valor == null ? null : valor,
  z.string().trim().max(longitudMaxima, `Usa como máximo ${longitudMaxima} caracteres.`).nullable().optional(),
);

const numeroDesdeFormulario = (mensaje) => z.coerce.number({ error: mensaje });
const vacioAIndefinido = (valor) => valor === '' || valor == null ? undefined : valor;

const enteroNoNegativo = (mensaje) => z.preprocess(
  vacioAIndefinido,
  numeroDesdeFormulario(mensaje).int('Ingresa un número entero.').min(0, 'El valor debe ser mayor o igual a 0.'),
);

export const categoriaSchema = z.object({
  nombre: z.string().trim().min(2, 'Ingresa al menos 2 caracteres.').max(80, 'Usa como máximo 80 caracteres.'),
});

export const productoSchema = z.object({
  nombre: z.string().trim().min(2, 'Ingresa al menos 2 caracteres.').max(120, 'Usa como máximo 120 caracteres.'),
  categoria_id: z.preprocess(
    vacioAIndefinido,
    numeroDesdeFormulario('Selecciona una categoría.').int('Selecciona una categoría válida.').positive('Selecciona una categoría.'),
  ),
  codigo_barras: textoOpcional(50),
  unidad_medida: z.string().trim().min(1, 'Ingresa la unidad de medida.').max(30, 'Usa como máximo 30 caracteres.'),
  stock_minimo: enteroNoNegativo('Ingresa el stock mínimo.'),
  stock_maximo: z.preprocess(
    vacioAIndefinido,
    numeroDesdeFormulario('Ingresa el stock máximo.').int('Ingresa un número entero.').min(0, 'El stock máximo debe ser mayor o igual a 0.'),
  ),
  dias_alerta_vencimiento: enteroNoNegativo('Ingresa los días de alerta.'),
}).superRefine((valores, contexto) => {
  if (valores.stock_maximo <= valores.stock_minimo) {
    contexto.addIssue({
      code: 'custom',
      path: ['stock_maximo'],
      message: 'El stock máximo debe ser mayor que el stock mínimo.',
    });
  }
});

export const proveedorSchema = z.object({
  nombre: z.string().trim().min(2, 'Ingresa al menos 2 caracteres.').max(120, 'Usa como máximo 120 caracteres.'),
  nit_ci: textoOpcional(30),
  telefono: z.string().trim().min(3, 'Ingresa un teléfono válido.').max(30, 'Usa como máximo 30 caracteres.'),
  email: z.preprocess(
    (valor) => (typeof valor === 'string' && valor.trim() === '') || valor == null ? null : valor,
    z.string().trim().email('Ingresa un email válido.').max(120, 'Usa como máximo 120 caracteres.').nullable().optional(),
  ),
});

export const productoProveedorSchema = z.object({
  producto_id: z.preprocess(
    vacioAIndefinido,
    numeroDesdeFormulario('Selecciona un producto.').int('Selecciona un producto válido.').positive('Selecciona un producto.'),
  ),
  costo_adquisicion: z.preprocess(
    vacioAIndefinido,
    numeroDesdeFormulario('Ingresa el costo de adquisición.')
      .min(0, 'El costo debe ser mayor o igual a 0.')
      .max(99999999.99, 'El costo supera el máximo permitido.')
      .refine((valor) => Math.abs(valor * 100 - Math.round(valor * 100)) < 1e-8, 'Usa como máximo 2 decimales.'),
  ),
  tiempo_entrega_dias: enteroNoNegativo('Ingresa el tiempo de entrega.'),
  es_principal: z.boolean(),
});
