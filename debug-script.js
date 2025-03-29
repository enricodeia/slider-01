// Debug flag - set to true to see diagnostic info
const DEBUG = true;

// Store global variables
const store = {
  ww: window.innerWidth,
  wh: window.innerHeight,
  isDevice: navigator.userAgent.match(/Android/i)
    || navigator.userAgent.match(/webOS/i)
    || navigator.userAgent.match(/iPhone/i)
    || navigator.userAgent.match(/iPad/i)
    || navigator.userAgent.match(/iPod/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i)
};

// Configuration
const config = {
  speed: 2,
  ease: 0.075,
  threshold: 50,
  rgbShift: 0.15,
  scaleMin: 0.65,
  scaleMax: 1
};

// Simple slides data with embedded SVGs
const slidesData = [
  { 
    image: "https://images.pexels.com/photos/41951/solar-system-emergence-spitzer-telescope-telescope-41951.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    title: "Space"
  },
  { 
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23444444'/%3E%3Cpolygon points='400,150 600,450 200,450' fill='%23666666'/%3E%3Cpolygon points='500,200 700,450 300,450' fill='%23555555'/%3E%3Ctext x='400' y='300' font-family='Arial' font-size='30' text-anchor='middle' fill='white'%3EMountains%3C/text%3E%3C/svg%3E",
    title: "Mountains"
  },
  { 
    image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%233B7EA1'/%3E%3Crect y='300' width='800' height='300' fill='%232A5B7A'/%3E%3Ccircle cx='650' cy='120' r='80' fill='%23FDB813'/%3E%3Cpath d='M0,300 Q200,200 400,300 T800,300' fill='%232A5B7A'/%3E%3Ctext x='400' y='250' font-family='Arial' font-size='30' text-anchor='middle' fill='white'%3EOcean%3C/text%3E%3C/svg%3E",
    title: "Ocean"
  }
];

// Duplicate the array to make it look infinite
const extendedSlidesData = [...slidesData, ...slidesData];

// Shader code
const backgroundCoverUv = `
vec2 backgroundCoverUv(vec2 screenSize, vec2 imageSize, vec2 uv) {
  float screenRatio = screenSize.x / screenSize.y;
  float imageRatio = imageSize.x / imageSize.y;

  vec2 newSize = screenRatio < imageRatio 
      ? vec2(imageSize.x * screenSize.y / imageSize.y, screenSize.y)
      : vec2(screenSize.x, imageSize.y * screenSize.x / imageSize.x);

  vec2 newOffset = (screenRatio < imageRatio 
      ? vec2((newSize.x - screenSize.x) / 2.0, 0.0) 
      : vec2(0.0, (newSize.y - screenSize.y) / 2.0)) / newSize;

  return uv * screenSize / newSize + newOffset;
}
`;

const vertexShader = `
precision mediump float;

uniform float uVelo;

varying vec2 vUv;

#define M_PI 3.1415926535897932384626433832795

void main(){
  vec3 pos = position;
  pos.x = pos.x + ((sin(uv.y * M_PI) * uVelo) * 0.125);

  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.);
}
`;

const fragmentShader = `
precision mediump float;

${backgroundCoverUv}

uniform sampler2D uTexture;

uniform vec2 uMeshSize;
uniform vec2 uImageSize;

uniform float uVelo;
uniform float uScale;
uniform float uRgbShift;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;

  vec2 texCenter = vec2(0.5);
  vec2 texUv = backgroundCoverUv(uMeshSize, uImageSize, uv);
  vec2 texScale = (texUv - texCenter) * uScale + texCenter;
  vec4 texture = texture2D(uTexture, texScale);

  texScale.x += uRgbShift * uVelo;
  if(uv.x < 1.) texture.g = texture2D(uTexture, texScale).g;

  texScale.x += (uRgbShift * 0.5) * uVelo;
  if(uv.x < 1.) texture.b = texture2D(uTexture, texScale).b;

  gl_FragColor = texture;
}
`;

// Helper function to log if debug is on
function debugLog(...args) {
  if (DEBUG) {
    console.log('[DEBUG]', ...args);
  }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  debugLog('DOM loaded, initializing app');
  
  // First, let's create a simple div to show if WebGL is functioning
  const debugElement = document.createElement('div');
  if (DEBUG) {
    debugElement.style.position = 'fixed';
    debugElement.style.top = '10px';
    debugElement.style.left = '10px';
    debugElement.style.zIndex = 9999;
    debugElement.style.background = 'rgba(0,0,0,0.7)';
    debugElement.style.padding = '10px';
    debugElement.style.color = 'white';
    debugElement.style.fontFamily = 'monospace';
    debugElement.textContent = 'Initializing...';
    document.body.appendChild(debugElement);
  }
  
  // Check for WebGL support
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    debugLog('WebGL supported');
    debugElement.textContent = 'WebGL supported ✅';
  } catch (e) {
    console.error('WebGL error:', e);
    debugElement.textContent = 'WebGL error: ' + e.message + ' ❌';
    // Fall back to showing regular images
    showFallbackImages();
    return;
  }
  
  try {
    // Generate slides for visualization
    generateSlides();
    
    // Initialize controls
    initControls();
    
    // Create WebGL renderer
    const gl = new Gl(debugElement);
    window.glInstance = gl;
    
    // Create slider
    const slider = new Slider(document.querySelector('.js-slider'), config, gl, debugElement);
    window.sliderInstance = slider;
    
    // Animation loop
    const tick = () => {
      gl.render();
      slider.render();
      requestAnimationFrame(tick);
    };
    
    tick();
    
    // Resize handler
    window.addEventListener('resize', () => {
      store.ww = window.innerWidth;
      store.wh = window.innerHeight;
      gl.resize();
      slider.resize();
    });
    
    // Add a test texture to verify three.js is working
    if (DEBUG) {
      debugLog('Creating test shapes');
      createTestShapes(gl);
    }
    
    // Update debug info
    if (DEBUG) {
      debugElement.textContent = 'Initialization complete ✅';
    }
  } catch (e) {
    console.error('Initialization error:', e);
    debugElement.textContent = 'Error: ' + e.message + ' ❌';
    // Fall back to showing regular images
    showFallbackImages();
  }
});

// Creates simple Three.js shapes to verify rendering works
function createTestShapes(gl) {
  // Create a simple colored cube
  const geometry = new THREE.BoxGeometry(100, 100, 100);
  const material = new THREE.MeshBasicMaterial({ 
    color: 0xff0000,
    wireframe: true
  });
  
  const cube = new THREE.Mesh(geometry, material);
  cube.position.z = -200;
  cube.position.x = 200;
  gl.scene.add(cube);
  
  // Add animation
  const animateCube = () => {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    requestAnimationFrame(animateCube);
  };
  
  animateCube();
}

// Fallback function to show regular images if WebGL fails
function showFallbackImages() {
  const container = document.querySelector('.slider__inner');
  container.innerHTML = '';
  container.style.display = 'flex';
  container.style.flexWrap = 'wrap';
  container.style.justifyContent = 'center';
  container.style.alignItems = 'center';
  
  extendedSlidesData.forEach((slide, index) => {
    const div = document.createElement('div');
    div.style.margin = '20px';
    
    const img = document.createElement('img');
    img.src = slide.image;
    img.alt = slide.title;
    img.style.maxWidth = '300px';
    img.style.maxHeight = '200px';
    img.style.display = 'block';
    
    const title = document.createElement('div');
    title.textContent = slide.title;
    title.style.textAlign = 'center';
    title.style.marginTop = '10px';
    
    div.appendChild(img);
    div.appendChild(title);
    container.appendChild(div);
  });
  
  document.querySelector('.titles').style.display = 'none';
  document.querySelector('.progress').style.display = 'none';
}

// Generate slide elements
function generateSlides() {
  debugLog('Generating slides');
  const sliderInner = document.querySelector('.js-slider');
  const titlesList = document.querySelector('.js-titles');
  
  // Clear existing content
  sliderInner.innerHTML = '';
  titlesList.innerHTML = '';
  
  // Generate slides
  extendedSlidesData.forEach((slide, index) => {
    // Create slide
    const slideEl = document.createElement('div');
    slideEl.className = 'slide js-slide';
    if (index > 0) {
      slideEl.style.left = `${index * 120}%`;
    }

    const slideInner = document.createElement('div');
    slideInner.className = 'slide__inner js-slideinner';

    const img = document.createElement('img');
    img.className = 'js-slideimg';
    img.src = slide.image;
    img.alt = slide.title;
    img.crossOrigin = 'anonymous';
    img.draggable = false;
    
    // For debugging, show the actual images in a visible way
    if (DEBUG) {
      img.style.opacity = '0.2'; // Make slightly visible for debugging
    }

    slideInner.appendChild(img);
    slideEl.appendChild(slideInner);
    sliderInner.appendChild(slideEl);

    // Create title
    const titleEl = document.createElement('div');
    titleEl.className = 'titles__title js-title';
    titleEl.textContent = slide.title;
    titlesList.appendChild(titleEl);
  });
}

// Initialize controls panel
function initControls() {
  debugLog('Initializing controls');
  const controlsPanel = document.getElementById('controls-panel');
  const togglePanelBtn = document.getElementById('toggle-panel');
  const fullscreenBtn = document.getElementById('fullscreen');

  // Handle controls panel toggle
  togglePanelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const isVisible = controlsPanel.style.display !== 'none';
    controlsPanel.style.display = isVisible ? 'none' : 'block';
    togglePanelBtn.textContent = isVisible ? 'Show Controls' : 'Hide Controls';
  });

  // Handle fullscreen
  fullscreenBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Error attempting to enable fullscreen:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  });

  // Set up range input controls
  setupRangeControl('speed', 'speed-value', (value) => {
    config.speed = value;
  });

  setupRangeControl('ease', 'ease-value', (value) => {
    config.ease = value;
  });

  setupRangeControl('rgb-shift', 'rgb-shift-value', (value) => {
    config.rgbShift = value;
    document.documentElement.style.setProperty('--rgb-shift', value);
    
    // Update all planes
    if (window.sliderInstance && window.sliderInstance.items) {
      window.sliderInstance.items.forEach(item => {
        if (item.plane && item.plane.updateRgbShift) {
          item.plane.updateRgbShift(value);
        }
      });
    }
  });

  setupRangeControl('scale-min', 'scale-min-value', (value) => {
    config.scaleMin = value;
    document.documentElement.style.setProperty('--scale-min', value);
  });

  setupRangeControl('scale-max', 'scale-max-value', (value) => {
    config.scaleMax = value;
    document.documentElement.style.setProperty('--scale-max', value);
  });
}

// Helper function to set up range input controls
function setupRangeControl(inputId, valueId, callback) {
  const input = document.getElementById(inputId);
  const valueDisplay = document.getElementById(valueId);
  
  if (!input || !valueDisplay) {
    console.warn(`Could not find elements for control: ${inputId}`);
    return;
  }

  input.addEventListener('input', () => {
    const value = parseFloat(input.value);
    valueDisplay.textContent = value;
    callback(value);
  });
}

// Create a fallback texture with text
function createTextTexture(text, color) {
  debugLog('Creating fallback texture:', text);
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color || '#444444';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.font = '30px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text || 'Image Placeholder', canvas.width/2, canvas.height/2);
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// WebGL handler class
class Gl {
  constructor(debugElement) {
    this.debugElement = debugElement;
    debugLog('Initializing GL');
    
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.OrthographicCamera(
      store.ww / - 2, 
      store.ww / 2, 
      store.wh / 2, 
      store.wh / - 2, 
      0.1, 
      1000 
    );
    this.camera.position.z = 400;
    this.camera.lookAt(0, 0, 0);
    
    try {
      this.renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true
      });
      
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setSize(store.ww, store.wh);
      this.renderer.setClearColor(0x111111, 1);
      
      // Add some basic lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      this.scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight.position.set(0, 1, 1);
      this.scene.add(directionalLight);
      
      debugLog('WebGL renderer created');
      if (this.debugElement) {
        this.debugElement.textContent += '\nWebGL renderer created ✅';
      }
    } catch (e) {
      console.error('Error creating renderer:', e);
      if (this.debugElement) {
        this.debugElement.textContent += '\nRenderer Error: ' + e.message + ' ❌';
      }
      throw e;
    }
    
    this.init();
  }
  
  render() {
    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  }
  
  resize() {
    this.camera.left = store.ww / - 2;
    this.camera.right = store.ww / 2;
    this.camera.top = store.wh / 2;
    this.camera.bottom = store.wh / - 2;
    this.camera.updateProjectionMatrix();
    
    if (this.renderer) {
      this.renderer.setSize(store.ww, store.wh);
    }
  }
  
  init() {
    if (!this.renderer) return;
    
    const domEl = this.renderer.domElement;
    domEl.classList.add('dom-gl');  
    document.body.appendChild(domEl);
    
    debugLog('GL initialized, canvas added to DOM');
  }
}

// Base object for WebGL elements
class GlObject extends THREE.Object3D {
  init(el) {
    this.el = el;
    this.resize();
  }
  
  resize() {
    this.rect = this.el.getBoundingClientRect();
    const { left, top, width, height } = this.rect;

    this.pos = {
      x: (left + (width / 2)) - (store.ww / 2),
      y: (top + (height / 2)) - (store.wh / 2)
    };
    
    this.position.y = this.pos.y;
    this.position.x = this.pos.x;
    
    this.updateX();
  }
  
  updateX(current) {
    if (current !== undefined) {
      this.position.x = current + this.pos.x;
    }
  }
}

// Texture loader with better cross-origin handling
const loader = new THREE.TextureLoader();
loader.crossOrigin = 'anonymous';

// Plane geometry
const planeGeo = new THREE.PlaneBufferGeometry(1, 1, 32, 32);

// WebGL Plane class
class Plane extends GlObject {
  init(el) {
    super.init(el);
    debugLog('Initializing plane for', el);

    this.geo = planeGeo;
    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      fragmentShader,
      vertexShader
    });
    
    this.mat.uniforms = {
      uTime: { value: 0 },
      uTexture: { value: 0 },
      uMeshSize: { value: new THREE.Vector2(this.rect.width, this.rect.height) },
      uImageSize: { value: new THREE.Vector2(800, 600) },
      uScale: { value: config.scaleMin },
      uVelo: { value: 0 },
      uRgbShift: { value: config.rgbShift }
    };

    this.img = this.el.querySelector('img');
    debugLog('Loading image:', this.img.src);
    
    // Set a default texture immediately
    const defaultTexture = createTextTexture('Loading ' + this.img.alt);
    this.mat.uniforms.uTexture.value = defaultTexture;
    
    // Try to load the image
    this.texture = loader.load(
      this.img.src, 
      (texture) => {
        debugLog('Texture loaded successfully:', this.img.src);
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        this.mat.uniforms.uTexture.value = texture;
        this.mat.uniforms.uImageSize.value = new THREE.Vector2(texture.image.width, texture.image.height);
      },
      (xhr) => {
        debugLog('Texture loading progress:', Math.round((xhr.loaded / xhr.total) * 100) + '%');
      },
      (error) => {
        console.warn('Error loading texture:', error, this.img.src);
        // Keep using the default texture we already set
      }
    );

    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.scale.set(this.rect.width, this.rect.height, 1);
    this.add(this.mesh);
    
    // Add to scene
    if (window.glInstance && window.glInstance.scene) {
      window.glInstance.scene.add(this);
      debugLog('Plane added to scene');
    } else {
      console.warn('Could not add plane to scene - glInstance not available');
    }
  }

  updateRgbShift(value) {
    if (this.mat && this.mat.uniforms && this.mat.uniforms.uRgbShift) {
      this.mat.uniforms.uRgbShift.value = value;
    }
  }
}

// Slider class for handling drag and scroll behavior
class Slider {
  constructor(el, opts = {}, gl, debugElement) {
    this.bindAll();

    this.el = el;
    this.gl = gl;
    this.debugElement = debugElement;
    this.opts = Object.assign({
      speed: 2,
      threshold: 50,
      ease: 0.075
    }, opts);

    debugLog('Initializing slider');
    
    this.ui = {
      items: document.querySelectorAll('.js-slide'),
      titles: document.querySelectorAll('.js-title'),
      lines: document.querySelectorAll('.js-progress-line')
    };

    this.state = {
      target: 0,
      current: 0,
      currentRounded: 0,
      y: 0,
      on: {
        x: 0,
        y: 0
      },
      off: 0,
      progress: 0,
      diff: 0,
      max: 0,
      min: 0,
      snap: {
        points: []
      },
      flags: {
        dragging: false,
        resize: false
      }
    };

    this.items = [];
    
    this.events = {
      move: store.isDevice ? 'touchmove' : 'mousemove',
      up: store.isDevice ? 'touchend' : 'mouseup',
      down: store.isDevice ? 'touchstart' : 'mousedown',
      wheel: 'wheel'
    };
    
    this.init();
    
    if (this.debugElement) {
      this.debugElement.textContent += '\nSlider initialized ✅';
    }
  }
  
  bindAll() {
    ['onDown', 'onMove', 'onUp', 'onWheel', 'resize']
      .forEach(fn => this[fn] = this[fn].bind(this));
  }

  init() {
    this.setup();
    this.on();
  }

  destroy() {
    this.off();
    this.state = null;
    this.items = null;
    this.opts = null;
    this.ui = null;
  }

  on() {
    const { move, up, down, wheel } = this.events;
    
    const dragArea = document.querySelector('.js-drag-area');
    
    dragArea.addEventListener(down, this.onDown);
    window.addEventListener(move, this.onMove);
    window.addEventListener(up, this.onUp);
    window.addEventListener(wheel, this.onWheel);
    
    debugLog('Event listeners added');
  }

  off() {
    const { move, up, down, wheel } = this.events;
    
    const dragArea = document.querySelector('.js-drag-area');
    
    dragArea.removeEventListener(down, this.onDown);
    window.removeEventListener(move, this.onMove);
    window.removeEventListener(up, this.onUp);
    window.removeEventListener(wheel, this.onWheel);
  }
  
  setup() {
    const { ww } = store;
    const state = this.state;
    const { items, titles } = this.ui;
    
    debugLog('Setting up slider with', items.length, 'items');
    
    const { 
      width: wrapWidth, 
      left: wrapDiff 
    } = this.el.getBoundingClientRect();
    
    // Set bounding
    state.max = -(items[items.length - 1].getBoundingClientRect().right - wrapWidth - wrapDiff);
    state.min = 0;
    
    debugLog('Slider bounds:', state.min, state.max);
    
    // Global timeline
    this.tl = gsap.timeline({ 
      paused: true,
      defaults: {
        duration: 1,
        ease: 'linear'
      }
    })
    .fromTo('.js-progress-line-2', {
      scaleX: 1
    }, {
      scaleX: 0,
      duration: 0.5,
      ease: 'power3'
    }, 0)
    .fromTo('.js-titles', {
      yPercent: 0
    }, {
      yPercent: -(100 - (100 / titles.length)),
    }, 0)
    .fromTo('.js-progress-line', {
      scaleX: 0
    }, {
      scaleX: 1
    }, 0);
    
    debugLog('GSAP timeline created');
    
    // Create WebGL planes for each slide
    for (let i = 0; i < items.length; i++) {
      const el = items[i];
      const { left, right, width } = el.getBoundingClientRect();
      
      debugLog('Creating plane for slide', i, 'at', left, right, width);
      
      // Create webgl plane
      const plane = new Plane();
      plane.init(el);
      
      // Timeline that plays when visible
      const tl = gsap.timeline({ paused: true })
      .fromTo(plane.mat.uniforms.uScale, {
        value: config.scaleMin
      }, {
        value: config.scaleMax,
        duration: 1,
        ease: 'linear'
      });

      // Push to cache
      this.items.push({
        el, plane,
        left, right, width,
        min: left < ww ? (ww * 0.775) : -(ww * 0.225 - wrapWidth * 0.2),
        max: left > ww ? state.max - (ww * 0.775) : state.max + (ww * 0.225 - wrapWidth * 0.2),
        tl,
        out: false
      });
    }
    
    debugLog('Created', this.items.length, 'webgl planes');
  }

  resize() {
    this.state.flags.resize = true;
    
    // Update bounding values
    const { ww } = store;
    const state = this.state;
    const { items } = this.ui;
    
    const { 
      width: wrapWidth, 
      left: wrapDiff 
    } = this.el.getBoundingClientRect();
    
    // Set bounding
    state.max = -(items[items.length - 1].getBoundingClientRect().right - wrapWidth - wrapDiff);
    state.min = 0;
    
    // Recalculate positions
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const { left, right, width } = item.el.getBoundingClientRect();
      
      item.left = left;
      item.right = right;
      item.width = width;
      item.min = left < ww ? (ww * 0.775) : -(ww * 0.225 - wrapWidth * 0.2);
      item.max = left > ww ? state.max - (ww * 0.775) : state.max + (ww * 0.225 - wrapWidth * 0.2);
      
      item.plane.resize();
    }
    
    state.flags.resize = false;
    debugLog('Slider resized');
  }

  calc() {
    const state = this.state;
    state.current += (state.target - state.current) * this.opts.ease;
    state.currentRounded = Math.round(state.current * 100) / 100;
    state.diff = (state.target - state.current) * 0.0005;
    state.progress = gsap.utils.wrap(0, 1, state.currentRounded / state.max);

    this.tl && this.tl.progress(state.progress);
  }

  render() {
    this.calc();
    this.transformItems();
  }

  transformItems() {
    const { flags } = this.state;

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const { translate, isVisible, progress } = this.isVisible(item);
      
      item.plane.updateX(translate);
      item.plane.mat.uniforms.uVelo.value = this.state.diff;
      item.plane.updateRgbShift(config.rgbShift);
      
      if (!item.out && item.tl) {
        item.tl.progress(progress);
      }

      if (isVisible || flags.resize) {
        item.out = false;
      } else if (!item.out) {
        item.out = true;
      }
    }   
  }

  isVisible({ left, right, width, min, max }) {
    const { ww } = store;
    const { currentRounded } = this.state;
    const translate = gsap.utils.wrap(min, max, currentRounded);  
    const threshold = this.opts.threshold;
    const start = left + translate;
    const end = right + translate;
    const isVisible = start < (threshold + ww) && end > -threshold;
    const progress = gsap.utils.clamp(0, 1, 1 - (translate + left + width) / (ww + width));

    return {
      translate,
      isVisible,
      progress
    };
  }

  clampTarget() {
    const state = this.state;
    state.target = gsap.utils.clamp(state.max, 0, state.target);
  }
  
  getPos({ changedTouches, clientX, clientY, target }) {
    const x = changedTouches ? changedTouches[0].clientX : clientX;
    const y = changedTouches ? changedTouches[0].clientY : clientY;

    return {
      x, y, target
    };
  }

  onDown(e) {
    const { x, y } = this.getPos(e);
    const { flags, on } = this.state;
    
    flags.dragging = true;
    on.x = x;
    on.y = y;
    
    document.querySelector('.js-drag-area').classList.add('grabbing');
    debugLog('Mouse/touch down at', x, y);
  }

  onUp() {
    const state = this.state;
    
    state.flags.dragging = false;
    state.off = state.target;
    
    document.querySelector('.js-drag-area').classList.remove('grabbing');
    debugLog('Mouse/touch up, target:', state.target);
  }

  onMove(e) {
    const { x, y } = this.getPos(e);
    const state = this.state;
    
    if (!state.flags.dragging) return;

    const { off, on } = state;
    const moveX = x - on.x;
    const moveY = y - on.y;

    if ((Math.abs(moveX) > Math.abs(moveY)) && e.cancelable) {
      e.preventDefault();
      e.stopPropagation();
    }

    state.target = off + (moveX * this.opts.speed);
    this.clampTarget();
    
    if (DEBUG && this.debugElement) {
      this.debugElement.textContent = `Target: ${state.target.toFixed(2)}, Move: ${moveX.toFixed(2)}`;
    }
  }
  
  onWheel(e) {
    // Add wheel support
    e.preventDefault();
    const state = this.state;
    state.target += e.deltaY * 0.5;
    this.clampTarget();
    
    debugLog('Wheel event, delta:', e.deltaY, 'target:', state.target);
  }
}
