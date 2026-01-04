import * as THREE from 'three';

/**
 * Simple orbit controls for 3D camera manipulation
 * Allows orbiting around a target point with mouse/touch input
 */
export class OrbitControls {
  public enabled = true;
  public target = new THREE.Vector3(0, 0, 0);

  // Rotation limits
  public minPolarAngle = 0;
  public maxPolarAngle = Math.PI;
  public minAzimuthAngle = -Infinity;
  public maxAzimuthAngle = Infinity;

  // Zoom limits
  public minDistance = 1;
  public maxDistance = 100;

  // Speed settings
  public rotateSpeed = 0.25;
  public panSpeed = 0.5;
  public zoomSpeed = 1.0;

  // Damping
  public enableDamping = true;
  public dampingFactor = 0.05;

  private camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private domElement: HTMLElement;

  // Internal state
  private spherical = new THREE.Spherical();
  private sphericalDelta = new THREE.Spherical();
  private panOffset = new THREE.Vector3();
  private scale = 1;

  // Mouse state
  private rotateStart = new THREE.Vector2();
  private rotateEnd = new THREE.Vector2();
  private panStart = new THREE.Vector2();
  private panEnd = new THREE.Vector2();

  private state: 'none' | 'rotate' | 'pan' | 'zoom' = 'none';

  constructor(
    camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
    domElement: HTMLElement
  ) {
    this.camera = camera;
    this.domElement = domElement;

    // Initialize spherical coordinates from camera position
    this.updateSpherical();

    // Bind event handlers
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);

    // Add event listeners
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.domElement.addEventListener('contextmenu', this.onContextMenu);
  }

  /**
   * Update spherical coordinates from camera position
   */
  private updateSpherical(): void {
    const offset = new THREE.Vector3();
    offset.copy(this.camera.position).sub(this.target);
    this.spherical.setFromVector3(offset);
  }

  /**
   * Update camera position from spherical coordinates
   */
  update(): void {
    if (!this.enabled) return;

    const offset = new THREE.Vector3();

    // Apply rotation
    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi += this.sphericalDelta.phi;

    // Clamp angles
    this.spherical.theta = Math.max(
      this.minAzimuthAngle,
      Math.min(this.maxAzimuthAngle, this.spherical.theta)
    );
    this.spherical.phi = Math.max(
      this.minPolarAngle,
      Math.min(this.maxPolarAngle, this.spherical.phi)
    );
    this.spherical.phi = Math.max(0.001, Math.min(Math.PI - 0.001, this.spherical.phi));

    // Apply zoom
    this.spherical.radius *= this.scale;
    this.spherical.radius = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.spherical.radius)
    );

    // Apply pan
    this.target.add(this.panOffset);

    // Update camera position
    offset.setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);

    // Apply damping
    if (this.enableDamping) {
      this.sphericalDelta.theta *= (1 - this.dampingFactor);
      this.sphericalDelta.phi *= (1 - this.dampingFactor);
      this.panOffset.multiplyScalar(1 - this.dampingFactor);
    } else {
      this.sphericalDelta.set(0, 0, 0);
      this.panOffset.set(0, 0, 0);
    }

    this.scale = 1;
  }

  /**
   * Rotate left (horizontal)
   */
  rotateLeft(angle: number): void {
    this.sphericalDelta.theta -= angle;
  }

  /**
   * Rotate up (vertical)
   */
  rotateUp(angle: number): void {
    this.sphericalDelta.phi -= angle;
  }

  /**
   * Pan left/right
   */
  panLeft(distance: number): void {
    const v = new THREE.Vector3();
    v.setFromMatrixColumn(this.camera.matrix, 0);
    v.multiplyScalar(-distance);
    this.panOffset.add(v);
  }

  /**
   * Pan up/down
   */
  panUp(distance: number): void {
    const v = new THREE.Vector3();
    v.setFromMatrixColumn(this.camera.matrix, 1);
    v.multiplyScalar(distance);
    this.panOffset.add(v);
  }

  /**
   * Zoom in
   */
  zoomIn(factor: number): void {
    this.scale /= factor;
  }

  /**
   * Zoom out
   */
  zoomOut(factor: number): void {
    this.scale *= factor;
  }

  /**
   * Focus on a position
   */
  focusOn(position: THREE.Vector3, distance?: number): void {
    this.target.copy(position);
    if (distance !== undefined) {
      this.spherical.radius = distance;
    }
    this.update();
  }

  /**
   * Reset to default view
   */
  reset(): void {
    this.target.set(0, 0, 0);
    this.spherical.set(10, Math.PI / 4, Math.PI / 4);
    this.sphericalDelta.set(0, 0, 0);
    this.panOffset.set(0, 0, 0);
    this.scale = 1;
    this.update();
  }

  /**
   * Update camera aspect ratio on resize
   */
  updateAspect(width: number, height: number): void {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    } else if (this.camera instanceof THREE.OrthographicCamera) {
      const aspect = width / height;
      const viewSize = this.camera.top - this.camera.bottom;
      this.camera.left = -viewSize * aspect / 2;
      this.camera.right = viewSize * aspect / 2;
      this.camera.updateProjectionMatrix();
    }
  }

  // Event handlers
  private onMouseDown(event: MouseEvent): void {
    if (!this.enabled) return;
    event.preventDefault();

    switch (event.button) {
      case 0: // Left mouse
        this.state = 'rotate';
        this.rotateStart.set(event.clientX, event.clientY);
        break;
      case 1: // Middle mouse
        this.state = 'zoom';
        break;
      case 2: // Right mouse
        this.state = 'pan';
        this.panStart.set(event.clientX, event.clientY);
        break;
    }

    if (this.state !== 'none') {
      document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.enabled) return;

    switch (this.state) {
      case 'rotate':
        this.rotateEnd.set(event.clientX, event.clientY);
        const rotateDelta = new THREE.Vector2();
        rotateDelta.subVectors(this.rotateEnd, this.rotateStart);

        const rotateAngle = (2 * Math.PI) / this.domElement.clientHeight;
        this.rotateLeft(rotateDelta.x * rotateAngle * this.rotateSpeed);
        this.rotateUp(rotateDelta.y * rotateAngle * this.rotateSpeed);

        this.rotateStart.copy(this.rotateEnd);
        break;

      case 'pan':
        this.panEnd.set(event.clientX, event.clientY);
        const panDelta = new THREE.Vector2();
        panDelta.subVectors(this.panEnd, this.panStart);

        const panScale = this.spherical.radius * 0.001 * this.panSpeed;
        this.panLeft(panDelta.x * panScale);
        this.panUp(panDelta.y * panScale);

        this.panStart.copy(this.panEnd);
        break;
    }
  }

  private onMouseUp(): void {
    this.state = 'none';
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }

  private onWheel(event: WheelEvent): void {
    if (!this.enabled) return;
    event.preventDefault();

    if (event.deltaY < 0) {
      this.zoomIn(Math.pow(0.95, this.zoomSpeed));
    } else {
      this.zoomOut(Math.pow(0.95, this.zoomSpeed));
    }
  }

  private onTouchStart(event: TouchEvent): void {
    if (!this.enabled) return;
    event.preventDefault();

    if (event.touches.length === 1) {
      this.state = 'rotate';
      this.rotateStart.set(event.touches[0].clientX, event.touches[0].clientY);
    } else if (event.touches.length === 2) {
      this.state = 'zoom';
    }

    document.addEventListener('touchmove', this.onTouchMove, { passive: false });
    document.addEventListener('touchend', this.onTouchEnd);
  }

  private onTouchMove(event: TouchEvent): void {
    if (!this.enabled) return;
    event.preventDefault();

    if (this.state === 'rotate' && event.touches.length === 1) {
      this.rotateEnd.set(event.touches[0].clientX, event.touches[0].clientY);
      const rotateDelta = new THREE.Vector2();
      rotateDelta.subVectors(this.rotateEnd, this.rotateStart);

      const rotateAngle = (2 * Math.PI) / this.domElement.clientHeight;
      this.rotateLeft(rotateDelta.x * rotateAngle * this.rotateSpeed);
      this.rotateUp(rotateDelta.y * rotateAngle * this.rotateSpeed);

      this.rotateStart.copy(this.rotateEnd);
    }
  }

  private onTouchEnd(): void {
    this.state = 'none';
    document.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('touchend', this.onTouchEnd);
  }

  private onContextMenu(event: Event): void {
    event.preventDefault();
  }

  /**
   * Dispose of event listeners
   */
  dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('touchstart', this.onTouchStart);
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('touchend', this.onTouchEnd);
  }
}
