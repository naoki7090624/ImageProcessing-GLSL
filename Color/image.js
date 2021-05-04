import * as THREE from '../threejs-dev/build/three.module.js';
import { OrbitControls } from '../threejs-dev/examples/jsm/controls/OrbitControls.js';
import { GUI } from '../threejs-dev/examples/jsm/libs/dat.gui.module.js';

function IVimageProcessing ( height, width, imageProcessingMaterial )
{
	this.height = height;
	this.width = width;
	
	//3 rtt setup
	this.scene = new THREE.Scene();
	this.orthoCamera = new THREE.OrthographicCamera(-1,1,1,-1,1/Math.pow( 2, 53 ),1 );

	//4 create a target texture
	var options = {
		minFilter: THREE.NearestFilter,
		magFilter: THREE.NearestFilter,
		format: THREE.RGBAFormat,
	//type:THREE.FloatType
		type:THREE.UnsignedByteType
	};
	this.rtt = new THREE.WebGLRenderTarget( width, height, options);

	var geom = new THREE.BufferGeometry();
	geom.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array([-1,-1,0, 1,-1,0, 1,1,0, -1,-1, 0, 1, 1, 0, -1,1,0 ]), 3 ) );
	geom.addAttribute( 'uv', new THREE.BufferAttribute( new Float32Array([ 0,1, 1,1, 1,0, 0,1, 1,0, 0,0 ]), 2 ) );
	this.scene.add( new THREE.Mesh( geom, imageProcessingMaterial ) );
}

function IVprocess ( imageProcessing, renderer )
{
	renderer.setRenderTarget( imageProcessing.rtt );
	renderer.render ( imageProcessing.scene, imageProcessing.orthoCamera ); 	
	renderer.setRenderTarget( null );
};


var camera, controls, scene, renderer, container;
var uniforms, material, mesh;
var plan1;
var plan2;

var imageProcessing, imageProcessingMaterial;

var gui;

init();
animate();

function init() {

    var urlParam = location.search.substring(1);
	console.log(urlParam);

    container = document.createElement( 'div' );
	document.body.appendChild( container );
    //container = document.getElementById('container');

    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
	renderer.autoClear = false;
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMap.enabled = false;

	container.appendChild( renderer.domElement );

	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.001, 10 );
	camera.position.z = 1.0;
	controls = new OrbitControls( camera, renderer.domElement );
	controls.minDistance = 0.005;
	controls.maxDistance = 2.0;
	controls.enableRotate = true;
	controls.addEventListener( 'change', render );
	controls.update();



    // 画像を読み込む
    var image = new THREE.TextureLoader().load('grenouille.jpg',
    (tex) => {

        uniforms = {
            colorScaleR: {type: 'f', value: 1.0},
            colorScaleG: {type: 'f', value: 1.0},
            colorScaleB: {type: 'f', value: 1.0},
            Lightness: {type: 'f', value: 0.0},
            Chrome: {type: 'f', value: 1.0},
            Hue: {type: 'f', value: 0.0},
            vertixScale: {type: 'f', value: 1.0},
            resolution: { type: "v2", value: new THREE.Vector2(tex.image.width,tex.image.height) },
            kernelSizeDiv2: {type: 'i', value: 2},
            image: { type: "t", value: image}
        };

        imageProcessingMaterial = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: document.getElementById('VertShader').text,
            fragmentShader: document.getElementById('FragShader').text,
        });

        imageProcessing = new IVimageProcessing ( tex.image.width, tex.image.height, imageProcessingMaterial );

        //var geometry = new THREE.PlaneGeometry(1, 1, 100, 100);
        var geometry = new THREE.PlaneGeometry( 1, tex.image.height/tex.image.width );
        var material = new THREE.MeshBasicMaterial( { map: imageProcessing.rtt.texture, side : THREE.DoubleSide } );
        plan1 = new THREE.Mesh( geometry, material );
        plan1.position.x = 0.6;
        plan1.receiveShadow = false;
        plan1.castShadow = false;
        scene.add( plan1 );

        var geometry2 = new THREE.PlaneGeometry( 1, tex.image.height/tex.image.width );
        var material2 = new THREE.MeshBasicMaterial( { map: image, side : THREE.DoubleSide } );
        plan2 = new THREE.Mesh( geometry2, material2 );
        plan2.position.x = -0.6;
        plan2.receiveShadow = false;
        plan2.castShadow = false;
        scene.add( plan2 );
        

        let params = {
            scaleX: 1,
            scaleY: 1,
            size: 1
        };

        gui = new GUI();
        gui.add(imageProcessingMaterial.uniforms.colorScaleR , 'value', 0, 1).name('Red'); 
        gui.add(imageProcessingMaterial.uniforms.colorScaleG , 'value', 0, 1).name('Green');
        gui.add(imageProcessingMaterial.uniforms.colorScaleB , 'value', 0, 1).name('Blue');
        gui.add(imageProcessingMaterial.uniforms.Lightness , 'value', -100, 100).name('Lightness');
        gui.add(imageProcessingMaterial.uniforms.Chrome , 'value', 0, 2).name('Chroma');
        gui.add(imageProcessingMaterial.uniforms.Hue , 'value', -1, 1).name('Hue');

    });

    window.addEventListener( 'resize', onWindowResize, false );
}

function render() {
	renderer.clear();
	
	if (typeof imageProcessing !== 'undefined') 
		IVprocess ( imageProcessing, renderer );
	renderer.render( scene, camera );
}

function animate() {	
	requestAnimationFrame(animate);
	controls.update();
	render();
}

function onWindowResize () {
	camera.aspect = ( window.innerWidth / window.innerHeight);
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
	render();
}

