// Lumina — interactive 3D model built from the SolidWorks files.
// Four curved mesh walls slot together like a #, faced with 30 x 100 x 3 mm pine slabs,
// with a 12 mm acrylic top. The mesh lets it flex and roll up, and lets the light through. Take it apart and put it back; the light comes on only when it is whole.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const host = document.getElementById('lumina3d');
if (host) init(host);

function init(host) {
  const wrap = host.querySelector('.l3d__canvas');
  const btnAssemble = host.querySelector('[data-l3d="assemble"]');
  const btnLight = host.querySelector('[data-l3d="light"]');
  const status = host.querySelector('.l3d__status');
  const modelUrl = host.dataset.model;

  // ---------- Renderer / scene ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  wrap.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 50);
  camera.position.set(1.45, 1.0, 1.6);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.25, 0);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 0.8;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.autoRotateSpeed = 0.7;

  const hemi = new THREE.HemisphereLight(0xe6ecff, 0x2a2018, 0.6);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(1.5, 2.4, 1.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -0.7, right: 0.7, top: 0.7, bottom: -0.7 });
  key.shadow.bias = -0.0004;
  scene.add(key);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.8, 64), new THREE.MeshStandardMaterial({ color: 0x15161c, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------- Materials ----------
  const pine = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
  // open-weave mesh: drawn once, repeated across each wall
  const meshTex = meshTexture();
  const meshMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2e, roughness: 0.8, metalness: 0.1,
    alphaMap: meshTex, alphaTest: 0.35, side: THREE.DoubleSide,
    emissive: new THREE.Color(0xffb866), emissiveIntensity: 0
  });
  const topAcrylic = new THREE.MeshPhysicalMaterial({
    color: 0xe9f2f6, roughness: 0.18, transparent: true, opacity: 0.5,
    clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.DoubleSide,
    emissive: new THREE.Color(0xffb866), emissiveIntensity: 0
  });
  const copper = new THREE.MeshStandardMaterial({
    color: 0xb8734a, metalness: 1, roughness: 0.32,
    emissive: new THREE.Color(0xffd29a), emissiveIntensity: 0
  });
  const topMat = topAcrylic;

  // inner glow: a warm light at the heart of the #, like the LEDs in the prototype
  const coreLight = new THREE.PointLight(0xffb35c, 0, 2.2, 1.4);
  coreLight.position.set(0, 0.3, 0);
  const floorSpill = new THREE.PointLight(0xffa04a, 0, 1.6, 2);
  floorSpill.position.set(0, 0.04, 0);
  scene.add(coreLight, floorSpill);

  // ---------- Load the model ----------
  const walls = [], woods = [], coppers = [], ropes = [];
  const top = new THREE.Group();
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xf2ece0, roughness: 0.95 });
  new GLTFLoader().load(modelUrl, (gltf) => {
    gltf.scene.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      if (o.name.startsWith('wall_')) { addWallUVs(o.geometry); o.material = meshMat; o.castShadow = false; walls[+o.name.slice(5)] = o; }
      else if (o.name.startsWith('wood_')) { o.material = pine; woods[+o.name.slice(5)] = o; }
      else if (o.name.startsWith('copper_')) { o.material = copper; coppers[+o.name.slice(7)] = o; }
      else if (o.name.startsWith('rope_')) { o.material = ropeMat; ropes[+o.name.slice(5)] = o; }
      else if (o.name === 'top') { o.material = topMat; top.userData.plate = o; }
      else if (o.name === 'top_wood') { o.material = pine; top.userData.wood = o; }
    });
    // each wall + its slabs move together; work out which way is "out" from its centre
    walls.forEach((w, i) => {
      const g = new THREE.Group();
      scene.add(g);
      g.add(w); g.add(woods[i]); if (coppers[i]) g.add(coppers[i]); if (ropes[i]) g.add(ropes[i]);
      const box = new THREE.Box3().setFromObject(w);
      const c = box.getCenter(new THREE.Vector3()); c.y = 0;
      g.userData.dir = c.lengthSq() > 1e-6 ? c.normalize() : new THREE.Vector3(1, 0, 0);
      // walls facing ±x lift out of their slots first, the others stay down
      g.userData.lifts = Math.abs(g.userData.dir.x) > Math.abs(g.userData.dir.z);
      parts.push(g);
    });
    [top.userData.plate, top.userData.wood].forEach((m) => m && top.add(m));
    scene.add(top);
    host.classList.add('is-ready');
    setStatus();
  }, undefined, () => { status.textContent = 'The 3D model could not load.'; });
  const parts = [];

  // ---------- Interaction ----------
  let t = 1, target = 1, lightOn = true, glow = 0, spark = 0, dragging = false;
  function setStatus() {
    const whole = target === 1;
    btnAssemble.textContent = whole ? 'Take it apart' : 'Put it together';
    btnAssemble.setAttribute('aria-pressed', String(!whole));
    btnLight.textContent = lightOn ? 'Light off' : 'Light on';
    btnLight.disabled = !whole;
    status.textContent = !whole ? 'Apart: the copper contacts are open, so there is no circuit.'
      : (lightOn ? 'Copper contacts touch, the circuit closes, the light comes on.' : 'Assembled. Light switched off.');
  }
  btnAssemble.addEventListener('click', () => {
    target = target === 1 ? 0 : 1; setStatus();
    if (window.gtag) gtag('event', 'lumina3d_toggle', { event_category: 'engagement', event_label: target ? 'assemble' : 'apart' });
  });
  btnLight.addEventListener('click', () => { lightOn = !lightOn; setStatus(); });
  controls.addEventListener('start', () => { dragging = true; controls.autoRotate = false; });
  controls.addEventListener('end', () => { dragging = false; });

  const ease = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
  const seg = (x, a, b) => ease((x - a) / (b - a));

  function update(dt) {
    t += Math.sign(target - t) * Math.min(Math.abs(target - t), dt * 0.55);
    const a = 1 - t;                         // 0 = whole, 1 = fully apart
    if (top) {
      top.position.y = seg(a, 0, 0.35) * 0.22;
      top.rotation.y = seg(a, 0, 0.35) * 0.35;
    }
    parts.forEach((g) => {
      const lift = g.userData.lifts ? seg(a, 0.2, 0.6) * 0.27 : 0;   // slide up out of the slots
      const out = seg(a, 0.5, 1) * 0.42;                              // then step outward
      g.position.set(g.userData.dir.x * out, lift, g.userData.dir.z * out);
    });

    const want = (t > 0.999 && lightOn) ? 1 : 0;
    if (want && glow < 0.02) spark = 1;          // contacts just met: quick flash on the copper
    spark = Math.max(0, spark - dt * 2.2);
    copper.emissiveIntensity = spark * 2.5 + glow * 0.25;
    glow += (want - glow) * Math.min(1, dt * 2.5);
    meshMat.emissiveIntensity = glow * 2.2;
    topMat.emissiveIntensity = glow * 1.2;
    coreLight.intensity = glow * 4.5;
    floorSpill.intensity = glow * 3;
    pine.color.setScalar(1 - glow * 0.6);
    pine.envMapIntensity = 1 - glow * 0.85;
    hemi.intensity = 0.6 - glow * 0.5;
    key.intensity = 1.6 - glow * 1.4;

    // keep everything in frame (pull back when apart, and on narrow screens)
    const fit = Math.max(1, 1.3 / camera.aspect);
    const want_d = (2.25 + a * 0.9) * fit;
    const off = camera.position.clone().sub(controls.target);
    const d = off.length();
    if (!dragging) camera.position.copy(controls.target).add(off.multiplyScalar(1 + (want_d / d - 1) * Math.min(1, dt * 2.5)));
  }

  let running = false, last = 0;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt); controls.update(); renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    else if (!e.isIntersecting) running = false;
  }).observe(host);

  function resize() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    controls.maxDistance = 5 * Math.max(1, 1.3 / camera.aspect);
    controls.target.y = camera.aspect < 1.1 ? 0.2 : 0.25;
  }
  new ResizeObserver(resize).observe(wrap);
  resize();
  setStatus();
}

// Woven mesh: dark strands with square openings, as an alpha map (white = solid strand).
function meshTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 64, 14); g.fillRect(0, 0, 14, 64);   // one horizontal + one vertical strand per tile
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

// The exported walls have no UVs, so map the mesh pattern along the wall and up its height.
function addWallUVs(geo) {
  geo.computeBoundingBox();
  const b = geo.boundingBox, pos = geo.attributes.position;
  const alongX = (b.max.x - b.min.x) > (b.max.z - b.min.z);
  const cell = 0.008;                       // 8 mm mesh pitch
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (alongX ? pos.getX(i) : pos.getZ(i)) / cell;
    uv[i * 2 + 1] = pos.getY(i) / cell;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
