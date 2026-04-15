import type { AdminUser, ApiResponse, HistorialItem, InventoryItem, SessionUser } from './types';

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null; expectJson?: boolean } = {}
): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers || {});
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
  const expectJson = options.expectJson ?? true;

  const res = await fetch(path, {
    ...options,
    headers
  });

  const body = expectJson ? await parseJsonSafe(res) : {};
  if (!res.ok) {
    return {
      success: false,
      message: (body as any)?.message || `HTTP ${res.status}`
    };
  }
  return body as ApiResponse<T>;
}

export const api = {
  login(payload: { usuario: string; contraseña: string; tipo_usuario?: string }) {
    return request<{ token: string; user: SessionUser }>('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },
  verifyToken(token: string) {
    return request<unknown>('/api/verify-token', { method: 'GET', token });
  },
  estadisticas(token: string) {
    return request<{ generales: Record<string, number>; porSecretaria: any[] }>('/api/estadisticas', { method: 'GET', token });
  },
  inventario(token: string) {
    return request<InventoryItem[]>('/api/inventario', { method: 'GET', token });
  },
  inventarioQuery(
    token: string,
    params: { page?: number; limit?: number; search?: string; secretaria?: string; estado_uso?: string } = {}
  ) {
    const qs = new URLSearchParams();
    if (params.page != null) qs.set('page', String(params.page));
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.search) qs.set('search', params.search);
    if (params.secretaria) qs.set('secretaria', params.secretaria);
    if (params.estado_uso) qs.set('estado_uso', params.estado_uso);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<InventoryItem[]>(`/api/inventario${suffix}`, { method: 'GET', token });
  },
  inventarioById(token: string, id: number) {
    return request<InventoryItem>(`/api/inventario/${id}`, { method: 'GET', token });
  },
  crearInventario(token: string, form: FormData) {
    return request<InventoryItem>('/api/inventario', { method: 'POST', token, body: form, expectJson: true });
  },
  actualizarInventario(token: string, id: number, form: FormData) {
    return request<InventoryItem>(`/api/inventario/${id}`, { method: 'PUT', token, body: form, expectJson: true });
  },
  eliminarInventario(token: string, id: number) {
    return request<unknown>(`/api/inventario/${id}`, { method: 'DELETE', token });
  },
  moverInventario(token: string, id: number, payload: { estado_uso: 'en_uso' | 'en_almacen'; secretaria?: string }) {
    return request<unknown>(`/api/inventario/${id}/mover`, {
      method: 'PUT',
      token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },
  trasladarInventario(token: string, id: number, payload: { secretaria_destino: string; motivo_traslado?: string }) {
    return request<unknown>(`/api/inventario/${id}/trasladar`, {
      method: 'PUT',
      token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },
  qrInventario(token: string, id: number) {
    return request<{ qr_image: string; item_info: unknown }>(`/api/inventario/${id}/qr`, { method: 'GET', token });
  },
  secretarias(token: string) {
    return request<string[]>('/api/secretarias', { method: 'GET', token });
  },
  historial(
    token: string,
    params: { tipo?: string; fecha_desde?: string; fecha_hasta?: string; limite?: number } = {}
  ) {
    const qs = new URLSearchParams();
    if (params.tipo) qs.set('tipo', params.tipo);
    if (params.fecha_desde) qs.set('fecha_desde', params.fecha_desde);
    if (params.fecha_hasta) qs.set('fecha_hasta', params.fecha_hasta);
    if (params.limite) qs.set('limite', String(params.limite));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<HistorialItem[]>(`/api/historial${suffix}`, { method: 'GET', token });
  },
  usuarios(token: string) {
    return request<AdminUser[]>('/api/usuarios', { method: 'GET', token });
  },
  crearUsuario(
    token: string,
    payload: Partial<AdminUser> & { contraseña: string; usuario: string; email: string; rol: 'admin' | 'usuario' }
  ) {
    return request<unknown>('/api/usuarios', {
      method: 'POST',
      token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },
  actualizarUsuario(token: string, id: number, payload: Partial<AdminUser> & { contraseña?: string }) {
    return request<unknown>(`/api/usuarios/${id}`, {
      method: 'PUT',
      token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },
  cambiarEstadoUsuario(token: string, id: number, activo: boolean) {
    return request<unknown>(`/api/usuarios/${id}/estado`, {
      method: 'PUT',
      token,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: activo ? 1 : 0 })
    });
  },
  eliminarUsuario(token: string, id: number) {
    return request<unknown>(`/api/usuarios/${id}`, { method: 'DELETE', token });
  }
};
