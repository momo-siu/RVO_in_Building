import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export class ThreeFloorViewer {
  constructor(options = {}) {
    this.floorHeight = options.floorHeight || 3;
    this.wallHeight = options.wallHeight || 3;
    this.wallThickness = options.wallThickness || 0.25;
    this.showFloorPlates = !!options.showFloorPlates;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.container = null;
    this.animationId = null;
    this.disposeResize = null;
    this.buildingGroup = null;
    this.agentGroup = null;
    this.agentMeshes = new Map();
    this.clock = new THREE.Clock();
    this.floorFilter = null;
    this.onlyCurrentFloor = false;
    this.mapWidth = options.mapWidth || 100;
    this.mapHeight = options.mapHeight || 60;
    this.onZoomChange = null;
  }

  init(container) {
    if (!container) return;
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    // 设置相机初始位置，使地图中心在视野中央
    this.camera.position.set(this.mapWidth, this.mapWidth * 0.8, this.mapHeight);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    // 设置控制中心为地图中心
    this.controls.target.set(this.mapWidth / 2, 0, this.mapHeight / 2);
    
    this.controls.addEventListener('change', () => {
        if (this.onZoomChange && this.camera) {
            // 简单估算缩放倍数：初始距离 / 当前距离
            const initialDist = Math.sqrt(Math.pow(this.mapWidth, 2) + Math.pow(this.mapWidth * 0.8, 2) + Math.pow(this.mapHeight, 2));
            const currentDist = this.camera.position.distanceTo(this.controls.target);
            this.onZoomChange(initialDist / currentDist);
        }
    });

    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.75);
    directional.position.set(30, 50, 30);
    this.scene.add(directional);

    const grid = new THREE.GridHelper(200, 50, 0x334155, 0x1e293b);
    this.scene.add(grid);

    this.buildingGroup = new THREE.Group();
    this.agentGroup = new THREE.Group();
    this.scene.add(this.buildingGroup);
    this.scene.add(this.agentGroup);

    const onResize = () => this.resize();
    window.addEventListener('resize', onResize);
    this.disposeResize = () => window.removeEventListener('resize', onResize);

    this.animate();
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    if (this.controls) {
      this.controls.update(this.clock.getDelta());
    }
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  resize() {
    if (!this.container || !this.camera || !this.renderer) return;
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  setStaticScene({ rooms = [], exits = [], connectors = [] } = {}) {
    if (!this.buildingGroup) return;
    this.clearGroup(this.buildingGroup);

    // 计算场景包围盒，用于确定地面尺寸和视图中心
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    const samplePoint = (x, z) => {
      if (!Number.isFinite(x) || !Number.isFinite(z)) return;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    };

    (rooms || []).forEach((r) => {
      (Array.isArray(r.walls) ? r.walls : []).forEach((p) => {
        if (!p) return;
        const x = Number(p.x);
        const z = Number(p.y);
        if (x === -10000 || z === -10000) return;
        samplePoint(x, z);
      });
    });
    (exits || []).forEach((e) => {
      const x0 = Number(e.x0 || 0);
      const x1 = Number(e.x1 || x0);
      const y0 = Number(e.y0 || 0);
      const y1 = Number(e.y1 || y0);
      samplePoint(x0, y0);
      samplePoint(x1, y1);
    });

    if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minZ) || !Number.isFinite(maxZ)) {
      minX = 0;
      minZ = 0;
      maxX = this.mapWidth;
      maxZ = this.mapHeight;
    }

    const width = Math.max(maxX - minX, 10);
    const height = Math.max(maxZ - minZ, 10);
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // 更新地图尺寸，用于地面和相机
    this.mapWidth = width;
    this.mapHeight = height;

    // 为每一层添加地面
    const floorIds = new Set();
    rooms.forEach(r => floorIds.add(Number(r.floorId || 0)));
    exits.forEach(e => floorIds.add(Number(e.floorId || 0)));
    
    floorIds.forEach(fid => {
      const groundGeo = new THREE.PlaneGeometry(this.mapWidth, this.mapHeight);
      const groundMat = new THREE.MeshStandardMaterial({ 
          color: 0x1e293b, 
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.25
      });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(centerX, fid * this.floorHeight, centerZ);
      ground.userData.floorId = fid;
      ground.userData.isGround = true;
      this.buildingGroup.add(ground);
    });

    // 重新设置相机和控制中心，使 3D 视图总是围绕场景中心
    if (this.camera && this.controls) {
      const extent = Math.max(this.mapWidth, this.mapHeight);
      const dist = extent * 1.2;
      this.controls.target.set(centerX, 0, centerZ);
      this.camera.position.set(centerX + dist, dist * 0.8, centerZ + dist);
      this.camera.lookAt(this.controls.target);
    }

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.05,
      roughness: 0.75,
      transparent: false,
      opacity: 1
    });
    const wallEdgeMaterial = new THREE.LineBasicMaterial({ color: 0x0b1220, transparent: true, opacity: 0.7 });
    const exitMaterial = new THREE.MeshStandardMaterial({ color: 0x22c55e });
    const connectorMaterial = new THREE.MeshStandardMaterial({ color: 0xf59e0b });

    rooms.forEach((room) => {
      const rawWalls = Array.isArray(room.walls) ? room.walls : [];
      const walls = this.normalizeWallPoints(rawWalls);
      if (walls.length < 2) return;
      const floorId = Number(room.floorId || 0);
      const y = floorId * this.floorHeight;
      for (let i = 0; i < walls.length; i++) {
        const a = walls[i];
        const b = walls[(i + 1) % walls.length];
        if (!a || !b) continue;
        const ax = a.x;
        const az = a.z;
        const bx = b.x;
        const bz = b.z;
        const dx = bx - ax;
        const dz = bz - az;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len <= 1e-6) continue;
        const wallMesh = new THREE.Mesh(
          new THREE.BoxGeometry(len, this.wallHeight, this.wallThickness),
          wallMaterial.clone()
        );
        wallMesh.position.set((ax + bx) / 2, y + this.wallHeight / 2, (az + bz) / 2);
        wallMesh.rotation.y = Math.atan2(dz, dx);

        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(wallMesh.geometry), wallEdgeMaterial.clone());
        edges.position.copy(wallMesh.position);
        edges.rotation.copy(wallMesh.rotation);

        wallMesh.userData.floorId = floorId;
        edges.userData.floorId = floorId;
        this.buildingGroup.add(wallMesh);
        this.buildingGroup.add(edges);
      }

      if (this.showFloorPlates) {
        const floorPlate = this.createFloorPlate(rawWalls, y);
        if (floorPlate) {
          floorPlate.userData.floorId = floorId;
          this.buildingGroup.add(floorPlate);
        }
      }
    });

    exits.forEach((exit) => {
      const x0 = Number(exit.x0 || 0);
      const y0 = Number(exit.y0 || 0);
      const x1 = Number(exit.x1 || 0);
      const y1 = Number(exit.y1 || 0);
      const floorId = Number(exit.floorId || 0);
      const centerX = (x0 + x1) / 2;
      const centerZ = (y0 + y1) / 2;
      const width = Math.max(Math.abs(x1 - x0), 0.5);
      const depth = Math.max(Math.abs(y1 - y0), 0.5);
      const marker = new THREE.Mesh(new THREE.BoxGeometry(width, 0.2, depth), exitMaterial.clone());
      marker.position.set(centerX, floorId * this.floorHeight + 0.1, centerZ);
      marker.userData.floorId = floorId;
      this.buildingGroup.add(marker);
    });

    connectors.forEach((connector) => {
      const fromFloor = Number(connector.fromFloor || 0);
      const toFloor = Number(connector.toFloor || 0);
      const entryX = Number(connector.entryX || connector.x || 0);
      const entryZ = Number(connector.entryY || connector.y || 0);
      const exitX = Number(connector.exitX || entryX);
      const exitZ = Number(connector.exitY || entryZ);
      const start = new THREE.Vector3(entryX, fromFloor * this.floorHeight + 0.25, entryZ);
      const end = new THREE.Vector3(exitX, toFloor * this.floorHeight + 0.25, exitZ);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([start, end]),
        new THREE.LineBasicMaterial({ color: 0xf59e0b })
      );
      line.userData.floorIds = [fromFloor, toFloor];
      this.buildingGroup.add(line);
      const node = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 10), connectorMaterial.clone());
      node.position.copy(start);
      node.userData.floorIds = [fromFloor, toFloor];
      this.buildingGroup.add(node);
    });

    this.applyFloorFilterToScene();
  }

  setFloorFilter(floorIdOrNull, onlyCurrentFloor = false) {
    this.floorFilter = floorIdOrNull;
    this.onlyCurrentFloor = !!onlyCurrentFloor;
    this.applyFloorFilterToScene();
  }

  applyFloorFilterToScene() {
    const focusFloor = this.floorFilter;
    const hideOthers = this.onlyCurrentFloor;
    const visibleOpacity = 1;
    const dimOpacity = 0.25;

    const setVisibility = (obj, visible, opacity) => {
      // 如果开启了“只看当前层”，则不满足条件的直接隐藏
      if (hideOthers && !visible) {
        obj.visible = false;
        return;
      }
      
      obj.visible = true;
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => {
            if (m.transparent !== undefined) m.transparent = opacity < 1;
            if (m.opacity !== undefined) m.opacity = opacity;
          });
        } else {
          if (obj.material.transparent !== undefined) obj.material.transparent = opacity < 1;
          if (obj.material.opacity !== undefined) obj.material.opacity = opacity;
        }
      }
    };

    if (this.buildingGroup) {
      this.buildingGroup.traverse((child) => {
        if (!child.userData && !child.geometry) return;
        const fid = child.userData.floorId;
        const fids = child.userData.floorIds;
        
        if (focusFloor == null) {
          setVisibility(child, true, visibleOpacity);
          return;
        }
        
        const onFocusFloor = fid === focusFloor || (fids && fids.indexOf(focusFloor) !== -1);
        setVisibility(child, onFocusFloor, onFocusFloor ? visibleOpacity : dimOpacity);
      });
    }

    if (this.agentGroup) {
      this.agentGroup.traverse((child) => {
        const fid = child.userData.floorId;
        if (focusFloor == null) {
          setVisibility(child, true, visibleOpacity);
          return;
        }
        const onFocusFloor = fid === focusFloor;
        setVisibility(child, onFocusFloor, onFocusFloor ? visibleOpacity : dimOpacity);
      });
    }
  }

  updateAgents(agents = []) {
    if (!this.agentGroup) return;
    const liveIds = new Set();
    agents.forEach((agent) => {
      const id = Number(agent.id);
      if (Number.isNaN(id)) return;
      liveIds.add(id);
      let mesh = this.agentMeshes.get(id);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.18, 0.5, 4, 8),
          new THREE.MeshStandardMaterial({ color: 0xf97316 })
        );
        this.agentGroup.add(mesh);
        this.agentMeshes.set(id, mesh);
      }
      const floorId = Number(agent.floorId || 0);
      mesh.userData.floorId = floorId;
      mesh.position.set(Number(agent.x || 0), floorId * this.floorHeight + 0.45, Number(agent.y || 0));
    });

    for (const [id, mesh] of this.agentMeshes.entries()) {
      if (!liveIds.has(id)) {
        this.agentGroup.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        this.agentMeshes.delete(id);
      }
    }

    this.applyFloorFilterToScene();
  }

  createFloorPlate(walls, y) {
    const pts = this.normalizeWallPoints(walls);
    if (pts.length < 3) return null;
    const shape = new THREE.Shape();
    let started = false;
    pts.forEach((point, index) => {
      if (!point) return;
      const x = Number(point.x || 0);
      const z = Number(point.z || 0);
      if (!started || index === 0) {
        shape.moveTo(x, z);
        started = true;
      } else {
        shape.lineTo(x, z);
      }
    });
    if (!started) return null;
    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshStandardMaterial({ color: 0x1e293b, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = y;
    return mesh;
  }

  normalizeWallPoints(rawWalls) {
    const pts = [];
    const isValidNum = (v) => typeof v === 'number' && Number.isFinite(v);
    const pushIfValid = (x, z) => {
      if (!isValidNum(x) || !isValidNum(z)) return;
      if (x === -10000 || z === -10000) return;
      const last = pts[pts.length - 1];
      if (last && Math.abs(last.x - x) < 1e-6 && Math.abs(last.z - z) < 1e-6) return;
      pts.push({ x, z });
    };

    (Array.isArray(rawWalls) ? rawWalls : []).forEach((p) => {
      if (!p) return;
      const x = Number(p.x);
      const z = Number(p.y);
      pushIfValid(x, z);
    });

    if (pts.length >= 2) {
      const first = pts[0];
      const last = pts[pts.length - 1];
      if (first && last && Math.abs(first.x - last.x) < 1e-6 && Math.abs(first.z - last.z) < 1e-6) {
        pts.pop();
      }
    }

    return pts;
  }

  clearGroup(group) {
    while (group.children.length > 0) {
      const child = group.children.pop();
      if (!child) continue;
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  }

  dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.disposeResize) {
      this.disposeResize();
      this.disposeResize = null;
    }
    if (this.buildingGroup) this.clearGroup(this.buildingGroup);
    if (this.agentGroup) this.clearGroup(this.agentGroup);
    this.agentMeshes.clear();
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
    this.container = null;
  }
}
