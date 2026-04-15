import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-2 p-8">
      <div className="text-lg font-semibold">Página no encontrada</div>
      <div className="text-sm text-mutedForeground">La ruta no existe o fue movida.</div>
      <div className="mt-2">
        <Link to="/">
          <Button variant="secondary">Ir al inicio</Button>
        </Link>
      </div>
    </div>
  );
}

