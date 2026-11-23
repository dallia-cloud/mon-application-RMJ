/* RMJ – scripts communs à toutes les pages */
(function () {
  "use strict";

  /* ---------- En-tête : ombre au défilement + menu mobile ---------- */
  const header = document.querySelector(".site-header");
  const onScroll = () => header && header.classList.toggle("scrolled", window.scrollY > 10);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const burger = document.querySelector(".burger");
  const menu = document.querySelector(".menu");
  if (burger && menu) {
    const setMenu = open => {
      menu.classList.toggle("open", open);
      document.body.classList.toggle("menu-open", open);
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    };
    burger.addEventListener("click", () => setMenu(!menu.classList.contains("open")));
    menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });
    window.addEventListener("resize", () => { if (window.innerWidth > 920) setMenu(false); });
  }

  /* ---------- Lien actif dans le menu ---------- */
  const page = document.body.dataset.page;
  document.querySelectorAll(".menu a[data-page]").forEach(a => {
    if (a.dataset.page === page) a.classList.add("active");
  });

  /* ---------- Année du copyright ---------- */
  document.querySelectorAll("[data-year]").forEach(el => (el.textContent = new Date().getFullYear()));

  /* ---------- Prochaine Convocation (3e samedi du mois) ---------- */
  function thirdSaturday(y, m) {
    const first = new Date(y, m, 1);
    const offset = (6 - first.getDay() + 7) % 7;
    return new Date(y, m, 1 + offset + 14);
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let next = thirdSaturday(today.getFullYear(), today.getMonth());
  if (next < today) next = thirdSaturday(today.getFullYear(), today.getMonth() + 1);
  document.querySelectorAll("[data-next-convocation]").forEach(el => {
    el.textContent = next.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  });

  /* ---------- Apparition au défilement ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add("in"));
  }

  /* ---------- Galerie photo ---------- */
  const photos = (typeof PHOTOS !== "undefined" && Array.isArray(PHOTOS)) ? PHOTOS : [];
  const cameraSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function renderGallery(container, list, limit) {
    container.innerHTML = "";
    const items = limit ? list.slice(0, limit) : list;
    if (!items.length) {
      const n = limit || 6;
      for (let i = 0; i < n; i++) {
        const d = document.createElement("div");
        d.className = "tile placeholder";
        d.innerHTML = `<div>${cameraSvg}<span>Photo à venir</span></div>`;
        container.appendChild(d);
      }
      return;
    }
    items.forEach((p, i) => {
      const b = document.createElement("button");
      b.type = "button";
      // Rythme éditorial (page Galerie seulement) : une grande photo toutes les 8, alternativement à gauche et à droite
      b.className = "tile" + (!limit && i % 8 === 0 ? (i % 16 === 0 ? " feat" : " feat feat-r") : "");
      b.setAttribute("aria-label", "Agrandir : " + (p.titre || "photo"));
      b.innerHTML = `<span class="tile-mat"><span class="tile-media"><img src="${esc(p.src)}" alt="${esc(p.titre)}" loading="lazy"></span>
          <span class="tile-zoom" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg></span></span>
        <span class="tile-info">
          <span class="tile-num">N° ${String(i + 1).padStart(2, "0")}</span>
          <strong>${esc(p.titre)}</strong>
          <span class="tile-rule" aria-hidden="true"></span>
          <small>${esc([p.categorie, p.date].filter(Boolean).join(" · "))}</small>
        </span>`;
      b.addEventListener("click", () => openLightbox(items, items.indexOf(p)));
      container.appendChild(b);
    });
  }

  // Lightbox
  let lb, lbImg, lbCap, lbCount, current = [], idx = 0, lastFocus;
  function buildLightbox() {
    lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Visionneuse de photos");
    lb.innerHTML = `
      <span class="lb-count"></span>
      <button class="lb-btn lb-close" aria-label="Fermer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <button class="lb-btn lb-prev" aria-label="Photo précédente"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>
      <figure><img alt=""><figcaption></figcaption></figure>
      <button class="lb-btn lb-next" aria-label="Photo suivante"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>`;
    document.body.appendChild(lb);
    lbImg = lb.querySelector("img");
    lbCap = lb.querySelector("figcaption");
    lbCount = lb.querySelector(".lb-count");
    lb.querySelector(".lb-close").addEventListener("click", closeLightbox);
    lb.querySelector(".lb-prev").addEventListener("click", () => show(idx - 1));
    lb.querySelector(".lb-next").addEventListener("click", () => show(idx + 1));
    lb.addEventListener("click", e => { if (e.target === lb) closeLightbox(); });
    document.addEventListener("keydown", e => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
    let x0 = null;
    lb.addEventListener("touchstart", e => (x0 = e.touches[0].clientX), { passive: true });
    lb.addEventListener("touchend", e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }
  function show(i) {
    idx = (i + current.length) % current.length;
    const p = current[idx];
    lbImg.src = p.src;
    lbImg.alt = p.titre || "";
    lbCap.innerHTML = `<strong>${esc(p.titre)}</strong>${esc([p.categorie, p.date].filter(Boolean).join(" · "))}`;
    lbCount.textContent = `${idx + 1} / ${current.length}`;
  }
  function openLightbox(list, i) {
    if (!lb) buildLightbox();
    lastFocus = document.activeElement;
    current = list;
    show(i);
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
    lb.querySelector(".lb-close").focus();
  }
  function closeLightbox() {
    lb.classList.remove("open");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  /* ---------- Anneau 3D (page galerie) ---------- */
  function initRing(scene) {
    const ringEl = document.getElementById("ring");
    const tiltEl = document.getElementById("ring-tilt");
    const section = scene.closest(".ring-section");
    const canvas = document.getElementById("ring-particles");
    const titleEl = document.getElementById("ring-title");
    const metaEl = document.getElementById("ring-meta");
    const countEl = document.getElementById("ring-count");
    const infoEl = titleEl && titleEl.parentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Photos marquées « une: true », sinon les 10 premières ; cartes « à venir » tant qu'il n'y a pas de photo.
    let items = photos.filter(p => p.une);
    if (!items.length) items = photos.slice(0, 10);
    const empty = !items.length;
    if (empty) {
      items = ["La Convocation", "Génération Influence Afrique", "Pacte Africa", "RMJ Masterclass",
        "Conférences Influence", "Webinaires", "Vie du mouvement", "Rencontres"]
        .map(t => ({ titre: t, categorie: "Photos à venir" }));
    }

    // Au moins 8 cartes pour former un vrai cercle : on répète les photos si besoin.
    const N = Math.max(items.length, 8);
    const step = 360 / N;
    const cards = [];
    for (let i = 0; i < N; i++) {
      const k = i % items.length, p = items[k];
      const el = document.createElement(empty ? "div" : "button");
      el.className = "ring-card" + (empty ? " placeholder" : "");
      if (empty) {
        el.setAttribute("aria-hidden", "true");
        el.style.setProperty("--h", String(195 + (i * 23) % 50));
        el.innerHTML = `<img src="assets/logo-rmj.jpg" alt="" draggable="false"><div><strong>${esc(p.titre)}</strong><small>Photos à venir</small></div>`;
      } else {
        el.type = "button";
        el.tabIndex = -1;
        el.setAttribute("aria-label", "Agrandir : " + (p.titre || "photo"));
        el.innerHTML = `<img src="${esc(p.src)}" alt="${esc(p.titre)}" draggable="false">`;
      }
      el.addEventListener("click", () => {
        if (suppressClick) return;
        if (i === front && !empty) openLightbox(items, k);
        else go(i);
      });
      ringEl.appendChild(el);
      cards.push({ el, k });
    }

    let radius = 0, angle = 0, vel = 0, target = null, front = -1, suppressClick = false;
    let tiltX = -6, tiltZ = 0, tiltXTo = -6, tiltZTo = 0, hover = false, idleUntil = 0;
    const AUTO = reduce ? 0 : -0.07; // degrés par image

    const norm = a => ((a + 180) % 360 + 360) % 360 - 180;

    function placeCards() {
      const w = cards[0].el.offsetWidth || 220;
      radius = Math.round((w / 2) / Math.tan(Math.PI / N) + w * 0.32);
      cards.forEach((c, i) => (c.el.style.transform = `rotateY(${i * step}deg) translateZ(${radius}px)`));
    }

    function render() {
      tiltEl.style.transform = `translateZ(${-radius * 0.4}px) rotateX(${tiltX}deg) rotateZ(${tiltZ}deg)`;
      ringEl.style.transform = `rotateY(${angle}deg)`;
      let best = 0, bestAbs = 999;
      cards.forEach((c, i) => {
        const rel = norm(i * step + angle);
        const facing = Math.cos(rel * Math.PI / 180);
        c.el.style.filter = `brightness(${(0.3 + 0.7 * Math.max(0, facing)).toFixed(3)})`;
        c.el.style.setProperty("--shine", `${(50 + rel * 0.9).toFixed(1)}%`);
        c.el.style.zIndex = String(Math.round(facing * 100) + 100);
        if (Math.abs(rel) < bestAbs) { bestAbs = Math.abs(rel); best = i; }
      });
      if (best !== front) {
        if (front >= 0) cards[front].el.classList.remove("is-front");
        front = best;
        cards[front].el.classList.add("is-front");
        updateInfo();
      }
    }

    function updateInfo() {
      const k = cards[front].k, p = items[k];
      if (titleEl) titleEl.textContent = p.titre || "";
      if (metaEl) metaEl.textContent = [p.categorie, p.date].filter(Boolean).join(" · ");
      if (countEl) countEl.textContent = `${String(k + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
      if (infoEl && !reduce) { infoEl.classList.remove("swap"); void infoEl.offsetWidth; infoEl.classList.add("swap"); }
    }

    function go(i) {
      target = angle + norm(-i * step - angle);
      vel = 0;
      idleUntil = performance.now() + 4000;
      if (reduce) { angle = target; target = null; render(); }
      kick();
    }

    document.getElementById("ring-prev").addEventListener("click", () => go(front - 1));
    document.getElementById("ring-next").addEventListener("click", () => go(front + 1));
    scene.addEventListener("keydown", e => {
      if (e.key === "ArrowLeft") { e.preventDefault(); go(front - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); go(front + 1); }
      if ((e.key === "Enter" || e.key === " ") && !empty && e.target === scene) { e.preventDefault(); openLightbox(items, cards[front].k); }
    });

    // Glisser pour tourner, avec élan au relâchement
    let x0 = null, last = 0, dragging = false, startAngle = 0;
    scene.addEventListener("pointerdown", e => {
      if (e.button !== 0) return;
      x0 = last = e.clientX; startAngle = angle; dragging = false; suppressClick = false;
    });
    scene.addEventListener("pointermove", e => {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      if (!dragging && Math.abs(dx) > 6) {
        dragging = true; suppressClick = true; target = null;
        scene.classList.add("dragging");
        scene.setPointerCapture(e.pointerId);
      }
      if (dragging) {
        angle = startAngle + dx * 0.25;
        vel = (e.clientX - last) * 0.25;
        last = e.clientX;
        render(); kick();
      }
    });
    const endDrag = () => {
      if (x0 === null) return;
      x0 = null;
      if (dragging) {
        scene.classList.remove("dragging");
        idleUntil = performance.now() + 3000;
        if (reduce) vel = 0;
        setTimeout(() => (suppressClick = false), 0);
      }
      dragging = false;
    };
    scene.addEventListener("pointerup", endDrag);
    scene.addEventListener("pointercancel", endDrag);
    scene.addEventListener("mouseenter", () => (hover = true));
    scene.addEventListener("mouseleave", () => (hover = false));

    // Inclinaison de la scène selon la position de la souris
    let mx = 0, my = 0;
    section.addEventListener("pointermove", e => {
      const r = section.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width - 0.5;
      my = (e.clientY - r.top) / r.height - 0.5;
      if (!reduce) { tiltXTo = -6 - my * 10; tiltZTo = mx * 3; kick(); }
    });
    section.addEventListener("pointerleave", () => { mx = my = 0; tiltXTo = -6; tiltZTo = 0; });

    // Particules lumineuses en profondeur
    const ctx = canvas.getContext("2d");
    let dots = [], cw = 0, ch = 0;
    function sizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cw = section.offsetWidth; ch = section.offsetHeight;
      canvas.width = cw * dpr; canvas.height = ch * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(110, cw / 12));
      dots = Array.from({ length: count }, () => ({ x: Math.random() * cw, y: Math.random() * ch, z: Math.random() * 0.9 + 0.1, s: Math.random() * 0.3 + 0.1 }));
    }
    function drawDots() {
      ctx.clearRect(0, 0, cw, ch);
      for (const d of dots) {
        if (!reduce) { d.y -= d.s * d.z; if (d.y < -4) { d.y = ch + 4; d.x = Math.random() * cw; } }
        const x = d.x - mx * 40 * d.z, y = d.y - my * 30 * d.z;
        ctx.beginPath();
        ctx.arc(x, y, 0.4 + d.z * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(140, 196, 245, ${(0.15 + d.z * 0.55).toFixed(2)})`;
        ctx.fill();
      }
    }

    // Boucle d'animation (s'arrête quand la section n'est pas visible)
    let raf = null, visible = true;
    function frame(now) {
      raf = null;
      if (!dragging) {
        if (target !== null) {
          angle += (target - angle) * 0.08;
          if (Math.abs(target - angle) < 0.05) { angle = target; target = null; }
        } else {
          vel *= 0.94;
          const autoOn = !hover && now > idleUntil && !(lb && lb.classList.contains("open"));
          if (autoOn && Math.abs(vel) < Math.abs(AUTO)) vel += (AUTO - vel) * 0.05;
          angle += vel;
        }
      }
      tiltX += (tiltXTo - tiltX) * 0.06;
      tiltZ += (tiltZTo - tiltZ) * 0.06;
      render();
      drawDots();
      if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }).observe(section);
    }
    document.addEventListener("visibilitychange", kick);
    window.addEventListener("resize", () => { placeCards(); sizeCanvas(); render(); drawDots(); });

    placeCards();
    sizeCanvas();
    render();
    drawDots();
    kick();
  }

  const ringScene = document.getElementById("ring-scene");
  if (ringScene) initRing(ringScene);

  const prefersReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Héros 3D (accueil) : logo en couches qui suit la souris ---------- */
  const hero3d = document.getElementById("hero3d");
  if (hero3d) {
    const stage = hero3d.querySelector(".h3d-stage");
    const card = hero3d.querySelector(".h3d-card");
    const layers = hero3d.querySelectorAll("[data-depth]");
    layers.forEach((el, i) => {
      el.style.setProperty("--z", el.dataset.depth + "px");
      el.style.setProperty("--d", (0.15 + i * 0.09).toFixed(2) + "s");
    });
    if (!prefersReduce) {
      hero3d.classList.add("intro");
      requestAnimationFrame(() => requestAnimationFrame(() => hero3d.classList.remove("intro")));
    }

    const zone = hero3d.closest(".hero") || hero3d;
    let rx = 0, ry = 0, tx = 0, ty = 0, pointerAt = 0, running = false, visible = true;
    zone.addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse") return;
      const r = hero3d.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      ty = Math.max(-1, Math.min(1, x)) * 18;
      tx = Math.max(-1, Math.min(1, -y)) * 14;
      card.style.setProperty("--gx", ((x + 0.5) * 100).toFixed(1) + "%");
      card.style.setProperty("--gy", ((y + 0.5) * 100).toFixed(1) + "%");
      pointerAt = performance.now();
      start3d();
    });
    function frame3d(now) {
      if (now - pointerAt > 2500) { // au repos : léger balancement
        tx = Math.sin(now / 1900) * 5;
        ty = Math.cos(now / 2300) * 9;
      }
      rx += (tx - rx) * 0.07;
      ry += (ty - ry) * 0.07;
      stage.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      if (visible && !document.hidden) requestAnimationFrame(frame3d); else running = false;
    }
    function start3d() { if (!running && !prefersReduce && visible) { running = true; requestAnimationFrame(frame3d); } }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; start3d(); }).observe(hero3d);
    }
    document.addEventListener("visibilitychange", start3d);
    start3d();
  }

  /* ---------- Vitrine des programmes (page Programmes) ---------- */
  const PROGRAMMES = [
    { id: "convocation", nom: "La Convocation", court: "Convocation", kicker: "Rendez-vous mensuel", tag: "3e samedi du mois",
      c: "#2163ad", d: "#0c2747",
      desc: "Chaque troisième samedi du mois, dans les villes où le mouvement est implanté : un espace de rencontre, de réflexion, d’apprentissage et de réseautage.",
      meta: ["Mensuel", "Plusieurs villes", "Réseautage"] },
    { id: "conferences", nom: "Les Conférences Influence", court: "Conférences", kicker: "Sensibiliser et inspirer", tag: "Dans plusieurs villes",
      c: "#1f6a5f", d: "#092a25",
      desc: "Des rencontres qui rapprochent les jeunes de personnes qui agissent dans différents secteurs, sur le leadership, l’influence et le développement.",
      meta: ["Conférences", "Leadership", "Influence"] },
    { id: "gia", nom: "Génération Influence Afrique", court: "Génération Influence", kicker: "Le rendez-vous panafricain", tag: "Tous les deux ans",
      c: "#2b5c46", d: "#0c241b",
      desc: "La grande conférence panafricaine du RMJ : jeunes leaders, entrepreneurs, responsables politiques, experts et sportifs autour de la transformation de l’Afrique.",
      meta: ["Biennal", "Panafricain", "Grande conférence"] },
    { id: "masterclass", nom: "RMJ Masterclass", court: "Masterclass", kicker: "Former et transmettre", tag: "Formation",
      c: "#34557a", d: "#101f31",
      desc: "Une plateforme de formation pour développer les compétences des jeunes : leadership, entrepreneuriat, gouvernance, innovation et développement personnel.",
      meta: ["Formation", "Compétences", "Experts"] },
    { id: "pacte", nom: "Pacte Africa", court: "Pacte Africa", kicker: "Préparer la future élite", tag: "Parcours structuré",
      c: "#1e4a3a", d: "#0a1f17",
      desc: "Un parcours pédagogique qui accompagne des jeunes à fort potentiel dans leur caractère, leurs compétences et leur capacité à assumer de grandes responsabilités.",
      meta: ["Parcours", "Fort potentiel", "Accompagnement"] },
    { id: "webinaires", nom: "Les Webinaires panafricains", court: "Webinaires", kicker: "Connecter le continent", tag: "En ligne",
      c: "#25617d", d: "#0a2533",
      desc: "Des rencontres en ligne pour connecter des jeunes de différents pays, débattre des grands enjeux africains et écouter des acteurs du changement.",
      meta: ["En ligne", "Plusieurs pays", "Débats"] },
    { id: "ecoles", nom: "Les Écoles et autres initiatives", court: "Écoles", kicker: "En développement", tag: "Bientôt",
      c: "#4a6357", d: "#17221c",
      desc: "Des écoles et des cadres de formation spécialisés pour approfondir la préparation des jeunes dans des domaines stratégiques.",
      meta: ["En développement", "Formation spécialisée"] },
  ];
  const showcase = document.getElementById("showcase");
  if (showcase) {
    const $ = id => document.getElementById(id);
    const textEl = showcase.querySelector(".sc-text");
    const cardEl = $("sc-card"), tiltWrap = $("sc-object"), tabsEl = $("sc-tabs"), bar = $("sc-bar");
    const DUR = 7000;
    let cur = -1, timer = null, t0 = 0, paused = false, hovering = false;

    const tabs = PROGRAMMES.map((p, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "sc-tab"; b.setAttribute("role", "tab");
      b.textContent = p.court;
      b.addEventListener("click", () => { show(i); restart(); });
      tabsEl.appendChild(b);
      return b;
    });

    function fill(i) {
      const p = PROGRAMMES[i], n = String(i + 1).padStart(2, "0");
      $("sc-index").textContent = n;
      $("sc-kicker").textContent = p.kicker;
      $("sc-title").textContent = p.nom;
      $("sc-desc").textContent = p.desc;
      $("sc-meta").innerHTML = p.meta.map(m => `<span>${esc(m)}</span>`).join("");
      $("sc-link").href = "#" + p.id;
      $("sc-num").textContent = n;
      $("sc-name").textContent = p.nom;
      $("sc-tag").textContent = p.tag;
      $("sc-word").textContent = p.court;
      showcase.style.setProperty("--sc-c", p.c);
      showcase.style.setProperty("--sc-d", p.d);
      tabs.forEach((t, k) => t.setAttribute("aria-selected", String(k === i)));
    }

    function show(i) {
      i = (i + PROGRAMMES.length) % PROGRAMMES.length;
      if (i === cur) return;
      const dir = cur === -1 ? 0 : (i > cur ? 1 : -1);
      cur = i;
      if (prefersReduce || dir === 0 || !cardEl.animate) { fill(i); return; }
      // La carte pivote comme un produit qu'on retourne, puis revient avec le nouveau programme.
      cardEl.animate([{ transform: "rotateY(0deg)", opacity: 1 }, { transform: `rotateY(${-dir * 90}deg)`, opacity: 0.2 }],
        { duration: 380, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" }).onfinish = () => {
        fill(i);
        textEl.classList.remove("swap"); void textEl.offsetWidth; textEl.classList.add("swap");
        cardEl.animate([{ transform: `rotateY(${dir * 90}deg)`, opacity: 0.2 }, { transform: "rotateY(0deg)", opacity: 1 }],
          { duration: 700, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" });
      };
    }

    function tick(now) {
      if (!paused && !hovering && !document.hidden) {
        const k = Math.min(1, (now - t0) / DUR);
        bar.style.transform = `scaleX(${k})`;
        if (k >= 1) { show(cur + 1); t0 = now; }
      } else {
        t0 = now - parseFloat(bar.style.transform.replace(/[^\d.]/g, "") || 0) * DUR;
      }
      timer = requestAnimationFrame(tick);
    }
    function restart() { t0 = performance.now(); bar.style.transform = "scaleX(0)"; }

    $("sc-prev").addEventListener("click", () => { show(cur - 1); restart(); });
    $("sc-next").addEventListener("click", () => { show(cur + 1); restart(); });
    showcase.addEventListener("keydown", e => {
      if (e.target.closest("a")) return;
      if (e.key === "ArrowLeft") { show(cur - 1); restart(); }
      if (e.key === "ArrowRight") { show(cur + 1); restart(); }
    });
    showcase.addEventListener("mouseenter", () => (hovering = true));
    showcase.addEventListener("mouseleave", () => (hovering = false));
    showcase.addEventListener("focusin", () => (paused = true));
    showcase.addEventListener("focusout", () => (paused = false));

    // Balayage au doigt
    let sx = null;
    showcase.addEventListener("touchstart", e => (sx = e.touches[0].clientX), { passive: true });
    showcase.addEventListener("touchend", e => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) { show(cur + (dx < 0 ? 1 : -1)); restart(); }
      sx = null;
    });

    // La carte s'incline vers la souris
    if (!prefersReduce) {
      tiltWrap.addEventListener("pointermove", e => {
        if (e.pointerType !== "mouse") return;
        const r = tiltWrap.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        tiltWrap.classList.add("active");
        tiltWrap.style.setProperty("--ry", ((x - 0.5) * 30).toFixed(1) + "deg");
        tiltWrap.style.setProperty("--rx", ((0.5 - y) * 22).toFixed(1) + "deg");
        cardEl.style.setProperty("--gx", (x * 100).toFixed(1) + "%");
        cardEl.style.setProperty("--gy", (y * 100).toFixed(1) + "%");
      });
      tiltWrap.addEventListener("pointerleave", () => {
        tiltWrap.classList.remove("active");
        tiltWrap.style.setProperty("--rx", "0deg");
        tiltWrap.style.setProperty("--ry", "0deg");
      });
    }

    show(0);
    if (!prefersReduce) { restart(); timer = requestAnimationFrame(tick); }
    else showcase.querySelector(".sc-progress").hidden = true;
  }

  /* ---------- Logo qui se construit au scroll (page Le mouvement) ---------- */
  const assemble = document.getElementById("assemble");
  if (assemble) {
    const logo = document.getElementById("as-logo");
    const cols = +logo.dataset.cols, rows = +logo.dataset.rows;
    const ids = logo.dataset.tiles.split(",").map(Number);
    const verbs = [...document.querySelectorAll("#as-verbs li")];
    const caption = document.getElementById("as-caption");
    const asBar = document.getElementById("as-bar");
    const rnd = (a, b) => a + Math.random() * (b - a);

    const tiles = ids.map(id => {
      const c = id % cols, r = Math.floor(id / cols);
      const el = document.createElement("span");
      el.className = "as-tile";
      el.style.left = (c / cols * 100) + "%";
      el.style.top = (r / rows * 100) + "%";
      el.style.width = `calc(${100 / cols}% + 1.5px)`;   // léger recouvrement : pas de joint visible une fois assemblé
      el.style.height = `calc(${100 / rows}% + 1.5px)`;
      logo.appendChild(el);
      // Chaque morceau part d'une position éclatée dans l'espace
      const ang = Math.random() * Math.PI * 2, dist = rnd(260, 620);
      return { el, x: Math.cos(ang) * dist, y: Math.sin(ang) * dist * 0.7, z: rnd(-900, 500),
        rx: rnd(-180, 180), ry: rnd(-180, 180), rz: rnd(-90, 90), delay: rnd(0, 0.22) };
    });

    // Découpe de l'image en pixels, recalculée si la taille change
    function cutTiles() {
      const W = logo.offsetWidth, H = logo.offsetHeight;
      tiles.forEach((t, k) => {
        const c = ids[k] % cols, r = Math.floor(ids[k] / cols);
        t.el.style.backgroundSize = `${W}px ${H}px`;
        t.el.style.backgroundPosition = `${(-c * W / cols).toFixed(2)}px ${(-r * H / rows).toFixed(2)}px`;
      });
    }
    window.addEventListener("resize", cutTiles);

    if (prefersReduce) {
      assemble.classList.add("static");
      caption.textContent = "Une génération présente, préparée et influente.";
    } else {
      const clamp = v => Math.max(0, Math.min(1, v));
      const ease = t => 1 - Math.pow(1 - t, 3);
      let lastCap = "", ticking = false;

      function update() {
        ticking = false;
        const r = assemble.getBoundingClientRect();
        const p = clamp(-r.top / (r.height - window.innerHeight));
        asBar.style.transform = `scaleX(${p.toFixed(3)})`;

        // 1) Assemblage du logo (0 → 55 % du défilement)
        tiles.forEach(t => {
          const k = ease(clamp((p - t.delay) / 0.33)), q = 1 - k;
          t.el.style.transform = `translate3d(${(t.x * q).toFixed(1)}px, ${(t.y * q).toFixed(1)}px, ${(t.z * q).toFixed(1)}px) rotateX(${(t.rx * q).toFixed(1)}deg) rotateY(${(t.ry * q).toFixed(1)}deg) rotateZ(${(t.rz * q).toFixed(1)}deg)`;
          t.el.style.opacity = (0.15 + 0.85 * k).toFixed(3);
        });
        const turn = (1 - ease(clamp(p / 0.55))) * -35 + Math.sin(p * Math.PI * 2) * 6;
        logo.style.transform = `rotateY(${turn.toFixed(2)}deg)`;

        // 2) Les six verbes apparaissent et gravitent autour du logo (45 → 100 %)
        const w = logo.offsetWidth, half = assemble.offsetWidth / 2;
        const narrow = half * 2 < 700;
        const spin = p * 140;
        verbs.forEach((li, i) => {
          const k = ease(clamp((p - 0.45 - i * 0.06) / 0.12));
          const a = (i / verbs.length) * 360 + spin, rad = a * Math.PI / 180;
          const xMax = Math.max(0, half - li.offsetWidth / 2 - 12); // reste dans l'écran
          let x, y, z;
          if (narrow) {
            // Téléphone : grille ordonnée de 2 colonnes sous le logo, dans l'ordre de lecture
            const col = Math.min(half * 0.47, 96);
            x = (i % 2 ? 1 : -1) * col;
            y = logo.offsetHeight / 2 + 40 + Math.floor(i / 2) * 50;
            z = 0;
          } else {
            x = Math.sin(rad) * Math.min(w * 0.8, xMax); z = Math.cos(rad) * w * 0.55;
            y = Math.cos(rad * 2) * w * 0.06 + (i % 2 ? -1 : 1) * w * 0.22;
          }
          li.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${(y + (1 - k) * 40).toFixed(1)}px, ${z.toFixed(1)}px)`;
          li.style.opacity = (k * (narrow ? 1 : 0.3 + 0.7 * (Math.cos(rad) + 1) / 2)).toFixed(3);
          li.style.zIndex = String(Math.round(z + 1000));
        });

        const cap = p < 0.4 ? "Faites défiler pour assembler la vision"
          : p < 0.85 ? "Éveiller, former, équiper, connecter, positionner, responsabiliser"
          : "Une génération présente, préparée et influente.";
        if (cap !== lastCap) {
          lastCap = cap;
          caption.classList.add("fade");
          setTimeout(() => { caption.textContent = cap; caption.classList.remove("fade"); }, 250);
        }
      }
      const onScrollAs = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
      window.addEventListener("scroll", onScrollAs, { passive: true });
      window.addEventListener("resize", onScrollAs);
      update();
    }
    cutTiles();
  }

  // Aperçu sur l'accueil
  const preview = document.getElementById("gallery-preview");
  if (preview) renderGallery(preview, photos, 6);

  // Page galerie complète avec filtres
  const gallery = document.getElementById("gallery");
  if (gallery) {
    const filtersEl = document.getElementById("gallery-filters");
    const note = document.getElementById("gallery-note");
    const cats = ["Toutes", ...new Set(photos.map(p => p.categorie).filter(Boolean))];
    let active = "Toutes";
    const draw = () => renderGallery(gallery, active === "Toutes" ? photos : photos.filter(p => p.categorie === active));
    if (photos.length && cats.length > 2) {
      cats.forEach(c => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "filter" + (c === active ? " active" : "");
        b.textContent = c;
        b.addEventListener("click", () => {
          active = c;
          filtersEl.querySelectorAll(".filter").forEach(f => f.classList.toggle("active", f === b));
          draw();
        });
        filtersEl.appendChild(b);
      });
    }
    if (note) note.hidden = photos.length > 0;
    draw();
  }

  /* ---------- Formulaire d'adhésion (démo) ---------- */
  const form = document.getElementById("join-form");
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      // TODO : brancher sur un service d'envoi (Formspree, backend, e-mail...)
      document.getElementById("form-msg").classList.add("show");
      form.reset();
    });
  }
})();
