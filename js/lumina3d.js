// Lumina — interactive 3D model
// Four interlocking quarter-shells, a wavy brick seat and a glowing core.
// Assemble it and the light comes on, the same reward as the real stool.
// Dimensions are approximate (mm): 360 wide, 450 tall.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const host = document.getElementById('lumina3d');
if (host) init(host);

function init(host) {
  const canvasWrap = host.querySelector('.l3d__canvas');
  const btnAssemble = host.querySelector('[data-l3d="assemble"]');
  const btnLight = host.querySelector('[data-l3d="light"]');
  const status = host.querySelector('.l3d__status');

  // ---------- Scene ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvasWrap.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 50);
  camera.position.set(1.05, 0.72, 1.15);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.26, 0);
  controls.enableDamping = true;
  controls.minDistance = 0.6;
  controls.maxDistance = 3;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.8;
  controls.enablePan = false;

  // ---------- Lighting ----------
  const hemi = new THREE.HemisphereLight(0xdfe7ff, 0x221a14, 0.55);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(1.2, 2.0, 1.0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -0.6; key.shadow.camera.right = 0.6;
  key.shadow.camera.top = 0.6; key.shadow.camera.bottom = -0.6;
  key.shadow.bias = -0.0005;
  scene.add(key);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(1.4, 64),
    new THREE.MeshStandardMaterial({ color: 0x15161c, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------- Dimensions (metres) ----------
  const W = 0.36;          // body width
  const H = 0.45;          // body height
  const T = 0.006;         // shell thickness
  const BH = 0.026;        // brick height
  const BL = 0.072;        // brick length
  const GAP = 0.0045;      // gap between bricks (light shows through)
  const BD = 0.005;        // brick depth

  // ---------- Materials ----------
  const woodTex = makeWoodTexture();
  const brickMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.72, metalness: 0 });
  const backMat = new THREE.MeshStandardMaterial({
    color: 0x1a140f, emissive: new THREE.Color(0xffb35c), emissiveIntensity: 0, roughness: 0.9
  });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.6 });
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xf3efe6, emissive: new THREE.Color(0xffc477), emissiveIntensity: 0, roughness: 0.5,
    transparent: true, opacity: 0.95
  });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xf1ece0, roughness: 0.95 });

  // ---------- Build helpers ----------
  const brickGeo = new THREE.BoxGeometry(1, 1, 1);

  // Lay bricks across a rectangle in local XY, facing +Z. Returns an InstancedMesh.
  function brickWall(width, height, offsetRow = 0) {
    const rows = Math.floor(height / (BH + GAP));
    const list = [];
    for (let r = 0; r < rows; r++) {
      const y = GAP / 2 + r * (BH + GAP) + BH / 2;
      const shift = ((r + offsetRow) % 2) * (BL + GAP) / 2;
      for (let x = -shift; x < width; x += BL + GAP) {
        const x0 = Math.max(0, x), x1 = Math.min(width, x + BL);
        if (x1 - x0 < 0.012) continue;
        list.push([x0 + (x1 - x0) / 2, y, x1 - x0]);
      }
    }
    const mesh = new THREE.InstancedMesh(brickGeo, brickMat, list.length);
    const m = new THREE.Matrix4();
    list.forEach(([x, y, w], i) => {
      m.compose(new THREE.Vector3(x, y, BD / 2), new THREE.Quaternion(), new THREE.Vector3(w, BH, BD));
      mesh.setMatrixAt(i, m);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // One half-face of a quarter: backing board + bricks.
  function halfFace(width, offsetRow, seamAtEnd = false) {
    const g = new THREE.Group();
    const back = new THREE.Mesh(new THREE.BoxGeometry(width, H, T), backMat);
    back.position.set(width / 2, H / 2, -T / 2);
    back.castShadow = true;
    g.add(back);
    g.add(brickWall(width, H, offsetRow));
    // dark edge strip on the seam side, like the prototype's black edge binding
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.004, H, T + BD + 0.001), edgeMat);
    strip.position.set(seamAtEnd ? width - 0.002 : 0.002, H / 2, (BD - T) / 2);
    g.add(strip);
    return g;
  }

  // A quarter shell = the corner where two half-faces meet.
  function quarter(index, withRope) {
    const q = new THREE.Group();
    const half = W / 2;
    // Face A: on the +Z side, from x=0 to x=half
    const a = halfFace(half, index);
    a.position.set(0, 0, half);
    q.add(a);
    // Face B: on the +X side, running from the corner (z=half) to the seam (z=0)
    const b = halfFace(half, index + 1, true);
    b.rotation.y = Math.PI / 2;      // local +Z (brick side) faces world +X
    b.position.set(half, 0, half);   // local x=0 at the corner, x=half at the seam
    q.add(b);

    if (withRope) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(half * 0.45, H * 0.62, half + BD + 0.004),
        new THREE.Vector3(half * 0.40, H * 0.38, half + 0.05),
        new THREE.Vector3(half * 0.48, H * 0.12, half + 0.045),
        new THREE.Vector3(half * 0.56, H * 0.30, half + 0.02),
        new THREE.Vector3(half * 0.52, H * 0.55, half + BD + 0.004)
      ]);
      const rope = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.006, 10, false), ropeMat);
      rope.castShadow = true;
      q.add(rope);
    }

    q.rotation.y = index * Math.PI / 2;
    const dir = new THREE.Vector3(1, 0, 1).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), index * Math.PI / 2);
    q.userData.dir = dir;
    return q;
  }

  // Wavy jigsaw-edged seat.
  function seat() {
    const g = new THREE.Group();
    const S = W / 2 + 0.022;
    const shape = new THREE.Shape();
    const N = 160;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2;
      // square-ish outline (superellipse) with wobbly, hand-cut edge
      const c = Math.cos(t), s = Math.sin(t);
      const p = 8;
      const r = S / Math.pow(Math.pow(Math.abs(c), p) + Math.pow(Math.abs(s), p), 1 / p);
      const wobble = 1 + 0.045 * Math.sin(t * 9 + 0.6) + 0.025 * Math.sin(t * 23 + 1.7);
      const x = c * r * wobble, y = s * r * wobble;
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false, curveSegments: 4 });
    geo.rotateX(-Math.PI / 2);
    const plate = new THREE.Mesh(geo, backMat);
    plate.castShadow = true;
    plate.receiveShadow = true;
    g.add(plate);
    // edge band (the black binding on the prototype)
    const edge = new THREE.Mesh(geo.clone(), edgeMat);
    edge.scale.set(1.006, 0.5, 1.006);
    edge.position.y = -0.001;
    g.add(edge);

    // bricks on top, clipped roughly to the seat shape
    const inset = S * 0.92;
    const wall = brickWall(inset * 2, inset * 2, 0);
    // drop instances outside the wobbly outline
    const m = new THREE.Matrix4(), pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3();
    const keep = [];
    for (let i = 0; i < wall.count; i++) {
      wall.getMatrixAt(i, m); m.decompose(pos, quat, scl);
      const x = pos.x - inset, y = pos.y - inset;
      const t = Math.atan2(y, x);
      const c = Math.cos(t), s = Math.sin(t);
      const r = S / Math.pow(Math.pow(Math.abs(c), 8) + Math.pow(Math.abs(s), 8), 1 / 8);
      const lim = r * (1 + 0.045 * Math.sin(t * 9 + 0.6) + 0.025 * Math.sin(t * 23 + 1.7)) - 0.01;
      if (Math.hypot(x + Math.sign(x) * scl.x / 2, y) < lim && Math.hypot(x, y + Math.sign(y) * BH / 2) < lim) keep.push(m.clone());
    }
    const top = new THREE.InstancedMesh(brickGeo, brickMat, keep.length);
    keep.forEach((mm, i) => top.setMatrixAt(i, mm));
    top.castShadow = true;
    top.rotation.x = -Math.PI / 2;
    top.position.set(-inset, 0.012, inset);
    g.add(top);
    return g;
  }

  // Cross-shaped core that lights the stool.
  function core() {
    const g = new THREE.Group();
    const cw = W * 0.86, ch = H * 0.86;
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(cw, ch, 0.004), coreMat);
    const p2 = p1.clone(); p2.rotation.y = Math.PI / 2;
    p1.position.y = p2.position.y = ch / 2 + 0.01;
    g.add(p1, p2);
    const glow = new THREE.PointLight(0xffb35c, 0, 1.6, 1.6);
    glow.position.y = H * 0.55;
    glow.castShadow = false;
    g.add(glow);
    g.userData.glow = glow;
    return g;
  }

  // ---------- Assemble the model ----------
  const stool = new THREE.Group();
  scene.add(stool);
  const quarters = [0, 1, 2, 3].map(i => quarter(i, i === 0 || i === 2));
  quarters.forEach(q => stool.add(q));
  const top = seat();
  top.position.y = H;
  stool.add(top);
  const coreG = core();
  stool.add(coreG);

  // Spill light on the floor when lit
  const spill = new THREE.PointLight(0xffa64a, 0, 1.2, 2);
  spill.position.set(0, 0.06, 0);
  stool.add(spill);

  // ---------- State + animation ----------
  let assembled = 1;        // 1 = together, 0 = apart
  let target = 1;
  let lightOn = true;
  let glow = 0;

  function setStatus() {
    const together = target === 1;
    btnAssemble.textContent = together ? 'Take it apart' : 'Put it together';
    btnAssemble.setAttribute('aria-pressed', String(!together));
    if (!together) status.textContent = 'Four pieces and a core. The light stays off until it is whole.';
    else status.textContent = lightOn ? 'Assembled. The light says yes.' : 'Assembled. Light switched off.';
    btnLight.textContent = lightOn ? 'Light off' : 'Light on';
    btnLight.disabled = !together;
  }

  btnAssemble.addEventListener('click', () => {
    target = target === 1 ? 0 : 1;
    controls.autoRotate = true;
    setStatus();
    if (window.gtag) gtag('event', 'lumina3d_toggle', { event_category: 'engagement', event_label: target ? 'assemble' : 'apart' });
  });
  btnLight.addEventListener('click', () => { lightOn = !lightOn; setStatus(); });
  let dragging = false;
  renderer.domElement.addEventListener('pointerdown', () => { controls.autoRotate = false; dragging = true; });
  window.addEventListener('pointerup', () => { dragging = false; });
  controls.addEventListener('start', () => { dragging = true; });
  controls.addEventListener('end', () => { dragging = false; });

  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function update(dt) {
    // move toward target
    const speed = 0.9;
    assembled += Math.sign(target - assembled) * Math.min(Math.abs(target - assembled), dt * speed);
    const apart = 1 - ease(assembled);

    quarters.forEach((q, i) => {
      const d = q.userData.dir;
      const out = apart * 0.2;
      q.position.set(d.x * out, 0, d.z * out);
      q.rotation.y = i * Math.PI / 2 + apart * (i % 2 ? 0.35 : -0.35);
    });
    top.position.y = H + apart * 0.16;
    top.rotation.y = apart * 0.5;
    coreG.position.y = apart * 0.06;

    // the light only comes on when fully assembled
    const want = (assembled > 0.999 && lightOn) ? 1 : 0;
    glow += (want - glow) * Math.min(1, dt * 3);
    backMat.emissiveIntensity = glow * 6.0;
    coreMat.emissiveIntensity = glow * 3.0;
    coreG.userData.glow.intensity = glow * 3.0;
    spill.intensity = glow * 3.0;
    hemi.intensity = 0.55 - glow * 0.47;
    key.intensity = 1.4 - glow * 1.28;
    brickMat.envMapIntensity = 1 - glow * 0.9;
    backMat.envMapIntensity = 1 - glow * 0.9;
    brickMat.color.setScalar(1 - glow * 0.4);
    // pull the camera back a little while it is apart so every piece stays in view
    const fit = Math.max(1, 1.35 / camera.aspect);   // narrow screens need more distance
    const want_d = (1.75 + apart * 0.45) * fit;
    const off = camera.position.clone().sub(controls.target);
    const d = off.length();
    if (!dragging && Math.abs(d - want_d) > 0.002) camera.position.copy(controls.target).add(off.multiplyScalar(1 + (want_d / d - 1) * Math.min(1, dt * 3)));
  }

  // ---------- Render loop (only while visible) ----------
  let running = false, last = performance.now();
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt);
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    else if (!e.isIntersecting) running = false;
  });
  io.observe(host);

  function resize() {
    const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    controls.target.y = camera.aspect < 1.1 ? 0.2 : 0.26;   // lift the model above the buttons on phones
    controls.maxDistance = 3 * Math.max(1, 1.35 / camera.aspect);
  }
  new ResizeObserver(resize).observe(canvasWrap);
  resize();

  // Respect reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) controls.autoRotate = false;

  setStatus();
  host.classList.add('is-ready');
}

// Procedural light timber texture for the bricks.
function makeWoodTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#c9ab82';
  g.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 40; i++) {
    const y = Math.random() * 64;
    g.strokeStyle = `rgba(${120 + Math.random() * 40},${88 + Math.random() * 30},${55 + Math.random() * 20},${0.15 + Math.random() * 0.25})`;
    g.lineWidth = 0.5 + Math.random() * 1.5;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= 256; x += 16) g.lineTo(x, y + Math.sin(x / 30 + i) * 2);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
