import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './state/auth';
import { ToastProvider } from './state/toast';
import AppShell from './components/layout/AppShell';
import RequireAuth from './components/routing/RequireAuth';
import RequireAdmin from './components/routing/RequireAdmin';
import LoginPage from './pages/LoginPage';
import RegistroPage from './pages/RegistroPage';
import NotFoundPage from './pages/NotFoundPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminAlmacenPage from './pages/admin/AdminAlmacenPage';
import AdminSecretariasPage from './pages/admin/AdminSecretariasPage';
import AdminArticuloFormPage from './pages/admin/AdminArticuloFormPage';
import AdminUsuariosPage from './pages/admin/AdminUsuariosPage';
import AdminReportesPage from './pages/admin/AdminReportesPage';
import AdminHistorialPage from './pages/admin/AdminHistorialPage';
import AdminTrasladosPage from './pages/admin/AdminTrasladosPage';
import AdminOrdenesTrasladoPage from './pages/admin/AdminOrdenesTrasladoPage';
import AdminArticuloDetallePage from './pages/admin/AdminArticuloDetallePage';

function IndexRedirect() {
  const { user, token, isBootstrapping } = useAuth();
  if (isBootstrapping) return null;
  if (!token || !user) return <Navigate to="/login" replace />;
  return user.rol === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/registro" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<IndexRedirect />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/registro"
            element={
              <RequireAuth>
                <AppShell>
                  <RegistroPage />
                </AppShell>
              </RequireAuth>
            }
          />

          <Route
            path="/admin"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <AppShell>
                    <AdminDashboardPage />
                  </AppShell>
                </RequireAdmin>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/almacen"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <AppShell>
                    <AdminAlmacenPage />
                  </AppShell>
                </RequireAdmin>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/secretarias"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <AppShell>
                    <AdminSecretariasPage />
                  </AppShell>
                </RequireAdmin>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/articulos/nuevo"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <AppShell>
                    <AdminArticuloFormPage mode="create" />
                  </AppShell>
                </RequireAdmin>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/articulos/:id/editar"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <AppShell>
                    <AdminArticuloFormPage mode="edit" />
                  </AppShell>
                </RequireAdmin>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/articulos/:id"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <AppShell>
                    <AdminArticuloDetallePage />
                  </AppShell>
                </RequireAdmin>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/usuarios"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <AppShell>
                    <AdminUsuariosPage />
                  </AppShell>
                </RequireAdmin>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/reportes"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <AppShell>
                    <AdminReportesPage />
                  </AppShell>
                </RequireAdmin>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/historial"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <AppShell>
                    <AdminHistorialPage />
                  </AppShell>
                </RequireAdmin>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/traslado"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <AppShell>
                    <AdminTrasladosPage />
                  </AppShell>
                </RequireAdmin>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/traslados/ordenes"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <AppShell>
                    <AdminOrdenesTrasladoPage />
                  </AppShell>
                </RequireAdmin>
              </RequireAuth>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}

