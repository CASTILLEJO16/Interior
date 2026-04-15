import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../state/auth';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, user, isBootstrapping } = useAuth();
  const loc = useLocation();

  if (isBootstrapping) return null;
  if (!token || !user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

