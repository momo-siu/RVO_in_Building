import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export class ThreeFloorViewer {
  constructor(options = {}) {
    this.floorHeight = options.floorHeight || 150;
    this.wallHeight = options.wallHeight || 20;
    this.wallThickness = options.wallThickness || 5;
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
    this.agentTransitions = new Map();
    this.clock = new THREE.Clock();
    this.floorFilter = null;
    this.onlyCurrentFloor = false;
    this.mapWidth = options.mapWidth || 100;
    this.mapHeight = options.mapHeight || 60;
    this.agentStyle = this.normalizeAgentStyle(options.agentStyle);
    this.agentVisualConfig = this.normalizeAgentVisualConfig(options.agentVisualConfig);
    this.occlusionGrayPerLayer = Number.isFinite(Number(options.occlusionGrayPerLayer)) ? Number(options.occlusionGrayPerLayer) : 0.15;
    this.occlusionGrayMax = Number.isFinite(Number(options.occlusionGrayMax)) ? Number(options.occlusionGrayMax) : 0.9;
    this._cachedFloorIds = [];
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
        this.applyOcclusionShading({ agentsOnly: false });
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
    this.updateAgentTransitions();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  updateAgentTransitions() {
    if (!this.agentTransitions || this.agentTransitions.size === 0) return;
    const now = performance.now();
    for (const [id, state] of this.agentTransitions.entries()) {
      const mesh = state && state.mesh;
      if (!mesh) {
        this.agentTransitions.delete(id);
        continue;
      }
      const startTime = Number(state.startTime);
      const durationMs = Math.max(1, Number(state.durationMs) || 1);
      const t = (now - startTime) / durationMs;
      if (t >= 1) {
        mesh.position.copy(state.to);
        if (Number.isFinite(state.toFloorId)) {
          mesh.userData.floorId = state.toFloorId;
        }
        this.agentTransitions.delete(id);
        continue;
      }
      const clamped = Math.max(0, Math.min(1, t));
      mesh.position.lerpVectors(state.from, state.to, clamped);
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

  setStaticScene({ rooms = [], exits = [], peos = [] } = {}) {
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
    (peos || []).forEach((g) => {
      (Array.isArray(g.walls) ? g.walls : []).forEach((p) => {
        if (!p) return;
        const x = Number(p.x);
        const z = Number(p.y);
        if (x === -10000 || z === -10000) return;
        samplePoint(x, z);
      });
      (Array.isArray(g.peos) ? g.peos : []).forEach((p) => {
        if (!p) return;
        const x = Number(p.x);
        const z = Number(p.y);
        if (!Number.isFinite(x) || !Number.isFinite(z)) return;
        samplePoint(x, z);
      });
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
    (peos || []).forEach((g) => {
      const fid = Number(g && g.floorId);
      if (Number.isFinite(fid)) floorIds.add(fid);
    });
    this._cachedFloorIds = Array.from(floorIds).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
    
    floorIds.forEach(fid => {
      // 这里的尺寸可能太小，或者 centerX/centerZ 的计算在只有部分数据时有问题
      // 增加地面尺寸的缓冲，确保覆盖所有可能的区域
      const groundWidth = Math.max(this.mapWidth * 2, 500); 
      const groundHeight = Math.max(this.mapHeight * 2, 500);
      const groundGeo = new THREE.PlaneGeometry(groundWidth, groundHeight);
      const groundMat = new THREE.MeshStandardMaterial({ 
          color: 0x1e293b, 
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.5,
          depthWrite: false
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
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    });
    const wallEdgeMaterial = new THREE.LineBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.98 });
    
    // 集合点（安全区）材质 - 浅绿色
    const exitGroundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x86efac, 
      transparent: true, 
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4
    });

    rooms.forEach((room) => {
      const rawWalls = Array.isArray(room.walls) ? room.walls : [];
      if (rawWalls.length < 2) return;
      const floorId = Number(room.floorId || 0);
      const y = floorId * this.floorHeight;
      for (let i = 1; i < rawWalls.length; i++) {
        const a = rawWalls[i - 1];
        const b = rawWalls[i];
        if (!a || !b) continue;
        const ax = Number(a.x);
        const az = Number(a.y);
        const bx = Number(b.x);
        const bz = Number(b.y);
        if (!Number.isFinite(ax) || !Number.isFinite(az) || !Number.isFinite(bx) || !Number.isFinite(bz)) continue;
        if (ax === -10000 || az === -10000 || bx === -10000 || bz === -10000) continue;
        const dx = bx - ax;
        const dz = bz - az;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len <= 1e-6) continue;

        const wallMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(len, this.wallHeight),
          wallMaterial.clone()
        );
        wallMesh.position.set((ax + bx) / 2, y + this.wallHeight / 2, (az + bz) / 2);
        wallMesh.rotation.y = Math.atan2(-dz, dx);

        const edgeLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(ax, y + this.wallHeight + 0.01, az),
            new THREE.Vector3(bx, y + this.wallHeight + 0.01, bz)
          ]),
          wallEdgeMaterial.clone()
        );

        wallMesh.userData.floorId = floorId;
        edgeLine.userData.floorId = floorId;
        this.buildingGroup.add(wallMesh);
        this.buildingGroup.add(edgeLine);
      }

      if (this.showFloorPlates) {
        const floorPlate = this.createFloorPlate(rawWalls, y);
        if (floorPlate) {
          floorPlate.userData.floorId = floorId;
          this.buildingGroup.add(floorPlate);
        }
      }
    });

    // 集合点（安全区）：绿色地面
    exits.forEach((exit) => {
      const floorId = Number(exit.floorId || 0);
      // 2D 出口在前端是一个四边形（x0..x3, y0..y3），这里用其包围盒来得到安全区矩形
      const xs = [exit.x0, exit.x1, exit.x2, exit.x3].map((v) => Number(v)).filter((v) => Number.isFinite(v));
      const ys = [exit.y0, exit.y1, exit.y2, exit.y3].map((v) => Number(v)).filter((v) => Number.isFinite(v));
      if (xs.length < 2 || ys.length < 2) return;
      const minX = Math.min.apply(null, xs);
      const maxX = Math.max.apply(null, xs);
      const minZ = Math.min.apply(null, ys);
      const maxZ = Math.max.apply(null, ys);

      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;
      const width = Math.max(maxX - minX, 0.5);
      const depth = Math.max(maxZ - minZ, 0.5);
      const floorY = floorId * this.floorHeight;

      // 绿色地面
      const groundGeo = new THREE.PlaneGeometry(width, depth);
      const ground = new THREE.Mesh(groundGeo, exitGroundMaterial.clone());
      ground.rotation.x = -Math.PI / 2;
      // 仅抬高一点点避免 z-fighting
      ground.position.set(centerX, floorY + 0.03, centerZ);
      ground.userData.floorId = floorId;
      ground.userData.isExitZone = true;
      ground.renderOrder = 20;
      this.buildingGroup.add(ground);
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
    const focusFloorNum = focusFloor == null ? null : Number(focusFloor);
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
        const fid = Number(child.userData.floorId);
        const fidsRaw = child.userData.floorIds;
        const fids = Array.isArray(fidsRaw) ? fidsRaw.map((v) => Number(v)).filter((v) => Number.isFinite(v)) : null;
        const isMultiFloor = Array.isArray(fids) && fids.length > 1;
        const hasFloorId = Number.isFinite(fid);
        const hasFloorIds = Array.isArray(fids) && fids.length > 0;

        if (!hasFloorId && !hasFloorIds) {
          setVisibility(child, true, visibleOpacity);
          return;
        }

        if (focusFloorNum == null) {
          setVisibility(child, true, visibleOpacity);
          return;
        }
        
        const onFocusFloor = (hasFloorId && fid === focusFloorNum) || (fids && fids.indexOf(focusFloorNum) !== -1 && (!hideOthers || !isMultiFloor));
        setVisibility(child, onFocusFloor, onFocusFloor ? visibleOpacity : dimOpacity);
      });
    }

    if (this.agentGroup) {
      this.agentGroup.traverse((child) => {
        const fid = Number(child.userData.floorId);
        const hasFloorId = Number.isFinite(fid);
        if (!hasFloorId) {
          setVisibility(child, true, visibleOpacity);
          return;
        }
        if (focusFloorNum == null) {
          setVisibility(child, true, visibleOpacity);
          return;
        }
        const onFocusFloor = fid === focusFloorNum;
        setVisibility(child, onFocusFloor, onFocusFloor ? visibleOpacity : dimOpacity);
      });
    }
    this.applyOcclusionShading({ agentsOnly: false });
  }

  getFloorOcclusionLayers(floorId) {
    if (!Number.isFinite(Number(floorId)) || !this.camera) return 0;
    const fid = Number(floorId);
    const camY = Number(this.camera.position.y);
    if (!Number.isFinite(camY)) return 0;
    const floorY = fid * this.floorHeight;
    const floors = Array.isArray(this._cachedFloorIds) ? this._cachedFloorIds : [];
    if (floors.length === 0) return 0;

    let count = 0;
    if (camY >= floorY) {
      for (let i = 0; i < floors.length; i++) {
        const f = Number(floors[i]);
        if (!Number.isFinite(f)) continue;
        const fy = f * this.floorHeight;
        if (f > fid && fy <= camY) count++;
      }
    } else {
      for (let i = 0; i < floors.length; i++) {
        const f = Number(floors[i]);
        if (!Number.isFinite(f)) continue;
        const fy = f * this.floorHeight;
        if (f < fid && fy >= camY) count++;
      }
    }
    return count;
  }

  applyMaterialGray(material, grayFactor) {
    if (!material || !material.color) return;
    if (!material.userData) material.userData = {};
    if (material.userData.baseColor == null) {
      material.userData.baseColor = material.color.getHex();
    }
    const base = new THREE.Color(material.userData.baseColor);
    const gray = new THREE.Color(0x808080);
    material.color.copy(base).lerp(gray, grayFactor);
    material.needsUpdate = true;
  }

  applyGrayToObject(obj, grayFactor) {
    if (!obj || !obj.material) return;
    if (Array.isArray(obj.material)) {
      obj.material.forEach((m) => this.applyMaterialGray(m, grayFactor));
    } else {
      this.applyMaterialGray(obj.material, grayFactor);
    }
  }

  applyOcclusionShading({ agentsOnly = false } = {}) {
    const perLayer = Math.max(0, Number(this.occlusionGrayPerLayer) || 0);
    const maxGray = Math.max(0, Math.min(1, Number(this.occlusionGrayMax) || 0));
    const calcGray = (fid) => Math.min(maxGray, this.getFloorOcclusionLayers(fid) * perLayer);

    const shadeGroup = (group, skipGround = false) => {
      if (!group) return;
      group.traverse((child) => {
        if (!child || !child.visible || !child.material) return;
        if (skipGround && child.userData && child.userData.isGround) return;
        const fid = Number(child.userData && child.userData.floorId);
        if (!Number.isFinite(fid)) {
          this.applyGrayToObject(child, 0);
          return;
        }
        this.applyGrayToObject(child, calcGray(fid));
      });
    };

    if (!agentsOnly) {
      shadeGroup(this.buildingGroup, true);
    }
    shadeGroup(this.agentGroup, false);
  }

  normalizeAgentStyle(style) {
    if (style === 'none' || style === 'capsule') return 'none';
    return 'cylinder';
  }

  getDefaultAgentVisualConfig() {
    return {
      cylinder: {
        radius: 0.18,
        height: 0.8,
        radialSegments: 10
      },
      capsule: {
        radius: 0.18,
        length: 0.5,
        capSegments: 4,
        radialSegments: 8
      },
      human: {
        scale: 1
      }
    };
  }

  normalizePositiveNumber(value, fallback, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  normalizeInteger(value, fallback, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
  }

  normalizeAgentVisualConfig(config) {
    const defaults = this.getDefaultAgentVisualConfig();
    const src = config && typeof config === 'object' ? config : {};
    const cylinderSrc = src.cylinder && typeof src.cylinder === 'object' ? src.cylinder : {};
    const capsuleSrc = src.capsule && typeof src.capsule === 'object' ? src.capsule : {};
    const humanSrc = src.human && typeof src.human === 'object' ? src.human : {};

    return {
      cylinder: {
        radius: this.normalizePositiveNumber(cylinderSrc.radius, defaults.cylinder.radius, 0.01, 10),
        height: this.normalizePositiveNumber(cylinderSrc.height, defaults.cylinder.height, 0.01, 20),
        radialSegments: this.normalizeInteger(cylinderSrc.radialSegments, defaults.cylinder.radialSegments, 3, 128)
      },
      capsule: {
        radius: this.normalizePositiveNumber(capsuleSrc.radius, defaults.capsule.radius, 0.01, 10),
        length: this.normalizePositiveNumber(capsuleSrc.length, defaults.capsule.length, 0.01, 20),
        capSegments: this.normalizeInteger(capsuleSrc.capSegments, defaults.capsule.capSegments, 2, 64),
        radialSegments: this.normalizeInteger(capsuleSrc.radialSegments, defaults.capsule.radialSegments, 3, 128)
      },
      human: {
        scale: this.normalizePositiveNumber(humanSrc.scale, defaults.human.scale, 0.1, 10)
      }
    };
  }

  setAgentVisualConfig(config) {
    const next = this.normalizeAgentVisualConfig(config);
    const prevJson = JSON.stringify(this.agentVisualConfig || {});
    const nextJson = JSON.stringify(next);
    if (prevJson === nextJson) return;
    this.agentVisualConfig = next;
    this.clearAgentMeshes();
  }

  getAgentVisualByStyle(style = this.agentStyle) {
    const normalized = this.normalizeAgentStyle(style);
    return normalized === 'capsule' ? this.agentVisualConfig.capsule : this.agentVisualConfig.cylinder;
  }

  setAgentStyle(style) {
    const nextStyle = this.normalizeAgentStyle(style);
    if (this.agentStyle === nextStyle) return;
    this.agentStyle = nextStyle;
    this.clearAgentMeshes();
  }

  createAgentMesh() {
    const geometry = this.agentStyle === 'capsule'
      ? new THREE.CapsuleGeometry(
        this.getAgentVisualByStyle('capsule').radius,
        this.getAgentVisualByStyle('capsule').length,
        this.getAgentVisualByStyle('capsule').capSegments,
        this.getAgentVisualByStyle('capsule').radialSegments
      )
      : new THREE.CylinderGeometry(
        this.getAgentVisualByStyle('cylinder').radius,
        this.getAgentVisualByStyle('cylinder').radius,
        this.getAgentVisualByStyle('cylinder').height,
        this.getAgentVisualByStyle('cylinder').radialSegments
      );
    const material = new THREE.MeshStandardMaterial({ color: 0xf97316 });
    return new THREE.Mesh(geometry, material);
  }

  getAgentCenterYOffset() {
    if (this.agentStyle === 'capsule') {
      const cfg = this.getAgentVisualByStyle('capsule');
      return (cfg.length + cfg.radius * 2) / 2 + 0.01;
    }
    const cfg = this.getAgentVisualByStyle('cylinder');
    return cfg.height / 2 + 0.01;
  }

  clearAgentMeshes() {
    if (this.agentGroup) {
      this.clearGroup(this.agentGroup);
    }
    this.agentMeshes.clear();
    this.agentTransitions.clear();
  }

  updateAgents(agents = []) {
    if (!this.agentGroup) return;
    if (this.agentStyle === 'none') {
      if (this.agentMeshes.size > 0) {
        this.clearAgentMeshes();
      }
      this.applyFloorFilterToScene();
      return;
    }
    const liveIds = new Set();
    const yOffset = this.getAgentCenterYOffset();
    agents.forEach((agent) => {
      const id = Number(agent.id);
      if (Number.isNaN(id)) return;
      liveIds.add(id);
      const existingMesh = this.agentMeshes.get(id);
      let mesh = this.agentMeshes.get(id);
      if (!mesh) {
        mesh = this.createAgentMesh();
        this.agentGroup.add(mesh);
        this.agentMeshes.set(id, mesh);
      }
      const floorId = Number(agent.floorId || 0);
      const px = Number(agent.x || 0);
      const pz = Number(agent.y || 0);

      const worldX = Number(agent.worldX);
      const worldY = Number(agent.worldY);
      const worldZ = Number(agent.worldZ);
      const targetX = Number.isFinite(worldX) ? worldX : px;
      const targetZ = Number.isFinite(worldZ) ? worldZ : pz;
      const targetY = Number.isFinite(worldY) ? (worldY + yOffset) : (floorId * this.floorHeight + yOffset);

      const teleport = agent && typeof agent.teleport === 'object' ? agent.teleport : null;
      if (teleport && existingMesh) {
        const toFloorId = Number(teleport.floorId);
        const toX = Number.isFinite(Number(teleport.worldX)) ? Number(teleport.worldX) : Number(teleport.x);
        const toZ = Number.isFinite(Number(teleport.worldZ)) ? Number(teleport.worldZ) : Number(teleport.y);
        const rawToY = Number.isFinite(Number(teleport.worldY)) ? Number(teleport.worldY) : (toFloorId * this.floorHeight);
        const to = new THREE.Vector3(
          Number.isFinite(toX) ? toX : targetX,
          (Number.isFinite(rawToY) ? rawToY : floorId * this.floorHeight) + yOffset,
          Number.isFinite(toZ) ? toZ : targetZ
        );
        const durationMs = Math.max(1, Number(teleport.durationMs) || 350);
        const existing = this.agentTransitions.get(id);
        const shouldRestart = !existing || !existing.to || existing.to.distanceToSquared(to) > 1e-6;
        if (shouldRestart) {
          mesh.userData.floorId = Number.isFinite(Number(mesh.userData.floorId)) ? Number(mesh.userData.floorId) : floorId;
          this.agentTransitions.set(id, {
            mesh,
            from: mesh.position.clone(),
            to,
            startTime: performance.now(),
            durationMs,
            toFloorId: Number.isFinite(toFloorId) ? toFloorId : floorId
          });
        }
      } else if (this.agentTransitions.has(id)) {
        const ongoing = this.agentTransitions.get(id);
        const to = new THREE.Vector3(targetX, targetY, targetZ);
        if (ongoing && ongoing.to && ongoing.to.distanceToSquared(to) > 1e-6) {
          ongoing.to.copy(to);
        }
      } else {
        this.agentTransitions.delete(id);
        mesh.userData.floorId = floorId;
        mesh.position.set(targetX, targetY, targetZ);
      }
    });

    for (const [id, mesh] of this.agentMeshes.entries()) {
      if (!liveIds.has(id)) {
        this.agentGroup.remove(mesh);
        if (mesh.geometry && typeof mesh.geometry.dispose === 'function') {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => {
              if (m && typeof m.dispose === 'function') m.dispose();
            });
          } else if (typeof mesh.material.dispose === 'function') {
            mesh.material.dispose();
          }
        }
        this.agentMeshes.delete(id);
        this.agentTransitions.delete(id);
      }
    }

    this.applyFloorFilterToScene();
    this.applyOcclusionShading({ agentsOnly: true });
  }

  createFloorPlate(walls, y) {
    const pts = this.normalizeWallPoints(walls);
    if (pts.length < 3) return null;
    const shapePts = pts.map((p) => new THREE.Vector2(Number(p.x || 0), Number(p.z || 0)));
    if (THREE.ShapeUtils.isClockWise(shapePts)) {
      shapePts.reverse();
    }
    const shape = new THREE.Shape(shapePts);
    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.45,
      side: THREE.FrontSide,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = y + 0.005;
    return mesh;
  }

  normalizeWallPoints(rawWalls) {
    const segments = [];
    let current = [];
    const pushCurrent = () => {
      if (current.length >= 3) segments.push(current);
      current = [];
    };

    (Array.isArray(rawWalls) ? rawWalls : []).forEach((p) => {
      if (!p) return;
      const x = Number(p.x);
      const z = Number(p.y);
      if (!Number.isFinite(x) || !Number.isFinite(z) || x === -10000 || z === -10000) {
        pushCurrent();
        return;
      }
      const last = current[current.length - 1];
      if (last && Math.abs(last.x - x) < 1e-6 && Math.abs(last.z - z) < 1e-6) return;
      current.push({ x, z });
    });
    pushCurrent();

    if (segments.length === 0) return [];
    let pts = segments[0];
    for (let i = 1; i < segments.length; i++) {
      if (segments[i].length > pts.length) pts = segments[i];
    }

    if (pts.length >= 2) {
      const first = pts[0];
      const last = pts[pts.length - 1];
      if (Math.abs(first.x - last.x) < 1e-6 && Math.abs(first.z - last.z) < 1e-6) {
        pts = pts.slice(0, pts.length - 1);
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
