(function () {
    'use strict';

    var isQuickReveal = false;
    try {
        if (sessionStorage.getItem('jogdev_circle_transition') === 'true') {
            isQuickReveal = true;
            sessionStorage.removeItem('jogdev_circle_transition');
        }
    } catch (e) {}

    var css = `
        #jdev-loader {
            position: fixed; inset: 0; z-index: 99999;
            background: #0b0f1a;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            overflow: hidden;
            pointer-events: auto;
        }
        #jdev-decor { position: absolute; inset: 0; z-index: 1; pointer-events: none; transition: opacity 0.35s ease; }
        .decor-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(20,241,217,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(20,241,217,0.03) 1px, transparent 1px); background-size: 50px 50px; }
        .decor-dot { position: absolute; background: rgba(20,241,217,0.05); border-radius: 50%; filter: blur(40px); }
        
        #jdev-center-content {
            position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center;
            transition: opacity 0.35s ease, transform 0.35s ease;
        }
        #jdev-center-content.fade-out {
            opacity: 0;
            transform: scale(0.92);
        }

        #jdev-logo {
            position: relative; font-family: inherit; font-weight: 800;
            font-size: clamp(3.2rem, 9vw, 5rem); line-height: 1.2;
            color: #475569; white-space: nowrap;
        }
        #jdev-logo::before {
            content: "Jog.DEV."; position: absolute; left: 0; top: 0; height: 100%; white-space: nowrap; overflow: hidden;
            background: linear-gradient(90deg, #14f1d9 0%, #0ea5e9 55%, #14f1d9 100%);
            -webkit-background-clip: text; background-clip: text;
            -webkit-text-fill-color: transparent; color: transparent;
            animation: jdevFill 1.3s ease-in-out forwards;
        }
        #terminal-box { 
            margin-top: 18px; width: 100%; 
            text-align: center; font-family: monospace; font-size: 0.85rem; color: #64748b; 
        }
        @keyframes jdevFill { 0% { width: 0; } 100% { width: 100%; } }

        /* Animasi Lingkaran Membesar (Expanding Circle Reveal) */
        @keyframes jdevCircleReveal {
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
        .jdev-reveal-ring {
            position: absolute;
            top: 50%;
            left: 50%;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            border: 2.5px solid #14f1d9;
            pointer-events: none;
            z-index: 10;
            animation: jdevCircleReveal 1.6s cubic-bezier(0.3, 0, 0.2, 1) forwards;
        }
    `;

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var loader = document.createElement('div');
    loader.id = 'jdev-loader';
    loader.innerHTML = `
        <div id="jdev-decor">
            <div class="decor-grid"></div>
            <div class="decor-dot" style="width:200px; height:200px; top:10%; left:10%;"></div>
            <div class="decor-dot" style="width:150px; height:150px; bottom:10%; right:10%;"></div>
        </div>
        <div id="jdev-center-content">
            <div id="jdev-logo">Jog.DEV.</div>
            <div id="terminal-box"><div id="terminal-output">> initializing...</div></div>
        </div>
    `;
    document.body.appendChild(loader);

    // Jika user datang dari navigasi transisi antar-halaman, langsung jalankan animasi lingkaran membesar
    if (isQuickReveal) {
        var centerEl = document.getElementById('jdev-center-content');
        var decorEl = document.getElementById('jdev-decor');
        if (centerEl) centerEl.style.display = 'none';
        if (decorEl) decorEl.style.display = 'none';
        loader.style.background = 'transparent';
        loader.style.pointerEvents = 'none';

        var quickRing = document.createElement('div');
        quickRing.className = 'jdev-reveal-ring';
        loader.appendChild(quickRing);

        setTimeout(function () {
            loader.remove();
        }, 1650);
        return;
    }

    // Mode normal (Fresh / Refresh): Tampilkan Splash Logo & Terminal lalu lingkaran membesar
    // Fase 1: Terminal status ready
    setTimeout(function () {
        var term = document.getElementById('terminal-output');
        if (term) term.textContent = "> ready.";

        // Fase 2: Selesai loading -> fade out logo & teks di tengah
        setTimeout(function () {
            var center = document.getElementById('jdev-center-content');
            var decor = document.getElementById('jdev-decor');
            if (center) center.classList.add('fade-out');
            if (decor) decor.style.opacity = '0';

            // Fase 3: Munculkan lingkaran dari titik dan membesar perlahan memenuhi layar
            setTimeout(function () {
                // Hapus background solid loader agar lubang lingkaran tembus ke halaman index
                loader.style.background = 'transparent';
                loader.style.pointerEvents = 'none';

                var ring = document.createElement('div');
                ring.className = 'jdev-reveal-ring';
                loader.appendChild(ring);

                // Fase 4: Setelah lingkaran memenuhi seluruh layar, bersihkan loader dari DOM
                setTimeout(function () {
                    loader.remove();
                }, 1650);
            }, 300);
        }, 800);
    }, 1200);
})();
