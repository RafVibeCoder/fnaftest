// FNAF: House of Predators — game.js
// Full first-person horror engine with improved graphics, collision, and flashlight

// ===== RENDERER / SCENE / CAMERA =====
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.06);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 1.75, 0);

// ===== LIGHTING =====
const ambient = new THREE.AmbientLight(0x222233, 0.4);
scene.add(ambient);

const moonLight = new THREE.DirectionalLight(0x9fc5ff, 0.8);
moonLight.position.set(10, 20, -10);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 2048;
moonLight.shadow.mapSize.height = 2048;
scene.add(moonLight);

const horrorLight = new THREE.PointLight(0xff0000, 0.6, 12);
horrorLight.position.set(3, 2.5, 3);
scene.add(horrorLight);

const flashlightLight = new THREE.SpotLight(0xffffff, 2, 15, Math.PI / 10, 0.4);
flashlightLight.castShadow = true;
scene.add(flashlightLight);
scene.add(flashlightLight.target);

// ===== WINDOW RESIZE =====
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ===== HUD ELEMENTS =====
const stateText = document.getElementById("state");
const currencyText = document.getElementById("currency");
const batteryText = document.getElementById("battery");
const lockMsg = document.getElementById("lockMsg");

// ===== PLAYER / INPUT =====
let player = {
  pos: new THREE.Vector3(0, 1.75, 0),
  speed: 0.06,
  hiding: false,
  alive: true,
  scrapsCollected: 0,
  currency: 0
};

const keys = {};
let yaw = 0;
let pitch = 0;
let mouseLocked = false;

window.addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  keys[k] = true;

  if (k === "f") {
    flashlight.on = !flashlight.on;
  }
});

window.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

renderer.domElement.addEventListener("click", () => {
  if (renderer.domElement.requestPointerLock) {
    renderer.domElement.requestPointerLock();
  }
});

document.addEventListener("pointerlockchange", () => {
  mouseLocked = (document.pointerLockElement === renderer.domElement);
  lockMsg.style.display = mouseLocked ? "none" : "block";
});

document.addEventListener("mousemove", e => {
  if (!mouseLocked) return;
  const sensitivity = 0.0025;
  yaw -= e.movementX * sensitivity;
  pitch -= e.movementY * sensitivity;
  const limit = Math.PI / 2 - 0.1;
  if (pitch > limit) pitch = limit;
  if (pitch < -limit) pitch = -limit;
});

// ===== FLASHLIGHT STATE =====
let flashlight = {
  on: false,
  battery: 100,
  drainRate: 0.08,
  rechargeCost: 10,
  lowThreshold: 20,
  flickerTimer: 0
};

// ===== CONFIG / GAME DATA =====
let CONFIG = null;
let animatronics = [];
let hidingSpots = [];
let scraps = [];
let rooms = [];
let quests = [];

// Simple wall AABBs for collision
const walls = [
  { x1: -6, x2: 6, z1: -8.2, z2: -8 }, // back
  { x1: -6, x2: 6, z1: 8,   z2: 8.2 }, // front
  { x1: -6.2, x2: -6, z1: -8, z2: 8 }, // left
  { x1: 6,   x2: 6.2, z1: -8, z2: 8 }, // right
  // add interior walls to match your layout
];

// ===== LOAD CONFIG =====
async function loadConfig() {
  const res = await fetch("game_config.json");
  CONFIG = await res.json();

  rooms = CONFIG.rooms;
  hidingSpots = CONFIG.hiding_spots;
  scraps = CONFIG.scraps.map(s => ({ ...s, visible: true }));
  quests = CONFIG.quests;

  spawnAnimatronics(CONFIG.animatronics);
}

// ===== VECTOR HELPERS =====
function forwardVector() {
  return new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
}

function rightVector() {
  return new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
}

// ===== COLLISION =====
function collides(pos) {
  for (const w of walls) {
    if (
      pos.x > w.x1 && pos.x < w.x2 &&
      pos.z > w.z1 && pos.z < w.z2
    ) return true;
  }
  return false;
}

function movePlayer(moveVec) {
  const newPos = player.pos.clone().add(moveVec);
  if (!collides(newPos)) {
    player.pos.copy(newPos);
  }
}

// ===== HIDING =====
function isNearHidingSpot(pos) {
  for (const h of hidingSpots) {
    const dist = pos.distanceTo(new THREE.Vector3(h.x, h.y, h.z));
    if (dist < 1.5) return true;
  }
  return false;
}

// ===== PLAYER MOVEMENT / CAMERA =====
function updatePlayerMovement() {
  if (!player.alive) return;

  const speed = player.speed;
  const forward = forwardVector();
  const right = rightVector();

  let move = new THREE.Vector3();

  if (keys["w"]) move.add(forward);
  if (keys["s"]) move.sub(forward);
  if (keys["a"]) move.sub(right);
  if (keys["d"]) move.add(right);

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(speed);
    movePlayer(move);
  }

  if (keys["e"]) {
    player.hiding = isNearHidingSpot(player.pos);
  } else {
    player.hiding = false;
  }

  stateText.textContent = player.alive
    ? (player.hiding ? "Hiding" : "Exploring")
    : stateText.textContent;

  camera.position.copy(player.pos);
}

function updateCameraLook() {
  camera.rotation.set(pitch, yaw, 0);
}

// ===== FLASHLIGHT =====
function updateFlashlight() {
  if (!flashlight.on) {
    flashlight.flickerTimer = 0;
    flashlightLight.intensity = 0;
    return;
  }

  flashlight.battery -= flashlight.drainRate;
  if (flashlight.battery < 0) flashlight.battery = 0;

  if (flashlight.battery < flashlight.lowThreshold) {
    flashlight.flickerTimer++;
    if (flashlight.flickerTimer % 20 < 10) {
      flashlight.on = false;
      flashlightLight.intensity = 0;
    }
  }

  if (flashlight.battery <= 0) {
    flashlight.on = false;
    flashlightLight.intensity = 0;
  }

  batteryText.textContent = Math.floor(flashlight.battery) + "%";

  if (flashlight.on) {
    flashlightLight.intensity = 2;
    flashlightLight.position.copy(player.pos);
    flashlightLight.target.position.copy(
      player.pos.clone().add(forwardVector().multiplyScalar(10))
    );
  }
}

// ===== SCRAPS / CURRENCY =====
function updateScraps() {
  if (!player.alive) return;

  for (const s of scraps) {
    if (!s.visible) continue;
    const dist = player.pos.distanceTo(new THREE.Vector3(s.x, s.y, s.z));
    if (dist < 1.0) {
      s.visible = false;
      player.currency += s.value;
      player.scrapsCollected += 1;
      currencyText.textContent = player.currency;

      if (player.currency >= flashlight.rechargeCost && flashlight.battery < 100) {
        flashlight.battery += 40;
        if (flashlight.battery > 100) flashlight.battery = 100;
        player.currency -= flashlight.rechargeCost;
        currencyText.textContent = player.currency;
      }
    }
  }
}

// ===== ANIMATRONICS =====
function spawnAnimatronics(list) {
  for (const a of list) {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x330000,
      roughness: 0.6,
      metalness: 0.2
    });
    const headMat = new THREE.MeshStandardMaterial({
      color: 0x550000,
      roughness: 0.4,
      metalness: 0.3
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.6), bodyMat);
    body.position.set(0, 1.0, 0);
    body.castShadow = true;
    body.receiveShadow = true;

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.6), headMat);
    head.position.set(0, 2.0, 0);
    head.castShadow = true;
    head.receiveShadow = true;

    const armGeo = new THREE.BoxGeometry(0.2, 1.0, 0.2);
    const armL = new THREE.Mesh(armGeo, bodyMat);
    armL.position.set(-0.6, 1.0, 0);
    armL.castShadow = true;
    const armR = new THREE.Mesh(armGeo, bodyMat);
    armR.position.set(0.6, 1.0, 0);
    armR.castShadow = true;

    const legGeo = new THREE.BoxGeometry(0.25, 1.0, 0.25);
    const legL = new THREE.Mesh(legGeo, bodyMat);
    legL.position.set(-0.25, 0.0, 0);
    legL.castShadow = true;
    const legR = new THREE.Mesh(legGeo, bodyMat);
    legR.position.set(0.25, 0.0, 0);
    legR.castShadow = true;

    group.add(body, head, armL, armR, legL, legR);
    group.position.set(a.patrol_points[0].x, a.patrol_points[0].y, a.patrol_points[0].z);
    group.castShadow = true;
    scene.add(group);

    animatronics.push({
      name: a.name,
      group,
      speed: a.speed,
      detection_range: a.detection_range,
      chase_range: a.chase_range,
      aggression: a.aggression,
      patrol_points: a.patrol_points.map(p => new THREE.Vector3(p.x, p.y, p.z)),
      patrolIndex: 0,
      voice_lines: a.voice_lines,
      talkCooldown: 0,
      state: "patrol",
      stunTimer: 0
    });
  }
}

function randomLine(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function updateAnimatronics() {
  for (const a of animatronics) {
    if (!player.alive) break;

    const dist = a.group.position.distanceTo(player.pos);

    if (a.state === "stunned") {
      a.stunTimer--;
      if (a.stunTimer <= 0) {
        a.state = "search";
      }
      continue;
    }

    let detectionRange = a.detection_range;
    let chaseRange = a.chase_range;

    if (player.hiding) {
      detectionRange *= 0.4;
    }

    if (dist < detectionRange) {
      if (dist < chaseRange) {
        a.state = "chase";
      } else {
        a.state = "search";
      }
    } else {
      a.state = "patrol";
    }

    if (flashlight.on) {
      const dirToPlayer = player.pos.clone().sub(a.group.position).normalize();
      const playerDir = forwardVector().normalize();
      const dot = dirToPlayer.dot(playerDir);
      if (dot > 0.85) {
        a.state = "stunned";
        a.stunTimer = 40;
        continue;
      }
    }

    let target;
    if (a.state === "patrol") {
      target = a.patrol_points[a.patrolIndex % a.patrol_points.length];
    } else {
      target = player.pos;
    }

    const dir = target.clone().sub(a.group.position);
    if (dir.lengthSq() > 0.001) {
      dir.normalize();
      const speedMul = a.state === "chase" ? 1.6 : 1.0;
      dir.multiplyScalar(a.speed * speedMul);
      a.group.position.add(dir);
    }

    if (a.state === "patrol") {
      if (a.group.position.distanceTo(target) < 0.5) {
        a.patrolIndex++;
      }
    }

    if (a.talkCooldown > 0) a.talkCooldown--;

    if (a.state === "search" && a.talkCooldown <= 0) {
      console.log(a.name + ": " + randomLine(a.voice_lines.searching));
      a.talkCooldown = 180;
    }

    if (a.state === "chase" && a.talkCooldown <= 0) {
      console.log(a.name + ": " + randomLine(a.voice_lines.spotted));
      a.talkCooldown = 240;
    }

    if (dist < 1.0 && !player.hiding && player.alive) {
      player.alive = false;
      stateText.textContent = "Caught by " + a.name;
      document.getElementById("jumpscareOverlay").style.opacity = "1";
    }
  }
}

// ===== MAIN LOOP =====
function gameLoop() {
  requestAnimationFrame(gameLoop);

  updateCameraLook();
  updatePlayerMovement();
  updateFlashlight();
  updateScraps();
  updateAnimatronics();

  renderer.render(scene, camera);
}

// ===== START =====
loadConfig().then(() => {
  gameLoop();
});

