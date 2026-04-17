export type Role = 'admin' | 'usuario';

export type SessionUser = {
  id: number;
  usuario: string;
  nombre_completo?: string;
  email?: string;
  rol: Role;
  secretaria?: string | null;
};

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: Pagination;
  token?: string;
  user?: SessionUser;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type InventoryItem = {
  id: number;
  numero_inventario: string;
  nombre_articulo: string;
  categoria: string | null;
  subcategoria: string | null;
  secretaria: string;
  fecha_alta: string;
  descripcion: string;
  costo: number;
  resguardante: string;
  imagen: string | null;
  usuario_registro: number;
  fecha_registro: string;
  ultima_actualizacion: string | null;
  estatus: 'activo' | 'dado_de_baja' | 'en_mantenimiento';
  estado_uso: 'en_uso' | 'en_almacen';
};

export type Estadisticas = {
  generales: {
    total_articulos?: number;
    articulos_activos?: number;
    articulos_baja?: number;
    articulos_mantenimiento?: number;
    valor_total_inventario?: number;
    costo_promedio?: number;
    costo_maximo?: number;
    costo_minimo?: number;
  };
  porSecretaria: Array<{
    secretaria: string;
    total_articulos: number;
    valor_total: number;
    costo_promedio: number;
  }>;
};

export type HistorialItem = {
  id: number;
  tipo_accion: string;
  descripcion: string;
  entidad_id: number | null;
  entidad_tipo: string | null;
  usuario_responsable_id: number;
  usuario_responsable_nombre: string | null;
  secretaria_origen: string | null;
  secretaria_destino: string | null;
  detalles_adicionales: string | null;
  fecha_accion: string;
  usuario_nombre?: string | null;
};

export type AdminUser = {
  id: number;
  usuario: string;
  nombre_completo: string;
  email: string;
  rol: Role;
  secretaria: string | null;
  fecha_creacion: string;
  ultimo_acceso: string | null;
  activo: 0 | 1;
};

export type TransferOrder = {
  id: number;
  folio: string;
  anio: number;
  consecutivo: number;
  id_inventario: number;
  nombre_articulo: string;
  numero_inventario: string;
  secretaria_origen: string;
  secretaria_destino: string;
  motivo: string | null;
  usuario_id: number;
  usuario_nombre: string;
  fecha: string;
};
