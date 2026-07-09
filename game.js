// FNAF: House of Predators — game.js

// ===== GLOBALS =====
let CONFIG = null;
let animatronics = [];
let hidingSpots = [];
let scraps = [];
let rooms = [];
let quests = [];

let player = {
    pos: new THREE.Vector3(0, 1.7, 2),
    speed: 0.06,
    hiding: false,
    alive: true,
    scrapsCollected: 0,
    currency: 0
};

let yaw = 0;
let pitch = 0;
let mouseLocked = false;
const keys = {};

let flashlight = {
    on: false,
    battery: 100,
    drainRate: 0.08,
    rechargeCost: 10,
    lowThreshold: 20,
    flickerTimer: 0
};

const stateText = document.getElementById("state");
const currencyText = document.getElementById("currency");
const batteryText = document.getElementById("battery");
const lockMsg = document.getElementById("lockMsg");

// ===== INPUT =====
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
    const sensitivity = 0.002;
    yaw   -= e.movementX * sensitivity;
    pitch -= e.movementY * sensitivity;
    const limit = Math.PI / 2 - 0.1;
    if (pitch > limit) pitch = limit;
    if (pitch < -limit) pitch = -limit;
});

// ===== VECTORS =====
function forwardVector() {
    return new THREE.Vector3(
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        Math.cos(yaw) * Math.cos(pitch)
    );
}

function rightVector() {
    return new THREE.Vector3(
        Math.cos(yaw),
        0,
        -Math.sin(yaw)
    );
}

// ===== CONFIG LOAD =====
async function loadConfig() {
    const res = await fetch("game_config.json");
    CONFIG = await res.json();

    rooms = CONFIG.rooms;
    hidingSpots = CONFIG.hiding_spots;
    scraps = CONFIG.scraps.map(s => ({ ...s, visible: true }));
    quests = CONFIG.quests;

    spawnAnimatronics(CONFIG.animatronics);
}

// ===== BOUNDS =====
function insideBounds(pos) {
    return (pos.x > -6 && pos.x < 6 && pos.z > -8 && pos.z < 8);
}

// ===== HIDING =====
function isNearHidingSpot(pos) {
    for (const h of hidingSpots) {
        const dist = pos.distanceTo(new THREE.Vector3(h.x, h.y, h.z));
        if (dist < 1.5) return true;
    }
    return false;
}

// ===== PLAYER =====
function updatePlayer() {
    if (!player.alive) return;

    const fwd = forwardVector();
    const right = rightVector();
    fwd.y = 0; right.y = 0;
    fwd.normalize(); right.normalize();

    const move = new THREE.Vector3();
    if (keys["w"]) move.add(fwd);
    if (keys["s"]) move.sub(fwd);
    if (keys["a"]) move.sub(right);
    if (keys["d"]) move.add(right);

    if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(player.speed);
        const newPos = player.pos.clone().add(move);
        if (insideBounds(newPos)) {
            player.pos.copy(newPos);
        }
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
    camera.lookAt(player.pos.clone().add(forwardVector()));
}

// ===== FLASHLIGHT =====
function updateFlashlight() {
    if (!flashlight.on) {
        flashlight.flickerTimer = 0;
        return;
    }

    flashlight.battery -= flashlight.drainRate;
    if (flashlight.battery < 0) flashlight.battery = 0;

    if (flashlight.battery < flashlight.lowThreshold) {
        flashlight.flickerTimer++;
        if (flashlight.flickerTimer % 20 < 10) {
            flashlight.on = false;
        }
    }

    if (flashlight.battery <= 0) {
        flashlight.on = false;
    }

    batteryText.textContent = Math.floor(flashlight.battery) + "%";
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

        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x330000 });
        const headMat = new THREE.MeshStandardMaterial({ color: 0x550000 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.6), bodyMat);
        body.position.set(0, 1.0, 0);

        const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.6), headMat);
        head.position.set(0, 2.0, 0);

        const armGeo = new THREE.BoxGeometry(0.2, 1.0, 0.2);
        const armL = new THREE.Mesh(armGeo, bodyMat);
        armL.position.set(-0.6, 1.0, 0);
        const armR = new THREE.Mesh(armGeo, bodyMat);
        armR.position.set(0.6, 1.0, 0);

        const legGeo = new THREE.BoxGeometry(0.25, 1.0, 0.25);
        const legL = new THREE.Mesh(legGeo, bodyMat);
        legL.position.set(-0.25, 0.0, 0);
        const legR = new THREE.Mesh(legGeo, bodyMat);
        legR.position.set(0.25, 0.0, 0);

        group.add(body, head, armL, armR, legL, legR);
        group.position.set(a.patrol_points[0].x, a.patrol_points[0].y, a.patrol_points[0].z);
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

        if (dist < a.detection_range) {
            if (dist < a.chase_range) {
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
        }
    }
}

// ===== LIGHT REACTION =====
function updateLighting() {
    if (!flashlight.on) {
        ambient.intensity = 0.15;
        mainLight.intensity = 0.4;
    } else {
        ambient.intensity = 0.3;
        mainLight.intensity = 1.2;
    }
}

// ===== FLASHLIGHT CONE =====
let flashlightSpot = null;

function renderFlashlight() {
    if (flashlightSpot) {
        scene.remove(flashlightSpot);
        scene.remove(flashlightSpot.target);
        flashlightSpot = null;
    }

    if (!flashlight.on || !player.alive) return;

    const cone = new THREE.SpotLight(0xffffff, 2, 12, Math.PI / 8, 0.4);
    cone.position.copy(player.pos);
    const target = player.pos.clone().add(forwardVector().multiplyScalar(10));
    cone.target.position.copy(target);
    scene.add(cone);
    scene.add(cone.target);
    flashlightSpot = cone;
}

// ===== MAIN LOOP =====
function gameLoop() {
    requestAnimationFrame(gameLoop);

    updatePlayer();
    updateFlashlight();
    updateScraps();
    updateAnimatronics();
    updateLighting();
    renderFlashlight();

    renderer.render(scene, camera);
}

// ===== START =====
loadConfig().then(() => {
    gameLoop();
});
