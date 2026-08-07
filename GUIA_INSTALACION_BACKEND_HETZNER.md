# Guía: Backend en Hetzner (API + PDF + Worker Visão)

Esta guía monta el **backend** en un VPS de Hetzner para que funcionen:
- la API (productos, Bancard, admin, etc.)
- la generación de **catálogo PDF** (Chrome/Puppeteer)
- el **worker diario** de carga de productos desde Visão Vip

El **frontend** puede seguir en **Vercel** (como ahora).

---

## 1. Cómo queda el flujo con GitHub (importante)

| Pieza | ¿Se actualiza sola con `git push`? |
|-------|-------------------------------------|
| **Frontend en Vercel** | **Sí** (si el proyecto está conectado al repo) |
| **Backend en Hetzner** | **No automáticamente** (a menos que armes un deploy) |

### Cómo funciona hoy
- Hacés `git push` → Vercel detecta el cambio → redeploy del frontend.

### Cómo queda con VPS
- `git push` → Vercel actualiza el **frontend**.
- El **backend en Hetzner** no se entera solo. Hay que actualizarlo así:

**Opción simple (manual):**
```bash
ssh root@IP_DEL_SERVIDOR
cd /var/www/zenn-backend
git pull
npm install --omit=dev
pm2 restart zenn-api
```

**Opción pro (automática):** GitHub Actions que, en cada push a `main`, haga SSH + `git pull` + `pm2 restart` en el VPS. Se puede armar después; al inicio alcanza la opción manual.

> **Sincronizado** significa: el frontend apunta a la URL del backend (`REACT_APP_BACKEND_URL=https://api.tudominio.com`). Los datos (Mongo/Firebase) son los mismos. El código del backend en el VPS se actualiza cuando vos hacés `git pull` ahí (o con Actions).

---

## 2. Contratar Hetzner

1. Entrá a: https://www.hetzner.com/cloud  
2. Consola: https://console.hetzner.cloud → **Sign up**  
3. **New project** → **Add Server**
   - Location: Germany o Finland  
   - Image: **Ubuntu 24.04**  
   - Type: **CX43** (ideal, ~8 GB) o **CX33** (más barato, más justo)  
   - SSH key (recomendado)  
4. Anotá la **IP pública** del servidor.

---

## 3. Conectarte al servidor

Desde tu Mac:

```bash
ssh root@IP_DEL_SERVIDOR
```

(Si usaste password, te la pide. Si usaste SSH key, entra directo.)

---

## 4. Actualizar el sistema e instalar lo básico

```bash
apt update && apt upgrade -y
apt install -y curl git ufw nginx
```

Firewall (SSH + HTTP + HTTPS):

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable
```

---

## 5. Instalar Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v
npm -v
```

---

## 6. Instalar Google Chrome (necesario para PDF y scraping)

```bash
apt install -y wget gnupg
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list
apt update
apt install -y google-chrome-stable
google-chrome-stable --version
```

Verificá que exista: `/usr/bin/google-chrome-stable` (el PDF en producción lo busca ahí).

Dependencias útiles de Chromium:

```bash
apt install -y fonts-liberation libasound2t64 libatk-bridge2.0-0 libatk1.0-0 libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 xdg-utils
```

> Si algún paquete `libasound2t64` falla en tu Ubuntu, instalá `libasound2` en su lugar.

---

## 7. Clonar el backend

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/TU_USUARIO/TU_REPO.git zenn
cd /var/www/zenn/backend
npm install --omit=dev
```

> Si el repo es privado: usá un **Personal Access Token** de GitHub o una deploy key SSH.

---

## 8. Crear el `.env` del backend

```bash
nano /var/www/zenn/backend/.env
```

Pegá las mismas variables que usás hoy (Mongo, JWT, Firebase, Bancard, etc.) y sumá:

```env
NODE_ENV=production
PORT=8080

# Worker diario Visão (schedule interno del backend)
# Recomendado: 0 acá y usar cron (paso 12). Si preferís schedule interno: 1
VISAO_MIRROR_SCHEDULE_ENABLED=0

# Si usás schedule interno en vez de cron:
# VISAO_MIRROR_SCHEDULE_ENABLED=1
# VISAO_MIRROR_SCHEDULE_INTERVAL_MS=86400000
# VISAO_MIRROR_SCHEDULE_INITIAL_DELAY_MS=180000
```

Guardá: `Ctrl+O`, Enter, `Ctrl+X`.

---

## 9. Instalar PM2 (proceso siempre vivo)

```bash
npm install -g pm2
cd /var/www/zenn/backend
pm2 start index.js --name zenn-api
pm2 save
pm2 startup
```

Ejecutá el comando que `pm2 startup` te imprima (copia/pega).

Comandos útiles:

```bash
pm2 status
pm2 logs zenn-api
pm2 restart zenn-api
```

Probá local en el server:

```bash
curl http://127.0.0.1:8080/
```

---

## 10. Nginx + dominio + HTTPS

Supongamos dominio: `api.tudominio.com.py` (el cliente debe apuntar un registro **A** a la IP del VPS).

```bash
nano /etc/nginx/sites-available/zenn-api
```

Contenido:

```nginx
server {
    listen 80;
    server_name api.tudominio.com.py;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

Activar:

```bash
ln -s /etc/nginx/sites-available/zenn-api /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

HTTPS (Let’s Encrypt):

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d api.tudominio.com.py
```

---

## 11. Apuntar el frontend (Vercel) al nuevo backend

En Vercel → Project → **Settings → Environment Variables**:

```text
REACT_APP_BACKEND_URL=https://api.tudominio.com.py
```

Redeploy del frontend (o push vacío) para que tome la variable.

También revisá CORS en el backend: que acepte el dominio del frontend (`zenn.com.py`, `*.vercel.app`, etc.).

---

## 12. Cron diario del worker Visão (recomendado)

```bash
chmod +x /var/www/zenn/backend/scripts/visao-mirror-update.sh
crontab -e
```

Agregá (todos los días a las 2:00 AM del servidor):

```cron
0 2 * * * /var/www/zenn/backend/scripts/visao-mirror-update.sh >> /var/www/zenn/backend/logs/cron-visao.log 2>&1
```

Creá carpeta de logs si no existe:

```bash
mkdir -p /var/www/zenn/backend/logs
```

> El script llama al endpoint local del mirror. Ajustá `VISAO_MIRROR_BASE_URL` / puerto si hace falta (por defecto `http://127.0.0.1:8080`).

---

## 13. Actualizar el backend después de un `git push`

En el VPS:

```bash
cd /var/www/zenn
git pull
cd backend
npm install --omit=dev
pm2 restart zenn-api
```

El frontend en Vercel ya se actualizó solo con el push.

---

## 14. Checklist rápido

- [ ] VPS Hetzner Ubuntu creado  
- [ ] Node + Chrome + PM2 instalados  
- [ ] Repo clonado y `.env` cargado  
- [ ] `pm2 status` muestra `zenn-api` online  
- [ ] Dominio `api.*` apunta a la IP  
- [ ] HTTPS con Certbot OK  
- [ ] Vercel tiene `REACT_APP_BACKEND_URL` al API  
- [ ] Cron diario configurado  
- [ ] Probar: login, un producto, generar PDF, (opcional) corrida manual del mirror  

---

## Resumen en una frase

**Vercel = frontend automático con push. Hetzner = backend siempre prendido (PDF + worker); se actualiza con `git pull` + `pm2 restart` (o Actions después).**

Si necesitás la versión automática con GitHub Actions, pedila y se arma un workflow `deploy-backend.yml`.
