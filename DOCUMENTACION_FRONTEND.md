# 🎨 DOCUMENTACIÓN FRONTEND - ABOGADAI

## 🌟 Visión General

El **frontend de AbogadAI** es una aplicación web moderna construida con React que permite a los usuarios:

1. 🔐 Autenticarse (login/signup)
2. 🎙️ Conversar con un avatar legal mediante voz en tiempo real
3. 📝 Crear y editar casos de tutelas y derechos de petición
4. 🤖 Procesar conversaciones con IA para extraer datos
5. 📄 Generar documentos legales profesionales
6. 📊 Revisar análisis de calidad y fortaleza
7. 💾 Descargar documentos en PDF/DOCX

---

## 🏗️ ARQUITECTURA

```
┌────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                     │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐       │
│  │   Login     │  │   Signup    │  │  Dashboard   │       │
│  └─────────────┘  └─────────────┘  └──────────────┘       │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐       │
│  │ AvatarSesion│  │ NuevaTutela │  │  MisCasos    │       │
│  └─────────────┘  └─────────────┘  └──────────────┘       │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│                  CAPA DE SERVICIOS                          │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐      │
│  │ authService  │  │ casoService  │  │livekitSvc   │      │
│  └──────────────┘  └──────────────┘  └─────────────┘      │
│                                                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │          api.js (Axios configurado)              │      │
│  └──────────────────────────────────────────────────┘      │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│                  CAPA DE ESTADO GLOBAL                      │
│                                                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │         AuthContext (Usuario, Token)             │      │
│  └──────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────┘
```

---

## 📁 ESTRUCTURA DEL PROYECTO

```
abogadai-frontend/
├── src/
│   ├── components/                # Componentes reutilizables
│   │   ├── ProtectedRoute.jsx    # HOC para rutas protegidas
│   │   ├── TranscriptPanel.jsx   # Panel de transcripción
│   │   └── AnalisisDocumento.jsx # Panel de análisis de IA
│   │
│   ├── context/                   # Contextos de React
│   │   └── AuthContext.jsx       # Estado global de autenticación
│   │
│   ├── hooks/                     # Custom hooks
│   │   └── useTranscriptions.js  # Hook para transcripciones
│   │
│   ├── pages/                     # Páginas principales
│   │   ├── Login.jsx             # Página de login
│   │   ├── Signup.jsx            # Página de registro
│   │   ├── AppDashboard.jsx      # Dashboard principal
│   │   ├── AvatarSession.jsx     # Sesión con avatar
│   │   ├── NuevaTutela.jsx       # Editor de casos
│   │   └── MisCasos.jsx          # Lista de casos
│   │
│   ├── services/                  # Servicios de API
│   │   ├── api.js                # Cliente Axios configurado
│   │   ├── authService.js        # Servicios de autenticación
│   │   ├── casoService.js        # Servicios de casos
│   │   └── livekitService.js     # Servicios de LiveKit
│   │
│   ├── App.jsx                    # Componente raíz + rutas
│   ├── main.jsx                   # Punto de entrada
│   └── index.css                  # Estilos globales (Tailwind)
│
├── public/                        # Archivos estáticos
├── .env                           # Variables de entorno
├── package.json                   # Dependencias
├── vite.config.js                 # Configuración Vite
├── tailwind.config.js             # Configuración Tailwind
└── README.md
```

---

## 🎯 PÁGINAS Y FUNCIONALIDADES

### 1️⃣ **Login.jsx** - Página de Inicio de Sesión

**Ruta:** `/login`

**Funcionalidades:**
- ✅ Formulario de login (email + password)
- ✅ Validación de campos
- ✅ Llamada a `/auth/login` del backend
- ✅ Guarda token JWT en localStorage
- ✅ Actualiza AuthContext
- ✅ Redirige a `/app` tras login exitoso
- ✅ Link a página de registro

**Tecnologías:**
- React state para formulario
- AuthContext para estado global
- authService para API calls
- React Router para navegación

---

### 2️⃣ **Signup.jsx** - Página de Registro

**Ruta:** `/signup`

**Funcionalidades:**
- ✅ Formulario de registro (email, password, nombre completo)
- ✅ Validación de campos
- ✅ Llamada a `/auth/signup` del backend
- ✅ Redirige a `/login` tras registro exitoso
- ✅ Link a página de login

---

### 3️⃣ **AppDashboard.jsx** - Dashboard Principal

**Ruta:** `/app` (protegida)

**Funcionalidades:**
- ✅ Navegación principal
- ✅ Acceso rápido a:
  - Iniciar nueva sesión con avatar
  - Crear caso manualmente
  - Ver casos existentes
- ✅ Información del usuario
- ✅ Botón de logout

**Layout:**
```
┌────────────────────────────────────┐
│  🏛️ AbogadAI     Usuario ▼  Salir  │
├────────────────────────────────────┤
│                                     │
│  Bienvenido, Juan Pérez             │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🎙️ Iniciar Sesión con Avatar│   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 📝 Crear Caso Manualmente    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 📂 Ver Mis Casos             │   │
│  └─────────────────────────────┘   │
│                                     │
└────────────────────────────────────┘
```

---

### 4️⃣ **AvatarSession.jsx** - Sesión con Avatar

**Ruta:** `/app/avatar` (protegida)

**Funcionalidades:**
- ✅ Conecta con LiveKit
- ✅ Muestra video del avatar (Simli)
- ✅ Transmite audio del usuario
- ✅ Recibe respuestas de voz del avatar
- ✅ Panel de transcripción en tiempo real
- ✅ Finaliza sesión automáticamente al desconectar
- ✅ Redirige a edición del caso tras finalizar

**Componentes utilizados:**
- `LiveKitRoom` (de @livekit/components-react)
- `TranscriptPanel` (custom)
- `useTranscriptions` (custom hook)

**Flujo:**
```
1. Usuario hace click en "Iniciar Sesión"
2. Frontend llama a livekitService.iniciarSesion()
3. Backend crea caso + genera token LiveKit
4. Frontend recibe: { caso_id, access_token, livekit_url }
5. Frontend monta <LiveKitRoom> con token
6. Usuario conversa con avatar
7. Transcripción se muestra en panel lateral
8. Usuario hace click en "Finalizar"
9. Frontend llama a livekitService.finalizarSesion(caso_id)
10. Redirige a /app/caso/{caso_id}
```

**Tecnologías:**
- LiveKit Components React
- LiveKit Client SDK
- Custom hooks para transcripciones
- WebRTC para audio/video

---

### 5️⃣ **NuevaTutela.jsx** - Editor de Casos

**Ruta:** `/app/caso/:id` o `/app/caso/nuevo` (protegida)

**Funcionalidades:**

#### **A. Selector de Tipo de Documento**
- ✅ Radio buttons: "Tutela" vs "Derecho de Petición"
- ✅ Cambia terminología según tipo:
  - Tutela → "Derechos Vulnerados", "Pretensiones"
  - Derecho de Petición → "Peticiones" (sin "Derechos Vulnerados")

#### **B. Formulario de Datos del Solicitante**
- ✅ Nombre completo
- ✅ Identificación (validación de cédula/NIT)
- ✅ Dirección
- ✅ Teléfono (validación colombiana)
- ✅ Email

#### **C. Formulario de Datos de la Entidad**
- ✅ Nombre de la entidad
- ✅ Dirección
- ✅ Representante legal

#### **D. Formulario de Contenido del Caso**
- ✅ Hechos (textarea)
- ✅ Derechos Vulnerados (solo para tutelas)
- ✅ Pretensiones/Peticiones (según tipo)
- ✅ Fundamentos de derecho

#### **E. Botón "Procesar con IA"**
Cuando el caso viene de una sesión con avatar:
- ✅ Extrae datos de la conversación
- ✅ Pre-llena el formulario automáticamente
- ✅ Muestra indicador de carga

**Flujo:**
```javascript
const procesarTranscripcion = async () => {
  setLoading(true);
  const resultado = await casoService.procesarTranscripcion(casoId);
  // resultado contiene: hechos, derechos_vulnerados, entidad, pretensiones
  setCaso(resultado);
  setLoading(false);
};
```

#### **F. Botón "Analizar Fortaleza"**
- ✅ Evalúa viabilidad del caso
- ✅ Muestra puntuación de fortaleza
- ✅ Muestra recomendaciones

#### **G. Botón "Generar Documento con IA"**
- ✅ Genera documento legal completo
- ✅ Realiza análisis de calidad automático
- ✅ Muestra documento en modal/panel
- ✅ Muestra análisis de calidad

#### **H. Panel de Análisis** (componente `AnalisisDocumento.jsx`)
Muestra:
- ✅ Puntuación de calidad (0-100)
- ✅ Análisis de jurisprudencia
- ✅ Problemas encontrados
- ✅ Sugerencias de mejora
- ✅ Estado: "Listo para radicar" o "Requiere revisión"

#### **I. Botones de Descarga**
- ✅ Descargar PDF
- ✅ Descargar DOCX

**Layout:**
```
┌────────────────────────────────────────────────────┐
│  ← Volver    Caso #123                             │
├────────────────────────────────────────────────────┤
│  Tipo de Documento:                                │
│  ○ Tutela  ● Derecho de Petición                   │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ Datos del Solicitante                        │  │
│  │ Nombre: [          ]  Cédula: [          ]   │  │
│  │ ...                                          │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ Datos de la Entidad                          │  │
│  │ ...                                          │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ Hechos                                       │  │
│  │ [                                            ]  │
│  │ [           Textarea grande                  ]  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ Peticiones (no Derechos Vulnerados)          │  │
│  │ [                                            ]  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  [🤖 Procesar con IA] [📊 Analizar Fortaleza]      │
│  [📄 Generar Documento]                            │
│                                                     │
│  Documento Generado:                               │
│  ┌──────────────────────────────────────────────┐  │
│  │ DERECHO DE PETICIÓN                          │  │
│  │                                              │  │
│  │ Señores...                                   │  │
│  │ ...                                          │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  Análisis de Calidad: 85/100 ✅ Listo para radicar │
│                                                     │
│  [💾 Descargar PDF] [💾 Descargar DOCX]            │
└────────────────────────────────────────────────────┘
```

---

### 6️⃣ **MisCasos.jsx** - Lista de Casos

**Ruta:** `/app/casos` (protegida)

**Funcionalidades:**
- ✅ Lista de todos los casos del usuario
- ✅ Filtro por tipo: "Todos", "Tutelas", "Derechos de Petición"
- ✅ Muestra: tipo, solicitante, entidad, estado, fecha
- ✅ Click en caso → redirige a edición
- ✅ Badge de tipo de documento

**Layout:**
```
┌────────────────────────────────────────────────────┐
│  Mis Casos                                          │
├────────────────────────────────────────────────────┤
│  Filtros: [Todos ▼] [Tutelas] [Derechos Petición]  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🏛️ Tutela            📊 Borrador             │  │
│  │ Juan Pérez vs EPS Sanitas                    │  │
│  │ Creado: 2024-12-01                           │  │
│  │                            [Ver/Editar →]    │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │ 📝 Derecho de Petición   ✅ Generado          │  │
│  │ María López vs Ministerio de Salud           │  │
│  │ Creado: 2024-12-05                           │  │
│  │                            [Ver/Editar →]    │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  [+ Crear Nuevo Caso]                              │
└────────────────────────────────────────────────────┘
```

---

## 🔌 SERVICIOS

### 1️⃣ **api.js** - Cliente HTTP Base

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// Interceptor para agregar token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores 401 (token expirado)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

### 2️⃣ **authService.js** - Autenticación

```javascript
import api from './api';

export const authService = {
  async signup(userData) {
    const response = await api.post('/auth/signup', userData);
    return response.data;
  },

  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    // response.data = { access_token: "...", token_type: "bearer" }
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
  }
};
```

---

### 3️⃣ **casoService.js** - Gestión de Casos

```javascript
import api from './api';

export const casoService = {
  async crearCaso(datos) {
    const response = await api.post('/casos/', datos);
    return response.data;
  },

  async listarCasos() {
    const response = await api.get('/casos/');
    return response.data;
  },

  async obtenerCaso(id) {
    const response = await api.get(`/casos/${id}`);
    return response.data;
  },

  async actualizarCaso(id, datos) {
    const response = await api.put(`/casos/${id}`, datos);
    return response.data;
  },

  async eliminarCaso(id) {
    await api.delete(`/casos/${id}`);
  },

  async procesarTranscripcion(id) {
    const response = await api.post(`/casos/${id}/procesar-transcripcion`);
    return response.data;
  },

  async analizarFortaleza(id) {
    const response = await api.post(`/casos/${id}/analizar-fortaleza`);
    return response.data;
  },

  async generarDocumento(id) {
    const response = await api.post(`/casos/${id}/generar`);
    return response.data;
  },

  async descargarPDF(id) {
    const response = await api.get(`/casos/${id}/descargar/pdf`, {
      responseType: 'blob'
    });
    // Crear descarga
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `caso_${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async descargarDOCX(id) {
    // Similar a descargarPDF
  }
};
```

---

### 4️⃣ **livekitService.js** - LiveKit

```javascript
import api from './api';

export const livekitService = {
  async iniciarSesion() {
    const response = await api.post('/sesiones/iniciar');
    // response.data = {
    //   caso_id, session_id, room_name,
    //   livekit_url, access_token
    // }
    return response.data;
  },

  async finalizarSesion(casoId) {
    const response = await api.put(`/sesiones/${casoId}/finalizar`);
    return response.data;
  }
};
```

---

## 🧩 COMPONENTES REUTILIZABLES

### 1️⃣ **ProtectedRoute.jsx**

```javascript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
```

**Uso:**
```javascript
<Route path="/app" element={
  <ProtectedRoute>
    <AppDashboard />
  </ProtectedRoute>
} />
```

---

### 2️⃣ **TranscriptPanel.jsx**

Panel lateral que muestra transcripción en tiempo real.

```javascript
export default function TranscriptPanel({ transcriptions }) {
  return (
    <div className="transcript-panel">
      <h3>Transcripción</h3>
      {transcriptions.map((t, i) => (
        <div key={i} className={`message ${t.remitente}`}>
          <span className="sender">
            {t.remitente === 'usuario' ? 'Tú' : 'Asistente'}:
          </span>
          <span className="text">{t.texto}</span>
        </div>
      ))}
    </div>
  );
}
```

---

### 3️⃣ **AnalisisDocumento.jsx**

Muestra análisis de calidad del documento generado.

```javascript
export default function AnalisisDocumento({ analisis }) {
  const { calidad, jurisprudencia, sugerencias, resumen } = analisis;

  return (
    <div className="analisis-panel">
      <h3>Análisis de Calidad</h3>

      <div className="score">
        Puntuación: {resumen.puntuacion_calidad}/100
        {resumen.puntuacion_calidad >= 70 ? '✅' : '⚠️'}
      </div>

      <div className="recommendation">
        {resumen.recomendacion}
      </div>

      {sugerencias.sugerencias_criticas > 0 && (
        <div className="alert-critical">
          ⚠️ {sugerencias.sugerencias_criticas} sugerencias críticas
        </div>
      )}

      <details>
        <summary>Ver detalles del análisis</summary>
        {/* Mostrar calidad.problemas_encontrados */}
        {/* Mostrar calidad.sugerencias_mejora */}
        {/* Mostrar jurisprudencia.sentencias_citadas */}
      </details>
    </div>
  );
}
```

---

## 🎨 ESTILOS (TailwindCSS)

### **Configuración Tailwind**

```javascript
// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',   // Azul institucional
        secondary: '#64748b', // Gris
        success: '#16a34a',   // Verde
        danger: '#dc2626',    // Rojo
      }
    },
  },
  plugins: [],
}
```

### **Clases Comunes**

```css
/* Botón primario */
.btn-primary {
  @apply bg-primary text-white px-4 py-2 rounded hover:bg-blue-700;
}

/* Tarjeta */
.card {
  @apply bg-white shadow rounded-lg p-6;
}

/* Input */
.input {
  @apply border border-gray-300 rounded px-3 py-2 w-full;
}
```

---

## 🔄 FLUJO DE DATOS

### **Estado Global (AuthContext)**

```javascript
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authService.getCurrentUser()
        .then(setUser)
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const { access_token } = await authService.login(credentials);
    localStorage.setItem('token', access_token);
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

---

## 📦 DEPENDENCIAS PRINCIPALES

```json
{
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^7.10.1",
    "axios": "^1.13.2",
    "@livekit/components-react": "^2.7.4",
    "livekit-client": "^2.7.4",
    "tailwindcss": "^4.1.17"
  }
}
```

---

## 🚀 COMANDOS

```bash
# Desarrollo
npm run dev

# Build producción
npm run build

# Preview del build
npm run preview

# Linting
npm run lint
```

---

## 🌍 VARIABLES DE ENTORNO

```bash
# .env
VITE_API_URL=http://localhost:8000
```

**Importante:** En Vite, las variables deben tener prefijo `VITE_`

---

## 📱 RESPONSIVE DESIGN

Todas las páginas son responsive usando Tailwind:

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Móvil: 1 columna, Tablet: 2 columnas, Desktop: 3 columnas */}
</div>
```

---

## ✅ CARACTERÍSTICAS DESTACADAS

✅ **Autenticación JWT** persistente
✅ **Rutas protegidas** con redirección automática
✅ **Integración LiveKit** para avatar en tiempo real
✅ **Soporte dual** (Tutela + Derecho de Petición)
✅ **Procesamiento IA** de conversaciones
✅ **Análisis de calidad** visual
✅ **Descarga PDF/DOCX** directa
✅ **Validación de formularios** con feedback
✅ **UI moderna** con TailwindCSS
✅ **Responsive** en todos los dispositivos

---

## 🎯 PRÓXIMOS PASOS

- [ ] Modo oscuro
- [ ] Notificaciones push
- [ ] Edición colaborativa
- [ ] Historial de versiones
- [ ] Plantillas personalizables
- [ ] Internacionalización (i18n)

---

**Última actualización:** Diciembre 2024
**Versión:** 1.0.0
