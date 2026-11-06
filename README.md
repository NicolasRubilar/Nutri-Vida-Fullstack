# NutriVida — Clínica Nutricional (DSY1104 · Forma D)

SPA en **React** para la Clínica Nutricional NutriVida (Temuco): agendamiento de citas en línea,
fichas clínicas digitales, seguimiento de mediciones, planes alimenticios y estadísticas.

> **Evaluación 3:** el frontend está integrado con el backend **Spring Boot** (repositorio
> `Nutri-Vida-Backend`): API REST con MySQL, autenticación JWT con roles y documentación Swagger.
> Los datos ya no se guardan en el navegador: todo se lee y escribe a través de la API.

## Ejecutar

```bash
# 1. Backend (en Nutri-Vida-Backend): http://localhost:8080 · Swagger en /swagger-ui.html
mvn spring-boot:run                                     # MySQL (XAMPP)
mvn spring-boot:run -Dspring-boot.run.profiles=h2       # o sin MySQL

# 2. Frontend (este repositorio)
npm install
npm run dev      # http://localhost:5173  (Vite redirige /api al backend)
npm run build    # compilación de producción
npm run lint
```

Para apuntar a un backend en otra dirección: `VITE_API_URL=https://api.ejemplo.cl npm run build`.
Los datos de demostración los carga el backend la primera vez que arranca con la base vacía.

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@nutrivida.cl | Admin123 |
| Secretaria | secretaria@nutrivida.cl | Secre123 |
| Nutricionista | crojas@nutrivida.cl (también fcontreras, jpino, tnavarrete) | Nutri123 |
| Paciente | paciente@nutrivida.cl (y otros 7 pacientes) | Paciente123 |

## Cobertura de la rúbrica

| Requisito | Implementación |
|---|---|
| Frontend React (SPA) | React 19 + React Router 7, carga diferida de vistas; UI con Bootstrap 5.3 / React-Bootstrap |
| Diseño responsive | **Bootstrap 5.3** + **React-Bootstrap**: grilla `row`/`col-*`, `navbar`, `Offcanvas responsive="md"` (menú hamburguesa en móvil, lateral fijo desde tableta), `card`, `table`, formularios `form-control`/`is-invalid`, `Modal`, `Accordion`, `nav-tabs`. Probado en 360 px, 768 px y 1280 px; en móvil las tablas se muestran como tarjetas |
| Seguridad | Backend: BCrypt, JWT HS256 (15 min) + refresh token rotativo en cookie HttpOnly/SameSite=Strict, bloqueo tras 5 intentos, `@PreAuthorize` por endpoint. Frontend: JWT solo en memoria, renovación automática, rutas protegidas por rol |
| Roles (RBAC) | Administrador, Nutricionista, Paciente + **Secretaria** (justificada por el contexto: gestiona las agendas) |
| Panel de administración | `/admin/usuarios`: crear, editar, desactivar/activar y asignar roles; `/admin/reportes` |
| Mapas | Leaflet + OpenStreetMap en `/ubicacion`: ubicación de la clínica, “usar mi ubicación”, distancia y enlaces a Google Maps / Waze |
| Página de bienvenida | `/bienvenida` (pública, es la portada del sitio): servicios, cómo funciona, equipo, mapa y contacto, con la **sección “Accede a tu cuenta”** para iniciar sesión ahí mismo. Solo muestra información institucional; el único dato que consulta es nombre y especialidad de los nutricionistas (`equipoPublico`). “Agenda tu hora” → registro → se abre directo la solicitud de cita. La ruta `/login` queda para sesiones expiradas o accesos directos a vistas protegidas |
| Pedidos / solicitudes | Flujo de citas: el paciente solicita (nutricionista preferido + motivo + horario) → secretaria/nutricionista confirma → el paciente es notificado y puede cancelar o reprogramar; historial de estados por cita |
| Privacidad de datos clínicos | Solo el paciente, su nutricionista asignado y el administrador ven mediciones, ficha y plan. La secretaria ve solo datos de contacto |
| Resultados esperados | Recordatorio automático 48 h antes de la cita, registro digital de mediciones con gráfico de progreso, plan alimenticio siempre disponible (imprimible), ausencia de nutricionista con aviso masivo a pacientes, estadísticas (atenciones por período, tasa de inasistencia, distribución por nutricionista) con exportación CSV |

## Integración con el backend

```
Vista React ──► services/api.js ──► services/http.js ──fetch /api/...──► Spring Boot ──► MySQL
                 (un método por        (JWT en Authorization,         (JWT + roles,
                  endpoint)             renovación, errores)           lógica de negocio)
```

- **`services/http.js`**: cliente HTTP único. Agrega `Authorization: Bearer <JWT>`, envía la cookie de
  renovación (`credentials: 'include'`), renueva el JWT antes de que venza o ante un 401 (una sola
  renovación compartida por peticiones simultáneas) y traduce los errores a `ApiError {status, message, campos}`.
- **`services/api.js`**: un método por endpoint (`listarCitas` → `GET /api/citas?desde=…`). Las vistas no cambiaron.
- **`services/auth.js`**: login, registro, cierre de sesión, cambio de clave y restauración de la sesión.

### Gestión de la sesión

- El **access token** vive solo en memoria (no en `localStorage`): un script inyectado no puede leerlo.
- El **refresh token** lo guarda el navegador en una cookie `HttpOnly` que JavaScript no ve.
- **Recarga de página:** `AuthContext` detecta la marca `nv_sesion` (sin datos sensibles), llama a
  `POST /api/auth/refresh` y muestra "Recuperando tu sesión…" antes de decidir. La sesión continúa sin
  volver a escribir la contraseña; tras 2 h sin actividad expira.
- **Varias pestañas:** cerrar sesión en una la cierra en las demás (evento `storage`).
- **Sesión revocada** (clave cambiada, cuenta desactivada): el siguiente 401 lleva al login con aviso.

### Restricciones de acceso por rol

- `RutaProtegida` bloquea vistas sin sesión o sin el rol (`/admin/*` solo admin; `/agenda`, `/pacientes`
  personal; `/pacientes/:id` admin y nutricionista; `/mis-citas`, `/progreso`, `/plan` solo paciente).
- El menú y las acciones se muestran según el rol (`puedeAcceder`, botones de confirmar/asistencia, etc.).
- Es una barrera de interfaz: el backend vuelve a validar cada petición (401/403), aunque se manipule el frontend.

## Pruebas (Jasmine + Karma)

```bash
npm test            # ejecuta todas las pruebas una vez y genera la cobertura
npm run test:watch  # modo observador
```

- **Servicios:** `http.spec.js` (cabecera JWT, renovación ante 401 y antes de vencer, sesión solo en
  memoria, errores), `auth.spec.js` (login, restauración tras recarga, logout, cambio de clave) y
  `api.spec.js` (cada función llama al endpoint REST correcto).
- **Componentes y vistas:** se prueban de punta a punta contra un **backend simulado**
  (`src/test/servidorFalso/`) que reemplaza `fetch` y responde con el mismo formato que la API real.
- Las reglas de negocio se prueban en el backend con pruebas de integración (`mvn test`).
- Tres pruebas que dependen de un recordatorio dentro de 48 h fallan cuando se ejecutan viernes,
  sábado o domingo (comportamiento previo a esta entrega).

## Estructura

```
src/
├── services/        # Integración con la API REST
│   ├── http.js      # fetch + JWT en memoria + renovación con cookie + errores
│   ├── auth.js      # login, registro, logout, restaurar sesión
│   └── api.js       # un método por endpoint
├── test/servidorFalso/  # backend simulado para las pruebas de componentes
├── context/         # AuthContext (sesión)
├── hooks/useApi.js  # carga de datos y acciones con manejo de errores
├── components/      # Layout (Navbar + Offcanvas), RutaProtegida, gráficos, mapa, formularios de citas, UI
├── styles/index.css # tema de marca sobre Bootstrap + estilos que Bootstrap no trae
├── pages/           # login, registro, inicio por rol, paciente/, staff/, admin/
└── utils/           # constantes, formato, validación de RUT, IMC
```
