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

  // Raycasting & Pen Dynamics
  public raycaster: THREE.Raycaster = new THREE.Raycaster();
  public mousePos: THREE.Vector2 = new THREE.Vector2(-999, -999);
  private paperContactPoint: THREE.Vector3 = new THREE.Vector3(0, 0, 0.002);
  public isPenWriting: boolean = false;

  // Camera views
  private currentCameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0.018, 0);
  private targetCameraPos: THREE.Vector3 = new THREE.Vector3(0, -0.015, 0.48); // Tactical Top-down
  public isTacticalView: boolean = true;

  constructor(container: HTMLElement, paperTexture: THREE.CanvasTexture) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#191009'); // Warm dark study ambiance

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.05, 10);
    this.camera.position.set(0, -0.015, 0.48);
    this.camera.lookAt(0, 0.018, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    // Setup Lighting
    this.setupLighting();

    // Setup 3D Paper Plane
    this.paperFold = new PaperFoldEngine(paperTexture);
    this.scene.add(this.paperFold.mesh);

    // Setup High-Fidelity Ballpoint Pens
    this.setupBallpointPens();

    // Load Blender 3D Desk Environment
    this.loadDeskModel();

    // Window Resize Handler
    window.addEventListener('resize', () => this.onWindowResize(container));
  }

  private setupLighting() {
    // Warm ambient fill for crystal-clear notebook readability
    const ambientLight = new THREE.AmbientLight(0xfff7ee, 1.35);
    this.scene.add(ambientLight);

    // Desk Lamp Soft Spotlight: Warm beam from upper right
    const lampLight = new THREE.SpotLight(0xffecd0, 1.3);
    lampLight.position.set(0.35, 0.25, 0.30);
    lampLight.target.position.set(0, 0.02, 0);
    lampLight.angle = Math.PI / 3;
    lampLight.penumbra = 0.8;
    lampLight.castShadow = true;
    lampLight.shadow.mapSize.width = 2048;
    lampLight.shadow.mapSize.height = 2048;
    lampLight.shadow.bias = -0.0001;
    this.scene.add(lampLight);
    this.scene.add(lampLight.target);

    // Soft window daylight fill from left
    const windowFill = new THREE.DirectionalLight(0xe8f0ff, 0.55);
    windowFill.position.set(-0.35, -0.25, 0.3);
    this.scene.add(windowFill);
  }

  /**
   * Constructs an authentic Bic Cristal ballpoint pen with exact tip pivot
   * Origin (0,0,0) is locked to the tungsten ballpoint tip!
   */
  private createBicPen(color: PlayerColor): THREE.Group {
    const penGroup = new THREE.Group();
    const inkColor = color === 'blue' ? 0x0a329e : 0xba1222;

    // 1. Tungsten Ballpoint Tip (At Origin 0,0,0)
    const ballGeo = new THREE.SphereGeometry(0.00065, 12, 12);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.95,
      roughness: 0.15,
    });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.position.set(0, 0.00065, 0);
    penGroup.add(ballMesh);

    // 2. Brass Conical Nose Nib
    const coneGeo = new THREE.CylinderGeometry(0.0034, 0.00075, 0.013, 16);
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Golden brass
      metalness: 0.88,
      roughness: 0.22,
    });
    const coneMesh = new THREE.Mesh(coneGeo, brassMat);
    coneMesh.position.set(0, 0.007, 0);
    coneMesh.castShadow = true;
    penGroup.add(coneMesh);

    // 3. Clear Faceted Hexagonal Body (Bic Cristal Barrel)
    const barrelGeo = new THREE.CylinderGeometry(0.0044, 0.0044, 0.118, 6);
    const plasticMat = new THREE.MeshPhysicalMaterial({
      color: 0xf5f8fc,
      transmission: 0.88,
      opacity: 0.65,
      transparent: true,
      roughness: 0.12,
      ior: 1.49,
      metalness: 0.02,
    });
    const barrelMesh = new THREE.Mesh(barrelGeo, plasticMat);
    barrelMesh.position.set(0, 0.0135 + 0.118 / 2, 0);
    barrelMesh.castShadow = true;
    penGroup.add(barrelMesh);

    // 4. Inner Ink Reservoir Tube (Filled with colored viscous ink)
    const inkGeo = new THREE.CylinderGeometry(0.0016, 0.0016, 0.105, 12);
    const inkMat = new THREE.MeshStandardMaterial({
      color: inkColor,
      roughness: 0.35,
      metalness: 0.05,
    });
    const inkMesh = new THREE.Mesh(inkGeo, inkMat);
    inkMesh.position.set(0, 0.0135 + 0.105 / 2, 0);
    penGroup.add(inkMesh);

    // 5. Classic Vented End Finial Plug
    const plugGeo = new THREE.CylinderGeometry(0.0042, 0.0042, 0.012, 12);
    const plugMat = new THREE.MeshStandardMaterial({
      color: inkColor,
      roughness: 0.4,
      metalness: 0.1,
    });
    const plugMesh = new THREE.Mesh(plugGeo, plugMat);
    plugMesh.position.set(0, 0.0135 + 0.118 + 0.006, 0);
    plugMesh.castShadow = true;
    penGroup.add(plugMesh);

    // Natural 48-degree handwriting lean toward player and slight right tilt
    penGroup.rotation.x = Math.PI / 3.7;
    penGroup.rotation.z = -Math.PI / 14;

    return penGroup;
  }

  private setupBallpointPens() {
    this.bluePenMesh = this.createBicPen('blue');
    this.scene.add(this.bluePenMesh);

    this.redPenMesh = this.createBicPen('red');
    this.redPenMesh.visible = false;
    this.scene.add(this.redPenMesh);

    this.activePenMesh = this.bluePenMesh;
  }

  private loadDeskModel() {
    this.loader.load('/models/desk_scene.glb', (gltf) => {
      this.deskSceneMesh = gltf.scene;
      // Align Blender Z-up coordinate system flat under paper
      this.deskSceneMesh.rotation.x = Math.PI / 2;
      this.deskSceneMesh.position.set(0, 0, -0.005);
      this.deskSceneMesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      this.scene.add(this.deskSceneMesh);
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
      // Tactical Top-down: full paper centered above bottom HUD
      this.targetCameraPos.set(0, -0.015, 0.48);
      this.currentCameraTarget.set(0, 0.018, 0);
    } else {
      // Cinematic Perspective: showing desk lamp, eraser, warm wood grain
      this.targetCameraPos.set(0, -0.26, 0.36);
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

    // 3. Update 3D Pen Movement & Natural Handwriting Tilt
    if (this.activePenMesh) {
      const targetPos = this.paperContactPoint.clone();

      if (this.isPenWriting) {
        // Pen tip touches paper directly
        targetPos.z = 0.002;
      } else {
        // Pen hovers naturally just 6mm above the paper (minimal parallax)
        targetPos.z = 0.007;
      }

      this.activePenMesh.position.lerp(targetPos, deltaTime * 16.0);

      // Natural handwriting tilt: leans back toward user and slightly right
      const targetRotX = this.isPenWriting ? Math.PI / 3.4 : Math.PI / 3.7;
      this.activePenMesh.rotation.x = THREE.MathUtils.lerp(
        this.activePenMesh.rotation.x,
        targetRotX,
        deltaTime * 10
      );
      this.activePenMesh.rotation.z = THREE.MathUtils.lerp(
        this.activePenMesh.rotation.z,
        -Math.PI / 14,
        deltaTime * 10
      );
    }

    // 4. Render Frame
    this.renderer.render(this.scene, this.camera);
  }
}
