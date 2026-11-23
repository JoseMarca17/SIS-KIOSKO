from django.urls import path

from .api_views import (
    api_catalogo, api_categorias, api_csrf, api_login, api_logout,
    api_me, api_pedidos, api_register, api_producto, api_checkout,
    api_pedido_detail, api_pago,
    api_admin_dashboard, api_admin_inventory, api_admin_products,
    api_admin_offers, api_admin_orders, api_admin_stats,
)

urlpatterns = [
    path('csrf/', api_csrf),
    path('catalogo/', api_catalogo),
    path('categorias/', api_categorias),
    path('auth/login/', api_login),
    path('auth/logout/', api_logout),
    path('auth/me/', api_me),
    path('pedidos/', api_pedidos),
    path('pedidos/checkout/', api_checkout),
    path('pedidos/<int:pk>/', api_pedido_detail),
    path('productos/<int:pk>/', api_producto),
    path('auth/register/', api_register),
    path('pagos/<int:pedido_id>/', api_pago),
    path('admin/dashboard/', api_admin_dashboard),
    path('admin/inventario/', api_admin_inventory),
    path('admin/productos/', api_admin_products),
    path('admin/productos/<int:pk>/', api_admin_products),
    path('admin/ofertas/', api_admin_offers),
    path('admin/ofertas/<int:pk>/', api_admin_offers),
    path('admin/pedidos/', api_admin_orders),
    path('admin/estadisticas/', api_admin_stats),
]
