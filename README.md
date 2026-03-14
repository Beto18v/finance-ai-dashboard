# Dinerance Dashboard

Frontend del proyecto Dinerance. Construido con Next.js 16 App Router, shadcn/ui, Tailwind CSS y Supabase Auth. Consume la API REST de `dinerance-api`.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS + shadcn/ui
- Supabase JS
- React Hook Form + Zod
- Sonner

## Variables de entorno

Crea `.env` o `.env.local` en la raiz del proyecto:

```env
# URL base del backend FastAPI
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000

# URL publica del dashboard para redirects OAuth
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Proyecto Supabase -> Settings -> API
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
```

La `anon key` es publica. No uses `service_role` en el frontend.

## Instalacion y ejecucion

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`.

Requisito previo: el backend `dinerance-api` debe estar corriendo en la URL configurada en `NEXT_PUBLIC_API_BASE_URL`.

## Estructura

```text
app/
  auth/
    callback/page.tsx       -> Finaliza OAuth y bootstrap del perfil
    login/page.tsx          -> Login con email/contrasena y Google
    register/page.tsx       -> Registro con email/contrasena y Google
  app/
    layout.tsx              -> Layout protegido con guard de sesion/perfil
    balance/page.tsx
    categories/page.tsx
    profile/page.tsx
    transactions/page.tsx
components/
  auth/
    google-auth-button.tsx  -> Boton reutilizable para Google OAuth
  providers/
    auth-provider.tsx
    site-preferences-provider.tsx
    theme-provider.tsx
lib/
  api.ts                    -> Cliente HTTP tipado hacia el backend
  auth.ts                   -> Helpers de Google OAuth y bootstrap de perfil
  cache.ts
  site.ts
  supabase/client.ts
```

## Funcionalidades

- Registro, login y logout con Supabase Auth.
- Login y registro con Google via Supabase OAuth.
- Callback dedicado en `/auth/callback` para terminar OAuth y llamar `POST /users/me/bootstrap`.
- Rutas protegidas bajo `/app/*`.
- Perfil editable, categorias, transacciones y balance.
- i18n es/en y preferencias de tema.

## Flujo Google

1. El usuario pulsa Google en `login` o `register`.
2. Supabase redirige a Google y luego vuelve a `NEXT_PUBLIC_SITE_URL/auth/callback`.
3. El callback obtiene la sesion y llama al backend para crear o sincronizar el perfil local.
4. Si todo sale bien, redirige a `/app/balance`.

## Build de produccion

```bash
npm run build
npm run start
```
