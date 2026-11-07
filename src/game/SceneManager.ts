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
  public activePenMesh: THREE.Group | null = null;
  public activePenColor: PlayerColor = 'blue';
  private deskSceneMesh: THREE.Group | null = null;

  // Pen Dock Positions on the Wooden Desk
  private blueDockPos = new THREE.Vector3(-0.25, -0.07, 0.003);
  private blueDockRot = new THREE.Vector3(0, 0, Math.PI / 7);
  private redDockPos = new THREE.Vector3(0.25, -0.07, 0.003);
  private redDockRot = new THREE.Vector3(0, 0, -Math.PI / 7);

  // Pen State: when false, pen rests in desk dock!
  public isPenActiveOnPaper: boolean = false;
  public isPenWriting: boolean = false;

  // Raycasting & Pen Dynamics
  public raycaster: THREE.Raycaster = new THREE.Raycaster();
  public mousePos: THREE.Vector2 = new THREE.Vector2(-999, -999);
  public paperContactPoint: THREE.Vector3 = new THREE.Vector3(-0.06, 0.0, 0.002);

  // Camera views
  private currentCameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0.018, 0);
  private targetCameraPos: THREE.Vector3 = new THREE.Vector3(0, -0.015, 0.48); // Tactical Top-down
  public isTacticalView: boolean = true;

  constructor(
    container: HTMLElement,
    frontTexture: THREE.CanvasTexture,
    backTexture: THREE.CanvasTexture
  ) {
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

    // Setup 3D Paper Plane (With two-sided front & back textures)
    this.paperFold = new PaperFoldEngine(frontTexture, backTexture);
    this.scene.add(this.paperFold.rootGroup);

    // Setup High-Fidelity Bic Ballpoint Pens
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

    // Initial parked dock position
    if (color === 'blue') {
      penGroup.position.copy(this.blueDockPos);
      penGroup.rotation.set(0, 0, this.blueDockRot.z);
    } else {
      penGroup.position.copy(this.redDockPos);
      penGroup.rotation.set(0, 0, this.redDockRot.z);
    }

    return penGroup;
  }

  private setupBallpointPens() {
    this.bluePenMesh = this.createBicPen('blue');
    this.scene.add(this.bluePenMesh);

    this.redPenMesh = this.createBicPen('red');
    this.scene.add(this.redPenMesh);

    this.activePenMesh = this.bluePenMesh;
    this.activePenColor = 'blue';
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
    this.activePenColor = color;
    if (color === 'blue') {
      this.activePenMesh = this.bluePenMesh;
    } else {
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

    // 3. Update Blue Pen (Active on paper OR docked on left desk)
    if (this.bluePenMesh) {
      if (this.activePenColor === 'blue' && this.isPenActiveOnPaper) {
        // Aiming / writing on paper
        const targetPos = this.paperContactPoint.clone();
        targetPos.z = this.isPenWriting ? 0.0018 : 0.0065;
        this.bluePenMesh.position.lerp(targetPos, deltaTime * 16.0);

        const targetRotX = this.isPenWriting ? Math.PI / 3.4 : Math.PI / 3.7;
        this.bluePenMesh.rotation.x = THREE.MathUtils.lerp(this.bluePenMesh.rotation.x, targetRotX, deltaTime * 12);
        this.bluePenMesh.rotation.z = THREE.MathUtils.lerp(this.bluePenMesh.rotation.z, -Math.PI / 14, deltaTime * 12);
      } else {
        // Smoothly return to left desk dock
        this.bluePenMesh.position.lerp(this.blueDockPos, deltaTime * 8.0);
        this.bluePenMesh.rotation.x = THREE.MathUtils.lerp(this.bluePenMesh.rotation.x, 0, deltaTime * 8);
        this.bluePenMesh.rotation.z = THREE.MathUtils.lerp(this.bluePenMesh.rotation.z, this.blueDockRot.z, deltaTime * 8);
      }
    }

    // 4. Update Red Pen (Active on paper OR docked on right desk)
    if (this.redPenMesh) {
      if (this.activePenColor === 'red' && this.isPenActiveOnPaper) {
        // Aiming / writing on paper
        const targetPos = this.paperContactPoint.clone();
        targetPos.z = this.isPenWriting ? 0.0018 : 0.0065;
        this.redPenMesh.position.lerp(targetPos, deltaTime * 16.0);

        const targetRotX = this.isPenWriting ? Math.PI / 3.4 : Math.PI / 3.7;
        this.redPenMesh.rotation.x = THREE.MathUtils.lerp(this.redPenMesh.rotation.x, targetRotX, deltaTime * 12);
        this.redPenMesh.rotation.z = THREE.MathUtils.lerp(this.redPenMesh.rotation.z, -Math.PI / 14, deltaTime * 12);
      } else {
        // Smoothly return to right desk dock
        this.redPenMesh.position.lerp(this.redDockPos, deltaTime * 8.0);
        this.redPenMesh.rotation.x = THREE.MathUtils.lerp(this.redPenMesh.rotation.x, 0, deltaTime * 8);
        this.redPenMesh.rotation.z = THREE.MathUtils.lerp(this.redPenMesh.rotation.z, this.redDockRot.z, deltaTime * 8);
      }
    }

    // 5. Render Frame
    this.renderer.render(this.scene, this.camera);
  }
}
