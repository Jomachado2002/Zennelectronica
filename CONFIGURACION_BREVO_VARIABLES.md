# 🔧 CONFIGURACIÓN PASO A PASO - BREVO EMAIL

## 📝 VARIABLES QUE DEBES AGREGAR AL ARCHIVO .env

Abre tu archivo `backend/.env` y agrega estas líneas al final:

```bash
# ============================================
# BREVO EMAIL CONFIGURATION
# ============================================

# 1. API Key de Brevo
# Obtener desde: https://app.brevo.com/settings/keys/api
BREVO_API_KEY=xkeysib-tu_api_key_aqui_xxxxxxxxxxxxxxxxx

# 2. ID de la plantilla (el número que copiaste de la URL)
BREVO_TEMPLATE_ID_PURCHASE=123

# 3. Email del remitente (debe estar verificado en Brevo)
BREVO_SENDER_EMAIL=no-reply@zenn.com.py
BREVO_SENDER_NAME=ZENN ELECTRONICOS

# 4. Email para recibir copia (opcional)
# BREVO_CC_EMAIL=admin@zenn.com.py

# 5. URL del frontend (para enlaces)
FRONTEND_URL=https://www.zenn.com.py
```

### ⚠️ IMPORTANTE:
- Reemplaza `tu_api_key_aqui` con tu API Key real de Brevo
- Reemplaza `123` con el ID real de tu plantilla
- El email remitente debe estar verificado en Brevo

---

## 🌐 CONFIGURACIÓN EN VERCEL (Si usas Vercel)

1. Ve a tu proyecto en Vercel
2. **Settings** → **Environment Variables**
3. Agrega cada variable:

| Variable | Valor | Environments |
|----------|-------|--------------|
| `BREVO_API_KEY` | `xkeysib-...` | Production, Preview, Development |
| `BREVO_TEMPLATE_ID_PURCHASE` | `123` | Production, Preview, Development |
| `BREVO_SENDER_EMAIL` | `no-reply@zenn.com.py` | Production, Preview, Development |
| `BREVO_SENDER_NAME` | `ZENN ELECTRONICOS` | Production, Preview, Development |
| `FRONTEND_URL` | `https://www.zenn.com.py` | Production, Preview, Development |

4. **Redeploy** tu aplicación después de agregar las variables

---

## ✅ VERIFICAR QUE ESTÁ TODO LISTO

Antes de continuar, verifica:

- [ ] Plantilla creada y guardada en Brevo
- [ ] ID de plantilla copiado
- [ ] API Key de Brevo obtenida
- [ ] Email remitente verificado en Brevo
- [ ] Variables agregadas al .env
- [ ] Backend reiniciado (si está corriendo)

