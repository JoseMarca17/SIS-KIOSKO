import json
import hashlib

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db.models import Q, Sum, Count, F
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_http_methods

from apps.catalogo.models import Categoria, Producto, Inventario, Oferta
from apps.pagos.models import Comprobante, QRKiosko, Transaccion
from apps.pedidos.models import EstadoPedido, Pedido, DetallePedido
from apps.usuarios.models import Rol, Usuario


def usuario_json(user):
    return {
        'id': user.id,
        'email': user.email,
        'nombre_completo': user.nombre_completo,
        'rol': user.rol.nombre if user.rol else None,
    }


def producto_json(producto):
    oferta = producto.get_oferta_activa()
    return {
        'id': producto.id,
        'nombre': producto.nombre,
        'descripcion': producto.descripcion or '',
        'categoria': producto.categoria.nombre,
        'categoria_id': producto.categoria_id,
        'precio_base': float(producto.precio_base),
        'precio_actual': float(producto.precio_actual()),
        'imagen': f'/media/{producto.imagen.name}' if producto.imagen else None,
        'destacado': producto.destacado,
        'stock': producto.inventario.stock_actual if hasattr(producto, 'inventario') else 0,
        'oferta': ({
            'tipo': oferta.tipo_descuento,
            'valor': float(oferta.valor_descuento),
            'descripcion': oferta.descripcion or '',
            'fecha_fin': oferta.fecha_fin.isoformat(),
        } if oferta else None),
    }


@ensure_csrf_cookie
def api_csrf(request):
    return JsonResponse({'ok': True})


def api_categorias(request):
    categorias = Categoria.objects.filter(activo=True).order_by('orden')
    return JsonResponse({'categorias': [
        {'id': c.id, 'nombre': c.nombre, 'descripcion': c.descripcion or ''}
        for c in categorias
    ]})


def api_catalogo(request):
    productos = Producto.objects.filter(activo=True).select_related('categoria', 'inventario')
    if request.GET.get('categoria'):
        productos = productos.filter(categoria_id=request.GET['categoria'])
    if request.GET.get('q'):
        busqueda = request.GET['q'].strip()
        productos = productos.filter(Q(nombre__icontains=busqueda) | Q(descripcion__icontains=busqueda))
    return JsonResponse({'productos': [producto_json(p) for p in productos]})


def api_producto(request, pk):
    producto = get_object_or_404(Producto.objects.select_related('categoria', 'inventario'), pk=pk, activo=True)
    relacionados = Producto.objects.filter(activo=True, categoria=producto.categoria).exclude(pk=pk)[:4]
    return JsonResponse({'producto': producto_json(producto), 'relacionados': [producto_json(p) for p in relacionados]})


@require_http_methods(['POST'])
@csrf_protect
def api_login(request):
    try:
        data = json.loads(request.body or '{}')
    except json.JSONDecodeError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    user = authenticate(request, username=data.get('email', '').strip(), password=data.get('password', ''))
    if not user:
        return JsonResponse({'error': 'Credenciales incorrectas'}, status=400)
    login(request, user)
    return JsonResponse({'usuario': usuario_json(user)})


@require_http_methods(['POST'])
@csrf_protect
def api_register(request):
    try:
        data = json.loads(request.body or '{}')
        if data.get('password') != data.get('password2'):
            return JsonResponse({'error': 'Las contraseñas no coinciden'}, status=400)
        if Usuario.objects.filter(email=data.get('email', '').strip()).exists():
            return JsonResponse({'error': 'Ya existe una cuenta con ese correo'}, status=400)
        user = Usuario.objects.create_user(
            email=data.get('email', '').strip(),
            nombre_completo=data.get('nombre_completo', '').strip(),
            password=data.get('password', ''),
            telefono=data.get('telefono', '').strip() or None,
        )
        return JsonResponse({'usuario': usuario_json(user)}, status=201)
    except (json.JSONDecodeError, ValueError) as exc:
        return JsonResponse({'error': str(exc)}, status=400)


@require_http_methods(['POST'])
def api_logout(request):
    logout(request)
    return JsonResponse({'ok': True})


def api_me(request):
    return JsonResponse({'usuario': usuario_json(request.user) if request.user.is_authenticated else None})


@login_required
def api_pedidos(request):
    if request.method != 'GET':
        return JsonResponse({'error': 'La creación de pedidos usa /pedidos/checkout/ temporalmente'}, status=405)
    pedidos = Pedido.objects.filter(usuario=request.user).select_related('estado')
    return JsonResponse({'pedidos': [
        {'id': p.id, 'codigo': p.codigo_pedido, 'estado': p.estado.nombre,
         'total': float(p.total), 'fecha': p.fecha_pedido.isoformat()}
        for p in pedidos
    ]})


@require_http_methods(['POST'])
@login_required
@csrf_protect
def api_checkout(request):
    # La operación existente ya calcula precios, valida stock y usa transaction.atomic().
    from apps.pedidos.views import vista_checkout
    return vista_checkout(request)


@login_required
def api_pedido_detail(request, pk):
    pedido = get_object_or_404(Pedido.objects.select_related('estado'), pk=pk, usuario=request.user)
    return JsonResponse({'pedido': {
        'id': pedido.id, 'codigo': pedido.codigo_pedido, 'estado': pedido.estado.nombre,
        'subtotal': float(pedido.subtotal), 'descuento': float(pedido.descuento), 'total': float(pedido.total),
        'notas': pedido.notas_especiales or '', 'fecha': pedido.fecha_pedido.isoformat(),
        'detalles': [{'producto': d.producto.nombre, 'cantidad': d.cantidad,
                      'precio_unitario': float(d.precio_unitario), 'subtotal': float(d.subtotal)}
                     for d in pedido.detalles.select_related('producto')],
    }})


@login_required
@require_http_methods(['GET', 'POST'])
@csrf_protect
def api_pago(request, pedido_id):
    pedido = get_object_or_404(Pedido, pk=pedido_id, usuario=request.user)
    qr = QRKiosko.objects.filter(activo=True).first() or QRKiosko.objects.first()
    if not qr:
        return JsonResponse({'error': 'No hay un QR de pago configurado'}, status=503)
    transaccion, _ = Transaccion.objects.get_or_create(
        pedido=pedido,
        defaults={'qr_usado': qr, 'monto': pedido.total, 'estado': 'pendiente_validacion'},
    )
    if request.method == 'POST':
        archivo = request.FILES.get('comprobante')
        if not archivo or not archivo.content_type.startswith('image/'):
            return JsonResponse({'error': 'Debes subir una imagen válida'}, status=400)
        if archivo.size > 5 * 1024 * 1024:
            return JsonResponse({'error': 'La imagen no debe superar 5MB'}, status=400)
        contenido = archivo.read(); archivo.seek(0)
        digest = hashlib.sha256(contenido).hexdigest()
        if Comprobante.objects.filter(hash_imagen=digest).exists():
            return JsonResponse({'error': 'Este comprobante ya fue subido'}, status=400)
        Comprobante.objects.create(transaccion=transaccion, imagen=archivo, hash_imagen=digest)
        pedido.estado = EstadoPedido.objects.get(nombre='pendiente_validacion'); pedido.save(update_fields=['estado'])
        return JsonResponse({'ok': True})
    return JsonResponse({'pedido': {'id': pedido.id, 'codigo': pedido.codigo_pedido, 'total': float(pedido.total)},
                         'qr': {'banco': qr.banco, 'titular': qr.titular,
                                'imagen': f'/media/{qr.imagen_qr.name}' if qr.imagen_qr else None}})


def _admin_required(request):
    return request.user.is_authenticated and request.user.es_admin


def _admin_error():
    return JsonResponse({'error': 'Se requieren permisos de administrador'}, status=403)


def api_admin_dashboard(request):
    if not _admin_required(request): return _admin_error()
    validos = ['pagado', 'preparando', 'listo', 'entregado']
    ventas = Pedido.objects.filter(cancelado=False, estado__nombre__in=validos).aggregate(total=Sum('total'))['total'] or 0
    top = DetallePedido.objects.filter(pedido__cancelado=False, pedido__estado__nombre__in=validos).values('producto__nombre').annotate(unidades=Sum('cantidad')).order_by('-unidades')[:5]
    return JsonResponse({'resumen': {'ventas': float(ventas), 'pedidos': Pedido.objects.exclude(estado__nombre='cancelado').count(), 'pendientes': Transaccion.objects.filter(estado='pendiente_validacion').count(), 'stock_bajo': Inventario.objects.filter(stock_actual__lte=F('stock_minimo')).count()}, 'top': list(top)})


def api_admin_inventory(request):
    if not _admin_required(request): return _admin_error()
    if request.method == 'POST':
        data = json.loads(request.body or '{}'); inv = get_object_or_404(Inventario, producto_id=data.get('producto_id')); inv.stock_actual = max(0, int(data.get('stock', 0))); inv.save(); return JsonResponse({'ok': True, 'stock': inv.stock_actual})
    items = Inventario.objects.select_related('producto__categoria').order_by('stock_actual')
    return JsonResponse({'inventario': [{'producto_id': i.producto_id, 'producto': i.producto.nombre, 'categoria': i.producto.categoria.nombre, 'stock': i.stock_actual, 'minimo': i.stock_minimo} for i in items]})


def api_admin_products(request, pk=None):
    if not _admin_required(request): return _admin_error()
    if request.method == 'POST':
        data = request.POST if request.content_type.startswith('multipart/') else json.loads(request.body or '{}')
        product = get_object_or_404(Producto, pk=pk) if pk else Producto()
        for field in ['nombre', 'descripcion', 'precio_base']:
            if field in data: setattr(product, field, data[field])
        if 'categoria' in data: product.categoria_id = data['categoria']
        for field in ['destacado', 'activo']:
            if field in data: setattr(product, field, str(data[field]).lower() in ('true', '1', 'on'))
        if request.FILES.get('imagen'): product.imagen = request.FILES['imagen']
        product.save(); Inventario.objects.get_or_create(producto=product, defaults={'stock_actual': int(data.get('stock_inicial', 0))})
        return JsonResponse({'ok': True, 'producto': producto_json(product)})
    if request.method == 'PATCH':
        product = get_object_or_404(Producto, pk=pk); product.activo = not product.activo; product.save(update_fields=['activo']); return JsonResponse({'ok': True, 'activo': product.activo})
    products = Producto.objects.select_related('categoria', 'inventario').order_by('-fecha_creacion')
    return JsonResponse({'productos': [producto_json(p) | {'activo': p.activo} for p in products], 'categorias': list(Categoria.objects.values('id', 'nombre'))})


def api_admin_offers(request, pk=None):
    if not _admin_required(request): return _admin_error()
    if request.method in ('POST', 'PUT'):
        data = json.loads(request.body or '{}'); offer = get_object_or_404(Oferta, pk=pk) if pk else Oferta()
        for field in ['producto_id', 'tipo_descuento', 'valor_descuento', 'descripcion', 'limite_cantidad', 'activo']:
            if field in data: setattr(offer, field, data[field])
        for field in ['fecha_inicio', 'fecha_fin']:
            if field in data: setattr(offer, field, parse_datetime(data[field]) if isinstance(data[field], str) else data[field])
        offer.save(); return JsonResponse({'ok': True, 'id': offer.id})
    if request.method == 'PATCH':
        offer = get_object_or_404(Oferta, pk=pk); offer.activo = not offer.activo; offer.save(update_fields=['activo']); return JsonResponse({'ok': True, 'activo': offer.activo})
    offers = Oferta.objects.select_related('producto__categoria').order_by('-fecha_inicio')
    return JsonResponse({'ofertas': [{'id': o.id, 'producto': o.producto.nombre, 'producto_id': o.producto_id, 'categoria': o.producto.categoria.nombre, 'tipo': o.tipo_descuento, 'valor': float(o.valor_descuento), 'inicio': o.fecha_inicio.isoformat(), 'fin': o.fecha_fin.isoformat(), 'limite': o.limite_cantidad, 'vendidas': o.cantidad_vendida, 'activo': o.activo} for o in offers], 'productos': list(Producto.objects.filter(activo=True).values('id', 'nombre'))})


def api_admin_orders(request):
    if not _admin_required(request): return _admin_error()
    if request.method == 'PATCH':
        data = json.loads(request.body or '{}'); pedido = get_object_or_404(Pedido, pk=data.get('id')); estado = data.get('estado')
        if estado == 'cancelado': pedido.cancelado = True
        pedido.estado = get_object_or_404(EstadoPedido, nombre=estado); pedido.save(); return JsonResponse({'ok': True})
    pedidos = Pedido.objects.select_related('estado', 'usuario').order_by('-fecha_pedido')[:100]
    return JsonResponse({'pedidos': [{'id': p.id, 'codigo': p.codigo_pedido, 'usuario': p.usuario.nombre_completo, 'estado': p.estado.nombre, 'total': float(p.total), 'fecha': p.fecha_pedido.isoformat()} for p in pedidos], 'estados': list(EstadoPedido.objects.values('nombre', 'descripcion'))})


def api_admin_stats(request):
    if not _admin_required(request): return _admin_error()
    validos = ['pagado', 'preparando', 'listo', 'entregado']
    products = DetallePedido.objects.filter(pedido__cancelado=False, pedido__estado__nombre__in=validos).values('producto__nombre', 'producto__categoria__nombre').annotate(unidades=Sum('cantidad'), ingresos=Sum('subtotal')).order_by('-unidades')
    categories = DetallePedido.objects.filter(pedido__cancelado=False, pedido__estado__nombre__in=validos).values('producto__categoria__nombre').annotate(total=Sum('subtotal')).order_by('-total')
    return JsonResponse({'productos': list(products), 'categorias': [{'nombre': c['producto__categoria__nombre'], 'total': float(c['total'])} for c in categories]})
