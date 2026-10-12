# NutriVida — Clínica Nutricional (DSY1104 · Forma D)

SPA en **React** para la Clínica Nutricional NutriVida (Temuco): agendamiento de citas en línea,
fichas clínicas digitales, seguimiento de mediciones, planes alimenticios y estadísticas.

> **Alcance de esta entrega:** solo frontend. El backend Spring Boot, la API REST, la base de datos
> y el despliegue en AWS se incorporarán más adelante. Mientras tanto, la información se guarda en
> **`localStorage`** del navegador mediante una capa de servicios que imita los endpoints.

## Ejecutar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # compilación de producción
npm run lint
```

La primera vez se cargan datos de demostración (usuarios, 6 meses de citas y mediciones, planes).
Se pueden restablecer desde la pantalla de login → “Cuentas de demostración”.

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
| Seguridad | Contraseñas con PBKDF2‑SHA256 + sal por usuario (Web Crypto), token de sesión aleatorio con expiración (120 min), bloqueo tras 5 intentos fallidos, rutas protegidas que rechazan sin token válido, validación de rol en cada servicio |
| Roles (RBAC) | Administrador, Nutricionista, Paciente + **Secretaria** (justificada por el contexto: gestiona las agendas) |
| Panel de administración | `/admin/usuarios`: crear, editar, desactivar/activar y asignar roles; `/admin/reportes` |
| Mapas | Leaflet + OpenStreetMap en `/ubicacion`: ubicación de la clínica, “usar mi ubicación”, distancia y enlaces a Google Maps / Waze |
| Página de bienvenida | `/bienvenida` (pública, es la portada del sitio): servicios, cómo funciona, equipo, mapa y contacto, con la **sección “Accede a tu cuenta”** para iniciar sesión ahí mismo. Solo muestra información institucional; el único dato que consulta es nombre y especialidad de los nutricionistas (`equipoPublico`). “Agenda tu hora” → registro → se abre directo la solicitud de cita. La ruta `/login` queda para sesiones expiradas o accesos directos a vistas protegidas |
| Pedidos / solicitudes | Flujo de citas: el paciente solicita (nutricionista preferido + motivo + horario) → secretaria/nutricionista confirma → el paciente es notificado y puede cancelar o reprogramar; historial de estados por cita |
| Privacidad de datos clínicos | Solo el paciente, su nutricionista asignado y el administrador ven mediciones, ficha y plan. La secretaria ve solo datos de contacto |
| Resultados esperados | Recordatorio automático 48 h antes de la cita, registro digital de mediciones con gráfico de progreso, plan alimenticio siempre disponible (imprimible), ausencia de nutricionista con aviso masivo a pacientes, estadísticas (atenciones por período, tasa de inasistencia, distribución por nutricionista) con exportación CSV |

## Pruebas unitarias (Jasmine + Karma)

```bash
npm test            # ejecuta todas las pruebas una vez y genera la cobertura
npm run test:watch  # modo observador: abre el reporte de Jasmine en el navegador
```

- **Entorno:** Karma ejecuta las pruebas en un navegador real sin ventana (Chrome, o Edge si no hay Chrome). webpack + Babel compilan el JSX y `karma-coverage` (Istanbul) mide la cobertura. Configuración en `karma.conf.cjs`; punto de entrada `src/test/entrada.js`.
- **Pruebas:** 109, en archivos `*.spec.js(x)` junto al código que prueban. Cubren utilidades (RUT, IMC, contraseñas), control de acceso por rol, autenticación (hash, bloqueo, expiración de sesión), reglas de negocio (privacidad clínica, flujo de citas, planes, reportes) y componentes React (props, estado, eventos y DOM con Testing Library).
- **Mocks usados:** `jasmine.createSpy` para props de callback, `spyOn` sobre `window.confirm`, `window.print`, `navigator.geolocation`, `URL.createObjectURL` y `console.error`, y `jasmine.clock().mockDate` para simular el paso del tiempo.
- **Cobertura:** reporte HTML en `coverage/html/index.html` y resumen en `coverage/resumen.txt` (≈ 86 % de sentencias y 90 % de líneas).

## Estructura

```
src/
├── services/        # "Backend" simulado
│   ├── db.js        # tablas en localStorage (modelo normalizado, relaciones por id)
│   ├── crypto.js    # hash PBKDF2, sal y tokens
│   ├── auth.js      # login, registro, sesión, requerir(rol)
│   └── api.js       # reglas de negocio y permisos (equivalente a los endpoints)
├── data/seed.js     # datos de demostración
├── context/         # AuthContext (sesión)
├── hooks/useApi.js  # carga de datos y acciones con manejo de errores
├── components/      # Layout (Navbar + Offcanvas), RutaProtegida, gráficos, mapa, formularios de citas, UI
├── styles/index.css # tema de marca sobre Bootstrap + estilos que Bootstrap no trae
├── pages/           # login, registro, inicio por rol, paciente/, staff/, admin/
└── utils/           # constantes, formato, validación de RUT, IMC
```

### Migración al backend

Todas las funciones de `services/api.js` y `services/auth.js` son asíncronas y lanzan errores con
código tipo HTTP (`401`, `403`, `404`, `409`, `422`). Para conectar los microservicios Spring Boot
basta con reemplazar el cuerpo de cada función por un `fetch()` al endpoint correspondiente
(p. ej. `listarCitas` → `GET /api/citas`), sin modificar las vistas.
