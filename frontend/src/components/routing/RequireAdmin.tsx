import { Navigate } from 'react-router-dom';
import { useAuth } from '../../state/auth';

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.rol !== 'admin') return <Navigate to="/registro" replace />;
  return children;
}

