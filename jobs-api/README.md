# zenn-jobs-api

API **aparte** del e-commerce. Solo worker Visão + catálogo PDF. Se despliega en el VPS (Hetzner).

La tienda sigue en Vercel (`backend/` + `frontend/`). Esta carpeta **no** se corre con `backend/index.js`.

## Arranque local

```bash
cd jobs-api
cp .env.example .env
npm install
npm start
```

Puerto: **8787**.

## En el VPS

El scrape/PDF reutiliza modelos y servicios que viven en `../backend` (mismo repo). En el servidor:

```bash
git clone TU_REPO zenn
cd zenn/jobs-api
cp .env.example .env && nano .env
npm install
pm2 start server.js --name zenn-jobs
pm2 save && pm2 startup
```

Chrome: `apt install -y google-chrome-stable`

Cron diario: `scripts/cron-daily.sh`

## Vercel (tienda)

```
WORKER_API_URL=http://IP_VPS:8787
WORKER_SECRET=la-misma-clave
```

El admin en www.zenn.com.py pide el PDF; Vercel reenvía a esta API.
