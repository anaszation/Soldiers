import * as THREE from 'three';
import { PaperCanvas } from './game/PaperCanvas';
import { SceneManager } from './game/SceneManager';
import { GameController } from './game/GameController';

window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  // 1. Initialize Dynamic 2D Paper Canvas
  const paperCanvas = new PaperCanvas();

  // 2. Initialize 3D Three.js Scene
  const sceneManager = new SceneManager(container, paperCanvas.texture);

  // 3. Initialize Core Game Controller
  const gameController = new GameController(sceneManager, paperCanvas);

  // 4. Main 60fps Animation Loop
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    sceneManager.update(delta);
  }

  animate();
  console.log('🎮 Soldiers (Paper War 1v1) initialized and ready!');
});
