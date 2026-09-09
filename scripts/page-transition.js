(function () {
    'use strict';

    // ── CSS untuk Transisi Antar Halaman (Exit & Entrance) ──
    var css = `
        /* Ring saat KELUAR halaman (Lingkaran mengecil ke titik tengah) */
        @keyframes jdevCircleClose {
            0% {
                width: 280vmax;
                height: 280vmax;
                border-width: 4px;
                opacity: 0.95;
            }
            85% {
                width: 90px;
                height: 90px;
                border-width: 2.5px;
                opacity: 1;
            }
            100% {
                width: 0px;
                height: 0px;
                border-width: 2px;
                opacity: 1;
            }
        }
        .jdev-exit-ring {
            position: fixed;
            top: 50%;
            left: 50%;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            border: 2.5px solid #14f1d9;
            box-shadow: 
                0 0 25px #14f1d9,
                0 0 50px rgba(20, 241, 217, 0.5),
                inset 0 0 20px rgba(20, 241, 217, 0.4),
                0 0 0 280vmax #0b0f1a;
            pointer-events: all !important;
            z-index: 999999;
            width: 280vmax;
            height: 280vmax;
            animation: jdevCircleClose 0.55s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
        }

        /* Ring saat MASUK halaman (Lingkaran membesar dari titik tengah) */
        @keyframes jdevCircleRevealPage {
            0% {
                width: 0px;
                height: 0px;
                border-width: 2px;
                box-shadow: 
                    0 0 20px #14f1d9,
                    0 0 40px rgba(20, 241, 217, 0.6),
                    inset 0 0 15px rgba(20, 241, 217, 0.5),
                    0 0 0 280vmax #0b0f1a;
                opacity: 1;
            }
            15% {
                width: 90px;
                height: 90px;
                border-width: 2.5px;
                box-shadow: 
                    0 0 25px #14f1d9,
                    0 0 50px rgba(20, 241, 217, 0.5),
                    inset 0 0 20px rgba(20, 241, 217, 0.4),
                    0 0 0 280vmax #0b0f1a;
                opacity: 1;
            }
            85% {
                opacity: 1;
            }
            100% {
                width: 280vmax;
                height: 280vmax;
                border-width: 4px;
                box-shadow: 
                    0 0 40px #14f1d9,
                    0 0 80px rgba(20, 241, 217, 0.4),
                    inset 0 0 30px rgba(20, 241, 217, 0.3),
                    0 0 0 280vmax #0b0f1a;
                opacity: 0;
            }
        }
        .jdev-page-reveal-ring {
            position: fixed;
            top: 50%;
            left: 50%;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            border: 2.5px solid #14f1d9;
            pointer-events: none;
            z-index: 99999;
            width: 0px;
            height: 0px;
            animation: jdevCircleRevealPage 1.45s cubic-bezier(0.3, 0, 0.2, 1) forwards;
        }
    `;

    var styleEl = document.createElement('style');
    styleEl.id = 'jdev-page-transition-style';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    // ── 1) ENTRANCE: Jalankan animasi lingkaran membesar di halaman non-index (about, services, dsb) ──
    var currentPath = window.location.pathname.replace(/\\/g, '/');
    var currentFile = currentPath.substring(currentPath.lastIndexOf('/') + 1) || 'index.html';
    var isIndexPage = (currentFile === '' || currentFile === 'index.html');

    if (!isIndexPage) {
        function triggerEntrance() {
            var ring = document.createElement('div');
            ring.className = 'jdev-page-reveal-ring';
            document.body.appendChild(ring);
            setTimeout(function () {
                ring.remove();
            }, 1500);
        }

        if (document.body) {
            triggerEntrance();
        } else {
            document.addEventListener('DOMContentLoaded', triggerEntrance);
        }
    }

    // ── 2) EXIT: Tangkap klik link navigasi internal (index <-> about <-> services, dsb) ──
    var isTransitioning = false;

    function handleLinkClick(e) {
        if (isTransitioning) return;

        // Cari elemen <a> terdekat
        var anchor = e.target.closest('a');
        if (!anchor) return;

        var href = anchor.getAttribute('href');
        if (!href) return;

        // Abaikan link eksternal, anchor hash murni, tel, mailto, target blank
        if (
            href.startsWith('#') ||
            href.startsWith('mailto:') ||
            href.startsWith('tel:') ||
            href.startsWith('javascript:') ||
            anchor.getAttribute('target') === '_blank' ||
            e.ctrlKey || e.metaKey || e.shiftKey || e.altKey
        ) {
            return;
        }

        // Pisahkan hash dan query parameter untuk cek file tujuan
        var cleanHref = href.split('#')[0].split('?')[0];
        if (!cleanHref) return; // hanya hash murni

        var targetFile = cleanHref.substring(cleanHref.lastIndexOf('/') + 1) || 'index.html';

        // Jika target adalah file yang sama (misal loncat ke section di halaman yang sama), biarkan scroll biasa
        if (targetFile && currentFile === targetFile) {
            return;
        }

        // Cek apakah link mengarah ke halaman internal HTML
        var isTargetInternal = (
            cleanHref.includes('index.html') ||
            cleanHref.includes('about.html') ||
            cleanHref.includes('services.html') ||
            cleanHref.includes('portofolio.html') ||
            cleanHref.includes('kontak.html') ||
            cleanHref === '/' ||
            cleanHref === './' ||
            (cleanHref.endsWith('.html') && !cleanHref.startsWith('http://') && !cleanHref.startsWith('https://'))
        );

        if (!isTargetInternal) return;

        // Cegah perpindahan langsung
        e.preventDefault();
        isTransitioning = true;

        // Pasang penanda di sessionStorage agar halaman tujuan tahu ini berasal dari transisi lingkaran
        try {
            sessionStorage.setItem('jogdev_circle_transition', 'true');
        } catch (err) {}

        // Jalankan animasi lingkaran menutup ke titik tengah
        var exitRing = document.createElement('div');
        exitRing.className = 'jdev-exit-ring';
        document.body.appendChild(exitRing);

        // Setelah lingkaran selesai menutup ke titik tengah (500ms), lakukan navigasi
        setTimeout(function () {
            window.location.href = anchor.href;
        }, 520);
    }

    document.addEventListener('click', handleLinkClick, true);
})();
