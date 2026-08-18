# 🛍️ Candela Joyas - Guía de Configuración y Despliegue

Esta guía contiene los pasos necesarios para configurar, personalizar y desplegar la tienda.

## 🚀 SEO y Google
**Importante:** Ejecutar `npm run sitemap` cada vez que se agregue stock nuevo o cambien categorías. Así, Google siempre sabrá exactamente qué artículos están disponibles en segundos.

---

## 🛠️ Configuración del Entorno

Para que la tienda funcione correctamente, debes configurar los siguientes archivos `.env`:

### 1. Frontend (Raíz del proyecto)
Crea un archivo `.env` en la carpeta raíz con las credenciales de tu proyecto de Firebase:
```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
VITE_FIREBASE_MEASURE_ID=tu_measure_id
```

### 2. Backend (Carpeta `/functions`)
Crea un archivo `.env` dentro de la carpeta `functions/` para las pasarelas de pago y notificaciones:
```env
# Mercado Pago (Obtener en el panel de desarrolladores de MP)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxx...

# Resend (Para envío de emails automáticos)
RESEND_API_KEY=re_xxxx...
```

---

## 💳 Configuración de Mercado Pago

El flujo de pago está configurado para redirigir automáticamente al dominio de producción. 

- **Dominio de éxito:** Si cambias de dominio, debes actualizar la constante `prodHost` en `functions/index.js` (Línea 33 aprox.) para que Mercado Pago sepa a dónde volver tras un pago exitoso.
- **Redirección automática:** Se utiliza `auto_return: 'approved'` para que el cliente no tenga que hacer clic en "Volver al sitio".

---

## 📧 Configuración de Emails (Resend)

La tienda envía correos automáticos en dos momentos: al **crear el pedido** (confirmación de compra con número interno de referencia, ej. `VTA-000123`) y cuando el pago es **aprobado**.
1. Registrate en [Resend.com](https://resend.com).
2. Agrega tu dominio (ej: `candelajoyas.com.ar`).
3. Agrega los registros **DNS** (TXT, MX) que te pide Resend en tu proveedor de dominio.
4. **DKIM:** Si tu proveedor de DNS te da error en el nombre, asegúrate de poner el dominio completo: `resend._domainkey.tu-dominio.com.ar`.
5. Una vez verificado, actualiza la `RESEND_API_KEY` en `functions/.env`.

---

## 📦 Despliegue (Deploy)

Para subir los cambios a internet, utiliza los siguientes comandos:

- **Subir todo (Web + Funciones + Reglas):**
  ```bash
  npm run build
  firebase deploy
  ```

- **Subir solo cambios en la Web:**
  ```bash
  npm run build
  firebase deploy --only hosting
  ```

- **Subir solo cambios en las Funciones (Backend):**
  ```bash
  firebase deploy --only functions
  ```

- **Subir solo Reglas de Base de Datos:**
  ```bash
  firebase deploy --only firestore:rules
  ```

---

## 🎨 Personalización de la Tienda

- **Paginación:** Los productos se cargan de a 12 por vez. Puedes cambiar este número en `src/pages/Home.jsx` modificando el estado `visibleCount`.
- **Panel de Administración:** Accede a `/admin` para gestionar productos, categorías, ventas y configuraciones generales (WhatsApp, Títulos, Colores).

---

Desarrollado con ❤️ para Candela Joyas.
