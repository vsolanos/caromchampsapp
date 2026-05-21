# CaromChamps v5.0.0 - Configuración Supabase

## 1. Variables de entorno

En Cloudflare Pages > Settings > Environment variables, agregar:

```text
VITE_SUPABASE_URL=https://vmcbaexkbenbesygxccu.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable/anon key de Supabase>
```

## 2. Auth URLs

En Supabase > Authentication > URL Configuration:

```text
Site URL: https://caromchamps.com
Redirect URLs:
https://caromchamps.com/*
http://localhost:5173/*
```

## 3. SQL

Ejecutar el archivo:

```text
docs/supabase_schema_v5.sql
```

en Supabase > SQL Editor.

## 4. Usuario Admin

Crear o registrar el usuario con el correo:

```text
vsolanos@gmail.com
```

El script asigna automáticamente el rol `ADMIN` a ese correo cuando el usuario exista en Supabase Auth.
No guardar contraseñas en GitHub ni en archivos del proyecto.

## 5. Proveedores sociales

Activar en Supabase Auth:

- Email
- Google
- Facebook

Instagram queda para una fase posterior.

## 6. Storage

El script crea el bucket público:

```text
user-avatars
```

con límite de 5 MB y tipos permitidos JPG, PNG y WEBP.
