# 🎨 Jog.DEV — Website Portfolio

Selamat datang di repo **Jog.DEV**, website portfolio untuk jasa **Web Developer & Desain Digital**. Website ini menampilkan layanan, portofolio, dan cara menghubungi Jog.DEV untuk pembuatan website & landing page untuk UMKM.

## 🌐 Link Website (Live)

Mengakses website langsung di browser:

[🔗 **Buka jogdev-website.pages.dev**](https://jogdev-website.pages.dev/)

> 💡 Website otomatis di-deploy ke **Cloudflare Pages** setiap ada update di branch `main`.

---

## 📄 Daftar Halaman

| Halaman | Deskripsi |
|---------|-----------|
| 🏠 **index.html** | Beranda — hero, layanan, keunggulan, dan CTA |
| 🧾 **about.html** | Tentang / profil Jog.DEV |
| 🛠️ **services.html** | Layanan Web Developer & Desain Digital |
| 🖼️ **portofolio.html** | Galeri proyek & portofolio |
| 📞 **kontak.html** | Kontak & form pemesanan |
| ➕ Halaman proyek | `clearlaundry`, `kilaustore`, `parfum`, `gearpage`, `sport`, `sg gaming` |
| 404 / lain | Halaman pendukung tambahan |

---

## 🛠️ Teknologi

- 🌐 **HTML5, CSS** — struktur & gaya dasar
- 🎨 **Tailwind CSS** — styling & layout responsif (via CDN)
- ⚙️ **JavaScript / Three.js** — efek partikel cahaya di hero
- 📦 **Font Awesome 6** — ikon
- ☁️ **Cloudflare Pages** — hosting & deployment otomatis (via GitHub Actions + Wrangler)

---

## 🚀 Menjalankan di Lokal

Project ini adalah website statis (tanpa build step / framework). Cukup buka langsung di browser:

```bash
# Buka index.html di browser default
start index.html
```

Atau jalankan server lokal sederhana:

```bash
# Opsi 1: Python
python -m http.server 8080
# lalu akses http://localhost:8080

# Opsi 2: Node (npx serve)
npx serve .
```

---

## 📦 Deployment (Cloudflare Pages)

Project ini memakai **GitHub Actions** + **Wrangler** untuk auto-deploy ke Cloudflare Pages:

- File workflow: `.github/workflows/deploy.yml`
- Branch: `main`
- Project name: `jogdev-website`
- Requirement: secret `CF_API_TOKEN` & `CF_ACCOUNT_ID`

Setiap `push` ke `main` akan otomatis mem-build & deploy website ke live URL.

---

## 📄 Lisensi

Project oleh **Jog.DEV** — jasa Web Developer & Desain Digital.
