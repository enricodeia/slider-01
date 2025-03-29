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

// Configuration for the slider and effects
const config = {
  speed: 2,
  ease: 0.075,
  threshold: 50,
  rgbShift: 0.15,
  scaleMin: 0.65,
  scaleMax: 1
};

// Sample data for slides with placeholder images
const slidesData = [
  { 
    image: "/api/placeholder/800/600?text=Mountains",
    title: "Mountains"
  },
  { 
    image: "/api/placeholder/800/600?text=Ocean",
    title: "Ocean"
  },
  { 
    image: "/api/placeholder/800/600?text=Forest",
    title: "Forest"
  },
  { 
    image: "/api/placeholder/800/600?text=Desert",
    title: "Desert"
  },
  { 
    image: "/api/placeholder/800/600?text=Arctic",
    title: "Arctic"
  },
  { 
    image: "/api/placeholder/800/600?text=Night+Sky",
    title: "Night Sky"
  }
];

// Duplicate the array to make it infinite
const extendedSlidesData = [...slidesData, ...slidesData, ...slidesData];

// Shader for the WebGL effect
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

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  generateSlides();
  initControls();

  // Initialize WebGL
  const gl = new Gl();
  const slider = new Slider(document.querySelector('.js-slider'), config);

  // Start animation loop
  const tick = () => {
    gl.render();
    slider.render();
    requestAnimationFrame(tick);
  };

  tick();

  // Handle window resize
  window.addEventListener('resize', () => {
    store.ww = window.innerWidth;
    store.wh = window.innerHeight;
    gl.resize();
    slider.resize();
  });
});

// Initialize the scene properly
document.addEventListener('DOMContentLoaded', () => {
  // Wait for the GL renderer to be created
  setTimeout(() => {
    const gl = document.querySelector('.dom-gl');
    if (gl) {
      // Create a reference to the THREE.Scene
      gl.scene = new THREE.Scene();
      
      // Store the add method for safe access
      gl.parentNode.add3DObject = function(obj) {
        if (gl.scene) {
          gl.scene.add(obj);
        }
      };
    }
  }, 100); // Small delay to ensure WebGL is initialized
});

// Generate slide elements
function generateSlides() {
  const sliderInner = document.querySelector('.js-slider');
  const titlesList = document.querySelector('.js-titles');
  
  // First clear any existing slides
  const existingSlides = document.querySelectorAll('.js-slide');
  if (existingSlides.length > 2) {
    // If we already have slides (from the fallback in HTML), use those instead of generating new ones
    console.log('Using existing fallback slides');
    
    // Still need to generate titles
    slidesData.forEach(slide => {
      const titleEl = document.createElement('div');
      titleEl.className = 'titles__title js-title';
      titleEl.textContent = slide.title;
      titlesList.appendChild(titleEl);
    });
    
    return;
  }
  
  // Clear any existing slides first
  sliderInner.innerHTML = '';
  
  // Generate inline SVG as fallback for each slide
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
    
    // Use data URI SVG as a fallback that will always work
    const svgContent = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'><rect width='800' height='600' fill='${index % 2 === 0 ? "#555555" : "#444444"}'/><text x='400' y='300' font-family='Arial' font-size='30' text-anchor='middle' fill='white'>${slide.title}</text></svg>`);
    img.src = `data:image/svg+xml,${svgContent}`;
    
    // Also try to load the original image as a backup
    img.setAttribute('data-original-src', slide.image);
    img.alt = slide.title;
    img.crossOrigin = 'anonymous';
    img.draggable = false;

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
  const controlsPanel = document.getElementById('controls-panel');
  const toggleControls = document.getElementById('toggle-controls');
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

  input.addEventListener('input', () => {
    const value = parseFloat(input.value);
    valueDisplay.textContent = value;
    callback(value);
  });
}

// Texture loader with better cross-origin handling
const loader = new THREE.TextureLoader();
loader.crossOrigin = 'anonymous';

// Create a simple colored texture as a last resort fallback
function createColorTexture(color) {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 2;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color || '#444444';
  ctx.fillRect(0, 0, 2, 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

// WebGL handler class
class Gl {
  constructor() {
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.OrthographicCamera(
      store.ww / - 2, 
      store.ww / 2, 
      store.wh / 2, 
      store.wh / - 2, 
      1, 
      10 
    );
    this.camera.lookAt(this.scene.position);
    this.camera.position.z = 1;
    
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(store.ww, store.wh);
    this.renderer.setClearColor(0xffffff, 0);
    
    this.init();
  }
  
  render() {
    this.renderer.render(this.scene, this.camera);
  }
  
  resize() {
    this.camera.left = store.ww / - 2;
    this.camera.right = store.ww / 2;
    this.camera.top = store.wh / 2;
    this.camera.bottom = store.wh / - 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(store.ww, store.wh);
  }
  
  init() {
    const domEl = this.renderer.domElement;
    domEl.classList.add('dom-gl');  
    document.body.appendChild(domEl);
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
    current && (this.position.x = current + this.pos.x);
  }
}

// Plane geometry and material
const planeGeo = new THREE.PlaneBufferGeometry(1, 1, 32, 32);

// WebGL Plane class
class Plane extends GlObject {
  init(el) {
    super.init(el);

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
      uImageSize: { value: new THREE.Vector2(0, 0) },
      uScale: { value: config.scaleMin },
      uVelo: { value: 0 },
      uRgbShift: { value: config.rgbShift }
    };

    this.img = this.el.querySelector('img');
    
    // Create a fallback texture in case image loading fails
    const createFallbackTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#555555';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '30px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.img.alt || 'Image Placeholder', canvas.width/2, canvas.height/2);
      
      const texture = new THREE.CanvasTexture(canvas);
      return texture;
    };

    // Try to load the texture, with fallback
    this.texture = loader.load(
      this.img.src, 
      (texture) => {
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        
        this.mat.uniforms.uTexture.value = texture;
        this.mat.uniforms.uImageSize.value = new THREE.Vector2(texture.image.width, texture.image.height);
      },
      undefined, // onProgress callback
      (error) => {
        // On error, use fallback texture
        console.warn('Error loading texture:', error);
        const fallbackTexture = createFallbackTexture();
        this.mat.uniforms.uTexture.value = fallbackTexture;
        this.mat.uniforms.uImageSize.value = new THREE.Vector2(800, 600);
      }
    );

    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.scale.set(this.rect.width, this.rect.height, 1);
    this.add(this.mesh);
    
    // Get the global scene and add this object to it
    const gl = document.querySelector('.dom-gl');
    if (gl) {
      gl.parentNode.add3DObject && gl.parentNode.add3DObject(this);
      gl.scene && gl.scene.add(this);
    }
  }

  updateRgbShift(value) {
    if (this.mat && this.mat.uniforms.uRgbShift) {
      this.mat.uniforms.uRgbShift.value = value;
    }
  }
}

// Slider class for handling drag and scroll behavior
class Slider {
  constructor(el, opts = {}) {
    this.bindAll();

    this.el = el;
    this.opts = Object.assign({
      speed: 2,
      threshold: 50,
      ease: 0.075
    }, opts);

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
      down: store.isDevice ? 'touchstart' : 'mousedown'
    };
    
    this.init();
  }
  
  bindAll() {
    ['onDown', 'onMove', 'onUp', 'resize']
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
    const { move, up, down } = this.events;
    
    const dragArea = document.querySelector('.js-drag-area');
    
    dragArea.addEventListener(down, this.onDown);
    window.addEventListener(move, this.onMove);
    window.addEventListener(up, this.onUp);
  }

  off() {
    const { move, up, down } = this.events;
    
    const dragArea = document.querySelector('.js-drag-area');
    
    dragArea.removeEventListener(down, this.onDown);
    window.removeEventListener(move, this.onMove);
    window.removeEventListener(up, this.onUp);
  }
  
  setup() {
    const { ww } = store;
    const state = this.state;
    const { items, titles } = this.ui;
    
    const { 
      width: wrapWidth, 
      left: wrapDiff 
    } = this.el.getBoundingClientRect();
    
    // Set bounding
    state.max = -(items[items.length - 1].getBoundingClientRect().right - wrapWidth - wrapDiff);
    state.min = 0;
    
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
    
    // Create WebGL planes for each slide
    for (let i = 0; i < items.length; i++) {
      const el = items[i];
      const { left, right, width } = el.getBoundingClientRect();
      
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
  }

  onUp() {
    const state = this.state;
    
    state.flags.dragging = false;
    state.off = state.target;
    
    document.querySelector('.js-drag-area').classList.remove('grabbing');
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
  }
}
