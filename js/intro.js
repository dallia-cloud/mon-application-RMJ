/* =========================================================
   RMJ — Intro « De la Terre à l'Afrique »
   1. La Terre tourne dans l'espace, l'aube se lève sur elle.
   2. La caméra plonge vers l'Afrique et traverse les nuages.
   3. L'Afrique s'ouvre : ses 5 régions s'allument une à une.
   4. « L'Afrique se réveille. » → bouton « Entrer dans le mouvement ».

   Deux moteurs de rendu, une seule chronologie :
   - 3D (WebGL + three.js) quand le navigateur le permet ;
   - 2D (canvas) sinon : même Terre, même plongée, mêmes régions.
   Textures et frontières : js/vendor/terre.js. Lancée par js/motion.js.
   ========================================================= */
(function () {
  "use strict";

  const REGIONS = [
    { id: "nord",     nom: "Afrique du Nord",    lon: 10,  lat: 26,  c: "#ffc46b" },
    { id: "ouest",    nom: "Afrique de l’Ouest", lon: -6,  lat: 13,  c: "#ff7a45" },
    { id: "centre",   nom: "Afrique centrale",   lon: 19,  lat: 1,   c: "#e8407c" },
    { id: "est",      nom: "Afrique de l’Est",   lon: 38,  lat: 4,   c: "#3d8bff" },
    { id: "australe", nom: "Afrique australe",   lon: 25,  lat: -21, c: "#2ec4b6" },
  ];
  const BOX = { lonMin: -26, lonMax: 64, latMin: -36, latMax: 38 }; // cadre de l'Afrique, îles comprises
  const AFRICA = { lon: 17, lat: 3 };                                 // point visé par la caméra
  const D2R = Math.PI / 180;
  const PAYS = window.RMJ_PAYS || [];   // 54 pays : nom, région, point d'ancrage, taille

  /* ---------- Outils ---------- */
  const ease = {
    inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out: t => 1 - Math.pow(1 - t, 3),
    in: t => t * t * t * t,
  };
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const seg = (t, a, b) => clamp01((t - a) / (b - a));
  const smooth = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
  const hexRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

  function webglOK() {
    try {
      const c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) { return false; }
  }

  /* ---------- Chronologie commune (en secondes) ---------- */
  const T_SPIN = 4.6, T_DIVE = 7.0, T_OPEN = 7.6, T_REG = 8.4, T_END = 11.6;
  const SPIN_SPEED = 0.22;                                   // rad/s
  const TARGET = Math.PI / 2 - (AFRICA.lon + 180) * D2R;     // rotation qui met l'Afrique face à nous
  const ROT0 = TARGET - SPIN_SPEED * T_SPIN - 2.4;
  const ROT_START = ROT0 + SPIN_SPEED * T_SPIN;
  let ROT_TARGET = TARGET;
  while (ROT_TARGET < ROT_START + 0.4) ROT_TARGET += Math.PI * 2;

  function timeline(t, fit) {
    const s = {};
    // Rotation de la Terre
    if (t < T_SPIN) s.rot = ROT0 + SPIN_SPEED * t;
    else if (t < T_DIVE) s.rot = ROT_START + (ROT_TARGET - ROT_START) * ease.inOut(seg(t, T_SPIN, T_DIVE));
    else s.rot = ROT_TARGET + Math.sin((t - T_DIVE) * 0.25) * 0.05;
    // L'aube : le soleil passe de derrière la Terre à devant-droite
    const dawn = ease.inOut(seg(t, 0.2, T_DIVE + 0.6));
    const sx = -0.35 + 0.95 * dawn, sy = 0.18 + 0.12 * dawn, sz = -1 + 1.8 * dawn, sl = Math.hypot(sx, sy, sz);
    s.sun = [sx / sl, sy / sl, sz / sl];
    s.sunGlow = 1 - 0.85 * seg(t, T_SPIN, T_DIVE);
    // Caméra : approche, plongée rapide, puis l'Afrique s'ouvre
    const Z0 = 4.4 * fit, ZNEAR = 1.42 * fit, ZF = 2.35 * fit;
    let z, fov;
    if (t < T_SPIN) { z = Z0 - 0.25 * ease.out(seg(t, 0, T_SPIN)); fov = 36; }
    else if (t < T_DIVE) { const k = ease.in(seg(t, T_SPIN + 0.6, T_DIVE)); z = (Z0 - 0.25) + (ZNEAR - Z0 + 0.25) * k; fov = 36 + 22 * k; }
    else { const k = ease.out(seg(t, T_DIVE, T_OPEN + 0.9)); z = ZNEAR + (ZF - ZNEAR) * k; fov = 58 - 10 * k; }
    const kEnd = ease.inOut(seg(t, T_END - 0.4, T_END + 1.2));
    z += kEnd * 0.35 * fit;
    if (t > T_END) z -= 0.06 * Math.sin((t - T_END) * 0.4);
    s.z = z; s.fov = fov; s.lift = kEnd * 0.24 * fit;
    s.shake = t > T_DIVE - 0.35 && t < T_DIVE + 0.35 ? 0.006 * (1 - Math.abs(t - T_DIVE) / 0.35) : 0;
    // Nuages, lignes de vitesse, flash
    s.clouds = 0.9 - 0.72 * ease.out(seg(t, T_DIVE - 0.4, T_OPEN + 0.6));
    s.warp = seg(t, T_SPIN + 0.8, T_DIVE);
    s.flash = t > T_DIVE - 0.18 && t < T_DIVE + 0.25;
    // Frontières puis régions
    s.linesA = ease.out(seg(t, T_OPEN, T_OPEN + 1.0));
    s.regA = REGIONS.map((r, i) => ease.out(seg(t, T_REG + i * 0.5, T_REG + i * 0.5 + 0.7)));
    s.progress = clamp01(t / T_END);
    s.end = t >= T_END;
    return s;
  }

  /* ---------- Interface par-dessus le rendu ---------- */
  function buildUI() {
    const root = document.createElement("div");
    root.className = "intro";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "Introduction : de la Terre à l’Afrique");
    root.innerHTML = `
      <canvas class="intro-gl"></canvas>
      <div class="intro-vignette"></div>
      <div class="intro-warp"></div>
      <div class="intro-flash"></div>
      <div class="intro-labels"></div>
      <header class="intro-top">
        <span class="intro-brand"><img src="assets/logo-blanc.png" alt=""> Réveil Mondial de la Jeunesse</span>
        <button type="button" class="intro-skip">Passer l’intro</button>
      </header>
      <p class="intro-caption" aria-live="polite"><span></span></p>
      <div class="intro-end">
        <p class="intro-kicker">54 pays · 5 régions · 60 % de moins de 25 ans</p>
        <h1 class="intro-title">L’Afrique se <em>réveille</em>.</h1>
        <p class="intro-sub">Et sa jeunesse se lève avec elle.</p>
        <button type="button" class="intro-enter">Entrer dans le mouvement
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12h16M14 6l6 6-6 6"/></svg></button>
      </div>
      <div class="intro-bar"><i></i></div>`;
    document.body.appendChild(root);
    const labelsEl = root.querySelector(".intro-labels");
    // Le nom de chacun des 54 pays, posé sur son territoire
    const order = {};
    const labels = PAYS.map(p => {
      const el = document.createElement("span");
      const ri = REGIONS.findIndex(r => r.id === p.reg);
      order[ri] = (order[ri] || 0) + 1;
      el.className = "intro-country s" + p.s;
      el.style.setProperty("--d", (order[ri] * 45) + "ms");
      el.textContent = p.n;
      labelsEl.appendChild(el);
      return { el, ri };
    });
    // Légende des 5 régions
    const legend = document.createElement("ul");
    legend.className = "intro-legend";
    const legendItems = REGIONS.map((r, i) => {
      const li = document.createElement("li");
      li.style.setProperty("--c", r.c);
      li.innerHTML = `<i></i>${r.nom} <small>${PAYS.filter(p => p.reg === r.id).length}</small>`;
      legend.appendChild(li);
      return li;
    });
    root.appendChild(legend);
    return {
      root, labels, legendItems,
      canvas: root.querySelector(".intro-gl"),
      caption: root.querySelector(".intro-caption span"),
      bar: root.querySelector(".intro-bar i"),
      enter: root.querySelector(".intro-enter"),
      skip: root.querySelector(".intro-skip"),
    };
  }

  const CAPTIONS = [
    [0.6, "Une planète. Huit milliards de vies."],
    [T_SPIN, "Un continent se réveille…"],
    [T_REG, "L’Afrique : 54 pays, 5 régions, une seule jeunesse."],
  ];

  /* =========================================================
     MOTEUR 3D (WebGL)
     ========================================================= */
  function drawAfricaLayers() {
    const W = 2048, H = Math.round(W * (BOX.latMax - BOX.latMin) / (BOX.lonMax - BOX.lonMin));
    const px = lon => (lon - BOX.lonMin) / (BOX.lonMax - BOX.lonMin) * W;
    const py = lat => (BOX.latMax - lat) / (BOX.latMax - BOX.latMin) * H;
    const data = window.RMJ_AFRIQUE;
    const mask = document.createElement("canvas"); mask.width = W; mask.height = H;
    const m = mask.getContext("2d");
    const lines = document.createElement("canvas"); lines.width = W; lines.height = H;
    const l = lines.getContext("2d");
    function path(ctx, ring) {
      ctx.moveTo(px(ring[0]), py(ring[1]));
      for (let i = 2; i < ring.length; i += 2) ctx.lineTo(px(ring[i]), py(ring[i + 1]));
      ctx.closePath();
    }
    REGIONS.forEach((reg, k) => {
      const v = 40 * (k + 1);
      m.fillStyle = `rgb(${v},${v},${v})`;
      (data[reg.id] || []).forEach(c => c.r.forEach(ring => { m.beginPath(); path(m, ring); m.fill(); }));
    });
    l.lineJoin = "round";
    l.strokeStyle = "rgba(255,255,255,.55)"; l.lineWidth = 1.6;
    REGIONS.forEach(reg => (data[reg.id] || []).forEach(c => c.r.forEach(ring => { l.beginPath(); path(l, ring); l.stroke(); })));
    l.shadowColor = "rgba(255,196,107,.9)"; l.shadowBlur = 14;
    l.strokeStyle = "rgba(255,220,170,.95)"; l.lineWidth = 2.6;
    l.globalCompositeOperation = "destination-over";
    REGIONS.forEach(reg => (data[reg.id] || []).forEach(c => c.r.forEach(ring => { l.beginPath(); path(l, ring); l.stroke(); })));
    return { mask, lines };
  }

  function renderer3D(ui) {
    const THREE = window.THREE;
    const toXYZ = (lon, lat, r) => {
      const phi = (lon + 180) * D2R, theta = (90 - lat) * D2R;
      return new THREE.Vector3(-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta));
    };
    const renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x020306, 1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 200);
    const loader = new THREE.TextureLoader(), T = window.RMJ_TERRE;
    const texDay = loader.load(T.jour), texNight = loader.load(T.nuit), texWater = loader.load(T.eau), texClouds = loader.load(T.nuages);
    texDay.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const sunDir = new THREE.Vector3(-0.3, 0.2, -1).normalize();

    const earthMat = new THREE.ShaderMaterial({
      uniforms: { dayMap: { value: texDay }, nightMap: { value: texNight }, waterMap: { value: texWater }, sunDir: { value: sunDir } },
      vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vW;
        void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform sampler2D dayMap, nightMap, waterMap; uniform vec3 sunDir; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
        void main(){
          vec3 N = normalize(vN), V = normalize(cameraPosition - vW), L = normalize(sunDir);
          float d = dot(N, L); float dayMix = smoothstep(-0.18, 0.22, d);
          vec3 day = texture2D(dayMap, vUv).rgb; vec3 night = texture2D(nightMap, vUv).rgb * vec3(1.0, 0.78, 0.5) * 2.2;
          vec3 col = mix(night, day * (0.18 + 1.05 * max(d, 0.0)), dayMix);
          float w = texture2D(waterMap, vUv).r;
          col += vec3(1.0, 0.86, 0.7) * pow(max(dot(N, normalize(L + V)), 0.0), 60.0) * w * dayMix * 0.75;
          col += vec3(1.0, 0.42, 0.12) * exp(-pow(d * 5.0, 2.0)) * 0.16;
          float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          col += mix(vec3(0.95, 0.45, 0.2), vec3(0.35, 0.62, 1.0), dayMix) * fres * (0.25 + 0.55 * dayMix);
          gl_FragColor = vec4(col, 1.0); }`,
    });
    const earthGroup = new THREE.Group(); scene.add(earthGroup);
    earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1, 128, 128), earthMat));
    const cloudMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { map: { value: texClouds }, sunDir: { value: sunDir }, opacity: { value: 0.9 } },
      vertexShader: `varying vec2 vUv; varying vec3 vN; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform sampler2D map; uniform vec3 sunDir; uniform float opacity; varying vec2 vUv; varying vec3 vN;
        void main(){ float a = texture2D(map, vUv).r; float d = dot(normalize(vN), normalize(sunDir)); float lit = smoothstep(-0.2, 0.35, d);
          vec3 c = mix(vec3(0.08,0.1,0.16), vec3(1.0), lit) + vec3(1.0,0.5,0.2) * exp(-pow(d*5.0,2.0)) * 0.25;
          gl_FragColor = vec4(c, a * opacity * (0.35 + 0.65 * lit)); }`,
    });
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, 96, 96), cloudMat);
    earthGroup.add(clouds);
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.16, 96, 96), new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { sunDir: { value: sunDir } },
      vertexShader: `varying vec3 vN; varying vec3 vNW; void main(){ vN = normalize(normalMatrix * normal); vNW = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 sunDir; varying vec3 vN; varying vec3 vNW;
        void main(){ float i = pow(0.72 - dot(vN, vec3(0.0,0.0,1.0)), 3.2); float s = dot(normalize(vNW), normalize(sunDir));
          vec3 c = mix(vec3(0.25,0.55,1.0), vec3(1.0,0.55,0.25), smoothstep(-0.3, 0.6, s) * 0.55);
          gl_FragColor = vec4(c, 1.0) * i * (0.35 + 0.9 * smoothstep(-0.5, 0.4, s)); }`,
    })));

    const layers = drawAfricaLayers();
    const maskTex = new THREE.CanvasTexture(layers.mask);
    maskTex.minFilter = maskTex.magFilter = THREE.NearestFilter; maskTex.generateMipmaps = false;
    const lineTex = new THREE.CanvasTexture(layers.lines);
    lineTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const U = { mask: { value: maskTex }, lines: { value: lineTex }, time: { value: 0 }, linesA: { value: 0 },
      regA: { value: [0, 0, 0, 0, 0] }, regC: { value: REGIONS.map(r => new THREE.Color(r.c)) } };
    earthGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.004, 160, 160, (BOX.lonMin + 180) * D2R, (BOX.lonMax - BOX.lonMin) * D2R, (90 - BOX.latMax) * D2R, (BOX.latMax - BOX.latMin) * D2R),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, uniforms: U,
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform sampler2D mask, lines; uniform float time, linesA; uniform float regA[5]; uniform vec3 regC[5]; varying vec2 vUv;
          void main(){
            float m = texture2D(mask, vUv).r * 255.0; int k = int(floor(m / 40.0 + 0.5)) - 1;
            float a = 0.0; vec3 c = vec3(0.0);
            for (int i = 0; i < 5; i++) { if (i == k) { a = regA[i]; c = regC[i]; } }
            float scan = 0.85 + 0.15 * sin(vUv.y * 900.0 - time * 4.0);
            float sweep = smoothstep(0.0, 0.08, 0.08 - abs(fract(vUv.y * 0.6 - time * 0.18) - 0.5));
            vec4 fill = vec4(c, a * (0.42 * scan + 0.35 * sweep));
            vec4 ln = texture2D(lines, vUv); ln.a *= linesA;
            gl_FragColor = vec4(mix(fill.rgb, ln.rgb, ln.a), max(fill.a, ln.a)); }`,
      })));

    const N = 4000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(60 + Math.random() * 40);
      pos.set([v.x, v.y, v.z], i * 3);
      const r = Math.random(), b = 0.5 + Math.random() * 0.5;
      col.set(r < 0.15 ? [b, b * 0.8, b * 0.6] : r < 0.3 ? [b * 0.7, b * 0.8, b] : [b, b, b], i * 3);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false })));

    const sunCanvas = document.createElement("canvas"); sunCanvas.width = sunCanvas.height = 256;
    const sg = sunCanvas.getContext("2d"), grad = sg.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(255,255,240,1)"); grad.addColorStop(0.12, "rgba(255,220,160,.9)");
    grad.addColorStop(0.35, "rgba(255,140,60,.35)"); grad.addColorStop(1, "rgba(255,90,40,0)");
    sg.fillStyle = grad; sg.fillRect(0, 0, 256, 256);
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(sunCanvas), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sun.scale.setScalar(16); scene.add(sun);

    earthGroup.rotation.x = AFRICA.lat * D2R;
    const anchors = PAYS.map(p => toXYZ(p.lon, p.lat, 1.006));
    const tmp = new THREE.Vector3();

    return {
      mode: "3d",
      resize(w, h) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); },
      draw(s, t) {
        sunDir.set(s.sun[0], s.sun[1], s.sun[2]);
        sun.position.copy(sunDir).multiplyScalar(40);
        sun.material.opacity = s.sunGlow;
        earthGroup.rotation.y = s.rot;
        clouds.rotation.y = t * 0.012;
        camera.position.set((Math.random() - 0.5) * s.shake, -s.lift * 0.35 + (Math.random() - 0.5) * s.shake, s.z);
        camera.fov = s.fov; camera.updateProjectionMatrix();
        camera.lookAt(0, -s.lift, 0);
        cloudMat.uniforms.opacity.value = s.clouds;
        U.time.value = t; U.linesA.value = s.linesA;
        s.regA.forEach((a, i) => (U.regA.value[i] = a));
        renderer.render(scene, camera);
      },
      project(i, W, H) {
        earthGroup.updateMatrixWorld();
        tmp.copy(anchors[i]).applyMatrix4(earthGroup.matrixWorld);
        const facing = tmp.dot(camera.position) - tmp.lengthSq() > 0.05;
        tmp.project(camera);
        return { x: (tmp.x + 1) / 2 * W, y: (1 - tmp.y) / 2 * H, visible: facing && tmp.z < 1 };
      },
      dispose() {
        scene.traverse(o => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) { Object.values(o.material.uniforms || {}).forEach(u => u.value && u.value.dispose && u.value.dispose()); if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
        });
        renderer.dispose();
      },
    };
  }

  /* =========================================================
     MOTEUR 2D (canvas) — même scène, sans carte graphique 3D.
     La Terre est calculée pixel par pixel (projection orthographique)
     à partir des mêmes images satellite, puis agrandie à l'écran.
     ========================================================= */
  function loadPixels(src, w, h) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        res(ctx.getImageData(0, 0, w, h).data);
      };
      img.onerror = rej;
      img.src = src;
    });
  }

  async function renderer2D(ui) {
    const T = window.RMJ_TERRE;
    const DW = 2048, DH = 1024, NW = 1024, NH = 512;
    const [day, night, cloud] = await Promise.all([loadPixels(T.jour, DW, DH), loadPixels(T.nuit, NW, NH), loadPixels(T.nuages, NW, NH)]);
    const ctx = ui.canvas.getContext("2d");
    const buf = document.createElement("canvas"), bctx = buf.getContext("2d");
    const stars = document.createElement("canvas");
    let W = 0, H = 0, dpr = 1, bw = 0, bh = 0, k = 1, img = null;
    const regRGB = REGIONS.map(r => hexRGB(r.c));
    const data = window.RMJ_AFRIQUE;
    let view = { cx: 0, cy: 0, R: 1, lon0: 0, sinP: 0, cosP: 1 };

    function resize(w, h) {
      W = w; H = h; dpr = Math.min(window.devicePixelRatio || 1, 2);
      ui.canvas.width = Math.round(w * dpr); ui.canvas.height = Math.round(h * dpr);
      k = Math.min(1, Math.sqrt(190000 / (w * h)));          // ~190 000 pixels calculés par image
      bw = Math.max(2, Math.round(w * k)); bh = Math.max(2, Math.round(h * k));
      buf.width = bw; buf.height = bh; img = bctx.createImageData(bw, bh);
      stars.width = ui.canvas.width; stars.height = ui.canvas.height;
      const sc = stars.getContext("2d");
      sc.fillStyle = "#020306"; sc.fillRect(0, 0, stars.width, stars.height);
      for (let i = 0; i < 900; i++) {
        const r = Math.random(), b = 150 + Math.random() * 105 | 0, big = Math.random() < 0.1 ? 2 : 1;
        sc.fillStyle = r < 0.15 ? `rgba(${b},${b * 0.8 | 0},${b * 0.6 | 0},.9)` : r < 0.3 ? `rgba(${b * 0.7 | 0},${b * 0.8 | 0},${b},.9)` : `rgba(${b},${b},${b},.85)`;
        sc.fillRect(Math.random() * stars.width, Math.random() * stars.height, big * dpr, big * dpr);
      }
    }

    // Projection d'un point (lon, lat) à l'écran ; v > 0 = face visible
    function fwd(lon, lat) {
      const la = lat * D2R, dl = (lon - view.lon0) * D2R, cl = Math.cos(la);
      return {
        x: view.cx + view.R * cl * Math.sin(dl),
        y: view.cy - view.R * (view.cosP * Math.sin(la) - view.sinP * cl * Math.cos(dl)),
        v: view.sinP * Math.sin(la) + view.cosP * cl * Math.cos(dl),
      };
    }

    function draw(s, t) {
      // Taille apparente de la Terre (mêmes réglages de caméra que la version 3D)
      const halfH = H / 2, tanF = Math.tan(s.fov * D2R / 2);
      const R = halfH * Math.tan(Math.asin(Math.min(0.999, 1 / s.z))) / tanF;
      const lift = s.lift / s.z / tanF * halfH;
      const shx = (Math.random() - 0.5) * s.shake * 400, shy = (Math.random() - 0.5) * s.shake * 400;
      const lon0 = -90 - s.rot / D2R, lat0 = AFRICA.lat;
      view = { cx: W / 2 + shx, cy: H / 2 - lift + shy, R, lon0, sinP: Math.sin(lat0 * D2R), cosP: Math.cos(lat0 * D2R) };

      // Fond étoilé
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(stars, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Soleil qui se lève derrière la Terre
      const [sx, sy, sz] = s.sun;
      if (s.sunGlow > 0.02) {
        const sl = Math.hypot(sx, sy) || 1, d = R * (sz < 0 ? 1.05 : 1.6);
        const px = view.cx + sx / sl * d, py = view.cy - sy / sl * d, rr = Math.max(W, H) * 0.35;
        const g = ctx.createRadialGradient(px, py, 0, px, py, rr);
        g.addColorStop(0, `rgba(255,255,240,${s.sunGlow})`); g.addColorStop(0.08, `rgba(255,220,160,${0.8 * s.sunGlow})`);
        g.addColorStop(0.3, `rgba(255,140,60,${0.25 * s.sunGlow})`); g.addColorStop(1, "rgba(255,90,40,0)");
        ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "source-over";
      }
      // Halo de l'atmosphère
      const ag = ctx.createRadialGradient(view.cx, view.cy, R * 0.92, view.cx, view.cy, R * 1.16);
      ag.addColorStop(0, "rgba(90,150,255,.55)"); ag.addColorStop(0.35, "rgba(120,140,255,.22)"); ag.addColorStop(1, "rgba(80,120,255,0)");
      ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(view.cx, view.cy, R * 1.16, 0, Math.PI * 2); ctx.fill();

      // La Terre, pixel par pixel
      const px8 = img.data, Rb = R * k, cxb = view.cx * k, cyb = view.cy * k;
      const sP = view.sinP, cP = view.cosP, cloudA = s.clouds, lonOff = lon0 + 180;
      const y0 = Math.max(0, Math.floor(cyb - Rb)), y1 = Math.min(bh - 1, Math.ceil(cyb + Rb));
      const x0 = Math.max(0, Math.floor(cxb - Rb)), x1 = Math.min(bw - 1, Math.ceil(cxb + Rb));
      px8.fill(0);
      for (let py = y0; py <= y1; py++) {
        const y = (cyb - py - 0.5) / Rb, yy = y * y;
        if (yy >= 1) continue;
        let o = (py * bw + x0) * 4;
        for (let pxl = x0; pxl <= x1; pxl++, o += 4) {
          const x = (pxl + 0.5 - cxb) / Rb, r2 = x * x + yy;
          if (r2 >= 1) continue;
          const z = Math.sqrt(1 - r2);
          const yr = y * cP + z * sP, zr = -y * sP + z * cP;
          const lat = Math.asin(yr);
          let u = (Math.atan2(x, zr) / D2R + lonOff) / 360; u -= Math.floor(u);
          const v = 0.5 - lat / Math.PI;
          const di = ((v * DH | 0) * DW + (u * DW | 0)) * 4, ni = ((v * NH | 0) * NW + (u * NW | 0)) * 4;
          const d = x * sx + y * sy + z * sz;
          const dm = smooth(-0.18, 0.22, d), lit = 0.18 + 1.05 * (d > 0 ? d : 0), nm = 1 - dm;
          let r = night[ni] * 2.2 * nm + day[di] * lit * dm;
          let g = night[ni + 1] * 1.7 * nm + day[di + 1] * lit * dm;
          let b = night[ni + 2] * 1.1 * nm + day[di + 2] * lit * dm;
          const cl = smooth(-0.2, 0.35, d), ca = cloud[ni] / 255 * cloudA * (0.35 + 0.65 * cl);
          if (ca > 0.01) { const c = 20 + 235 * cl; r += (c - r) * ca; g += (c - g) * ca; b += (c * 1.02 - b) * ca; }
          const dawn = Math.exp(-(d * 5) * (d * 5)) * 40;
          const f = (1 - z) * (1 - z) * (1 - z) * (0.25 + 0.55 * dm) * 255;
          px8[o] = r + dawn + f * (0.95 - 0.6 * dm);
          px8[o + 1] = g + dawn * 0.42 + f * (0.45 + 0.17 * dm);
          px8[o + 2] = b + dawn * 0.12 + f * (0.2 + 0.8 * dm);
          px8[o + 3] = 255;
        }
      }
      bctx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(buf, 0, 0, W, H);

      // Régions et frontières de l'Afrique
      if (s.linesA > 0.01 || s.regA.some(a => a > 0.01)) {
        ctx.lineJoin = "round";
        REGIONS.forEach((reg, i) => {
          const a = s.regA[i], [cr, cg, cb] = regRGB[i];
          (data[reg.id] || []).forEach(country => country.r.forEach(ring => {
            ctx.beginPath();
            for (let j = 0; j < ring.length; j += 2) {
              const p = fwd(ring[j], ring[j + 1]);
              if (j === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
            }
            ctx.closePath();
            if (a > 0.01) { ctx.fillStyle = `rgba(${cr},${cg},${cb},${(a * (0.42 + 0.06 * Math.sin(t * 4))).toFixed(3)})`; ctx.fill(); }
            if (s.linesA > 0.01) { ctx.strokeStyle = `rgba(255,236,210,${(0.6 * s.linesA).toFixed(3)})`; ctx.lineWidth = 1; ctx.stroke(); }
          }));
        });
      }
    }

    return {
      mode: "2d",
      resize, draw,
      project(i) { const c = PAYS[i], p = fwd(c.lon, c.lat); return { x: p.x, y: p.y, visible: p.v > 0.15 }; },
      dispose() { /* rien à libérer */ },
    };
  }

  /* =========================================================
     Lecture
     ========================================================= */
  function play() {
    return new Promise(async resolve => {
      if (!window.RMJ_TERRE || !window.RMJ_AFRIQUE) { resolve(false); return; }
      const ui = buildUI();
      document.documentElement.style.overflow = "hidden";
      let engine = null;
      try {
        engine = window.THREE && webglOK() ? renderer3D(ui) : await renderer2D(ui);
      } catch (e) {
        try { engine = await renderer2D(ui); }
        catch (e2) { ui.root.remove(); document.documentElement.style.overflow = ""; resolve(false); return; }
      }
      ui.root.classList.add("mode-" + engine.mode);

      let fit = 1;
      function resize() {
        const w = window.innerWidth, h = window.innerHeight;
        fit = Math.min(1.75, Math.max(1, 0.85 / (w / h)));
        engine.resize(w, h);
      }
      resize();
      window.addEventListener("resize", resize);

      let start = null, raf = null, finished = false, endShown = false, captionStep = -1;
      function setCaption(t) {
        let k = -1;
        CAPTIONS.forEach((c, i) => { if (t >= c[0]) k = i; });
        if (t >= T_END) k = 99;
        if (k === captionStep) return;
        captionStep = k;
        ui.caption.classList.add("out");
        setTimeout(() => { ui.caption.textContent = k >= 0 && k < 99 ? CAPTIONS[k][1] : ""; ui.caption.classList.remove("out"); }, 350);
      }

      function frame(now) {
        raf = requestAnimationFrame(frame);
        if (start === null) start = now;
        const t = (now - start) / 1000;
        const s = timeline(t, fit);
        ui.bar.style.transform = `scaleX(${s.progress.toFixed(3)})`;
        ui.root.style.setProperty("--warp", s.warp.toFixed(3));
        ui.root.classList.toggle("flash", s.flash);
        engine.draw(s, t);
        const W = window.innerWidth, H = window.innerHeight;
        // À la fin, les noms qui passeraient sous le grand titre s'effacent
        const cut = endShown ? ui.root.querySelector(".intro-kicker").getBoundingClientRect().top - 14 : Infinity;
        ui.labels.forEach((L, i) => {
          const on = s.regA[L.ri] > 0.05;
          if (on) {
            const p = engine.project(i, W, H);
            L.el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -50%)`;
            L.el.classList.toggle("on", p.visible && p.y < cut);
          } else L.el.classList.remove("on");
        });
        ui.legendItems.forEach((li, i) => li.classList.toggle("on", s.regA[i] > 0.05));
        setCaption(t);
        if (s.end && !endShown) { endShown = true; ui.root.classList.add("end"); ui.enter.focus({ preventScroll: true }); }
      }
      raf = requestAnimationFrame(frame);

      function finish() {
        if (finished) return;
        finished = true;
        ui.root.classList.add("leaving");
        resolve(true);
        setTimeout(() => {
          cancelAnimationFrame(raf);
          window.removeEventListener("resize", resize);
          engine.dispose();
          ui.root.remove();
        }, 1300);
      }
      ui.enter.addEventListener("click", finish);
      ui.skip.addEventListener("click", finish);
      ui.root.addEventListener("keydown", e => { if (e.key === "Escape") finish(); });
    });
  }

  window.RMJIntro = { play };
})();
