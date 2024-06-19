//Create three.js scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
scene.background = new THREE.Color("rgb(25,25,25)");
scene.fog = new THREE.Fog(0x222222, 0, 10);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
//mouse lock
let isSupport = "pointerLockElement" in document;
let element = renderer.domElement;
if (isSupport) {
  element.requestPointerLock = element.requestPointerLock;
  element.exitPointerLock = document.exitPointerLock;
}

document.body.appendChild(element);
document.body.appendChild(renderer.domElement);

//create cannon.js world
const world = new CANNON.World();
world.gravity.set(0, -20, 0);

const clock = new THREE.Clock();
const tuniform = {
  iResolution: { value: new THREE.Vector2() },
  iTime: { type: "f", value: 0.1 },
};
tuniform.iResolution.value.set(window.innerWidth, window.innerHeight);
//checkered pattern
const FLOOR_MATERIAL = [
  new THREE.MeshPhongMaterial({ color: new THREE.Color("rgb(10%, 10%, 10%)") }),
  new THREE.MeshPhongMaterial({ color: new THREE.Color("rgb(30%, 30%, 30%)") }),
  new THREE.MeshPhongMaterial({ color: new THREE.Color("rgb(10%, 10%, 10%)") }),
  new THREE.MeshPhongMaterial({ color: new THREE.Color("rgb(30%, 30%, 30%)") }),
  new THREE.ShaderMaterial({
    uniforms: tuniform,
    vertexShader: vs,
    fragmentShader: fs,
  }),
  new THREE.ShaderMaterial({
    uniforms: tuniform,
    vertexShader: vs,
    fragmentShader: fs,
  }),
];

let pitchObject = new THREE.Object3D();
let yawObject = new THREE.Object3D();
let pointerLock = false;
let contactNormal = new CANNON.Vec3();
let upAxis = new CANNON.Vec3(0, 1, 0);
let bodyTemp, canJump;

let e = new Event(document);
let keys = [];
let mouse = {};
e.keyPress(keys);
e.getMouse(mouse);
//event listeners for all player controls
e.listener(
  "click",
  () => {
    if (!pointerLock) {
      element.requestPointerLock();
    }
  },
  false
);
e.listener(
  "pointerlockchange",
  () => {
    if (!pointerLock) {
      pointerLock = true;
    } else if (pointerLock) {
      document.exitPointerLock();
      pointerLock = false;
    }
  },
  false
);
e.listener(
  "mousemove",
  (e) => {
    if (pointerLock) {
      yawObject.rotation.y -= e.movementX * 0.002;
      pitchObject.rotation.x -= e.movementY * 0.002;
      pitchObject.rotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 8, pitchObject.rotation.x)
      );
    }
  },
  false
);

/**********************/
//lighting
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 32, 64);
scene.add(directionalLight);

// ground body
const groundBody = new CANNON.Body({
  type: CANNON.Body.STATIC,
  shape: new CANNON.Plane(),
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // make it face up
world.addBody(groundBody);

// plane mesh
const PlaneGeometry = new THREE.PlaneGeometry(1000, 1000);
const planeMaterial = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
const planeMesh = new THREE.Mesh(PlaneGeometry, planeMaterial);

planeMesh.position.copy(groundBody.position);
planeMesh.quaternion.copy(groundBody.quaternion);
scene.add(planeMesh);

/**********************/

let toRad = (ang) => (ang * Math.PI) / 180;
//cannon.js rotation
let rotateCannon = (obj, obj_pos, ang) => {
  const body = obj;
  const rotationQuaternion = new CANNON.Quaternion();
  rotationQuaternion.copy(body.quaternion);

  const newRotation = new CANNON.Quaternion();

  let pos = 0;
  switch (obj_pos) {
    case "x":
      pos = new CANNON.Vec3(1, 0, 0);
      break;
    case "y":
      pos = new CANNON.Vec3(0, 1, 0);
      break;
    case "z":
      pos = new CANNON.Vec3(0, 0, 1);
      break;
  }
  newRotation.setFromAxisAngle(pos, toRad(ang));
  rotationQuaternion.mult(newRotation, rotationQuaternion);
  rotationQuaternion.normalize();

  body.quaternion.copy(rotationQuaternion);
};

/**********************/

class Player {
  constructor() {
    //movement
    this.inputVelocity = new THREE.Vector3();
    this.euler = new THREE.Euler();
    this.quat = new THREE.Quaternion();

    //hitbox
    this.shape = new CANNON.Sphere(1);
    this.body = new CANNON.Body({ shape: this.shape, mass: 2 });
    world.addBody(this.body);

    bodyTemp = this.body;

    //three.js geo (hidden for first person pov)
    this.geometry = new THREE.SphereGeometry(this.shape.radius, 12, 9);
    this.material = new THREE.MeshPhongMaterial({
      metalness: 0.9,
      roughness: 0.05,
      envMapIntensity: 0.9,
      clearcoat: 1,
      transparent: true,
      transmission: .95,
      opacity: 0.5,
      reflectivity: 0.2,
      refractionRatio: 0.985,
      ior: 0.9,
      side: THREE.DoubleSide,
      flatShading: true,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.reciveShadow = false;
    scene.add(this.mesh)
  }

  update() {
    //set three.js mesh position to cannon.js mesh position
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);

    this.inputVelocity.set(0, 0, 0);
    //player movement
    if (this.inputVelocity.z > 0) {
      this.inputVelocity.z += -0.1;
    }
    if (this.inputVelocity.z < 0) {
      this.inputVelocity.z += 0.1;
    }

    if (this.inputVelocity.x > 0) {
      this.inputVelocity.x += -0.1;
    }
    if (this.inputVelocity.x < 0) {
      this.inputVelocity.x += 0.1;
    }

    if (keys["w"] && this.inputVelocity.z >= -0.2) {
      this.inputVelocity.z = -2;
    }
    if (keys["s"] && this.inputVelocity.z <= 0.2) {
      this.inputVelocity.z = 2;
    }
    if (keys["a"] && this.inputVelocity.x >= -0.2) {
      this.inputVelocity.x = -2;
    }
    if (keys["d"] && this.inputVelocity.x <= 0.2) {
      this.inputVelocity.x = 2;
    }

    this.body.velocity.z *= 0.9;
    this.body.velocity.x *= 0.9;

    this.euler.y = yawObject.rotation.y;
    this.euler.order = "XYZ";
    this.quat.setFromEuler(this.euler);
    this.inputVelocity.applyQuaternion(this.quat);

    this.body.velocity.z += this.inputVelocity.z;
    this.body.velocity.x += this.inputVelocity.x;

    yawObject.position.x = this.body.position.x;
    yawObject.position.z = this.body.position.z;
    yawObject.position.y += (this.body.position.y - yawObject.position.y) / 4;
  }
}

//make camera follow the player
let player = new Player();
player.body.position.set(0, 40, 0);
pitchObject.add(camera);
camera.position.set(0,1,5);
yawObject.add(pitchObject);
scene.add(yawObject);

function animate() {
  player.update();

  //esc key to leave game
  if (keys[27] && pointerLock) {
    document.exitPointerLock();
  }

  //update cannon world
  world.step(1 / 60);
  //update shaders
  tuniform.iTime.value += clock.getDelta();
  //update three.js world
  renderer.render(scene, camera);
  //update webpage
  requestAnimationFrame(animate);
}

animate();
