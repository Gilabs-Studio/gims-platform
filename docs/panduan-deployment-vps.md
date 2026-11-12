# Panduan Deployment VPS & Operasional — GIMS Platform API

Dokumen ini memandu Anda untuk melakukan deployment backend Go (**GIMS API**) ke VPS menggunakan metode **Local Build & Zero-Quota SSH Pipe** (persis seperti pola proyek Growgi / UMKM Gilabs).

Dengan metode ini:
* **VPS tetap sangat ringan**: Tidak ada Git repository, tidak ada proses compiler Go, dan tidak ada build cache yang memakan RAM/CPU VPS.
* **Tanpa Registry**: Docker image tidak perlu di-push ke GitHub Container Registry (GHCR) atau Docker Hub, melainkan di-stream langsung dari laptop ke VPS via SSH pipe (`docker save | gzip | ssh | gunzip | docker load`).
* **Resource Capped & Log Rotated**: Container dibatasi RAM-nya dan log Docker dibatasi maksimal 10MB per file agar disk VPS tidak penuh.

---

## 1. Arsitektur Deployment

```text
Laptop Pengembang:
└── apps/api/ (Go Backend) ──[Docker Build Lokal]──> [SSH Pipe (Gzip)] ──> VPS: Docker Engine (Port 8080)
                                                                             ├── gims_api (Port 8080)
                                                                             ├── gims_db (PostgreSQL 16)
                                                                             └── gims_redis (Redis 7)
```

Nginx di host VPS bertindak sebagai Reverse Proxy:
* `https://api-gione.gilabs.id/` ──> `http://127.0.0.1:8080` (Container `gims_api`)

---

## 2. Setup SSH Key (Hanya Perlu 1x)

Agar proses deploy tidak meminta password berulang kali, pasang SSH Public Key laptop Anda ke VPS:

```bash
# Salin kunci SSH laptop ke VPS (cukup jalankan 1 kali):
ssh-copy-id root@api-gione.gilabs.id
```

> [!TIP]
> Jika laptop Anda belum memiliki file kunci SSH, buat terlebih dahulu dengan `ssh-keygen -t ed25519` (tekan Enter terus sampai selesai), lalu jalankan `ssh-copy-id root@api-gione.gilabs.id`.
> 
> Skrip `deploy-api.sh` juga sudah dilengkapi **SSH Multiplexing** (`ControlMaster`), sehingga koneksi SSH hanya dibuka 1 kali selama seluruh proses deploy berlangsung.

---

## 3. Langkah Pertama Kali: Pembersihan & Migrasi di VPS

Sebelum menggunakan skrip deploy baru, lakukan pembersihan stack lama di VPS:

Login ke VPS (`ssh root@api-gione.gilabs.id`):

```bash
# 1. Cek isi file .env lama yang ada di VPS dan salin nilainya jika diperlukan
cat ~/gims-platform/apps/api/.env 2>/dev/null || cat ~/gims-platform/.env 2>/dev/null

# 2. Hapus container postgres yatim yang mengekspos port 5435
docker stop growgi-landing-db && docker rm growgi-landing-db

# 3. Hapus stack salesview lama
docker stop salesview-api-prod salesview-postgres-prod salesview-redis-prod
docker rm salesview-api-prod salesview-postgres-prod salesview-redis-prod

# 4. Siapkan folder mandiri untuk backend GIMS di /opt/gims-api
mkdir -p /opt/gims-api
chmod 700 /opt/gims-api

# 5. Salin .env lama ke /opt/gims-api/.env (atau buat baru)
cp ~/gims-platform/apps/api/.env /opt/gims-api/.env 2>/dev/null || true
chmod 600 /opt/gims-api/.env

# 6. Hapus repo lama di VPS untuk membebaskan ruang disk
rm -rf ~/gims-platform

# 7. Bersihkan image & build cache lama yang tidak terpakai
docker image prune -a -f
```

---

## 4. Konfigurasi Environment di Laptop (`.env.production`)

Di laptop lokal Anda, buat file konfigurasi production:
📁 `apps/api/.env.production`

Anda dapat menyalin dari template contoh:
```bash
cp apps/api/.env.production.example apps/api/.env.production
```

Isi variabel penting seperti:
* `DB_PASSWORD`: Password database PostgreSQL.
* `JWT_SECRET`: Kunci rahasia JWT (buat acak dengan `openssl rand -hex 32`).
* `RUN_MIGRATIONS=true` dan `RUN_SEEDERS=true` (untuk inisialisasi awal database baru).

> [!IMPORTANT]
> File `apps/api/.env.production` sudah otomatis masuk ke `.gitignore` sehingga tidak akan pernah ter-commit ke Git.

---

## 5. Cara Deploy API ke VPS

Pastikan Docker di laptop Anda sedang aktif, lalu jalankan dari root direktori proyek:

```bash
# Deploy standar (otomatis menggunakan api-gione.gilabs.id)
bash scripts/vps/deploy-api.sh
```

Jika Anda mengubah file `apps/api/.env.production` di laptop dan ingin menyinkronkan pembaruan env tersebut ke VPS:
```bash
SYNC_ENV=1 bash scripts/vps/deploy-api.sh
```

### Tahapan yang Dijalankan Skrip Secara Otomatis:
1. **[1/5] Build Image Lokal:** Mengompilasi binary Go di laptop ke Docker image `gims-api:<tag>`.
2. **[2/5] Menyiapkan VPS:** Membuat folder `/opt/gims-api`, mengirim `docker-compose.yml`, dan sinkronisasi `.env`.
3. **[3/5] Streaming Image:** Mengompres image dengan `gzip` dan streaming langsung ke Docker daemon VPS melalui pipe SSH.
4. **[4/5] Menjalankan Service:** Menjalankan `docker compose up -d --remove-orphans` di VPS.
5. **[5/5] Health Check & Auto Prune:** Memvalidasi endpoint `http://127.0.0.1:8080/health` merespons sehat, lalu otomatis menghapus image versi lama di VPS (menyimpan 3 versi terbaru).

---

## 6. Manajemen Versi & Git Tag

Skrip `deploy-api.sh` mendeteksi versi secara otomatis:

### Opsi A: Menggunakan Git Tag (Sangat Disarankan untuk Rilis)
```bash
git tag v1.0.0
bash scripts/vps/deploy-api.sh
```
*Image di VPS otomatis diberi tag `gims-api:v1.0.0`.*

### Opsi B: Tanpa Git Tag (Otomatis & Praktis)
```bash
bash scripts/vps/deploy-api.sh
```
*Image otomatis diberi tag `gims-api:YYYYMMDD-HHMMSS-<git_short_hash>` (misal `gims-api:20261112-221000-a1b2c3d`).*

### Opsi C: Manual Override
```bash
TAG="v1.0.1-hotfix" bash scripts/vps/deploy-api.sh
```

---

## 7. Prosedur Rollback Instan

Jika versi API yang baru mengalami error, Anda dapat kembali ke image sebelumnya dalam beberapa detik tanpa build ulang:

```bash
# Rollback ke 1 versi tepat sebelumnya:
bash scripts/vps/rollback-api.sh

# Atau rollback ke tag versi tertentu:
bash scripts/vps/rollback-api.sh v1.0.0
```

---

## 8. Pemantauan & Operasional di VPS

Untuk memeriksa status backend langsung di VPS (`ssh root@api-gione.gilabs.id`):

```bash
# Masuk ke folder kerja GIMS API
cd /opt/gims-api

# Melihat status container & healthcheck
docker compose ps

# Melihat live logs API
docker logs -f gims_api

# Melihat live logs Database
docker logs -f gims_db

# Melihat live logs Redis
docker logs -f gims_redis

# Restart container API saja
docker compose restart api
```
