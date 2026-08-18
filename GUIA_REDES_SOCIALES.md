# Publicar en Facebook e Instagram desde el panel de Admin

Esta guía explica cómo dejar funcionando la nueva pestaña **"Redes Sociales"** del panel de administración, que te permite elegir un producto, sus fotos y el texto, y publicarlo directo en Facebook e Instagram (o programarlo para más tarde).

Meta (dueña de Facebook e Instagram) exige que **cualquier** publicación automática pase por una app registrada en su plataforma de desarrolladores. Son pasos que hacés una sola vez.

## Requisitos previos

1. Tu Instagram debe ser una cuenta **profesional** (Empresa o Creador). Se activa gratis desde la app de Instagram: Configuración → Cuenta → Cambiar a cuenta profesional.
2. Esa cuenta de Instagram debe estar **vinculada a una Página de Facebook** (Configuración de la Página de Facebook → Instagram → Conectar cuenta).
3. Vos debés ser **administrador** de esa Página de Facebook.

## Paso 1: Crear la app en Meta for Developers

1. Entrá a [developers.facebook.com](https://developers.facebook.com/) con tu usuario de Facebook.
2. "Mis apps" → "Crear app" → elegí el tipo **"Negocio"**.
3. Ponele un nombre (ej. "Candela Joyas - Publicador").
4. Una vez creada, en el panel de la app agregá el producto **"Facebook Login"** y el producto **"Instagram Graph API"** (buscalos en "Agregar productos").

## Paso 2: Configurar Facebook Login

1. Dentro de "Facebook Login" → "Configuración".
2. En **"URI de redireccionamiento de OAuth válidas"** agregá exactamente esta URL:
   ```
   https://us-central1-tienda-c072c.cloudfunctions.net/metaOAuthCallback
   ```
3. Guardar cambios.

## Paso 3: Obtener App ID y App Secret

1. En "Configuración" → "Básica" vas a ver el **App ID** y el **Clave secreta de la app** (App Secret, hay que hacer click en "Mostrar").
2. Copiá ambos valores.

## Paso 4: Cargar las credenciales desde el panel (sin tocar código)

Ya no hace falta editar archivos `.env`. En la pestaña **"Redes Sociales"** del panel de administración vas a ver, arriba de todo, una tarjeta para cargar el **App ID** y el **App Secret**. Pegá ahí los valores que copiaste en el Paso 3 y tocá "Guardar credenciales".

El App Secret se guarda de forma segura en el servidor (nunca llega al navegador ni se vuelve a mostrar en pantalla); solo las Cloud Functions pueden leerlo. Cualquier persona con acceso de administrador al panel puede cargar o editar estas credenciales, así que no hace falta que sea siempre la misma persona la que gestione las redes.

> Nota técnica: si preferís seguir usando variables de entorno (`VITE_META_APP_ID` en `.env` y `META_APP_ID` / `META_APP_SECRET` en `functions/.env`), el sistema las sigue aceptando como respaldo si no hay nada cargado desde el panel — pero lo recomendado es usar el formulario del panel.

## Paso 5: Vincular tus cuentas desde el panel

1. Entrá al panel de administración → pestaña **"Redes Sociales"**.
2. Click en **"Conectar con Facebook"**.
3. Facebook te va a pedir iniciar sesión (si no lo estás) y **elegir la Página** que querés vincular, junto con los permisos:
   - Mostrar tus Páginas
   - Leer contenido de la Página
   - Crear contenido en la Página
   - Acceso básico a Instagram
   - Publicar contenido en Instagram
4. Al aceptar, volvés al panel y deberías ver la Página y la cuenta de Instagram conectadas.

## Paso 6: Modo de prueba vs. app en producción (¡importante!)

Mientras tu app de Meta esté en **modo de desarrollo** (así arranca por defecto), **solo vos** (y los usuarios que agregues como "Testers" o "Administradores de la app" en Meta for Developers) van a poder usar la conexión y publicar. Esto alcanza perfectamente para que uses la herramienta vos misma en tu propia tienda.

Si en el futuro necesitás que **otro** dueño de tienda (no vos) use esta misma función con su propia cuenta, Meta va a pedirte pasar por **"App Review"** y solicitar los permisos `pages_manage_posts` e `instagram_content_publish` para uso público, lo cual incluye una revisión manual de Meta (puede llevar 1-2 semanas y piden un video mostrando el uso). Para tu caso de uso actual (una sola tienda, tus propias cuentas) **no hace falta pasar por App Review**.

## Cómo funciona una vez conectado

- En la pestaña "Redes Sociales" elegís un producto, marcás qué fotos publicar, editás el texto (que arranca con la descripción del producto) y elegís si publicar en Facebook, Instagram o ambos.
- Podés publicar al instante o activar "Programar para más tarde" y elegir fecha/hora; una función programada revisa cada 5 minutos si hay publicaciones pendientes y las dispara automáticamente.
- Abajo vas a ver el historial con el estado de cada publicación (Publicado, Programado, Falló, etc.).
- Podés desvincular las cuentas en cualquier momento con el botón "Desvincular".

## Problemas comunes

- **"No hay cuenta de Instagram profesional vinculada a la Página"**: revisá el Paso previo de vincular Instagram a la Página de Facebook (tiene que hacerse desde la configuración de la Página, no desde la app de Instagram).
- **Error `token_exchange_failed` o `missing_config`**: revisá que el App ID y App Secret estén bien cargados en la tarjeta de credenciales del panel (Paso 4).
- **"No hay Páginas"**: tu usuario de Facebook no es administrador de ninguna Página, o no le diste permiso a la app para verlas durante el login.
