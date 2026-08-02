/*
 * Jog.DEV - Custom Page Loader (Splash Screen)
 * --------------------------------------------
 * Menampilkan splash loading premium (dark navy + cyan neon) saat user
 * pertama kali membuka website.** Hanya berlaku untuk halaman INDEX
 * dan tampil ulang setiap refresh.
 *
 * Script ini disisipkan tepat setelah <body> supaya overlay muncul sebelum
 * konten besar dirender (menghindari flash-of-content).
 *
 * Desain:
 *  - Logo "Jog.DEV" besar, berwarna ABU-ABU, lalu terisi Warna Asli
 *    dari kiri ke kanan saat loading.
 *  - Icon loading lingkaran yang diperkecil.
 *  - Tulisan "Memuat" di SEBELAH icon loading (bukan di bawah).
 *
 * Hanya digunakan di halaman INDEX — menampilkan ulang SETIAP refresh
 * (tanpa penanda sessionStorage).
 */
(function () {
    'use strict';

    // ── 1) Suntikkan CSS loader ──
    var css =
        '#jdev-loader{' +
            'position:fixed;inset:0;z-index:99999;' +
            'background:#0b0f1a;' +
            'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
            'overflow:hidden;' +
            'transition:opacity .55s ease,visibility .55s ease;' +
            'opacity:1;visibility:visible;' +
        '}' +
        '#jdev-loader.done{' +
            'opacity:0;visibility:hidden;' +
        '}' +
        // glow latar halus
        '#jdev-loader::before{' +
            'content:"";position:absolute;inset:auto;' +
            'width:560px;height:560px;' +
            'background:radial-gradient(circle,rgba(20,241,217,.10),rgba(37,99,235,.06) 45%,rgba(0,0,0,0) 70%);' +
            'border-radius:50%;' +
            'animation:jdevPulse 2.4s ease-in-out infinite;' +
        '}' +
        // Logo besar, warna abu-abu sebagai tampilan dasar
        '#jdev-logo{' +
            'position:relative;z-index:2;' +
            'font-family:inherit;font-weight:800;' +
            'font-size:5rem;line-height:1.25;letter-spacing:.03em;' +
            'color:#9aa4b5;' +
            'white-space:nowrap;' +
            'animation:jdevLogoIn 1s cubic-bezier(.22,1,.36,1) both;' +
        '}' +
        // Lapisan warna asli (gradient) yang terisi dari KIRI ke KANAN
        '#jdev-logo::before{' +
            'content:"Jog.DEV.";position:absolute;left:0;top:0;' +
            'height:100%;white-space:nowrap;overflow:hidden;' +
            'background:linear-gradient(90deg,#14f1d9 0%,#0ea5e9 55%,#14f1d9 100%);' +
            '-webkit-background-clip:text;background-clip:text;' +
            '-webkit-text-fill-color:transparent;color:transparent;' +
            'animation:jdevFill 1.6s cubic-bezier(.4,0,.2,1) forwards;' +
            'filter:drop-shadow(0 0 18px rgba(20,241,217,.35));' +
        '}' +
        // Baris loading: icon lingkaran (kecil) + tulisan "Memuat" di sampingnya
        '#jdev-loading{' +
            'position:relative;z-index:2;margin-top:30px;' +
            'display:flex;align-items:center;gap:12px;' +
            'opacity:0;' +
            'animation:jdevShow .6s .5s ease both;' +
        '}' +
        // Icon loading lingkaran — diperkecil
        '#jdev-spinner{' +
            'width:22px;height:22px;border-radius:50%;flex:none;' +
            'border:3px solid rgba(20,241,217,.18);' +
            'border-top-color:#14f1d9;border-right-color:#2563EB;' +
            'animation:jdevSpin .8s linear infinite;' +
            'box-shadow:0 0 14px rgba(20,241,217,.30);' +
        '}' +
        // Tulisan "Memuat" di sebelah icon
        '#jdev-tag{' +
            'font-size:.82rem;font-weight:600;letter-spacing:.25em;text-transform:uppercase;' +
            'color:rgba(148,163,184,.75);' +
        '}' +
        // keyframes
        '@keyframes jdevSpin{to{transform:rotate(360deg);}}' +
        '@keyframes jdevPulse{' +
            '0%,100%{transform:scale(.92);opacity:.7;}' +
            '50%{transform:scale(1.08);opacity:1;}' +
        '}' +
        '@keyframes jdevLogoIn{' +
            '0%{opacity:0;transform:scale(.9) translateY(8px);filter:blur(8px);}' +
            '100%{opacity:1;transform:scale(1) translateY(0);filter:blur(0);}' +
        '}' +
        // Efek pengisian warna asli dari kiri (width 0) ke kanan (width 100%)
        '@keyframes jdevFill{' +
            '0%{width:0;}' +
            '100%{width:100%;}' +
        '}' +
        '@keyframes jdevShow{' +
            '0%{opacity:0;transform:translateY(6px);}' +
            '100%{opacity:1;transform:translateY(0);}' +
        '}';

    try {
        var style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    } catch (e) { /* abaikan */ }

    // ── 2) Buat overlay loader ──
    var loader = document.createElement('div');
    loader.id = 'jdev-loader';
    loader.innerHTML =
        '<div id="jdev-logo">Jog.DEV.</div>' +
        '<div id="jdev-loading">' +
            '<div id="jdev-spinner"></div>' +
            '<div id="jdev-tag">Memuat</div>' +
        '</div>';

    try {
        document.body.appendChild(loader);
    } catch (e) { return; }

    function hide() {
        if (loader.classList.contains('done')) return;
        loader.classList.add('done');
        setTimeout(function () {
            if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
        }, 600);
    }

    // Tampilkan setidaknya beberapa saat agar smooth, lalu fade out.
    var minDuration = 1800; // ms (cukup untuk animasi pengisian warna logo)
    setTimeout(hide, minDuration);
})();
