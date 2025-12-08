# Abogadai Frontend

Frontend de la plataforma Abogadai - Generación de tutelas y derechos de petición con IA.

## Tecnologías

- React 18
- Vite
- TailwindCSS
- React Router
- Axios

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
```

Edita `.env` y configura:
- `VITE_API_URL`: URL del backend (por defecto: http://localhost:8000)

## Ejecución

### Desarrollo
```bash
npm run dev
```

La aplicación estará disponible en: http://localhost:5173

### Producción

Build:
```bash
npm run build
```

Preview del build:
```bash
npm run preview
```

## Estructura del proyecto

```
abogadai-frontend/
├── src/
│   ├── components/      # Componentes reutilizables
│   ├── context/         # Contextos de React (Auth)
│   ├── pages/           # Páginas (Login, Signup, App)
│   ├── services/        # Servicios de API
│   ├── utils/           # Utilidades
│   ├── App.jsx          # Componente principal
│   └── main.jsx         # Punto de entrada
├── public/              # Archivos estáticos
├── .env                 # Variables de entorno
└── package.json         # Dependencias
```

## Rutas

- `/` - Redirige a `/login`
- `/login` - Página de inicio de sesión
- `/signup` - Página de registro
- `/app` - Dashboard principal (protegida)

## Fase actual

**Fase 1 completada:**
- Sistema de autenticación (registro y login)
- Rutas protegidas
- Dashboard básico

**Próximas fases:**
- Fase 2: Chat con IA
- Fase 3: Generación de documentos
- Fase 4: Historial de casos
- Fase 5: Sistema de pagos
- Fase 6: Avatar con voz (integración con LiveKit + Simli)
