/* =========================================================
   RMJ — Effets du thème « Aube »
   Écran d'ouverture, transitions entre pages, défilement fluide,
   textes qui se révèlent, curseur, boutons aimantés, bandeau
   cinétique et mot « RÉVEIL » animé.
   Tout est désactivé si le visiteur a choisi « réduire les animations ».
   ========================================================= */
(function () {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) { /* stockage indisponible */ } },
  };
  const ready = new Promise(res => (window.__rmjReady = res));
  if (reduce) { document.documentElement.classList.remove("intro-pending"); window.__rmjReady(); return; }

  /* ---------- Défilement fluide ---------- */
  let lenis = null;
  if (typeof window.Lenis === "function") {
    document.documentElement.style.scrollBehavior = "auto";
    lenis = new window.Lenis({ lerp: 0.09, anchors: true });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  /* ---------- Rideau de transition entre les pages ---------- */
  const pt = document.createElement("div");
  pt.className = "pt";
  pt.setAttribute("aria-hidden", "true");
  pt.innerHTML = Array.from({ length: 6 }, (_, k) => `<i style="--k:${k}"></i>`).join("");
  document.body.appendChild(pt);

  const arriving = store.get("rmj-transit") === "1";
  store.del("rmj-transit");
  function uncover() {
    pt.classList.add("leave");
    pt.querySelectorAll("i").forEach((el, k) => el.style.setProperty("--k", String(5 - k)));
    requestAnimationFrame(() => requestAnimationFrame(() => pt.classList.remove("cover")));
    setTimeout(() => {
      pt.classList.remove("leave");
      pt.querySelectorAll("i").forEach((el, k) => el.style.setProperty("--k", String(k)));
    }, 1200);
  }
  if (arriving) {
    pt.querySelectorAll("i").forEach(el => (el.style.transition = "none"));
    pt.classList.add("cover");
    void pt.offsetWidth;
    pt.querySelectorAll("i").forEach(el => (el.style.transition = ""));
  }

  document.addEventListener("click", e => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== "_self") return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || /^(mailto|tel|sms|javascript):/i.test(href)) return;
    const url = new URL(href, location.href);
    if (url.protocol !== location.protocol || url.host !== location.host) return;
    if (!/\.html?$/i.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.hash) return; // ancre sur la même page
    e.preventDefault();
    store.set("rmj-transit", "1");
    pt.classList.add("cover");
    setTimeout(() => (location.href = url.href), 750);
  });
  window.addEventListener("pageshow", e => { if (e.persisted) pt.classList.remove("cover", "leave"); });

  /* ---------- Écran d'ouverture (une fois par visite) ---------- */
  function runPreloader() {
    return new Promise(done => {
      const pl = document.createElement("div");
      pl.className = "preloader";
      pl.setAttribute("aria-hidden", "true");
      pl.innerHTML = `<div class="pl-inner">
          <img class="pl-logo" src="assets/logo-blanc.png" alt="">
          <div class="pl-count">0</div>
          <div class="pl-word">Réveil Mondial de la Jeunesse</div>
        </div><div class="pl-line"></div>`;
      document.body.appendChild(pl);
      document.documentElement.style.overflow = "hidden";
      const count = pl.querySelector(".pl-count"), line = pl.querySelector(".pl-line");
      const t0 = performance.now(), DUR = 1900;
      (function step(now) {
        const k = Math.min(1, (now - t0) / DUR), e = 1 - Math.pow(1 - k, 3);
        count.textContent = String(Math.round(e * 100));
        line.style.setProperty("--p", e.toFixed(3));
        if (k < 1) return requestAnimationFrame(step);
        setTimeout(() => {
          pl.classList.add("done");
          document.documentElement.style.overflow = "";
          done();
          setTimeout(() => pl.remove(), 1200);
        }, 250);
      })(t0);
    });
  }

  const firstVisit = !store.get("rmj-seen");
  store.set("rmj-seen", "1");
  // L'accueil s'ouvre toujours sur l'intro 3D « De la Terre à l'Afrique » (ouverture, rafraîchissement, lien direct),
  // sauf quand on y revient depuis une autre page du site.
  const wantsIntro = document.body.dataset.page === "accueil" && (!arriving || location.hash === "#intro");
  // Ordre : la Terre et l'Afrique d'abord → « Entrer dans le mouvement » → le compte à rebours → le site.
  const opening = wantsIntro && window.RMJIntro
    ? window.RMJIntro.play().then(() => runPreloader())
    : (firstVisit && !arriving ? runPreloader() : Promise.resolve());
  opening.then(() => {
    document.documentElement.classList.remove("intro-pending");
    if (arriving) uncover();
    window.__rmjReady();
  });

  /* ---------- Textes qui se révèlent mot par mot ---------- */
  const splitTargets = document.querySelectorAll(
    "h1.display, h2.h2, .cta h2, .foot-brand, .feature .body h3, .row h3"
  );
  splitTargets.forEach(el => {
    if (el.closest(".assemble, .showcase, .ring-section")) return;
    let i = 0;
    (function walk(node) {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const parts = n.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            const w = document.createElement("span");
            w.className = "w";
            const inner = document.createElement("i");
            inner.textContent = p;
            inner.style.setProperty("--i", String(i++));
            w.appendChild(inner);
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "BR" && n.tagName !== "SVG") {
          walk(n);
        }
      });
    })(el);
    el.classList.remove("reveal");
    el.classList.add("split");
  });

  const clipTargets = document.querySelectorAll(".gallery .tile, .feature, .h3d-card");
  clipTargets.forEach(el => el.classList.add("clip-in"));

  ready.then(() => {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }), { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".split, .clip-in").forEach(el => io.observe(el));

    // Relance l'entrée en 3D du logo de l'accueil une fois le rideau levé
    const h3d = document.getElementById("hero3d");
    if (h3d) {
      h3d.classList.add("intro");
      requestAnimationFrame(() => requestAnimationFrame(() => h3d.classList.remove("intro")));
    }
  });

  /* ---------- Curseur personnalisé ---------- */
  if (finePointer) {
    const dot = document.createElement("div"), ring = document.createElement("div");
    dot.className = "cur-dot"; ring.className = "cur-ring";
    ring.innerHTML = "<span></span>";
    const label = ring.firstChild;
    document.body.append(dot, ring);
    let mx = -100, my = -100, rx = -100, ry = -100, shown = false;
    window.addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse") return;
      mx = e.clientX; my = e.clientY;
      if (!shown) { shown = true; rx = mx; ry = my; document.documentElement.classList.add("has-cursor"); }
      dot.style.transform = `translate(${mx}px, ${my}px)`;
    });
    (function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx.toFixed(1)}px, ${ry.toFixed(1)}px)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener("pointerover", e => {
      const t = e.target.closest("a, button, [role='tab'], .tile, .ring-card, .sc-object, input, textarea, select");
      ring.classList.remove("hover", "label");
      if (!t || t.matches("input, textarea, select")) return;
      const text = t.matches(".tile:not(.placeholder), .ring-card:not(.placeholder)") ? "Voir"
        : t.matches(".sc-object") ? "Glisser" : "";
      if (text) { label.textContent = text; ring.classList.add("label"); } else ring.classList.add("hover");
    });
    document.addEventListener("pointerdown", () => ring.classList.add("down"));
    document.addEventListener("pointerup", () => ring.classList.remove("down"));
    document.addEventListener("mouseleave", () => { dot.style.opacity = ring.style.opacity = "0"; });
    document.addEventListener("mouseenter", () => { dot.style.opacity = ring.style.opacity = ""; });

    /* Boutons aimantés : ils se déplacent légèrement vers la souris */
    document.querySelectorAll(".btn, .sc-btn, .ring-btn, .socials a, .burger").forEach(b => {
      b.addEventListener("pointermove", e => {
        const r = b.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.28, y = (e.clientY - r.top - r.height / 2) * 0.35;
        b.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      });
      b.addEventListener("pointerleave", () => (b.style.translate = ""));
    });
  }

  /* ---------- Vitesse de défilement (pour le bandeau et le mot cinétique) ---------- */
  let lastY = window.scrollY, velocity = 0;
  function readVelocity() {
    const y = window.scrollY;
    velocity += ((y - lastY) - velocity) * 0.2;
    lastY = y;
  }

  /* ---------- Bandeau de mots ---------- */
  const rows = [...document.querySelectorAll(".band-row")];
  const bands = rows.map((row, k) => {
    row.innerHTML += row.innerHTML; // deux copies pour une boucle sans couture
    return { row, x: 0, dir: k % 2 ? 1 : -1 };
  });

  /* ---------- Mot « RÉVEIL » qui s'épaissit avec le scroll ---------- */
  const kinetic = document.querySelector(".kinetic");
  const kLines = kinetic ? [...kinetic.querySelectorAll(".kinetic-lines span")] : [];

  (function tick() {
    readVelocity();
    bands.forEach(b => {
      const half = b.row.scrollWidth / 2;
      b.x += b.dir * (0.6 + Math.min(Math.abs(velocity) * 0.35, 14));
      if (b.x <= -half) b.x += half;
      if (b.x > 0) b.x -= half;
      const skew = Math.max(-12, Math.min(12, velocity * -0.25));
      b.row.style.transform = `translate3d(${b.x.toFixed(1)}px,0,0) skewX(${skew.toFixed(2)}deg)`;
    });
    if (kinetic) {
      const r = kinetic.getBoundingClientRect(), vh = window.innerHeight;
      if (r.top < vh && r.bottom > 0) {
        // Chaque mot grossit selon SA position à l'écran :
        // 0 quand il entre par le bas, 1 quand son centre atteint le tiers haut de l'écran.
        kLines.forEach((s, i) => {
          const lr = s.getBoundingClientRect();
          const mid = lr.top + lr.height / 2;
          const local = Math.max(0, Math.min(1, (vh - mid) / (vh * 0.65)));
          s.style.fontWeight = String(Math.round(400 + local * 400));
          s.style.letterSpacing = (-0.02 - local * 0.05).toFixed(3) + "em";
          s.classList.toggle("lit", local > 0.92 && i === kLines.length - 1);
        });
      }
    }
    requestAnimationFrame(tick);
  })();
})();
