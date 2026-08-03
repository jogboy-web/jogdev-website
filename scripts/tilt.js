/*
 * Jog.DEV - 3D Interactive Tilt untuk card (Desktop + Mobile)
 * ------------------------------------------------------------
 * Deskripsi:
 *  - DESKTOP (pointer halus/mouse): efek tilt 3D mengikuti cursor.
 *      rotateX/rotateY ikut posisi mouse, translateZ + subtle scale,
 *      lighting/glossy (CSS variables), kembali halus saat keluar.
 *  - MOBILE (touch/coarse pointer): karena tidak ada mouse, card tetap
 *      "hidup" lewat ANIMASI IDLE FLOAT (levitasi naik-turun halus) +
 *      GLOSSY PULSE, plus reaksi ringan saat disentuh (touch hilft + glow).
 *
 * Dua kelompok target dengan parameter beda:
 *  1. Card CTA  -> maxTilt lebih besar (9°) / float lebih tinggi
 *  2. Card paket-> maxTilt lebih kecil (4°) / float lebih rendah
 */
(function () {
    'use strict';

    // Deteksi perangkat tanpa mouse (touch / coarse pointer).
    var coarsePointer = false;
    try {
        coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    } catch (e) { /* abaikan */ }
    var isTouchDevice = coarsePointer ||
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0);

    var LERP = 0.14;         // faktor smoothing (lerp) per frame
    var PERSPECTIVE = 900;   // perspektif untuk efek 3D

    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    /* ============================================================
     * MODE MOBILE / TOUCH
     * ----------------------------------------------------------
     * Tanpa mouse, kita jalankan animasi idle float (levitasi) yang
     * halus + glossy pulse. Saat card disentuh, naikkan & nyalakan
     * glow supaya terasa interaktif (tidak mengganggu scroll).
     * ============================================================ */
    function initMobileFloat(selector, cfg) {
        var cards = Array.prototype.slice.call(
            document.querySelectorAll(selector)
        );
        if (!cards.length) return;

        cards.forEach(function (card) {
            // Hindari inisialisasi ganda bila card cocok beberapa selector.
            if (card.getAttribute('data-jd-tilt')) return;
            card.setAttribute('data-jd-tilt', '1');

            // Styling dasar 3D + glow.
            card.style.willChange = 'transform';
            card.style.transformStyle = 'preserve-3d';
            card.style.setProperty('--mx', '50');
            card.style.setProperty('--my', '50');

            // Fase acak agar tiap card tidak gerak serempak.
            var phase = Math.random() * Math.PI * 2;
            var amp = cfg.floatAmp;          // amplitudo float (px)
            var speed = cfg.floatSpeed;      // kecepatan float (rad/detik)
            var glowAmp = cfg.glowAmp;       // amplitudo glow 0..1
            var last = performance.now();
            var pressed = false;
            var rafId = null;

            function tick(now) {
                var dt = (now - last) / 1000;
                last = now;
                var t = now / 1000;
                var wave = Math.sin(t * speed + phase);

                // Float naik-turun halus (tanpa scale berlebihan).
                var tz = wave * amp;
                // Glow berdenyut pelan.
                var glow = glowAmp * (0.5 + 0.5 * Math.sin(t * (speed * 0.7) + phase));

                if (pressed) {
                    // Saat disentuh: naikkan & glow terang.
                    tz = amp * 1.6;
                    glow = 1;
                }

                card.style.transform =
                    'perspective(' + PERSPECTIVE + 'px) ' +
                    'translateZ(' + tz.toFixed(2) + 'px) ';

                card.style.setProperty('--glow', glow.toFixed(3));
                var mx = 50 + Math.sin(t * speed * 0.4 + phase) * 30;
                var my = 50 + Math.cos(t * speed * 0.4 + phase) * 30;
                card.style.setProperty('--mx', mx.toFixed(2));
                card.style.setProperty('--my', my.toFixed(2));

                rafId = requestAnimationFrame(tick);
            }

            // Responsive: jangan render animasi saat tab tersembunyi / card off-screen.
            function start() {
                if (rafId !== null) return;
                last = performance.now();
                rafId = requestAnimationFrame(tick);
            }
            function stop() {
                if (rafId !== null) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
            }

            function onTouchStart() {
                pressed = true;
                // Shadow/gloss saat disentuh.
                card.style.boxShadow =
                    '0 20px 45px -15px rgba(0, 0, 0, 0.55), ' +
                    '0 0 40px -10px rgba(20, 241, 217, 0.30)';
                start();
            }
            function onTouchEnd() {
                pressed = false;
                card.style.boxShadow = '';
            }

            card.addEventListener('touchstart', onTouchStart, { passive: true });
            card.addEventListener('touchend', onTouchEnd, { passive: true });
            card.addEventListener('touchcancel', onTouchEnd, { passive: true });

            // Hirarkis: jalankan hanya jika card terlihat (Jauh dari viewport -> pause).
            if ('IntersectionObserver' in window) {
                var io = new IntersectionObserver(function (entries) {
                    entries.forEach(function (en) {
                        if (en.isIntersecting) start(); else stop();
                    });
                }, { rootMargin: '100px' });
                io.observe(card);
            } else {
                start();
            }
        });
    }

    /* ============================================================
     * MODE DESKTOP (mouse)
     * ============================================================ */
    function initTiltDesktop(selector, cfg) {
        var cards = Array.prototype.slice.call(
            document.querySelectorAll(selector)
        );
        if (!cards.length) return;

        cards.forEach(function (card) {
            // Hindari inisialisasi ganda bila card cocok beberapa selector.
            if (card.getAttribute('data-jd-tilt')) return;
            card.setAttribute('data-jd-tilt', '1');

            // State per card
            var cur = { rx: 0, ry: 0, tz: 0, scale: 1, mx: 50, my: 50, glow: 0 };
            var tgt = { rx: 0, ry: 0, tz: 0, scale: 1, mx: 50, my: 50, glow: 0 };
            var rafId = null;
            var hovered = false;

            card.style.willChange = 'transform';
            card.style.transformStyle = 'preserve-3d';
            card.style.transition = 'box-shadow 0.4s ease';
            card.style.setProperty('--mx', '50');
            card.style.setProperty('--my', '50');

            function onEnter() {
                hovered = true;
                tgt.scale = cfg.scale;
                tgt.tz = cfg.translateZ;
                card.style.boxShadow =
                    '0 20px 45px -15px rgba(0, 0, 0, 0.55), ' +
                    '0 0 40px -10px rgba(20, 241, 217, 0.25)';
                startLoop();
            }

            function onMove(e) {
                if (!hovered) return;
                var rect = card.getBoundingClientRect();
                if (!rect.width || !rect.height) return;

                var x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
                var y = clamp((e.clientY - rect.top) / rect.height, 0, 1);

                tgt.ry = (x - 0.5) * 2 * -cfg.maxTilt;
                tgt.rx = (0.5 - y) * 2 * cfg.maxTilt;

                tgt.mx = x * 100;
                tgt.my = y * 100;

                var d = Math.sqrt((x - 0.5) * (x - 0.5) + (y - 0.5) * (y - 0.5));
                tgt.glow = clamp(d * 2.2, 0, 1);

                startLoop();
            }

            function onLeave() {
                hovered = false;
                tgt.rx = 0; tgt.ry = 0; tgt.tz = 0;
                tgt.scale = 1;
                tgt.mx = 50; tgt.my = 50;
                tgt.glow = 0;
                card.style.boxShadow = '';
                startLoop();
            }

            function startLoop() {
                if (rafId !== null) return;
                rafId = requestAnimationFrame(loop);
            }

            function loop() {
                cur.rx = lerp(cur.rx, tgt.rx, LERP);
                cur.ry = lerp(cur.ry, tgt.ry, LERP);
                cur.tz = lerp(cur.tz, tgt.tz, LERP);
                cur.scale = lerp(cur.scale, tgt.scale, LERP);
                cur.mx = lerp(cur.mx, tgt.mx, LERP);
                cur.my = lerp(cur.my, tgt.my, LERP);
                cur.glow = lerp(cur.glow, tgt.glow, LERP);

                card.style.transform =
                    'perspective(' + PERSPECTIVE + 'px) ' +
                    'translateZ(' + cur.tz.toFixed(2) + 'px) ' +
                    'rotateX(' + cur.rx.toFixed(2) + 'deg) ' +
                    'rotateY(' + cur.ry.toFixed(2) + 'deg) ' +
                    'scale(' + cur.scale.toFixed(4) + ')';

                card.style.setProperty('--mx', cur.mx.toFixed(2));
                card.style.setProperty('--my', cur.my.toFixed(2));
                card.style.setProperty('--glow', cur.glow.toFixed(3));

                var done = !hovered &&
                    Math.abs(cur.rx) < 0.02 && Math.abs(cur.ry) < 0.02 &&
                    Math.abs(cur.tz) < 0.02 && Math.abs(cur.scale - 1) < 0.0005;

                if (done) {
                    card.style.transform = '';
                    card.style.setProperty('--mx', '50');
                    card.style.setProperty('--my', '50');
                    card.style.setProperty('--glow', '0');
                    rafId = null;
                    return;
                }
                rafId = requestAnimationFrame(loop);
            }

            card.addEventListener('mouseenter', onEnter);
            card.addEventListener('mousemove', onMove);
            card.addEventListener('mouseleave', onLeave);
        });
    }

    /* ============================================================
     * JALANKAN: pilih mode sesuai perangkat
     * ============================================================ */
    function init(selector, desktopCfg, mobileCfg) {
        if (isTouchDevice) {
            initMobileFloat(selector, mobileCfg);
        } else {
            initTiltDesktop(selector, desktopCfg);
        }
    }

    // 1) Card CTA banner (tilt/float lebih besar & jelas)
    init(
        '.max-w-4xl.glass-card.rounded-3xl.text-center.fade-in',
        { maxTilt: 9, translateZ: 14, scale: 1.02 },
        { floatAmp: 8, floatSpeed: 1.6, glowAmp: 0.9 }
    );

    // 2) Card paket harga (tilt/float lebih kecil)
    init(
        '[class~="p-7"].glass-card.rounded-2xl.text-center.fade-in',
        { maxTilt: 4, translateZ: 6, scale: 1.015 },
        { floatAmp: 5, floatSpeed: 1.4, glowAmp: 0.7 }
    );

    // 3) Card kontak (info items & form) — berlaku juga di mobile.
    init(
        '.glass-card.rounded-2xl.fade-in, .contact-item.glass-card',
        { maxTilt: 3, translateZ: 5, scale: 1.008 },
        { floatAmp: 3.5, floatSpeed: 1.3, glowAmp: 0.55 }
    );

})();
