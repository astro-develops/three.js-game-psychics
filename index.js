//Create three.js scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// let stats = new Stats();
// stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
// document.body.appendChild( stats.dom );

//Set up the canvas API with my canvas functions
setCanvas(canvas, ctx);
//cannon.js
const world = new CANNON.World();

const clock = new THREE.Clock();
const tuniform = {
  iResolution: { value: new THREE.Vector2() },
  iTime: { type: "f", value: 0.1 },
};

let element = renderer.domElement;
let pointerLock = false;
let contactNormal = new CANNON.Vec3();
let upAxis = new CANNON.Vec3(0, 1, 0);
let bodyTemp, canJump;
let keys = [];
let mouse = {};

const mouseLock = () => {
  let isSupport = "pointerLockElement" in document;

  if (isSupport) {
    element.requestPointerLock = element.requestPointerLock;
    element.exitPointerLock = document.exitPointerLock;
  }
};
const bg = () => {
  const loader = new THREE.TextureLoader();
  const texture = loader.load(
    "https://t4.ftcdn.net/jpg/04/38/75/23/360_F_438752353_ll05wHi4U3PAumqkxdZ8D907DfzH3EPe.jpg",
    () => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      scene.background = texture;
    }
  );
};

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

class Box {
  constructor(x, y, z, m, w, h, l, r) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.w = w || 10;
    this.h = h || 10;
    this.l = l || 10;
    this.r = r || [0, 0, 0];
    this.m = m || 1;

    this.cannonBody = new CANNON.Body({
      mass: this.m,
      shape: new CANNON.Box(
        new CANNON.Vec3(this.w / 2, this.h / 2, this.l / 2)
      ),
    });
    this.cannonBody.position.set(this.x, this.y, this.z);
    rotateCannon(this.cannonBody, "x", this.r[0]);
    rotateCannon(this.cannonBody, "y", this.r[1]);
    rotateCannon(this.cannonBody, "z", this.r[2]);
    world.addBody(this.cannonBody);

    this.textures = [
      "https://preview.redd.it/63oyebjywf951.jpg?auto=webp&s=d47b6b4a596761ee52d8c8806da32f1ca91c9965",
      "https://art.pixilart.com/8958a2c64b6def8.png",
    ];

    this.loader = new THREE.TextureLoader();
    this.threejsGeo = new THREE.BoxGeometry(this.w, this.h, this.l);
    this.material = new THREE.MeshPhongMaterial({
      //color: this.color,
      map: this.loader.load(
        this.textures[Math.floor(Math.random() * this.textures.length)]
      ),

      depthWrite: true,
    });
    this.threejsMesh = new THREE.Mesh(this.threejsGeo, this.material);

    scene.add(this.threejsMesh);

    this.wireframeGeo = new THREE.EdgesGeometry(this.threejsGeo);
    this.wireframeMat = new THREE.LineBasicMaterial({
      color: new THREE.Color("rgb(0,200,0)"),
      linewidth: 4,
    });
    this.wireframe = new THREE.LineSegments(
      this.wireframeGeo,
      this.wireframeMat
    );
    scene.add(this.wireframe);
  }
  // draw() {
  //     //hitbox
  //     this.cannonBody = new CANNON.Body({
  //       mass: this.m,
  //       shape: new CANNON.Box(new CANNON.Vec3(this.w/2,this.h/2,this.l/2))
  //     });
  //     this.cannonBody.position.set(this.x,this.y,this.z);
  //     rotateCannon(this.cannonBody,'x',this.r[0])
  //     rotateCannon(this.cannonBody,'y',this.r[1])
  //     rotateCannon(this.cannonBody,'z',this.r[2])
  //     world.addBody(this.cannonBody);

  //     //box
  //     this.threejsGeo = new THREE.BoxGeometry(this.w,this.h,this.l);
  //     this.material = new THREE.MeshPhongMaterial({
  //       //color: this.color,
  //       map: this.loader.load("https://art.pixilart.com/8958a2c64b6def8.png"),

  //       depthWrite: true,
  //     });
  //     this.threejsMesh = new THREE.Mesh(this.threejsGeo, this.material);
  //     scene.add(this.threejsMesh)

  //     //frame
  //     this.wireframeGeo = new THREE.EdgesGeometry( this.threejsGeo );
  //     this.wireframeMat = new THREE.LineBasicMaterial( { color:  new THREE.Color("rgb(0,200,0)"), linewidth: 4 } );
  //     this.wireframe = new THREE.LineSegments( this.wireframeGeo, this.wireframeMat );
  //     scene.add(this.wireframe)
  // }

  update() {
    this.threejsMesh.position.copy(this.cannonBody.position);
    this.threejsMesh.quaternion.copy(this.cannonBody.quaternion);

    this.wireframe.position.copy(this.cannonBody.position);
    this.wireframe.quaternion.copy(this.cannonBody.quaternion);
  }
}

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
      // transmission: .95,
      opacity: 0.5,
      reflectivity: 0.2,
      refractionRatio: 0.985,
      ior: 0.9,
      //side: THREE.DoubleSide,
      flatShading: true,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.reciveShadow = false;
    scene.add(this.mesh);

    //collision event listener
    bodyTemp.addEventListener("collide", function (e) {
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
      this.inputVelocity.z = -1;
    }
    if (keys["s"] && this.inputVelocity.z <= 0.2) {
      this.inputVelocity.z = 1;
    }
    if (keys["a"] && this.inputVelocity.x >= -0.2) {
      this.inputVelocity.x = -1;
    }
    if (keys["d"] && this.inputVelocity.x <= 0.2) {
      this.inputVelocity.x = 1;
    }
    this.body.velocity.z *= 0.9;
    this.body.velocity.x *= 0.9;
    if (keys[" "] && canJump) {
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
    this.yawObject.position.y +=
      (this.body.position.y - this.yawObject.position.y) / 4;
  }
}

// const tick = () => {
//   // stats.begin();

//   const elapsedTime = clock.getElapsedTime();

//   // Update controls
//   controls.update();

//   // Update time
//   waterMaterial.uniforms.uTime.value = elapsedTime;
//   // Render
//   renderer.render(scene, camera);

//   // stats.end();
//   // Call tick again on the next frame
//   window.requestAnimationFrame(tick);
// };

// tick();

class Program {
  constructor() {
    this.boxes = [];
    this.player = new Player();

    this.groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    });

    this.PlaneGeometry = new THREE.PlaneGeometry(1000, 1000);
    this.planeMaterial = new THREE.ShaderMaterial({
      uniforms: tuniform,
      vertexShader: vs,
      fragmentShader: fs,
    });
    this.planeMesh = new THREE.Mesh(this.PlaneGeometry, this.planeMaterial);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  }
  setup() {
    scene.background = new THREE.Color("rgb(25,25,25)");
    scene.fog = new THREE.Fog(0x222222, 0, 40);
    camera.position.set(0, 1, 5);
    world.gravity.set(0, -20, 0);

    //lighting
    this.directionalLight.position.set(0, 32, 64);
    scene.add(this.directionalLight);

    // ground
    this.groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // make it face up
    world.addBody(this.groundBody);

    this.planeMesh.position.copy(this.groundBody.position);
    this.planeMesh.quaternion.copy(this.groundBody.quaternion);
    scene.add(this.planeMesh);

    this.player.body.position.set(0, 10, 0);
    this.player.pitchObject.add(camera);

    //test collisions

    for (let i = 0; i < 100; i++) {
      this.boxes.push(
        new Box(
          25 - Math.random() * 50,
          25 - Math.random() * 50,
          50 - Math.random() * 100,
          Math.random(),
          1 + Math.random() * 10,
          Math.random() * 10,
          Math.random() * 10,
          [Math.random() * 90, Math.random() * 90, Math.random() * 90]
        )
      );
    }

    //floating block
    this.listeners();
  }
  listeners() {
    let e = new Event(document);
    e.keyPress(keys);
    e.getMouse(mouse);

    e.listener(
      "mousemove",
      (e) => {
        if (pointerLock) {
          this.player.yawObject.rotation.y -= e.movementX * 0.002;
          this.player.pitchObject.rotation.x -= e.movementY * 0.002;
          this.player.pitchObject.rotation.x = Math.max(
            -Math.PI / 2,
            Math.min(Math.PI / 8, this.player.pitchObject.rotation.x)
          );
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
      "click",
      () => {
        if (!pointerLock) {
          element.requestPointerLock();
        }
      },
      false
    );
    mouseLock();
    bg();

    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(element);
    document.body.appendChild(renderer.domElement);

    tuniform.iResolution.value.set(window.innerWidth, window.innerHeight);
  }
  playground() {
    for (let i = 0; i < this.boxes.length; i++) {
      this.boxes[i].update();
    }

    this.player.update();

    //esc key to leave game
    if (keys[27] && pointerLock) {
      document.exitPointerLock();
    }

    world.step(1 / 60);
    tuniform.iTime.value += clock.getDelta();

    renderer.render(scene, camera);
    //stats.showPanel(0);
  }
  update() {
    //stats.begin();
    this.playground();
    //stats.end();

    raf(() => {
      this.update();
    });
  }
}

(function () {
  let program = new Program();

  program.setup();
  program.update();
})();
