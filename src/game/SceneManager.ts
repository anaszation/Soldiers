import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PaperFoldEngine } from './PaperFoldEngine';
import { PlayerColor } from './types';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public paperFold: PaperFoldEngine;

  private loader: GLTFLoader = new GLTFLoader();
  private bluePenMesh: THREE.Group | null = null;
  private redPenMesh: THREE.Group | null = null;
  private activePenMesh: THREE.Group | null = null;
  private deskSceneMesh: THREE.Group | null = null;

  // Raycasting
  public raycaster: THREE.Raycaster = new THREE.Raycaster();
  public mousePos: THREE.Vector2 = new THREE.Vector2(-999, -999);
  private paperContactPoint: THREE.Vector3 = new THREE.Vector3(0, 0, 0.002);
  public isPenWriting: boolean = false;

  // Camera views
  private currentCameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private targetCameraPos: THREE.Vector3 = new THREE.Vector3(0, -0.01, 0.38); // Default tactical top-down
  public isTacticalView: boolean = true;

  constructor(container: HTMLElement, paperTexture: THREE.CanvasTexture) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#191009'); // Warm dark study ambiance

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.05, 10);
    this.camera.position.set(0, -0.01, 0.38);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    // Setup Lighting
    this.setupLighting();

    // Setup 3D Paper Plane
    this.paperFold = new PaperFoldEngine(paperTexture);
    this.scene.add(this.paperFold.mesh);

    // Load Blender 3D Models
    this.loadModels();

    // Window Resize Handler
    window.addEventListener('resize', () => this.onWindowResize(container));
  }

  private setupLighting() {
    // Ambient fill light (warm classroom morning)
    const ambientLight = new THREE.AmbientLight(0xfff1dc, 0.7);
    this.scene.add(ambientLight);

    // Desk Lamp Spotlight (Warm directional beam from top-right)
    const lampLight = new THREE.SpotLight(0xffecd0, 4.5);
    lampLight.position.set(0.18, 0.10, 0.28);
    lampLight.target.position.set(0, 0, 0);
    lampLight.angle = Math.PI / 4;
    lampLight.penumbra = 0.45;
    lampLight.castShadow = true;
    lampLight.shadow.mapSize.width = 2048;
    lampLight.shadow.mapSize.height = 2048;
    lampLight.shadow.bias = -0.0001;
    this.scene.add(lampLight);
    this.scene.add(lampLight.target);

    // Subtle blue fill from window side
    const windowFill = new THREE.DirectionalLight(0xd6e5ff, 0.4);
    windowFill.position.set(-0.35, -0.25, 0.3);
    this.scene.add(windowFill);
  }

  private loadModels() {
    // 1. Desk Scene Model
    this.loader.load('/models/desk_scene.glb', (gltf) => {
      this.deskSceneMesh = gltf.scene;
      this.deskSceneMesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      this.scene.add(this.deskSceneMesh);
    });

    // 2. Ballpoint Pen Blue
    this.loader.load('/models/ballpoint_pen_blue.glb', (gltf) => {
      this.bluePenMesh = gltf.scene;
      this.bluePenMesh.scale.set(0.7, 0.7, 0.7);
      this.bluePenMesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
        }
      });
      this.scene.add(this.bluePenMesh);
      this.setActivePen('blue');
    });

    // 3. Ballpoint Pen Red
    this.loader.load('/models/ballpoint_pen_red.glb', (gltf) => {
      this.redPenMesh = gltf.scene;
      this.redPenMesh.scale.set(0.7, 0.7, 0.7);
      this.redPenMesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
        }
      });
      this.redPenMesh.visible = false;
      this.scene.add(this.redPenMesh);
    });
  }

  public setActivePen(color: PlayerColor) {
    if (color === 'blue') {
      if (this.bluePenMesh) this.bluePenMesh.visible = true;
      if (this.redPenMesh) this.redPenMesh.visible = false;
      this.activePenMesh = this.bluePenMesh;
    } else {
      if (this.bluePenMesh) this.bluePenMesh.visible = false;
      if (this.redPenMesh) this.redPenMesh.visible = true;
      this.activePenMesh = this.redPenMesh;
    }
  }

  public toggleCameraView(): boolean {
    this.isTacticalView = !this.isTacticalView;
    if (this.isTacticalView) {
      // Tactical Top-down: straight above paper
      this.targetCameraPos.set(0, -0.01, 0.38);
      this.currentCameraTarget.set(0, 0, 0);
    } else {
      // Cinematic Perspective: showing desk lamp, eraser, warm wood grain
      this.targetCameraPos.set(0, -0.24, 0.28);
      this.currentCameraTarget.set(0, 0.02, 0);
    }
    return this.isTacticalView;
  }

  public raycastPaper(screenX: number, screenY: number): { u: number; v: number; point: THREE.Vector3 } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mousePos.x = ((screenX - rect.left) / rect.width) * 2 - 1;
    this.mousePos.y = -((screenY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mousePos, this.camera);
    const intersects = this.raycaster.intersectObject(this.paperFold.mesh);

    if (intersects.length > 0 && intersects[0].uv) {
      this.paperContactPoint.copy(intersects[0].point);
      return {
        u: intersects[0].uv.x,
        v: intersects[0].uv.y,
        point: intersects[0].point,
      };
    }
    return null;
  }

  private onWindowResize(container: HTMLElement) {
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  public update(deltaTime: number) {
    // 1. Update Paper Folding Physics
    this.paperFold.update(deltaTime);

    // 2. Smooth Camera Interpolation (Damping)
    this.camera.position.lerp(this.targetCameraPos, deltaTime * 5.0);
    this.camera.lookAt(this.currentCameraTarget);

    // 3. Update 3D Pen Movement & Natural Tilt
    if (this.activePenMesh) {
      const targetPos = this.paperContactPoint.clone();

      if (this.isPenWriting) {
        // Pen tip touches paper
        targetPos.z = 0.003;
      } else {
        // Pen hovers comfortably above paper
        targetPos.z = 0.035;
      }

      this.activePenMesh.position.lerp(targetPos, deltaTime * 14.0);

      // Natural 45-degree handwriting tilt
      this.activePenMesh.rotation.x = THREE.MathUtils.lerp(
        this.activePenMesh.rotation.x,
        this.isPenWriting ? Math.PI / 3.8 : Math.PI / 4.5,
        deltaTime * 10
      );
      this.activePenMesh.rotation.y = THREE.MathUtils.lerp(
        this.activePenMesh.rotation.y,
        0.18,
        deltaTime * 10
      );
    }

    // 4. Render Frame
    this.renderer.render(this.scene, this.camera);
  }
}
