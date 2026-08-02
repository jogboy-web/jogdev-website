/**
 * Jog.DEV Hero — Animated Light Particles (Three.js)
 * ---------------------------------------------------
 * Efek visual background hero: kilauan partikel cahaya cyan/biru neon.
 * - Lembut, smooth, tidak berkedip kasar
 * - Parallax halus mengikuti mouse
 * - Responsif terhadap resize
 * - Dioptimalkan untuk mobile (jumlah partikel & intensitas diturunkan)
 * - Render hanya di dalam area hero, di belakang konten (tidak menghalangi klik)
 */
(function () {
    "use strict";

    var hero = document.getElementById('hero');
    var canvas = null;

    // ── Deteksi perangkat (mobile => lebih ringan) ──
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Perluas deteksi mobile: termasuk layar kecil / touch yang tidak terdeteksi UA ──
    // Menjamin efek tetap aktif & terlihat pada perangkat responsif mobile.
    function detectMobile() {
        if (isMobile) return true;
        // layar kecil (sm/bawah) dianggap mobile meskipun userAgent tidak bilang
        if (typeof window !== 'undefined' && window.matchMedia) {
            if (window.matchMedia('(max-width: 767px)').matches) return true;
            if ('ontouchstart' in window && window.innerWidth <= 1024) return true;
        }
        return false;
    }
    isMobile = detectMobile();

    // ── Konfigurasi partikel ──
    var CONFIG = {
        // Warna utama = warna teks "Website Impian" di h1 (#14f1d9)
        color: '#14f1d9',
        counts: isMobile ? 260 : 520,          // jumlah partikel (lebih banyak)
        maxOpacity: isMobile ? 0.55 : 0.75,    // intensitas glow
        baseSize: isMobile ? 1.8 : 2.4,        // ukuran partikel px
        speed: isMobile ? 0.30 : 0.50,         // kecepatan drift (lebih cepat, tetap smooth)
        noiseStrength: isMobile ? 0.004 : 0.006, // noise arah (sedikit naik agar tetap berkelok halus)
        parallaxStrength: isMobile ? 12 : 26,  // follow mouse
        orbitPoints: isMobile ? 16 : 26        // titik cahaya glow (bloom lembut)
    };

    // ── Tekstur partikel BULAT (bukan kotak) ──
    // Membuat sprite bulat dengan falloff radial agar partikel tampak bulat & lembut.
    function makeCircularTexture() {
        var size = 64;
        var c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        var ctx = c.getContext('2d');
        var r = size / 2;
        var gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.35, 'rgba(255,255,255,0.7)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        var texture = new THREE.CanvasTexture(c);
        texture.needsUpdate = true;
        return texture;
    }

    // Jika user memilih reduce motion, matikan animasi
    if (reduced) {
        CONFIG.counts = 20;
        CONFIG.maxOpacity = 0.3;
        CONFIG.orbitPoints = 4;
        CONFIG.speed = 0.03;
    }

    // ── Inisialisasi ──
    function init() {
        if (reduced) return; // tanpa animasi untuk prefers-reduced-motion
        if (!hero) return;

        // Pastikan Three.js tersedia (di-load dari CDN di head)
        if (!window.THREE || !window.THREE.Scene) {
            console.warn('[Jog.DEV] Three.js tidak tersedia, melewati efek partikel hero.');
            return;
        }

        var old = document.getElementById('hero-particle-canvas');
        if (old) old.remove();

        createCanvas();

        // Pastikan WebGL benar-benar tersedia (tanpa duplikasi context,
        // biarkan WebGLRenderer yang membuat context kanvas sendiri).
        if (!supportsWebGL()) {
            canvas.remove();
            canvas = null;
            return;
        }

        setupScene();

        // Jika setup gagal (mis. WebGL context tidak bisa dibuat di mobile),
        // batal mulai animate tanpa error; animate hanya jalan jika renderer ada.
        if (!renderer || !scene) {
            // renderer/scene akan null jika setupScene mendeteksi kegagalan
            canvas = null;
            return;
        }

        window.__jogHeroParticlesRequestId = requestAnimationFrame(animate);

        window.addEventListener('mousemove', onMouseMove, { passive: true });
        window.addEventListener('resize', onResize, { passive: true });

        // Pastikan ukuran hero sudah benar setelah semua aset/gambar selesai dimuat
        // (di mobile, ukuran bisa 0 jika js jalan sebelum gambar base64 besar selesai).
        if (document.readyState === 'complete') {
            onResize();
        } else {
            window.addEventListener('load', function onLoad() {
                onResize();
                window.removeEventListener('load', onLoad);
            });
        }
    }

    // Cek dukungan WebGL lewat canvas tes terpisah (tidak menyentuh canvas utama)
    function supportsWebGL() {
        try {
            var probe = document.createElement('canvas');
            return !!(probe.getContext('webgl') || probe.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    }

    function createCanvas() {
        canvas = document.createElement('canvas');
        canvas.id = 'hero-particle-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        // Di belakang konten (content hero z-10), di atas overlay, tidak menghalangi klik
        canvas.style.position = 'absolute';
        canvas.style.inset = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '1';
        canvas.style.pointerEvents = 'none';
        canvas.style.display = 'block';
        hero.appendChild(canvas);
    }

    // ── State Three.js ──
    var renderer, scene, camera;
    var particles, starField, orbitGroup;
    var sweep = null;                  // kilauan bahan dari kiri-atas ke kanan-bawah
    var sweepOffset = 0;               // progres lintasan 0..1
    var sizes = { w: 0, h: 0 };
    var dprLimit = isMobile ? 1.2 : 2;   // DPI lebih rendah di mobile agar ringan
    var mouse = { x: 0, y: 0 };
    var mouseSmooth = { x: 0, y: 0 };
    var clock;
    var frame = 0;

    function setupScene() {
        heroRect();

        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x0b0f1a, 0.012);

        camera = new THREE.PerspectiveCamera(60, sizes.w / sizes.h, 0.1, 300);
        camera.position.z = 60;

        var renderFailed = false;
        try {
            renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                alpha: true,
                antialias: !isMobile,          // matikan antialias di mobile utk performa
                // 'high-performance' bisa membuat WebGL gagal di perangkat mobile/lesu.
                // Di mobile kita pakai default agar lebih kompatibel.
                powerPreference: isMobile ? 'default' : 'high-performance'
            });
        } catch (e) {
            // WebGL gagal dibuat (mis. GPU dibatasi). Bersihkan & non-aktifkan efek.
            renderFailed = true;
        }
        if (renderFailed || !renderer) {
            if (canvas) canvas.remove();
            canvas = null;
            return;
        }
        renderer.setClearColor(0x000000, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprLimit));
        renderer.setSize(sizes.w, sizes.h, false);

        clock = new THREE.Clock();

        // Buat tekstur partikel bulat (sekali) sebelum material dibuat
        particleTexture = makeCircularTexture();

        buildParticles();
        buildOrbits();
        buildSweep();
    }

    // Ukuran hero saat ini
    function heroRect() {
        var r = hero.getBoundingClientRect();
        sizes.w = Math.max(r.width, 1);
        sizes.h = Math.max(r.height, 1);
    }

    var particleTexture = null; // tekstur bulat, dibuat sekali di setupScene

    // ── Partikel utama (debu cahaya) ──
    function buildParticles() {
        var count = CONFIG.counts;
        var geometry = new THREE.BufferGeometry();
        var positions = new Float32Array(count * 3);
        var colors = new Float32Array(count * 3);
        var velocities = new Float32Array(count * 3);

        var baseColor = new THREE.Color(CONFIG.color);

        for (var i = 0; i < count; i++) {
            positions[i * 3 + 0] = (Math.random() - 0.5) * sizes.w * 1.1;
            positions[i * 3 + 1] = (Math.random() - 0.5) * sizes.h * 1.1;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 26;

            // kecepatan drift perlahan, sedikit acak
            velocities[i * 3 + 0] = (Math.random() - 0.5) * CONFIG.speed;
            velocities[i * 3 + 1] = (Math.random() - 0.5) * CONFIG.speed;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.05;

            // warna seragam mengikuti teks "Website Impian" + variasi kecerahan halus
            var c = baseColor.clone();
            c.offsetHSL(0, (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.05);
            colors[i * 3 + 0] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Simpan velocities agar mudah di-update
        geometry.userData.velocities = velocities;

        var material = new THREE.PointsMaterial({
            size: CONFIG.baseSize,
            map: particleTexture,       // tekstur bulat -> partikel tidak kotak
            vertexColors: true,
            transparent: true,
            opacity: CONFIG.maxOpacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: false,
            alphaTest: 0.0
        });

        particles = new THREE.Points(geometry, material);
        scene.add(particles);
    }

    // Orbit / titik glow (bloom lembut) untuk kedalaman
    function buildOrbits() {
        var count = CONFIG.orbitPoints;
        var geometry = new THREE.BufferGeometry();
        var positions = new Float32Array(count * 3);
        var colors = new Float32Array(count * 3);
        var theta = new Float32Array(count);   // sudut orbit

        var baseColor = new THREE.Color(CONFIG.color);

        // Area sebaran titik cahaya glow
        var spreadX = sizes.w * 0.45;
        var spreadY = sizes.h * 0.4;

        for (var i = 0; i < count; i++) {
            positions[i * 3 + 0] = (Math.random() - 0.5) * spreadX;
            positions[i * 3 + 1] = (Math.random() - 0.5) * spreadY;
            positions[i * 3 + 2] = -15 + Math.random() * 12;

            theta[i] = Math.random() * Math.PI * 2;

            var c = baseColor.clone();
            c.offsetHSL(0, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.06);
            colors[i * 3 + 0] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.userData.theta = theta;

        var material = new THREE.PointsMaterial({
            size: isMobile ? 5 : 8,
            map: particleTexture,       // tekstur bulat -> tidak tampil kotak
            vertexColors: true,
            transparent: true,
            opacity: isMobile ? 0.18 : 0.30,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true,
            alphaTest: 0.0
        });

        starField = new THREE.Points(geometry, material);
        scene.add(starField);
        orbitGroup = starField;
    }

    // ── Kilauan cahaya berulang: dari pojok kiri-atas menuju kanan-bawah ──
    // Beberapa blob bulat membentuk garis diagonal; bergerak perlahan lalu reset.
    function buildSweep() {
        var n = isMobile ? 10 : 16;
        var geometry = new THREE.BufferGeometry();
        var positions = new Float32Array(n * 3);
        var colors = new Float32Array(n * 3);

        var baseColor = new THREE.Color(CONFIG.color);

        // Titik disusun membentuk garis miring (sumbu lokal, digerakkan di animate)
        var spread = 8;   // panjang sapuan dalam satuan world (garis miring pendek)
        for (var i = 0; i < n; i++) {
            var t = i / (n - 1);            // 0..1 sepanjang sapuan
            positions[i * 3 + 0] = (t - 0.5) * spread;   // merentang horizontal
            positions[i * 3 + 1] = (0.5 - t) * spread;   // merentang vertikal (miring)
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

            var c = baseColor.clone();
            colors[i * 3 + 0] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        var material = new THREE.PointsMaterial({
            size: isMobile ? 10 : 16,        // blob cahaya lembut
            map: particleTexture,
            vertexColors: true,
            transparent: true,
            opacity: 0.0,                    // mulai tidak terlihat
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true,
            alphaTest: 0.0
        });

        sweep = new THREE.Points(geometry, material);
        scene.add(sweep);
        sweepOffset = 0;
    }

    // ── Mouse parallax (halus) ──
    function onMouseMove(e) {
        mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
        mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    }

    // ── Resize (responsive) ──
    function onResize() {
        // Jika mode mobile berubah karena ukuran layar berubah,
        // perbarui CONFIG & bangun ulang agar partikel sesuai perangkat.
        var mobileNow = detectMobile();
        if (mobileNow !== isMobile) {
            isMobile = mobileNow;
            // perbarui nilai CONFIG yang peka terhadap mode
            CONFIG.counts = isMobile ? 260 : 520;
            CONFIG.maxOpacity = isMobile ? 0.55 : 0.75;
            CONFIG.baseSize = isMobile ? 1.8 : 2.4;
            CONFIG.orbitPoints = isMobile ? 16 : 26;
            CONFIG.parallaxStrength = isMobile ? 12 : 26;
            CONFIG.speed = isMobile ? 0.30 : 0.50;
            CONFIG.noiseStrength = isMobile ? 0.004 : 0.006;
            dprLimit = isMobile ? 1.2 : 2;
            rebuildAll();
            return;
        }

        heroRect();
        if (renderer && camera) {
            camera.aspect = sizes.w / sizes.h;
            camera.updateProjectionMatrix();
            renderer.setSize(sizes.w, sizes.h, false);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprLimit));
        }
    }

    // Bangun ulang seluruh scene (dipakai saat mode mobile berubah saat resize)
    function rebuildAll() {
        var requestId = window.__jogHeroParticlesRequestId;
        if (requestId) {
            cancelAnimationFrame(requestId);
            window.__jogHeroParticlesRequestId = undefined;
        }
        // lepas canvas lama & object Three.js
        if (renderer) {
            renderer.dispose();
            if (renderer.forceContextLoss) renderer.forceContextLoss();
        }
        if (canvas) canvas.remove();
        particles = starField = orbitGroup = scene = camera = renderer = undefined;
        sweep = null;
        sweepOffset = 0;

        // buat canvas baru & bangun ulang dari nol
        createCanvas();
        setupScene();
        if (!renderer || !scene) {
            // setup gagal di mode baru (mis. WebGL tidak tersedia) — berhenti aman
            if (canvas) { canvas.remove(); canvas = null; }
            window.__jogHeroParticlesRequestId = undefined;
            return;
        }
        window.__jogHeroParticlesRequestId = requestAnimationFrame(animate);
    }

    // ── Loop animasi ──
    function animate() {
        window.__jogHeroParticlesRequestId = requestAnimationFrame(animate);
        if (!renderer || !scene) return;

        var delta = Math.min(clock.getDelta(), 0.05);
        frame++;

        // Parallax halus (lerp menuju posisi mouse)
        mouseSmooth.x += (mouse.x - mouseSmooth.x) * 0.035;
        mouseSmooth.y += (mouse.y - mouseSmooth.y) * 0.035;
        var px = mouseSmooth.x * CONFIG.parallaxStrength;
        var py = mouseSmooth.y * CONFIG.parallaxStrength;

        // Camera bergeser sangat halus mengikuti mouse
        camera.position.x += (px - camera.position.x) * 0.04;
        camera.position.y += (-py - camera.position.y) * 0.04;
        camera.lookAt(scene.position);

        // Gerakkan partikel (positions attribute)
        var pos = particles.geometry.attributes.position.array;
        var vel = particles.geometry.userData.velocities;
        var count = pos.length / 3;

        for (var i = 0; i < count; i++) {
            // tambahkan noise sinus lambat agar arah sedikit acak, tidak berulang
            var nx = Math.sin(frame * CONFIG.noiseStrength + i * 1.7);
            var ny = Math.cos(frame * CONFIG.noiseStrength * 0.8 + i * 2.3);

            pos[i * 3 + 0] += (vel[i * 3 + 0] + nx * 0.02) * delta * 60;
            pos[i * 3 + 1] += (vel[i * 3 + 1] + ny * 0.02) * delta * 60;
            pos[i * 3 + 2] += vel[i * 3 + 2] * delta * 60;

            // Wrap-around (keluar lalu muncul di sisi lain)
            var hw = sizes.w * 0.7;
            var hh = sizes.h * 0.7;
            if (pos[i * 3 + 0] > hw) pos[i * 3 + 0] = -hw;
            if (pos[i * 3 + 0] < -hw) pos[i * 3 + 0] = hw;
            if (pos[i * 3 + 1] > hh) pos[i * 3 + 1] = -hh;
            if (pos[i * 3 + 1] < -hh) pos[i * 3 + 1] = hh;
        }
        particles.geometry.attributes.position.needsUpdate = true;

        // Orbit glow: gerakan sirkular lembut
        if (orbitGroup) {
            var opos = orbitGroup.geometry.attributes.position.array;
            var theta = orbitGroup.geometry.userData.theta;
            var n = opos.length / 3;
            for (var j = 0; j < n; j++) {
                theta[j] += 0.0012 * (isMobile ? 0.6 : 1);
                opos[j * 3 + 0] += Math.sin(frame * 0.001 + j) * 0.0004;
                opos[j * 3 + 1] += Math.cos(theta[j]) * 0.003;
            }
            orbitGroup.geometry.attributes.position.needsUpdate = true;
            orbitGroup.rotation.y += 0.0004;
        }

        // Kilauan cahaya berulang: kiri-atas -> kanan-bawah
        if (sweep) {
            // Kecepatan (detik per siklus penuh)
            var duration = isMobile ? 14 : 18;
            sweepOffset = (sweepOffset + delta / duration) % 1;

            // Jangkauan area yang terlihat oleh kamera (z=0), agar sapuan selalu tampak
            var visibleH = 2 * Math.tan(THREE.MathUtils.degToRad(30)) * camera.position.z;
            var visibleW = visibleH * (sizes.w / sizes.h);
            var rx = visibleW * 0.75;
            var ry = visibleH * 0.75;

            // Posisi dari kiri-atas (-x, +y) menuju kanan-bawah (+x, -y)
            var px2 = -rx + sweepOffset * rx * 2;
            var py2 =  ry - sweepOffset * ry * 2;
            sweep.position.x = px2;
            sweep.position.y = py2;

            // Pulsasi opacity: menyala di tengah, meredup sebelum reset
            var bright = Math.sin(sweepOffset * Math.PI);  // 0 -> 1 -> 0
            sweep.material.opacity = bright * (isMobile ? 0.22 : 0.38);
        }

        renderer.render(scene, camera);
    }

    // ── Cleanup (hapus semua sumber daya) ──
    function cleanup() {
        if (window.__jogHeroParticlesRequestId) {
            cancelAnimationFrame(window.__jogHeroParticlesRequestId);
            window.__jogHeroParticlesRequestId = undefined;
        }
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('resize', onResize);

        if (renderer) {
            renderer.dispose();
            if (renderer.forceContextLoss) renderer.forceContextLoss();
            renderer = undefined;
        }
        if (canvas) {
            canvas.remove();
            canvas = undefined;
        }
        particles = starField = orbitGroup = scene = camera = undefined;
        sweep = null;
        sweepOffset = 0;
    }

    // ── Boot setelah halaman & aset siap ──
    // Di mobile, menunggu window.load memastikan gambar base64 besar sudah selesai
    // sehingga ukuran hero (getBoundingClientRect) bukan 0 saat canvas dibangun.
    var bootStarted = false;
    var bootTimer = null;

    function doBoot() {
        if (bootStarted) return;
        bootStarted = true;
        if (bootTimer) { clearTimeout(bootTimer); bootTimer = null; }
        init();
    }

    function boot() {
        if (document.readyState === 'complete') {
            doBoot();
            return;
        }
        window.addEventListener('load', function onLoad() {
            doBoot();
            window.removeEventListener('load', onLoad);
        });
        // Fallback: tunggu maksimal 900ms lalu mulai walau belum load (anti-macet)
        bootTimer = setTimeout(doBoot, 900);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();
