// navLock prevents IO from interfering while we programmatically scroll / animate
let navLock = false;
let lastNavTime = 0;
const NAV_LOCK_MS = 700; // reduced to improve responsiveness and fluidity

function lockNav() {
    navLock = true;
    lastNavTime = Date.now();
    setTimeout(() => navLock = false, NAV_LOCK_MS);
}

// Swipers
const heroSwiper = new Swiper('#hero-swiper', {
    loop: true,
    autoplay: {
        delay: 4500,
        disableOnInteraction: false
    },
    effect: 'fade',
    fadeEffect: {
        crossFade: true
    },
    pagination: {
        el: '#hero-swiper .swiper-pagination',
        clickable: true
    },
    navigation: {
        nextEl: '#hero-swiper .swiper-button-next',
        prevEl: '#hero-swiper .swiper-button-prev'
    },
    keyboard: {
        enabled: true
    }
});
const attivitaSwiper = new Swiper('#attivita .attivita-swiper', {
    loop: true,
    slidesPerView: 1,
    effect: 'fade',
    fadeEffect: {
        crossFade: true
    },
    pagination: {
        el: '#attivita .swiper-pagination',
        clickable: true
    },
    navigation: {
        nextEl: '#attivita .swiper-button-next',
        prevEl: '#attivita .swiper-button-prev'
    },
    keyboard: {
        enabled: true
    }
});

// Sections / nav
const sections = Array.from(document.querySelectorAll('.boxes-wrap .box'));
const navLinks = document.querySelectorAll('.nav-links a');
const progress = document.getElementById('progress');
let currentIndex = 0;

function setActiveIndex(i, updateView = true) {
    currentIndex = Math.max(0, Math.min(sections.length - 1, i));
    sections.forEach((s, idx) => s.classList.toggle('in-view', idx === currentIndex));
    navLinks.forEach(a => a.classList.toggle('active', a.dataset.target === sections[currentIndex].id));
    if (updateView) {
        lockNav();
        sections[currentIndex].scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
    progress.style.width = sections.length > 1 ? (currentIndex / (sections.length - 1)) * 100 + '%' : '0%';
}
setActiveIndex(0, false);

// Hovered swiper tracking (for keyboard control)
const swipers = [heroSwiper, attivitaSwiper];
let hoveredSwiper = null;
swipers.forEach(s => {
    if (s && s.el) {
        s.el.addEventListener('mouseenter', () => hoveredSwiper = s);
        s.el.addEventListener('mouseleave', () => hoveredSwiper = null);
    }
});

// Animate att-slide active
const attSlides = Array.from(document.querySelectorAll('#attivita .att-slide'));

function updateAttSlidesActive() {
    const sectionInView = document.getElementById('attivita').classList.contains('in-view');
    attSlides.forEach((el, idx) => el.classList.toggle('in-view', sectionInView && idx === attivitaSwiper.realIndex));
}
attivitaSwiper.on('slideChange', updateAttSlidesActive);
window.addEventListener('load', updateAttSlidesActive);

// Keyboard handling
window.addEventListener('keydown', (ev) => {
    const ae = document.activeElement;
    const tag = ae && ae.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (ae && ae.isContentEditable)) return;

    // prevent repeated ArrowUp/Down while navigation is locked or within debounce window
    if ((ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && (navLock || (Date.now() - lastNavTime) < NAV_LOCK_MS)) {
        ev.preventDefault();
        return;
    }

    if ((ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && window.scrollY <= 10) {
        if (ev.key === 'ArrowDown') {
            ev.preventDefault();
            setActiveIndex(0);
            return;
        }
    }

    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        lockNav();
        (ev.key === 'ArrowDown') ? setActiveIndex(currentIndex + 1): setActiveIndex(currentIndex - 1);
    } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
        let targetSwiper = hoveredSwiper;
        if (!targetSwiper) {
            const focusedSwiperEl = ae && ae.closest ? ae.closest('.swiper') : null;
            if (focusedSwiperEl) targetSwiper = swipers.find(s => s.el === focusedSwiperEl) || null;
        }
        if (targetSwiper) {
            ev.preventDefault();
            if (ev.key === 'ArrowLeft') targetSwiper.slidePrev();
            else targetSwiper.slideNext();
        }
    }
}, {
    passive: false
});

// Nav clicks
navLinks.forEach(a => a.addEventListener('click', (ev) => {
    ev.preventDefault();
    const idx = sections.findIndex(s => s.id === a.dataset.target);
    if (idx >= 0) {
        lockNav();
        setActiveIndex(idx);
    }
}));

// IntersectionObserver for nav/progress (avoid false triggers)
// - choose entry with largest intersectionRatio
// - require min ratio 0.35
// - debounce 80ms to avoid flicker with animations
let _ioDebounce = null;
const IO_MIN_RATIO = 0.35;
const io = new IntersectionObserver((entries) => {
    if (navLock) return;
    let best = null;
    entries.forEach(e => {
        if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
    });
    if (!best || best.intersectionRatio < IO_MIN_RATIO) return;
    clearTimeout(_ioDebounce);
    _ioDebounce = setTimeout(() => {
        const idx = sections.indexOf(best.target);
        if (idx >= 0) {
            currentIndex = idx;
            navLinks.forEach(a => a.classList.toggle('active', a.dataset.target === sections[currentIndex].id));
            progress.style.width = sections.length > 1 ? (currentIndex / (sections.length - 1)) * 100 + '%' : '0%';
            if (best.target.id === 'attivita') updateAttSlidesActive();
        }
    }, 80);
}, {
    threshold: [0, 0.25, 0.35, 0.5, 0.75, 1]
});
sections.forEach(s => io.observe(s));

// Animation-on-scroll observer (visuals only) with higher threshold to avoid early triggers
const animObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('in-view');
        else e.target.classList.remove('in-view');
    });
}, {
    threshold: 0.5
});
document.querySelectorAll('.box, .att-slide').forEach(el => animObserver.observe(el));

// Navbar show/hide
const topbar = document.getElementById('topbar');
document.addEventListener('mousemove', (e) => {
    const NAV_TRIGGER = topbar.offsetHeight + 6;
    if (window.scrollY <= 10 || e.clientY <= NAV_TRIGGER) topbar.classList.remove('hidden');
    else if (currentIndex > 0) topbar.classList.add('hidden');
}, {
    passive: true
});

// Focus handling
sections.forEach(s => s.addEventListener('focus', () => {
    const idx = sections.indexOf(s);
    if (idx >= 0) setActiveIndex(idx, false);
}));

// Apri SIRINGA_SCUOLA_DOC dalla stessa cartella se esiste (prova senza estensione e con .txt)
(function() {
    const docBtn = document.getElementById('docLink');
    if (!docBtn) return;
    async function tryFetchAndOpen(name) {
        try {
            const resp = await fetch(name, {
                cache: 'no-store'
            });
            if (resp.ok) {
                // prova a interpretare come testo, altrimenti scarica
                const ct = resp.headers.get('Content-Type') || '';
                if (ct.includes('text') || ct.includes('plain') || ct === '') {
                    const text = await resp.text();
                    const blob = new Blob([text], {
                        type: 'text/plain'
                    });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
                    return true;
                } else {
                    const blob = await resp.blob();
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
                    return true;
                }
            }
        } catch (err) {
            // ignore and try next
        }
        return false;
    }

    async function openDoc() {
        const candidates = ['SIRINGA_SCUOLA_DOC.dot', 'SIRINGA_SCUOLA_DOC', 'SIRINGA_SCUOLA_DOC.txt'];
        for (const name of candidates) {
            const ok = await tryFetchAndOpen(name);
            if (ok) return;
        }
        alert('File "SIRINGA_SCUOLA_DOC.dot" non trovato nella stessa cartella. Assicurati che il file esista con nome esatto (SIRINGA_SCUOLA_DOC.dot).');
    }

    docBtn.addEventListener('click', (ev) => {
        ev.preventDefault();
        openDoc();
    });
})();