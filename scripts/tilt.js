/*
 * Jog.DEV - 3D Interactive Tilt untuk card
 * --------------------------------------------
 * Efek tilt 3D halus pada card CTA & card paket tanpa Three.js.
 *
 * Menggunakan CSS 3D transform + requestAnimationFrame + interpolasi (lerp)
 * sehingga card bergerak sangat smooth (tidak patah-patah) serta ringan tanpa lag.
 *
 * Fitur:
 *  - rotateX/rotateY mengikuti posisi cursor (mouse X -> rotateY, mouse Y -> rotateX)
 *  - translateZ + subtle scale agar terasa seperti permukaan 3D
 *  - Lighting/reflection (glossy) yang mengikuti posisi cursor via CSS variables
 *  - Kembali halus ke posisi semula saat cursor keluar
 *  - Mobile/touch nonaktif (efek cursor) karena tidak ada mouse
 *  - Tidak mengubah struktur HTML / isi card / ukuran layout
 *
 * Dua kelompok target dengan parameter berbeda:
 *  1. Card CTA  -> maxTilt lebih besar (9°)
 *  2. Card paket -> maxTilt lebih kecil (4°)
 */
(function () {
    'use strict';

    // Deteksi perangkat tanpa mouse (touch / coarse pointer). Matikan efek cursor.
    var coarsePointer = false;
    try {
        coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    } catch (e) { /* abaikan */ }
    var isTouchDevice = coarsePointer ||
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0);

    // Jika perangkat touch/coarse, jangan jalankan efek tilt berbasis cursor.
    // (ketentuan mobile: nonaktifkan / pakai efek ringan)
    if (isTouchDevice) return;

    var LERP = 0.14;         // faktor smoothing (lerp) per frame
    var PERSPECTIVE = 900;   // perspektif untuk efek 3D

    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    // Inisialisasi tilt untuk satu kelompok card.
    // selector: selektor CSS untuk card target.
    // cfg: { maxTilt (deg), translateZ (px), scale }
    function initTilt(selector, cfg) {
        var cards = Array.prototype.slice.call(
            document.querySelectorAll(selector)
        );
        if (!cards.length) return;

        cards.forEach(function (card) {
            // State per card
            var cur = { rx: 0, ry: 0, tz: 0, scale: 1, mx: 50, my: 50, glow: 0 };
            var tgt = { rx: 0, ry: 0, tz: 0, scale: 1, mx: 50, my: 50, glow: 0 };
            var rafId = null;
            var hovered = false;

            // Siapkan style dasar untuk 3D & efek glossy.
            card.style.willChange = 'transform';
            card.style.transformStyle = 'preserve-3d';
            card.style.transition = 'box-shadow 0.4s ease';

            card.style.setProperty('--mx', '50');
            card.style.setProperty('--my', '50');

            function onEnter() {
                hovered = true;
                tgt.scale = cfg.scale;
                tgt.tz = cfg.translateZ;
                // Shadow glossy saat tersorot ('' saat keluar agar pakai CSS default)
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

                // target rotasi (mouse X -> rotateY, mouse Y -> rotateX)
                tgt.ry = (x - 0.5) * 2 * -cfg.maxTilt;
                tgt.rx = (0.5 - y) * 2 * cfg.maxTilt;

                // posisi highlight glossy
                tgt.mx = x * 100;
                tgt.my = y * 100;

                // intensitas glow mengikuti jarak dari tengah (subtle)
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
                // Interpolasi halus menuju target
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

    // 1) Card CTA banner (kemiringan lebih besar)
    initTilt(
        '.max-w-4xl.glass-card.rounded-3xl.text-center.fade-in',
        { maxTilt: 9, translateZ: 14, scale: 1.02 }
    );

    // 2) Card paket harga (kemiringan LEBIH KECIL dari card CTA)
    initTilt(
        '[class~="p-7"].glass-card.rounded-2xl.text-center.fade-in',
        { maxTilt: 4, translateZ: 6, scale: 1.015 }
    );

})();
