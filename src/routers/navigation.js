import {
  ArrowLeftRight,
  Bell,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  PackageSearch,
  Tags,
  Truck,
  TriangleAlert,
  Users,
} from 'lucide-react';

export const ALL_ROLES = ['ADMIN', 'PERSONAL'];
export const ADMIN_ONLY = ['ADMIN'];

export const navigation = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ALL_ROLES },
  { path: '/inventario', label: 'Inventario', icon: Boxes, roles: ALL_ROLES },
  { path: '/incidentes', label: 'Incidentes', icon: TriangleAlert, roles: ALL_ROLES, counter: 'incidentes' },
  { path: '/alertas', label: 'Alertas', icon: Bell, roles: ALL_ROLES, counter: 'alertas' },
  { path: '/operaciones', label: 'Operaciones', icon: ArrowLeftRight, roles: ADMIN_ONLY },
  { path: '/catalogo', label: 'Catálogo', icon: Tags, roles: ADMIN_ONLY },
  { path: '/proveedores', label: 'Proveedores', icon: Truck, roles: ADMIN_ONLY },
  { path: '/kardex', label: 'Kardex', icon: ClipboardList, roles: ADMIN_ONLY },
  { path: '/usuarios', label: 'Usuarios', icon: Users, roles: ADMIN_ONLY },
];

export const getPageTitle = (pathname) => (
  navigation.find((item) => item.path === pathname)?.label ?? 'KioskoControl'
);

export { PackageSearch };
