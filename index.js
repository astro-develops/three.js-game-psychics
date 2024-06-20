//Create three.js scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

//create cannon.js world
const world = new CANNON.World();
world.gravity.set(0, -20, 0);

scene.background = new THREE.Color("rgb(25,25,25)");
scene.fog = new THREE.Fog(0x222222, 0, 10);

//mouse lock
let isSupport = "pointerLockElement" in document;
let element = renderer.domElement;
if (isSupport) {
  element.requestPointerLock = element.requestPointerLock;
  element.exitPointerLock = document.exitPointerLock;
}

document.body.appendChild(element);
document.body.appendChild(renderer.domElement);


const clock = new THREE.Clock();
const tuniform = {
  iResolution: { value: new THREE.Vector2() },
  iTime: { type: "f", value: 0.1 },
};
tuniform.iResolution.value.set(window.innerWidth, window.innerHeight);

let pointerLock = false;
let contactNormal = new CANNON.Vec3();
let upAxis = new CANNON.Vec3(0, 1, 0);
let bodyTemp, canJump;

//my own functions
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
const planeMaterial = new THREE.ShaderMaterial({
  uniforms: tuniform,
  vertexShader: vs,
  fragmentShader: fs,
});
const planeMesh = new THREE.Mesh(PlaneGeometry, planeMaterial);

planeMesh.position.copy(groundBody.position);
planeMesh.quaternion.copy(groundBody.quaternion);
scene.add(planeMesh);

/**********************/

class Player {
    constructor() {
        //movement
        this.inputVelocity = new THREE.Vector3();
        this.euler = new THREE.Euler();
        this.quat = new THREE.Quaternion();
        this.yawObject = new THREE.Object3D();
        this.pitchObject = new THREE.Object3D();
        
        this.yawObject.add(this.pitchObject);
        scene.add(this.yawObject);

        //hitbox
        this.shape = new CANNON.Sphere(1);
        this.body = new CANNON.Body({ shape: this.shape, mass: 2 });
        world.addBody(this.body)

        bodyTemp = this.body;

        //three.js geo (hidden for first person pov)
        this.geometry = new THREE.SphereGeometry(this.shape.radius, 12, 9);
        this.material = new THREE.MeshPhongMaterial({
            metalness: .9,
            roughness: .05,
            envMapIntensity: 0.9,
            clearcoat: 1,
            transparent: true,
            // transmission: .95,
            opacity: .5,
            reflectivity: 0.2,
            refractionRatio: 0.985,
            ior: 0.9,
            //side: THREE.DoubleSide,
            flatShading: true,
        });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.castShadow = true;
        this.mesh.reciveShadow = false;
        scene.add(this.mesh)

        //collision event listener
        bodyTemp.addEventListener("collide", function(e) {
            let contact = e.contact;

            if (contact.bi.id == bodyTemp.id) contact.ni.negate(contactNormal);
            else contactNormal.copy(contact.ni);

            if (contactNormal.dot(upAxis) > 0.5) canJump = true;
        });
    }

    update() {
        //set three.js mesh position to cannon.js mesh position
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);

        this.inputVelocity.set(0, 0, 0);
        //plahyer movement
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
        if (keys['w'] && this.inputVelocity.z >= -0.2) {
            this.inputVelocity.z = -1;
        }
        if (keys['s'] && this.inputVelocity.z <= 0.2) {
            this.inputVelocity.z = 1;
        }
        if (keys['a'] && this.inputVelocity.x >= -0.2) {
            this.inputVelocity.x = -1;
        }
        if (keys['d'] && this.inputVelocity.x <= 0.2) {
            this.inputVelocity.x = 1;
        }
        this.body.velocity.z*=0.9;
        this.body.velocity.x*=0.9;
        if (keys[' '] && canJump) {
            bodyTemp.velocity.y = 16;
            canJump = false;
        }

        this.euler.y = this.yawObject.rotation.y;
        this.euler.order = "XYZ";
        this.quat.setFromEuler(this.euler);
        this.inputVelocity.applyQuaternion(this.quat);

        this.body.velocity.z += this.inputVelocity.z;
        this.body.velocity.x += this.inputVelocity.x;

        this.yawObject.position.x = this.body.position.x;
        this.yawObject.position.z = this.body.position.z;
        this.yawObject.position.y += (this.body.position.y - this.yawObject.position.y) / 4;
    }
}

let pitchObject = new THREE.Object3D();

//make camera follow the player
let player = new Player();
player.body.position.set(0, 40, 0);
player.pitchObject.add(camera);
camera.position.set(0,1,5);

e.listener(
    "mousemove",
    (e) => {
      if (pointerLock) {
        player.yawObject.rotation.y -= e.movementX * 0.002;
        player.pitchObject.rotation.x -= e.movementY * 0.002;
        player.pitchObject.rotation.x = Math.max(
          -Math.PI / 2,
          Math.min(Math.PI / 8, player.pitchObject.rotation.x)
        );
      }
    },
    false
  );

function animate() {
  player.update();

  //esc key to leave game
  if (keys[27] && pointerLock) {
    document.exitPointerLock();
  }

  world.step(1 / 60);
  tuniform.iTime.value += clock.getDelta();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
