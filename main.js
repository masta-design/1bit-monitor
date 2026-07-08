import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const canvas = document.querySelector("#hero-canvas");
const visual = document.querySelector(".hero__visual");
const status = document.querySelector("#scene-status");
const loaderElement = document.querySelector("#model-loader");
const loaderLabel = document.querySelector("#model-loader-label");

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;

const modelRoot = new THREE.Group();
scene.add(modelRoot);
const modelFramingBox = new THREE.Box3();
const modelFramingCorners = Array.from({ length: 8 }, () => new THREE.Vector3());

const hemiLight = new THREE.HemisphereLight(0xffffff, 0xc8bda8, 1.9);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 3.8);
keyLight.position.set(3.2, 4.5, 4.6);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.radius = 8;
keyLight.shadow.blurSamples = 18;
keyLight.shadow.bias = -0.00004;
keyLight.shadow.normalBias = 0.06;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 18;
keyLight.shadow.camera.left = -5;
keyLight.shadow.camera.right = 5;
keyLight.shadow.camera.top = 5;
keyLight.shadow.camera.bottom = -5;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xf0f7ff, 1.7);
rimLight.position.set(-4.5, 2.2, -2.6);
scene.add(rimLight);

const fillLight = new THREE.PointLight(0xe50071, 35, 12);
fillLight.position.set(-2.4, 1.1, 3.6);
scene.add(fillLight);

const pointer = new THREE.Vector2(0, 0);
const easedPointer = new THREE.Vector2(0, 0);
const clock = new THREE.Clock();
const screenVideo = document.createElement("video");
screenVideo.src = "./assets/monitor-site.mp4";
screenVideo.muted = true;
screenVideo.loop = true;
screenVideo.playsInline = true;
screenVideo.preload = "auto";

let topCrt = null;
let topCrtBaseRotation = null;
let modelReady = false;
let modelRootBaseY = -0.32;

const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();

dracoLoader.setDecoderPath("./vendor/draco/");
loader.setDRACOLoader(dracoLoader);

loader.load(
  "./assets/monitor-site.glb",
  (gltf) => {
    const model = gltf.scene;
    const topCrtNode = model.getObjectByName("Top-CRT");

    applyVideoTextureToScreen(model);

    model.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;

        if (object.material) {
          object.material.needsUpdate = true;
        }
      }
    });

    fitModelToViewport(model);
    modelRoot.add(model);

    topCrt = topCrtNode;
    topCrtBaseRotation = topCrtNode ? topCrtNode.rotation.clone() : null;
    modelReady = true;

    visual.classList.add("is-loaded");
    loaderElement.classList.add("is-hidden");
    status.textContent = topCrtNode ? "" : "Узел Top-CRT не найден";
    status.classList.toggle("is-hidden", Boolean(topCrtNode));
    resize();
  },
  (event) => {
    if (!event.lengthComputable) {
      return;
    }

    const progress = Math.min(99, Math.round((event.loaded / event.total) * 100));
    loaderLabel.textContent = `Загрузка компьютера ${progress}%`;
  },
  (error) => {
    console.error(error);
    visual.classList.add("is-loaded");
    loaderElement.classList.add("is-hidden");
    status.textContent = "Не удалось загрузить 3D-модель";
    status.classList.remove("is-hidden");
  }
);

function applyVideoTextureToScreen(model) {
  const screenNode = model.getObjectByName("Screen");

  if (!screenNode) {
    return;
  }

  const videoTexture = new THREE.VideoTexture(screenVideo);
  videoTexture.colorSpace = THREE.SRGBColorSpace;
  videoTexture.flipY = false;
  videoTexture.generateMipmaps = false;
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;

  const screenMaterial = new THREE.MeshPhysicalMaterial({
    map: videoTexture,
    emissive: 0xffffff,
    emissiveIntensity: 0.55,
    emissiveMap: videoTexture,
    metalness: 0,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    reflectivity: 0.55,
    toneMapped: false
  });

  screenNode.traverse((object) => {
    if (object.isMesh) {
      object.material = screenMaterial;
    }
  });

  screenVideo.play().catch(() => {});
}

function fitModelToViewport(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z);
  const scale = 4.2 / maxAxis;

  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
}

function resize() {
  const rect = visual.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const aspect = width / height;
  const viewportWidth = window.innerWidth;
  const isTablet = viewportWidth <= 900 && viewportWidth > 560;
  const isMobile = viewportWidth <= 560;
  const rootScale = isMobile ? 1.16 : isTablet ? 1.16 : 1.2;

  renderer.setSize(width, height, false);

  modelRoot.position.set(isMobile ? 0 : isTablet ? 0 : 0.08, isMobile ? -0.04 : isTablet ? -0.02 : -0.02, 0);
  modelRootBaseY = isMobile ? -0.08 : isTablet ? -0.1 : -0.12;
  modelRoot.rotation.set(0, modelRootBaseY, 0);
  modelRoot.scale.setScalar(rootScale);
  camera.position.set(isMobile ? 6.8 : 7.6, isMobile ? 5.2 : 5.8, isMobile ? 6.8 : 7.6);
  camera.lookAt(0, isMobile ? -0.05 : -0.08, 0);

  modelFramingBox.setFromObject(modelRoot);
  const cameraBounds = getCameraSpaceBounds(modelFramingBox, camera);

  const containerWidthFill = isMobile ? 1.3 : isTablet ? 1.22 : 1.34;
  const containerHeightFill = isMobile ? 1.2 : isTablet ? 1.16 : 1.24;
  const viewHeight = Math.max(
    cameraBounds.width / (containerWidthFill * aspect),
    cameraBounds.height / containerHeightFill
  );
  const viewWidth = viewHeight * aspect;
  const horizontalOffset = viewWidth * 0.05;
  const verticalOffset = viewHeight * (isMobile ? 0.14 : isTablet ? 0.15 : 0.16);

  camera.left = cameraBounds.centerX - viewWidth / 2 - horizontalOffset;
  camera.right = cameraBounds.centerX + viewWidth / 2 - horizontalOffset;
  camera.top = cameraBounds.centerY + viewHeight / 2 - verticalOffset;
  camera.bottom = cameraBounds.centerY - viewHeight / 2 - verticalOffset;
  camera.updateProjectionMatrix();
}

function getCameraSpaceBounds(box, activeCamera) {
  const { min, max } = box;

  modelFramingCorners[0].set(min.x, min.y, min.z);
  modelFramingCorners[1].set(min.x, min.y, max.z);
  modelFramingCorners[2].set(min.x, max.y, min.z);
  modelFramingCorners[3].set(min.x, max.y, max.z);
  modelFramingCorners[4].set(max.x, min.y, min.z);
  modelFramingCorners[5].set(max.x, min.y, max.z);
  modelFramingCorners[6].set(max.x, max.y, min.z);
  modelFramingCorners[7].set(max.x, max.y, max.z);

  activeCamera.updateMatrixWorld();
  const cameraMatrixInverse = activeCamera.matrixWorldInverse;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const corner of modelFramingCorners) {
    corner.applyMatrix4(cameraMatrixInverse);
    minX = Math.min(minX, corner.x);
    maxX = Math.max(maxX, corner.x);
    minY = Math.min(minY, corner.y);
    maxY = Math.max(maxY, corner.y);
  }

  return {
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  };
}

function updatePointer(clientX, clientY) {
  const rect = visual.getBoundingClientRect();
  pointer.x = THREE.MathUtils.clamp(((clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
  pointer.y = THREE.MathUtils.clamp(-(((clientY - rect.top) / rect.height) * 2 - 1), -1, 1);
}

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();
  easedPointer.lerp(pointer, 0.07);

  if (modelReady) {
    modelRoot.rotation.y = modelRootBaseY + Math.sin(elapsed * 0.45) * 0.006;
  }

  if (topCrt && topCrtBaseRotation) {
    const maxYawLeft = THREE.MathUtils.degToRad(47.25);
    const maxYawRight = THREE.MathUtils.degToRad(15.75);
    const maxPitchUp = THREE.MathUtils.degToRad(20.25);
    const maxPitchDown = THREE.MathUtils.degToRad(6.75);
    const yawLimit = easedPointer.x > 0 ? maxYawLeft : maxYawRight;
    const pitchLimit = easedPointer.y > 0 ? maxPitchUp : maxPitchDown;
    const targetY = topCrtBaseRotation.y + easedPointer.x * yawLimit;
    const targetX = topCrtBaseRotation.x - easedPointer.y * pitchLimit;

    topCrt.rotation.y = THREE.MathUtils.lerp(topCrt.rotation.y, targetY, 0.09);
    topCrt.rotation.x = THREE.MathUtils.lerp(topCrt.rotation.x, targetX, 0.09);
  }

  renderer.render(scene, camera);
}

window.addEventListener("resize", resize);
window.addEventListener("pointerdown", () => screenVideo.play().catch(() => {}), { once: true });
window.addEventListener("pointermove", (event) => updatePointer(event.clientX, event.clientY), { passive: true });
window.addEventListener(
  "touchmove",
  (event) => {
    if (event.touches[0]) {
      updatePointer(event.touches[0].clientX, event.touches[0].clientY);
    }
  },
  { passive: true }
);

resize();
animate();
