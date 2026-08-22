# Publicar en Facebook e Instagram desde el panel de Admin

Esta guía explica cómo dejar funcionando la pestaña **"Redes Sociales"** del panel de administración, que permite elegir un producto, sus fotos y el texto, y publicarlo directo en Facebook e Instagram (o programarlo para más tarde).

Meta (dueña de Facebook e Instagram) exige que **cualquier** publicación automática pase por una app registrada en su plataforma de desarrolladores (developers.facebook.com). Son pasos que se hacen **una sola vez por tienda/proyecto**. Como este sitio es un template tipo SaaS, esta guía está pensada para repetirse cada vez que se levanta una tienda nueva a partir de esta base.

> Última revisión: agosto 2026 (agregado el Paso 8 sobre selección de Página cuando el usuario administra más de una). La interfaz de developers.facebook.com cambia seguido (Meta reorganizó todo bajo "Casos de uso" en 2025-2026), así que si algún nombre de pantalla no coincide, buscá el concepto (permisos, dominios, redirect URI) más que el nombre exacto del botón.

## Requisitos previos

1. El Instagram de la tienda debe ser una cuenta **profesional** (Empresa o Creador). Se activa gratis desde la app de Instagram: Configuración → Cuenta → Cambiar a cuenta profesional.
2. Esa cuenta de Instagram debe estar **vinculada a una Página de Facebook** (Configuración de la Página de Facebook → Instagram → Conectar cuenta).
3. La persona que va a hacer el "Conectar con Facebook" debe ser **administradora** de esa Página de Facebook.

## Paso 1: Crear la app en Meta for Developers

1. Entrá a [developers.facebook.com/apps](https://developers.facebook.com/apps) con el usuario de Facebook de la tienda.
2. "Crear app" → tipo **"Negocio"**.
3. Ponele un nombre identificable (ej. "Candela Joyas - Publicador").

## Paso 2: Agregar los Casos de uso necesarios

En el panel de la app, entrá a **"Casos de uso"** (menú lateral). Ahí tenés que tener agregados como mínimo:

- **"Administrar mensajes y contenido en Instagram"** (API de Instagram) — trae los permisos de Instagram.
- **"Administrar todos los aspectos de tu página"** (API de Páginas) — trae los permisos de Facebook Page. **Este NO viene agregado por defecto**; hay que sumarlo a mano con el botón "Agregar casos de uso" (arriba a la derecha del Panel) y tildarlo en el listado.

Sin el segundo caso de uso, la conexión falla con el error `Invalid Scopes: pages_manage_posts`, porque ese permiso no está "reclamado" por ningún caso de uso de la app.

### Permisos a confirmar

Entrá a "Personalizar" en cada uno de los dos casos de uso de arriba → pestaña **"Permisos y funciones"**, y confirmá que estos 6 permisos figuren con estado **"Listo para la prueba"** (no hace falta mandarlos a "Revisión de la app" para uso propio):

- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_posts`
- `instagram_basic`
- `instagram_content_publish`
- `business_management`

Si alguno aparece con botón "+ Agregar" en vez de "Acciones", hacé clic para sumarlo.

> **App Review solo hace falta si en el futuro otra tienda/dueño (que no sea admin/tester de esta app puntual) va a usar la misma conexión con su propia cuenta.** Para el caso normal (una tienda, sus propias cuentas), con "Listo para la prueba" alcanza — la persona que conecta solo tiene que figurar como Administrador/Desarrollador/Tester de la app en **"Roles de la app"**.

## Paso 3: Configurar "Inicio de sesión con Facebook para empresas"

1. En el menú lateral, entrá a **"Inicio de sesión con Facebook para empresas"** → **"Configurar"**.
2. Buscá el campo **"URI de redireccionamiento de OAuth válidos"** y agregá exactamente:

   ```
   https://<TU_PROJECT_REF>.functions.supabase.co/meta-oauth-callback
   ```

   El `<TU_PROJECT_REF>` es el subdominio de tu `VITE_SUPABASE_URL` (por ejemplo, si tu Supabase URL es `https://yrnftldfiythpksleaho.supabase.co`, el project ref es `yrnftldfiythpksleaho`). Se puede confirmar mirando el archivo `.env` del proyecto o construyendo la URL manualmente igual que lo hace el código (`src/services/social.js` y `supabase/functions/meta-oauth-callback/index.ts`).

3. Presioná Enter para que quede agregada como chip en la lista (no alcanza con escribirla, tiene que quedar confirmada).
4. Bajá y hacé clic en **"Guardar cambios"**.

## Paso 4: Cargar el dominio de la tienda

1. Andá a **Configuración de la app → Básica**.
2. En el campo **"Dominios de la app"**, agregá el dominio de la tienda sin `https://` ni rutas, por ejemplo:

   ```
   candelajoyas.com.ar
   ```

3. Si la tienda también se sirve desde un subdominio (`www.` u otro), agregalo también como entrada aparte.
4. Guardá cambios.

Sin este paso, después del login Facebook muestra el error "No se puede cargar la URL — El dominio de esta URL no está incluido en los dominios de la app".

## Paso 5: Obtener App ID y App Secret

1. En "Configuración" → "Básica" están el **App ID** y la **Clave secreta de la app** (App Secret; hay que hacer clic en "Mostrar").
2. Copiá ambos valores.

## Paso 6: Cargar las credenciales desde el panel de la tienda (sin tocar código)

No hace falta editar archivos `.env`. En la pestaña **"Redes Sociales"** del panel de administración, arriba de todo hay una tarjeta para cargar el **App ID** y el **App Secret**. Pegá ahí los valores del Paso 5 y tocá "Guardar credenciales".

El App Secret se guarda en el servidor (Supabase, tabla `integration_settings`) y nunca se vuelve a mostrar en pantalla; solo lo leen las Edge Functions. Cualquier persona con acceso de administrador al panel puede cargar o editar estas credenciales.

> Nota técnica: si se prefiere usar variables de entorno como respaldo, el sistema acepta `VITE_META_APP_ID` en `.env` (frontend) y `META_APP_ID` / `META_APP_SECRET` como variables de entorno de las Edge Functions de Supabase — pero solo se usan si no hay nada cargado desde el panel.

## Paso 7: Vincular las cuentas desde el panel

1. Panel de administración → pestaña **"Redes Sociales"**.
2. Clic en **"Conectar con Facebook"**.
3. Facebook pide iniciar sesión (si hace falta) y elegir a qué Páginas darle acceso — se puede elegir "Activar todas las Páginas actuales y futuras" sin problema si es la cuenta del propio dueño de la tienda.
4. En la pantalla siguiente aparecen los 4 permisos a confirmar (subir contenido a Instagram, crear/leer contenido de la Página, listar Páginas) → **"Guardar"**.
5. Al aceptar, Facebook redirige de vuelta al panel (`meta-oauth-callback` en Supabase) y ahí deberían quedar guardadas la Página y la cuenta de Instagram conectadas.

## Paso 8: Elegir la Página correcta (si el usuario administra más de una)

Cuando en el diálogo de Facebook aparece **"Elige las Páginas a las que quieres que acceda Web"**, si la persona que conecta es administradora de **más de una** Página de Facebook, hay que tener cuidado:

- El código (`meta-oauth-callback/index.ts`) toma automáticamente la **primera Página** que devuelve la API de Facebook (`pagesData.data[0]`) — no deja elegir cuál usar. Facebook no garantiza ningún orden en particular, así que puede quedar vinculada una Página que no es la de la tienda.
- Para evitarlo, en ese diálogo **no elijas "Activar todos los Páginas actuales y futuros"**. Elegí la opción **"Activar solo las Páginas actuales"**, y ahí tildá **únicamente la Página de la tienda** (destildá cualquier otra Página que administre esa cuenta).

Si ya conectaste y quedó vinculada la Página equivocada:

1. En el panel → "Redes Sociales" → botón **"Desvincular"**.
2. Volvé a tocar **"Conectar con Facebook"**.
3. En el diálogo de selección de Páginas, elegí **"Activar solo las Páginas actuales"** y tildá solo la Página correcta.
4. Continuá y "Guardar" como de costumbre.

> Mejora pendiente (opcional): se podría modificar `meta-oauth-callback` para que, si la cuenta administra varias Páginas, el panel deje elegir cuál vincular en vez de tomar la primera automáticamente. Por ahora, el cuidado manual en el diálogo de Facebook (paso de arriba) resuelve el problema.

## Cómo funciona una vez conectado

- En "Redes Sociales" se elige un producto, se marcan qué fotos publicar, se edita el texto (arranca con la descripción del producto) y se elige publicar en Facebook, Instagram o ambos.
- Se puede publicar al instante o activar "Programar para más tarde"; una función programada (`process-scheduled-social-posts`) revisa cada 5 minutos si hay publicaciones pendientes y las dispara.
- Abajo queda el historial con el estado de cada publicación (Publicado, Programado, Falló, Parcial).
- Se puede desvincular la cuenta en cualquier momento con el botón "Desvincular".

## Problemas comunes (y su causa real)

| Error | Causa | Solución |
|---|---|---|
| `Invalid Scopes: pages_manage_posts` | Falta agregar el caso de uso "Administrar todos los aspectos de tu página" | Paso 2 |
| "No se puede cargar la URL — dominio no incluido" | Falta cargar el dominio de la tienda en "Dominios de la app" | Paso 4 |
| Redirige a Facebook pero nunca vuelve / pantalla en blanco | La "URI de redireccionamiento de OAuth válidos" no coincide exactamente con la que calcula el código | Paso 3 — revisar que sea la URL de Supabase, no una vieja de Firebase u otro hosting |
| "No hay cuenta de Instagram profesional vinculada a la Página" | Falta vincular Instagram a la Página de Facebook (se hace desde la configuración de la Página, no desde la app de Instagram) | Ver Requisitos previos |
| Error `token_exchange_failed` o `missing_config` | El App ID / App Secret no están bien cargados en la tarjeta de credenciales del panel | Paso 6 |
| "No hay Páginas" | El usuario de Facebook que hizo login no es administrador de ninguna Página, o no le dio permiso a la app para verlas | Verificar rol de administrador en la Página de Facebook |
| Quedó vinculada una Página que no es la de la tienda (ej. otra Página que administra el mismo usuario) | El código toma la primera Página que devuelve Facebook, sin dejar elegir; al conectar se autorizaron "todas" las Páginas en vez de solo una | Paso 8 — desvincular, reconectar eligiendo "Activar solo las Páginas actuales" y tildar solo la correcta |

## Checklist rápido para una tienda nueva

- [ ] App creada en developers.facebook.com (tipo Negocio)
- [ ] Caso de uso "Administrar mensajes y contenido en Instagram" agregado
- [ ] Caso de uso "Administrar todos los aspectos de tu página" agregado
- [ ] Los 6 permisos en "Listo para la prueba"
- [ ] URI de redirección OAuth cargada y guardada (URL de Supabase de esa tienda)
- [ ] Dominio de la tienda cargado en "Dominios de la app"
- [ ] App ID + App Secret cargados desde el panel de la tienda
- [ ] Instagram profesional vinculado a la Página de Facebook
- [ ] Usuario que conecta es admin de la Página y figura en "Roles de la app" de Meta
- [ ] "Conectar con Facebook" probado de punta a punta
- [ ] Si el usuario administra más de una Página, se conectó eligiendo "Activar solo las Páginas actuales" y tildando solo la de la tienda
