import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import type { AdminUser } from '../../lib/types';
import { useAuth } from '../../state/auth';
import { useToast } from '../../state/toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import ActionsDropdown from '../../components/ui/ActionsDropdown';
import { useSecretarias } from '../../lib/secretarias';

type UserDraft = {
  usuario: string;
  contraseña?: string;
  nombre_completo: string;
  email: string;
  rol: 'admin' | 'usuario';
  secretaria: string;
};

function toDraft(u: AdminUser | null | undefined, defaultSecretaria: string): UserDraft {
  return {
    usuario: u?.usuario || '',
    contraseña: '',
    nombre_completo: u?.nombre_completo || '',
    email: u?.email || '',
    rol: u?.rol || 'usuario',
    secretaria: u?.secretaria || defaultSecretaria
  };
}

export default function AdminUsuariosPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');

  const secretarias = useSecretarias();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [draft, setDraft] = useState<UserDraft>(toDraft(null, secretarias[0] || ''));
  const [secretariaMode, setSecretariaMode] = useState<'select' | 'custom'>('select');
  const [customSecretaria, setCustomSecretaria] = useState('');

  // Modal de confirmación para eliminar
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function reload() {
    if (!token) return;
    setLoading(true);
    const res = await api.usuarios(token);
    setLoading(false);
    if (!res.success || !res.data) {
      toast.push({ type: 'error', title: 'No se pudieron cargar usuarios', detail: res.message });
      return;
    }
    setUsers(res.data);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => [u.usuario, u.nombre_completo, u.email, u.rol, u.secretaria || ''].join(' ').toLowerCase().includes(s));
  }, [users, q]);

  function openCreate() {
    setEditing(null);
    setDraft(toDraft(null, secretarias[0] || ''));
    setSecretariaMode('select');
    setCustomSecretaria('');
    setOpen(true);
  }

  function openEdit(u: AdminUser) {
    setEditing(u);
    setDraft(toDraft(u, secretarias[0] || ''));
    const sec = (u.secretaria || '').trim();
    const inList = !!sec && secretarias.includes(sec as any);
    setSecretariaMode(inList || !sec ? 'select' : 'custom');
    setCustomSecretaria(inList ? '' : sec);
    setOpen(true);
  }

  async function save() {
    if (!token) return;
    if (!draft.usuario.trim() || !draft.email.trim() || !draft.nombre_completo.trim()) {
      toast.push({ type: 'error', title: 'Campos requeridos', detail: 'Usuario, nombre y email son obligatorios.' });
      return;
    }
    if (!editing && !draft.secretaria.trim()) {
      toast.push({ type: 'error', title: 'Secretaría requerida', detail: 'Para crear un usuario debes asignar una secretaría.' });
      return;
    }
    if (!editing && !draft.contraseña?.trim()) {
      toast.push({ type: 'error', title: 'Contraseña requerida', detail: 'Para crear un usuario debes definir contraseña.' });
      return;
    }
    setBusy(true);
    const res = editing
      ? await api.actualizarUsuario(token, editing.id, {
          usuario: draft.usuario,
          email: draft.email,
          nombre_completo: draft.nombre_completo,
          rol: draft.rol,
          secretaria: draft.secretaria || null,
          ...(draft.contraseña?.trim() ? { contraseña: draft.contraseña } : {})
        })
      : await api.crearUsuario(token, {
          usuario: draft.usuario,
          email: draft.email,
          nombre_completo: draft.nombre_completo,
          rol: draft.rol,
          secretaria: draft.secretaria || null,
          contraseña: draft.contraseña!
        });
    setBusy(false);
    if (!res.success) {
      toast.push({ type: 'error', title: 'No se pudo guardar', detail: res.message });
      return;
    }
    toast.push({ type: 'success', title: editing ? 'Usuario actualizado' : 'Usuario creado' });
    setOpen(false);
    reload();
  }

  async function toggle(u: AdminUser) {
    if (!token) return;
    const res = await api.cambiarEstadoUsuario(token, u.id, !(u.activo === 1));
    if (!res.success) {
      toast.push({ type: 'error', title: 'No se pudo cambiar estado', detail: res.message });
      return;
    }
    toast.push({ type: 'success', title: u.activo === 1 ? 'Usuario desactivado' : 'Usuario activado' });
    reload();
  }

  function openDeleteModal(u: AdminUser) {
    setDeleteUser(u);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!token || !deleteUser) return;
    setDeleteBusy(true);
    const res = await api.eliminarUsuario(token, deleteUser.id);
    setDeleteBusy(false);
    if (!res.success) {
      toast.push({ type: 'error', title: 'No se pudo eliminar', detail: res.message });
      return;
    }
    toast.push({ type: 'success', title: 'Usuario eliminado' });
    setDeleteOpen(false);
    setDeleteUser(null);
    reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle>Gestión de usuarios</CardTitle>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => reload()} disabled={loading}>
                Recargar
              </Button>
              <Button onClick={openCreate}>Crear</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar usuario, nombre, email…" />
            <div className="overflow-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-xs text-mutedForeground">
                  <tr>
                    <th className="px-3 py-2">Usuario</th>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Rol</th>
                    <th className="px-3 py-2">Secretaría</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{u.usuario}</td>
                      <td className="px-3 py-2">{u.nombre_completo}</td>
                      <td className="px-3 py-2">{u.rol}</td>
                      <td className="px-3 py-2">{u.secretaria || '—'}</td>
                      <td className="px-3 py-2">{u.activo === 1 ? 'Activo' : 'Inactivo'}</td>
                      <td className="px-3 py-2">
                        {/* Desktop */}
                        <div className="hidden md:flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" onClick={() => openEdit(u)}>
                            Editar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => toggle(u)}>
                            {u.activo === 1 ? 'Desactivar' : 'Activar'}
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => openDeleteModal(u)}>
                            Eliminar
                          </Button>
                        </div>
                        {/* Mobile */}
                        <div className="md:hidden">
                          <ActionsDropdown
                            actions={[
                              { label: 'Editar', onClick: () => openEdit(u) },
                              { label: u.activo === 1 ? 'Desactivar' : 'Activar', onClick: () => toggle(u) },
                              { label: 'Eliminar', onClick: () => openDeleteModal(u), variant: 'danger' }
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filtered.length ? (
                    <tr>
                      <td className="px-3 py-6 text-center text-sm text-mutedForeground" colSpan={6}>
                        {loading ? 'Cargando…' : 'Sin usuarios.'}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de confirmación para eliminar */}
      <Modal
        open={deleteOpen}
        title="Confirmar eliminación"
        onClose={() => {
          if (!deleteBusy) {
            setDeleteOpen(false);
            setDeleteUser(null);
          }
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-950 dark:text-red-200">
            <p className="font-medium">¿Estás seguro de eliminar este usuario?</p>
            <p className="mt-1 text-sm">
              Usuario: <strong>{deleteUser?.usuario}</strong>
            </p>
            <p className="text-sm">
              Nombre: <strong>{deleteUser?.nombre_completo}</strong>
            </p>
            <p className="mt-2 text-xs text-red-600 dark:text-red-300">
              Esta acción no se puede deshacer.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="danger" onClick={confirmDelete} disabled={deleteBusy}>
              {deleteBusy ? 'Eliminando…' : 'Sí, eliminar'}
            </Button>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleteBusy}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={open} title={editing ? `Editar: ${editing.usuario}` : 'Crear usuario'} onClose={() => setOpen(false)}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-mutedForeground">Usuario *</label>
            <Input value={draft.usuario} onChange={(e) => setDraft((d) => ({ ...d, usuario: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-mutedForeground">Email *</label>
            <Input value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} type="email" />
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-medium text-mutedForeground">Nombre completo *</label>
            <Input value={draft.nombre_completo} onChange={(e) => setDraft((d) => ({ ...d, nombre_completo: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-mutedForeground">Rol</label>
            <Select value={draft.rol} onChange={(e) => setDraft((d) => ({ ...d, rol: e.target.value as any }))}>
              <option value="usuario">Usuario</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-mutedForeground">Secretaría</label>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
              <Select
                className="md:col-span-2"
                value={secretariaMode}
                onChange={(e) => {
                  const mode = e.target.value as 'select' | 'custom';
                  setSecretariaMode(mode);
                  if (mode === 'select') {
                    setCustomSecretaria('');
                    setDraft((d) => ({ ...d, secretaria: secretarias.includes(d.secretaria as any) ? d.secretaria : (secretarias[0] || '') }));
                  } else {
                    setDraft((d) => ({ ...d, secretaria: customSecretaria || d.secretaria || '' }));
                  }
                }}
              >
                <option value="select">Lista</option>
                <option value="custom">Otra</option>
              </Select>
              {secretariaMode === 'select' ? (
                <Select
                  className="md:col-span-3"
                  value={secretarias.includes(draft.secretaria as any) ? draft.secretaria : (secretarias[0] || '')}
                  onChange={(e) => setDraft((d) => ({ ...d, secretaria: e.target.value }))}
                >
                  {secretarias.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  className="md:col-span-3"
                  value={customSecretaria}
                  onChange={(e) => {
                    setCustomSecretaria(e.target.value);
                    setDraft((d) => ({ ...d, secretaria: e.target.value }));
                  }}
                  placeholder="Escriba la secretaría…"
                />
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-medium text-mutedForeground">{editing ? 'Nueva contraseña (opcional)' : 'Contraseña *'}</label>
            <Input
              value={draft.contraseña || ''}
              onChange={(e) => setDraft((d) => ({ ...d, contraseña: e.target.value }))}
              type="password"
              placeholder={editing ? 'Dejar vacío para no cambiar' : '••••••••'}
            />
          </div>
          <div className="mt-2 flex gap-2 md:col-span-2">
            <Button onClick={save} disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
