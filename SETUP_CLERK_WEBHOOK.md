# 🚀 Pasos Finales para Activar la Sincronización Clerk + Convex

## ✅ Lo que ya está implementado

- ✅ Endpoint HTTP en Convex (`/clerk-users-webhook`)
- ✅ Mutaciones internas para crear/actualizar/eliminar usuarios
- ✅ Validación de firma con Svix
- ✅ Hook `useCurrentUser` para verificar sincronización
- ✅ Notificación al admin cuando crea un teacher manualmente

## 🔧 Configuración Pendiente (5 minutos)

### 1. Configurar Variable de Entorno en Convex

1. Ve a [Convex Dashboard](https://dashboard.convex.dev)
2. Selecciona tu proyecto **cpca-teachers**
3. Ve a **Settings** → **Environment Variables**
4. Agrega una nueva variable:
   - **Name**: `CLERK_WEBHOOK_SECRET`  
   - **Value**: `whsec_...` (lo obtendrás en el paso 2)
5. Haz clic en **Save**

### 2. Configurar Webhook en Clerk

1. Ve a [Clerk Dashboard](https://dashboard.clerk.com)
2. Selecciona tu aplicación
3. Ve a **Webhooks** en el menú lateral
4. Haz clic en **+ Add Endpoint**
5. Configura el endpoint:

   **Endpoint URL**:
   ```
   https://[tu-deployment].convex.site/clerk-users-webhook
   ```
   
   > ⚠️ **IMPORTANTE**: 
   > - Usa `.site` NO `.cloud`
   > - Obtén tu deployment URL de Convex Dashboard
   > - Ejemplo: `https://happy-horse-123.convex.site/clerk-users-webhook`

   **Subscribe to events** (marca estas 3):
   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`

6. Haz clic en **Create**

7. **Copia el Signing Secret** que aparece (empieza con `whsec_`)

8. Vuelve al **Paso 1** y pega este secret en Convex

### 3. Probar la Configuración

#### Opción A: Crear usuario de prueba en Clerk

1. En Clerk Dashboard → **Users** → **Create User**
2. Crea un usuario con email: `test-teacher@example.com`
3. Ve a Convex Dashboard → **Data** → **users** table
4. Verifica que el usuario aparezca automáticamente

#### Opción B: Usar el Testing de Clerk

1. En Clerk Dashboard → **Webhooks** → Clic en tu endpoint
2. Ve a la pestaña **Testing**
3. Selecciona evento `user.created`
4. Haz clic en **Send Example**
5. Verifica en Convex Logs que se procesó correctamente

### 4. Verificar Logs

**En Convex Dashboard**:
- Ve a **Logs**
- Deberías ver mensajes como:
  ```
  Created new user from Clerk: user_abc123
  Updated user from Clerk: user_abc123
  ```

**En Clerk Dashboard**:
- Ve a **Webhooks** → Tu endpoint → **Logs**
- Verifica que las peticiones muestren **200 OK**

## 🎯 Flujo de Trabajo Actualizado

### Crear un Teacher Manualmente (desde Admin Panel)

1. Admin abre el panel de teachers
2. Clic en "Create Teacher"
3. Completa el formulario con email, nombre, etc.
4. Clic en "Create Teacher"
5. ✅ Teacher se crea en Convex con `clerkId` temporal
6. 📧 **NUEVO**: Aparece un toast recordando enviar invitación
7. Admin envía invitación manualmente por email (o usa Clerk Invitations)
8. Teacher recibe email y se registra en Clerk
9. 🔄 **Webhook automático** actualiza el `clerkId` temporal con el real
10. ✅ Teacher puede hacer login normalmente

### Usuario se Registra Directamente

1. Usuario va a `/sign-up`
2. Completa el formulario de Clerk
3. Clerk crea la cuenta
4. 🔄 **Webhook automático** crea el usuario en Convex
5. ✅ Usuario tiene acceso inmediato a la aplicación

## 📊 Monitoreo y Troubleshooting

### El webhook no funciona

**Verificar**:
1. La URL termina en `.site` (no `.cloud`)
2. El `CLERK_WEBHOOK_SECRET` está configurado en Convex
3. El endpoint está marcado como **Active** en Clerk
4. Revisa logs en Clerk → Webhooks → Tu endpoint → Logs

### Usuario no aparece en Convex

**Verificar**:
1. Webhook está suscrito a `user.created`
2. Logs de Clerk muestran que se envió el webhook
3. Logs de Convex muestran que se recibió
4. No hay errores en Convex Logs

### Error 400 en webhook

**Causa común**: `CLERK_WEBHOOK_SECRET` incorrecto

**Solución**:
1. Ve a Clerk Dashboard → Webhooks → Tu endpoint
2. Copia nuevamente el Signing Secret
3. Actualiza en Convex Dashboard → Settings → Environment Variables

## 🔒 Seguridad

- ✅ Todas las peticiones de webhook son validadas con firma Svix
- ✅ El secret se almacena de forma segura en variables de entorno
- ✅ Las mutaciones son internas (solo llamables desde HTTP actions)
- ✅ Protección contra replay attacks automática

## 📚 Documentación Adicional

- [CLERK_CONVEX_SYNC.md](./CLERK_CONVEX_SYNC.md) - Documentación completa técnica
- [Convex Auth Docs](https://docs.convex.dev/auth/clerk)
- [Clerk Webhooks](https://clerk.com/docs/integrations/webhooks/overview)

## ✨ Próximas Mejoras

- [ ] Implementar sistema de invitaciones automático para teachers
- [ ] Email template personalizado para invitaciones
- [ ] Dashboard de monitoreo de sincronización
- [ ] Notificación Slack cuando un teacher acepta su invitación

---

**¿Listo?** Sigue los pasos 1-4 y tendrás sincronización automática funcionando. 🎉
