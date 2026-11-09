"use strict";

/* =====================================================================
   Données
   ===================================================================== */

const IMG_DIR = 'static/img/';

// Joueurs de "Starting rolls", dans l'ordre horaire (= ordre de lancer).
// `area` = position dans la grille 2x2 (ligne / colonne).
const PLAYERS = [
    { id: 'red', label: 'Rouge', area: '1 / 1', img: 'liliana.jpg' },        // haut-gauche
    { id: 'blue', label: 'Bleu', area: '1 / 2', img: 'jace-beleren.jpg' },    // haut-droite
    { id: 'yellow', label: 'Jaune', area: '2 / 2', img: 'ajani-1920.jpg' },   // bas-droite
    { id: 'green', label: 'Vert', area: '2 / 1', img: 'garruk.jpg' },         // bas-gauche
];

/* --- Formules Shard maths --- */
const line = (label, value, extra = '') =>
    `<div class="line">${label} : <strong>${value}</strong>${extra ? ` ${extra}` : ''}</div>`;

// Créatures 2/2 (ou autre) qui reçoivent un anthem +X/+X ; `bonusOf` calcule X.
const anthem = (basePower, baseToughness, bonusOf) => (ctx) => {
    const bonus = bonusOf(ctx);
    const power = basePower + bonus;
    const toughness = baseToughness + bonus;
    return [
        line('Nombre de créatures', ctx.shards),
        line('Anthem', `+${bonus}/+${bonus}`),
        line('Power et Toughness', `${power}/${toughness}`),
        line('Total de dégâts potentiels', ctx.shards * power),
    ];
};

// Chaque shard donne une instance de "pioche une carte" ; les instances se cumulent :
// chaque créature qui connecte fait piocher `shards` cartes.
const drawOnHit = (basePower) => ({ shards }) => [
    line('Draw par créature qui connecte', shards),
    line('Total draw potentiel', shards * shards),
    line('Total de dégâts potentiels', basePower * shards),
];

// Le fichier image est `${key}.jpg` dans IMG_DIR.
const CREATURES = [
    { key: 'soltari-champion', name: 'Soltari Champion', compute: anthem(2, 2, ({ shards }) => shards) },
    { key: 'ultramarines-honour-guard', name: 'Ultramarines Honour Guard', compute: anthem(2, 2, ({ shards }) => shards) },
    { key: 'skyhunter-strike-force', name: 'Skyhunter Strike Force', compute: anthem(2, 2, ({ shards, opponents }) => shards * opponents) },
    { key: 'curiosity-crafter', name: 'Curiosity Crafter', compute: drawOnHit(2) },
    { key: 'enduring-curiosity', name: 'Enduring Curiosity', compute: drawOnHit(2) },
    {
        key: 'dream-trawler', name: 'Dream Trawler',
        compute: ({ shards }) => {
            // 1 carte pigée par Dream Trawler qui attaque, chaque carte = +1/+0 à CHAQUE Dream Trawler
            const cardsDrawn = shards;
            const power = 3 + cardsDrawn;
            const toughness = 5;
            // Lifelink : gain de vie = power si la créature connecte
            return [
                line('Stats par Dream Trawler', `${power}/${toughness}`),
                line('Cartes pigées', cardsDrawn),
                line('Total de vie gagné (si tout connecte)', shards * power),
            ];
        },
    },
    {
        key: 'nesting-dovehawk', name: 'Nesting Dovehawk',
        compute: ({ shards }) => {
            const bonus = shards;
            const power = 2 + bonus;
            const toughness = 2 + bonus;
            return [
                line('Nombre de populates possibles', shards),
                line('Nombre total de +1/+1 gagnés', bonus),
                line('Power et Toughness', `${power}/${toughness}`),
                line('Total de dégâts potentiels', shards * power),
            ];
        },
    },
    {
        key: 'hero-of-bladehold', name: 'Hero of Bladehold',
        compute: ({ shards }) => {
            const nbHeroes = shards;
            const nbTokens = nbHeroes * 2;
            // Battle cry : +1/+0 aux AUTRES créatures attaquantes
            const heroPower = 3 + Math.max(0, nbHeroes - 1);
            const tokenPower = 1 + nbHeroes;
            const dmgHeroes = nbHeroes * heroPower;
            const dmgTokens = nbTokens * tokenPower;
            return [
                line('Héros de Bladehold', nbHeroes, `(${heroPower}/4)`),
                line('Tokens créés', nbTokens, `(${tokenPower}/1)`),
                line('Total dégâts — Héros', dmgHeroes),
                line('Total dégâts — Tokens', dmgTokens),
                line('Total de dégâts potentiels', dmgHeroes + dmgTokens),
            ];
        },
    },
];

/* =====================================================================
   Utils
   ===================================================================== */

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
const randInt = (max) => Math.floor(Math.random() * max) + 1;
const d6 = () => randInt(6);

// Rejoue une animation CSS liée à une classe.
function restartAnimation(el, className) {
    el.classList.remove(className);
    void el.offsetWidth; // force reflow
    el.classList.add(className);
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

/* =====================================================================
   Service worker
   ===================================================================== */

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(console.error);
    });
}

/* =====================================================================
   Routeur hash (1-pager)
   ===================================================================== */

(function () {
    const views = Array.from(document.querySelectorAll('.view'));
    const dropdown = document.querySelector('details[name="lazy-maths"]');

    function current() {
        const h = (location.hash || '#home').slice(1);
        return views.some(v => v.dataset.view === h) ? h : 'home';
    }
    function show(viewName) {
        for (const v of views) v.hidden = (v.dataset.view !== viewName);
        const active = views.find(v => v.dataset.view === viewName);
        document.body.classList.toggle('immersive', active.hasAttribute('data-immersive'));
        if (dropdown) dropdown.open = false; // page d’accueil toujours propre
        window.scrollTo(0, 0);
    }

    addEventListener('hashchange', () => show(current()));
    show(current());
})();

/* =====================================================================
   Starting rolls + Tie-breaker Commander
   ===================================================================== */

(function () {
    const btn = $('btn-lancer-starting');
    const grid = $('roll-grid');
    const overlay = $('dice-overlay');
    if (!btn || !grid || !overlay) return;

    // Anim quad (avec upright au final) → doit matcher @keyframes fallBounceQuad
    const DUR_MS = 1300;
    const FACE_CHANGES_MS = [0.62, 0.86, 0.965].map(t => Math.floor(DUR_MS * t)); // impacts
    const FINAL_MS = Math.floor(DUR_MS * 0.995);
    const HOLD_ON_OVERLAY_MS = 300; // pause lisibilité
    const PAUSE_BETWEEN_CELLS_MS = 500;
    const DICE_GAP = 10;            // doit matcher .dice-row { gap }

    const BONUS_MSG = { '1-1': 'T’a tu callé ton snake eyes ?', '6-6': 'Fuck yeah!!' };

    // Construction des cases (ordre horaire)
    const cells = PLAYERS.map(p => {
        const cell = el('div', `roll-cell roll-${p.id}`);
        cell.id = `cell-${p.id}`;
        cell.style.gridArea = p.area;
        // URL absolue : un url() relatif dans une variable CSS serait résolu depuis styles.css
        cell.style.setProperty('--cell-bg', `url("${new URL(IMG_DIR + p.img, document.baseURI).href}")`);
        cell.setAttribute('aria-live', 'polite');
        cell.setAttribute('aria-label', p.label);

        const inner = el('div', 'cell-inner');
        const caption = el('div', 'cell-caption');
        caption.append(el('div', 'total'));
        inner.append(el('div', 'dice-slot'), caption);
        cell.append(inner);
        grid.append(cell);
        return cell;
    });

    // null = pas de tie-break en cours ; sinon liste des cases ex æquo à relancer
    let contenders = null;

    btn.addEventListener('click', async () => {
        btn.disabled = true;

        const rolling = contenders ?? cells;
        if (!contenders) rolling.forEach(clearCell);
        clearHighlights();

        const totals = await rollSequence(rolling);
        const best = Math.max(...totals);
        const leaders = rolling.filter((_, i) => totals[i] === best);

        if (leaders.length > 1) {
            contenders = leaders;
            btn.textContent = 'Break the tie';
            leaders.forEach(c => c.classList.add('tie'));
        } else {
            contenders = null;
            btn.textContent = 'Lancer';
            celebrateWinner(leaders[0]);
        }

        btn.disabled = false;
    });

    // Lance séquentiellement chaque case ; retourne les totaux (même ordre)
    async function rollSequence(cellsToRoll) {
        const totals = [];
        for (const cell of cellsToRoll) {
            clearCell(cell);
            totals.push(await animateDiceIntoCell(cell));
            await sleep(PAUSE_BETWEEN_CELLS_MS);
        }
        return totals;
    }

    // Animation d’une case (retourne le total)
    async function animateDiceIntoCell(cell) {
        const slot = cell.querySelector('.dice-slot');

        // Taille des dés proportionnelle à la case (téléphone → tablette)
        const cellRect = cell.getBoundingClientRect();
        const size = Math.round(clamp(Math.min(cellRect.width, cellRect.height) * 0.2, 40, 88));
        const half = size / 2;

        // Point d'atterrissage = centre de la zone de contenu du slot (là où les dés seront posés)
        const r = slot.getBoundingClientRect();
        const cs = getComputedStyle(slot);
        const centerX = (r.left + parseFloat(cs.paddingLeft) + r.right - parseFloat(cs.paddingRight)) / 2;
        const centerY = (r.top + parseFloat(cs.paddingTop) + r.bottom - parseFloat(cs.paddingBottom)) / 2;
        const offset = half + DICE_GAP / 2;

        overlay.innerHTML = '';
        const dice = [-offset, +offset].map(dx => {
            const die = el('div', 'die', String(d6()));
            die.style.setProperty('--die-size', `${size}px`);
            die.style.setProperty('--dur', `${DUR_MS}ms`);
            die.style.setProperty('--hitY', `${centerY}px`);
            die.style.setProperty('--dieHalf', `${half}px`);
            die.style.left = `${centerX + dx - half}px`;
            die.classList.add('fall-bounce-quad');
            overlay.append(die);
            return die;
        });

        // Changement de chiffres aux impacts, puis faces finales + total
        const finalFaces = [d6(), d6()];
        const timers = FACE_CHANGES_MS.map(ms => setTimeout(() => setFaces(dice), ms));
        timers.push(setTimeout(() => {
            setFaces(dice, finalFaces);
            showTotalAndMessage(cell, finalFaces);
        }, FINAL_MS));

        await sleep(DUR_MS + HOLD_ON_OVERLAY_MS + 20);
        timers.forEach(clearTimeout);

        // Déposer les dés figés dans la case (côte à côte)
        const row = el('div', 'dice-row');
        for (const die of dice) {
            die.classList.remove('fall-bounce-quad', 'face-pop');
            die.style.left = '';
            row.append(die);
        }
        slot.replaceChildren(row);

        return finalFaces[0] + finalFaces[1];
    }

    // Affiche `faces` (ou des valeurs aléatoires) avec un petit "pop"
    function setFaces(diceEls, faces = diceEls.map(d6)) {
        diceEls.forEach((die, i) => {
            die.textContent = String(faces[i]);
            restartAnimation(die, 'face-pop');
        });
    }

    function showTotalAndMessage(cell, faces) {
        const totalEl = cell.querySelector('.total');
        totalEl.textContent = String(faces[0] + faces[1]);

        const msg = BONUS_MSG[`${faces[0]}-${faces[1]}`];
        if (msg) totalEl.before(el('div', 'bonus-msg', msg));
    }

    function clearCell(cell) {
        cell.querySelector('.dice-slot').replaceChildren();
        cell.querySelector('.total').textContent = '';
        cell.querySelector('.bonus-msg')?.remove();
    }

    function clearHighlights() {
        for (const c of cells) {
            c.classList.remove('tie', 'winner');
            c.querySelector('.fireworks')?.remove();
        }
    }

    // --- Célébration du gagnant ---
    function celebrateWinner(cell) {
        clearHighlights();
        cell.classList.add('winner');

        const host = cell.querySelector('.cell-inner');
        const fw = el('div', 'fireworks');
        host.append(fw);

        const { width, height } = host.getBoundingClientRect();
        const reach = Math.min(width, height); // la gerbe s'adapte à la taille de la case
        const count = 28 + Math.floor(Math.random() * 10);

        for (let i = 0; i < count; i++) {
            const spark = el('div', 'spark');
            const angle = Math.random() * 2 * Math.PI;
            const distance = reach * (0.25 + Math.random() * 0.4);
            spark.style.left = `${width / 2}px`;
            spark.style.top = `${height / 2}px`;
            spark.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
            spark.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
            fw.append(spark);
        }

        setTimeout(() => fw.remove(), 1200);
    }
})();

/* =====================================================================
   Partie Commander : vie, dégâts de commandant, poison, taxe
   ===================================================================== */

(function () {
    const grid = $('life-grid');
    const menu = $('life-menu');
    const btnMenu = $('life-menu-btn');
    if (!grid || !menu || !btnMenu) return;

    const STORAGE_KEY = 'mtg-commander-state';
    const START_LIFE = 40;
    const LETHAL = { poison: 10, cmd: 21 };
    const TAX_STEP = 2;
    const HOLD_STEP = 10;
    const HOLD_DELAY_MS = 450;
    const HOLD_REPEAT_MS = 500;
    const DELTA_VISIBLE_MS = 1600;

    const labelOf = Object.fromEntries(PLAYERS.map(p => [p.id, p.label]));
    const opponentsOf = (id) => PLAYERS.filter(o => o.id !== id);

    const freshState = () => Object.fromEntries(PLAYERS.map(p => [p.id, {
        life: START_LIFE,
        poison: 0,
        tax: 0,
        cmd: Object.fromEntries(opponentsOf(p.id).map(o => [o.id, 0])),
    }]));

    function load() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return saved && PLAYERS.every(p => saved[p.id]) ? saved : null;
        } catch {
            return null;
        }
    }

    let state = load() ?? freshState();
    const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    // Clés de compteur : 'poison', 'tax', ou 'cmd:<id adversaire>'
    const valueOf = (s, key) => key.startsWith('cmd:') ? s.cmd[key.slice(4)] : s[key];
    const isLethal = (key, v) => key.startsWith('cmd:') ? v >= LETHAL.cmd : key === 'poison' && v >= LETHAL.poison;
    const format = (key, v) => key === 'tax' ? `+${v}` : String(v);
    const isOut = (s) => s.life <= 0 || s.poison >= LETHAL.poison || Object.values(s.cmd).some(v => v >= LETHAL.cmd);

    // refs[id] = { panel, life, deltaEl, delta, deltaTimer, drawer, bound: { key: [elements] } }
    const refs = {};

    for (const p of PLAYERS) {
        const panel = el('div', `life-panel player-${p.id}`);
        panel.style.gridArea = p.area;
        panel.style.setProperty('--cell-bg', `url("${new URL(IMG_DIR + p.img, document.baseURI).href}")`);
        // La rangée du haut fait face aux joueurs assis de l'autre côté de la table
        if (p.area.startsWith('1')) panel.classList.add('life-panel--flipped');

        const r = { panel, delta: 0, deltaTimer: null, bound: {} };
        const bind = (key, node) => (r.bound[key] ??= []).push(node);

        const minus = el('button', 'btn life-tap life-tap--minus', '−');
        const plus = el('button', 'btn life-tap life-tap--plus', '+');
        minus.type = plus.type = 'button';
        minus.setAttribute('aria-label', `${p.label} : perdre 1 point de vie`);
        plus.setAttribute('aria-label', `${p.label} : gagner 1 point de vie`);
        bindHold(minus, p.id, -1);
        bindHold(plus, p.id, +1);

        r.life = el('div', 'life-value');
        r.life.setAttribute('aria-live', 'polite');
        r.deltaEl = el('div', 'life-delta');

        // Barre de résumé : dégâts de commandant reçus de chaque adversaire, poison, taxe
        const counters = el('button', 'btn life-counters');
        counters.type = 'button';
        counters.setAttribute('aria-label', `${p.label} : compteurs`);
        counters.append(el('span', 'chip-icon', '⚔'));
        for (const o of opponentsOf(p.id)) {
            const chip = el('span', `chip chip--cmd player-${o.id}`);
            bind(`cmd:${o.id}`, chip);
            counters.append(chip);
        }
        for (const [key, icon] of [['poison', '☠'], ['tax', 'Taxe']]) {
            const chip = el('span', 'chip');
            const value = el('span');
            bind(key, value);
            chip.append(el('span', 'chip-icon', icon), value);
            counters.append(chip);
        }

        r.drawer = buildDrawer(p, bind);

        panel.append(
            minus, plus, r.life, r.deltaEl,
            el('div', 'life-out', 'Éliminé'), counters, r.drawer,
        );

        panel.addEventListener('click', (e) => {
            const step = e.target.closest('[data-key]');
            if (step) changeCounter(p.id, step.dataset.key, Number(step.dataset.step));
            else if (e.target.closest('[data-close-drawer]')) r.drawer.hidden = true;
            else if (e.target.closest('.life-counters')) r.drawer.hidden = false;
        });

        refs[p.id] = r;
        grid.append(panel);
    }

    function buildDrawer(p, bind) {
        const drawer = el('div', 'life-drawer');
        drawer.hidden = true;

        const header = el('div', 'life-drawer__header');
        const close = el('button', 'btn ctb', 'OK');
        close.type = 'button';
        close.dataset.closeDrawer = '';
        header.append(el('span', 'life-drawer__title', p.label), close);
        drawer.append(header);

        const rows = [
            ...opponentsOf(p.id).map(o => ({ key: `cmd:${o.id}`, label: `Cmd. ${o.label}`, step: 1, dot: o.id })),
            { key: 'poison', label: '☠ Poison', step: 1 },
            { key: 'tax', label: 'Taxe', step: TAX_STEP },
        ];
        for (const row of rows) {
            const line = el('div', 'counter-row');
            const label = el('span', 'counter-row__label', row.label);
            if (row.dot) label.prepend(el('span', `dot player-${row.dot}`));
            const value = el('span', 'counter-row__value');
            bind(row.key, value);
            const [dec, inc] = [-row.step, row.step].map(step => {
                const b = el('button', 'btn counter-step', step < 0 ? '−' : '+');
                b.type = 'button';
                b.dataset.key = row.key;
                b.dataset.step = String(step);
                b.setAttribute('aria-label', `${row.label} ${step < 0 ? '−' : '+'}${row.step}`);
                return b;
            });
            line.append(label, dec, value, inc);
            drawer.append(line);
        }
        drawer.append(el('p', 'life-drawer__hint', 'Les dégâts de commandant retirent aussi la vie.'));
        return drawer;
    }

    // Tap = ±1 ; maintenir = ±10 répété
    function bindHold(btn, id, sign) {
        let holdTimer = null;
        let repeatTimer = null;
        let held = false;
        const stop = () => {
            clearTimeout(holdTimer);
            clearInterval(repeatTimer);
        };
        btn.addEventListener('pointerdown', () => {
            held = false;
            holdTimer = setTimeout(() => {
                held = true;
                changeLife(id, sign * HOLD_STEP);
                repeatTimer = setInterval(() => changeLife(id, sign * HOLD_STEP), HOLD_REPEAT_MS);
            }, HOLD_DELAY_MS);
        });
        for (const type of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(type, stop);
        btn.addEventListener('contextmenu', (e) => e.preventDefault());
        btn.addEventListener('click', () => {
            if (held) held = false;
            else changeLife(id, sign);
        });
    }

    function changeLife(id, delta) {
        state[id].life += delta;
        showDelta(id, delta);
        commit(id);
    }

    function changeCounter(id, key, step) {
        const s = state[id];
        if (key.startsWith('cmd:')) {
            const from = key.slice(4);
            const next = Math.max(0, s.cmd[from] + step);
            const diff = next - s.cmd[from];
            if (!diff) return;
            s.cmd[from] = next;
            changeLife(id, -diff);
        } else {
            s[key] = Math.max(0, s[key] + step);
            commit(id);
        }
    }

    function commit(id) {
        save();
        render(id);
        navigator.vibrate?.(8);
    }

    function showDelta(id, delta) {
        const r = refs[id];
        r.delta += delta;
        r.deltaEl.textContent = r.delta > 0 ? `+${r.delta}` : r.delta < 0 ? `−${-r.delta}` : '';
        r.deltaEl.classList.toggle('is-gain', r.delta > 0);
        clearTimeout(r.deltaTimer);
        r.deltaTimer = setTimeout(() => {
            r.delta = 0;
            r.deltaEl.textContent = '';
        }, DELTA_VISIBLE_MS);
    }

    function render(id) {
        const s = state[id];
        const r = refs[id];
        r.life.textContent = String(s.life);
        for (const [key, nodes] of Object.entries(r.bound)) {
            const v = valueOf(s, key);
            for (const node of nodes) {
                node.textContent = format(key, v);
                node.classList.toggle('is-lethal', isLethal(key, v));
            }
        }
        r.panel.classList.toggle('is-out', isOut(s));
    }

    PLAYERS.forEach(p => render(p.id));

    // --- Menu de partie ---
    const setMenu = (open) => { menu.hidden = !open; };
    btnMenu.addEventListener('click', () => setMenu(true));
    $('btn-life-resume').addEventListener('click', () => setMenu(false));
    menu.addEventListener('click', (e) => {
        if (e.target === menu || e.target.closest('a')) setMenu(false);
    });
    $('btn-life-reset').addEventListener('click', () => {
        if (!confirm('Recommencer la partie ? Tous les compteurs seront remis à zéro.')) return;
        state = freshState();
        save();
        for (const p of PLAYERS) {
            refs[p.id].drawer.hidden = true;
            render(p.id);
        }
        setMenu(false);
    });

    // --- Garder l'écran allumé pendant la partie ---
    let wakeLock = null;
    const onCommanderView = () => location.hash === '#commander' && document.visibilityState === 'visible';
    async function syncWakeLock() {
        try {
            if (onCommanderView() && !wakeLock && 'wakeLock' in navigator) {
                wakeLock = await navigator.wakeLock.request('screen');
                wakeLock.addEventListener('release', () => { wakeLock = null; });
            } else if (!onCommanderView() && wakeLock) {
                await wakeLock.release();
            }
        } catch {
            wakeLock = null;
        }
    }
    addEventListener('hashchange', syncWakeLock);
    document.addEventListener('visibilitychange', syncWakeLock);
    syncWakeLock();
})();

/* =====================================================================
   Any number random
   ===================================================================== */

(function () {
    const inputNum = $('max-number');
    const inputRange = $('max-number-slider');
    const btnRoll = $('btn-roll-any');
    const resultEl = $('any-roll-result');
    if (!inputNum || !inputRange || !btnRoll || !resultEl) return;

    const MIN = Number(inputRange.min);
    const MAX = Number(inputRange.max);
    const read = (input) => clamp(parseInt(input.value, 10) || MIN, MIN, MAX);
    const setBoth = (n) => { inputNum.value = inputRange.value = String(n); };

    // Pendant la saisie on ne réécrit pas le champ (sinon impossible de taper "12") ;
    // on le borne quand l'utilisateur a fini (change / blur).
    inputNum.addEventListener('input', () => {
        const n = parseInt(inputNum.value, 10);
        if (n >= MIN && n <= MAX) inputRange.value = String(n);
    });
    inputNum.addEventListener('change', () => setBoth(read(inputNum)));
    inputRange.addEventListener('input', () => setBoth(read(inputRange)));
    setBoth(read(inputNum));

    btnRoll.addEventListener('click', () => {
        const max = read(inputNum);
        setBoth(max);
        resultEl.textContent = String(randInt(max));
        restartAnimation(resultEl, 'pop');
    });
})();

/* =====================================================================
   Shard maths : sheet de sélection + calcul
   ===================================================================== */

(function () {
    const form = $('form-shard-maths');
    const btnOpen = $('open-creature-sheet');
    const sheet = $('creature-sheet');
    const grid = $('creature-grid');
    const inputHidden = $('creature');
    const inputDisplay = $('creature-display');
    const resultBox = $('shard-result');
    if (!form || !btnOpen || !sheet || !grid || !inputHidden || !inputDisplay || !resultBox) return;

    const byKey = new Map(CREATURES.map(c => [c.key, c]));

    // --- Options des <select> à partir de data-min / data-max ---
    for (const select of form.querySelectorAll('select[data-min][data-max]')) {
        const placeholder = new Option('— Choisir —', '', true, true);
        placeholder.disabled = true;
        select.add(placeholder);
        for (let n = Number(select.dataset.min); n <= Number(select.dataset.max); n++) {
            select.add(new Option(String(n), String(n)));
        }
    }

    // --- Cartes de créatures ---
    for (const c of CREATURES) {
        const card = el('button', 'creature-card');
        card.type = 'button';
        card.dataset.value = c.key;

        const imgBox = el('div', 'card-img');
        const img = el('img');
        img.src = `${IMG_DIR}${c.key}.jpg`;
        img.alt = '';
        img.loading = 'lazy';
        imgBox.append(img);

        card.append(imgBox, el('div', 'card-title', c.name));
        grid.append(card);
    }

    // --- Ouverture / fermeture du sheet ---
    const isOpen = () => sheet.classList.contains('open');
    function setOpen(open) {
        sheet.classList.toggle('open', open);
        sheet.setAttribute('aria-hidden', String(!open));
        // bloquer le scroll arrière-plan
        document.documentElement.style.overflow = document.body.style.overflow = open ? 'hidden' : '';
        if (open) {
            grid.querySelectorAll('.creature-card').forEach(card => {
                card.classList.toggle('selected', card.dataset.value === inputHidden.value);
            });
            (grid.querySelector('.selected') || sheet.querySelector('.sheet__close')).focus();
        } else {
            btnOpen.focus();
        }
    }

    btnOpen.addEventListener('click', () => setOpen(true));
    inputDisplay.addEventListener('click', () => setOpen(true));
    sheet.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen()) setOpen(false);
    });

    // Sélection d’une carte → renseigne le champ + ferme le sheet
    grid.addEventListener('click', (e) => {
        const card = e.target.closest('.creature-card');
        if (!card) return;
        const creature = byKey.get(card.dataset.value);
        inputHidden.value = creature.key;
        inputDisplay.value = creature.name;
        setOpen(false);
    });

    // --- Calcul ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const creature = byKey.get(inputHidden.value);
        const opponents = parseInt(form.elements.opponents.value, 10);
        const shards = parseInt(form.elements.shards.value, 10);

        const missing = [];
        if (!creature) missing.push('une créature');
        if (!opponents) missing.push('le nombre d’opponents');
        if (!shards) missing.push('le nombre de shards');
        if (missing.length) {
            alert(`Veuillez choisir ${missing.join(', ')}.`);
            return;
        }

        resultBox.innerHTML = creature.compute({ shards, opponents }).join('');
        restartAnimation(resultBox, 'show');
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
})();
