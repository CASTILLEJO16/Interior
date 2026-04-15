# Frontend (React + Vite + Tailwind)

## Requisitos
- Node.js 18+ recomendado

## Instalar y correr (desarrollo)
1) Inicia el backend (puerto `3000`):
- En `backend/`: `npm install` y luego `npm run dev` (o `npm start`)

2) Inicia el frontend (puerto `5173`):
- En `frontend/`: `npm install` y luego `npm run dev`

El frontend usa proxy de Vite:
- `/api/*` → `http://localhost:3000`
- `/uploads/*` → `http://localhost:3000`

## Build (producción)
- En `frontend/`: `npm run build`
- Se genera `frontend/dist/`
- El backend sirve automáticamente `frontend/dist/` si existe.

## Rutas
- `/login`
- Usuario: `/registro`
- Admin: `/admin`, `/admin/almacen`, `/admin/secretarias`, `/admin/articulos/*`, `/admin/usuarios`, `/admin/reportes`, `/admin/historial`, `/admin/traslado`

## Dark mode
- Toggle en el Navbar (Claro → Oscuro → Sistema)
