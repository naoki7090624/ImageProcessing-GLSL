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
var plan;

// VIDEO AND THE ASSOCIATED TEXTURE
var video,videoTexture;

var imageProcessing, imageProcessingMaterial;

// GUI
var gui;

init();
animate();

function init () {

    container = document.createElement( 'div' );
    document.body.appendChild( container );

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
    controls.maxDistance = 1.0;
    controls.enableRotate = true;
    controls.addEventListener( 'change', render );
    controls.update();

    if ( navigator.mediaDevices && navigator.mediaDevices.getUserMedia ) {
        const constraints = { video: { width: 1280, height: 720, facingMode: 'user' } };
        navigator.mediaDevices.getUserMedia( constraints ).then( function ( stream ) 
        {
            video = document.createElement('video');
            video.srcObject = stream;
            video.play();

            video.onloadeddata = function () 
            { 
                videoTexture = new THREE.VideoTexture( video );
                videoTexture.minFilter = THREE.NearestFilter;
                videoTexture.magFilter = THREE.NearestFilter;
                videoTexture.generateMipmaps = false; 
                videoTexture.format = THREE.RGBFormat;

                imageProcessingMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    sizeDiv2: {type: 'i', value: 5},
                    colorScaleR: {type: 'f', value: 1.0},
                    colorScaleG: {type: 'f', value: 1.0},
                    colorScaleB: {type: 'f', value: 1.0},
                    vertixScale: {type: 'f', value: 1.0},
                    sigma: {type: 'f', value: 2.0},
                    image: {type: 't', value: videoTexture},
                    kernelSizeDiv2: {type: 'i', value: 2},
                    resolution: {type: '2f', value:  new THREE.Vector2( video.videoWidth, video.videoHeight ) }
                },
                vertexShader: document.getElementById('VertShader').text,
                fragmentShader: document.getElementById('FragShader').text,
            });

            imageProcessing = new IVimageProcessing ( video.videoHeight, video.videoWidth, imageProcessingMaterial );

            console.log ( imageProcessing.width );

            var geometry = new THREE.PlaneGeometry( 1, video.videoHeight/video.videoWidth );
            var material = new THREE.MeshBasicMaterial( { map: imageProcessing.rtt.texture, side : THREE.DoubleSide } );
            plan = new THREE.Mesh( geometry, material );
            plan.position.y = 0.3;
            plan.receiveShadow = false;
            plan.castShadow = false;
            scene.add( plan );

            var geometry2 = new THREE.PlaneGeometry( 1, video.videoHeight/video.videoWidth );
            var material2 = new THREE.MeshBasicMaterial( { map: videoTexture, side : THREE.DoubleSide } );
            plan = new THREE.Mesh( geometry2, material2 );
            plan.position.y = -0.3;
            plan.receiveShadow = false;
            plan.castShadow = false;
            scene.add( plan );

            var pausePlayObj =
            {
                pausePlay: function () 
                {
                    if (!video.paused)
                    {
                        console.log ( "pause" );
                        video.pause();
                    }
                    else
                    {
                        console.log ( "play" );
                        video.play();
                    }
                },
                add10sec: function ()
                {
                    video.currentTime = video.currentTime + 10;
                    console.log ( video.currentTime  );
                }
            };

            gui = new GUI();
            gui.add(imageProcessingMaterial.uniforms.colorScaleR , 'value', 0, 1).name('Red'); 
            gui.add(imageProcessingMaterial.uniforms.colorScaleG , 'value', 0, 1).name('Green');
            gui.add(imageProcessingMaterial.uniforms.colorScaleB , 'value', 0, 1).name('Blue');
            gui.add(pausePlayObj,'pausePlay').name ('Pause/play video');
            gui.add(pausePlayObj,'add10sec').name ('Add 10 seconds');
            gui.add(imageProcessingMaterial.uniforms.sigma , 'value', 0, 5).name('sigma');
            gui.add(imageProcessingMaterial.uniforms.kernelSizeDiv2 , 'value', 1, 5).name('kernel');

            video.play();

            };

            window.addEventListener( 'resize', onWindowResize, false );
        })
    }
}

function render () {
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