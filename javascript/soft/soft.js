/**
 * Provides requestAnimationFrame in a cross browser way.
 * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 */

if ( !window.requestAnimationFrame ) {

    window.requestAnimationFrame = ( function() {

    return window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame || // comment out if FF4 is slow (it caps framerate at ~30fps: https://bugzilla.mozilla.org/show_bug.cgi?id=630127)
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
            window.setTimeout( callback, 1000 / 60 );
        };
    } )();

}

function loadShader(gl, vertexShaderID, fragmentShaderID) {

    var vertexShader = loadShaderScript(gl, vertexShaderID),
        fragmentShader = loadShaderScript(gl, fragmentShaderID),
        shaderProgram = gl.createProgram();

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);

    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    
        console.log("Unable to initialize the shader program.");
    
    }

    return shaderProgram;

};

function loadShaderScript(gl, shaderScriptID) {

    var shaderScript = document.getElementById(shaderScriptID),
        shader;

    if (shaderScript.type === "x-shader/x-fragment") {

        shader = gl.createShader(gl.FRAGMENT_SHADER);

    } else if (shaderScript.type === "x-shader/x-vertex") {

        shader = gl.createShader(gl.VERTEX_SHADER);

    } else {

        return null;

    }


    gl.shaderSource(shader, shaderScript.text);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {

        console.log("shader " + gl.getShaderInfoLog(shader));
        return null;

    }

    return shader;

};

function initShader(gl, vertexShaderID, fragmentShaderID) {
    
    var shader = loadShader(gl, vertexShaderID, fragmentShaderID);
    gl.useProgram(shader);
    
    shader.mvMatrixUniform = gl.getUniformLocation(shader, "uMVMatrix");
    shader.pMatrixUniform = gl.getUniformLocation(shader, "uPMatrix");
    
    shader.colorUniform = gl.getUniformLocation(shader, "uColor");
    shader.lightUniform = gl.getUniformLocation(shader, "uLight");
    
    shader.positionAttribute = gl.getAttribLocation(shader, "aPosition");
    gl.enableVertexAttribArray(shader.positionAttribute);
    
    shader.normalAttribute = gl.getAttribLocation(shader, "aNormal");
    gl.enableVertexAttribArray(shader.normalAttribute);
    
    return shader;
    
}

function pushMatrix() {
    
    if (!matrixStack) {
        
        matrixStack = [];
        
    }
    
    matrixStack.push(mat4.create(mvMatrix));
    
};

function popMatrix() {
    
    if (!matrixStack || !matrixStack.length) {
        
        throw "error: popMatrix failed";
        
    }
    
    mvMatrix = matrixStack.pop();
    
}

function onMouseMove(event) {

    mouse.x = event.clientX / canvas.width * 2 - 1;
    mouse.y = event.clientY / canvas.height * -2 + 1;
    
    var ray = getMouseRay(mouse, mvMatrix, pMatrix),
        face = Body.getFaceInRay(ray.origin, ray.direction);
    
    if (face) {
        
        vec3.add(face.cube.position, Body.faceNormals[face.type], cube.position);
        cube.visible = true;
        
    } else {
        
        cube.visible = false;
        
    }

};

function onMouseDown(event) {

    rotate = true;
    
    if (cube.visible) {
        
        Body.addCube(vec3.create(cube.position));
        cube.visible = false;
        
    }

};

function onMouseUp(event) {

    rotate = false;

};

var getMouseRay = (function() {
    
    var matrix = mat4.create(),
        
        near = new glMatrixArrayType(4),
        far = new glMatrixArrayType(4),
        
        invertPoint = function(point) {
            
            mat4.multiplyVec4(matrix, point);
            
            point[0] /= point[3];
            point[1] /= point[3];
            point[2] /= point[3];
            
        };
    
    return function(mouse, mvMatrix, pMatrix) {
    
        mat4.multiply(pMatrix, mvMatrix, matrix);
        mat4.inverse(matrix);
        
        near[0] = far[0] = mouse.x;
        near[1] = far[1] = mouse.y;
        
        near[2] = 0; far[2] = 1;
        near[3] = far[3] = 1;

        invertPoint(near);
        invertPoint(far);
        
        return {
            origin : near,
            direction : vec3.direction(far, near, far)
        };
    };
})();

function render() {
    
    requestAnimationFrame(render, canvas);
    
    // if (end) return;
    
    var dt,
        t = (new Date()).getTime();
        
    dt = (t - time) * 0.001;
    dt = dt > 0.04 ? 0.04 : dt;
        
    time = t;
    
    update(dt);
    draw();
    
};

function rotateMatrix(angle, axis, vector) {
    
    mat4.identity(rotMatrix);
    mat4.rotate(rotMatrix, angle, axis);
    
    mat4.multiply(mvMatrix, rotMatrix);
    
    mat4.inverse(rotMatrix);
    mat4.multiplyVec3(rotMatrix, vector);
    
};

function update(dt) {
    
    if (rotate) {
        
        rotateMatrix(mouse.x * 0.2, up, axis);
        
    }
    
    Body.update(dt);
    
};
    
function draw() {
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    gl.uniformMatrix4fv(shader.mvMatrixUniform, false, mvMatrix);
    
    Floor.draw();
    Body.draw();
    
    if (cube.visible) {
        
        cube.draw();
        
    }
    
};

function createCube() {
    
    stop();
    
    var point = [
        parseInt(document.querySelector("#x").value) || 0,
        parseInt(document.querySelector("#y").value) || 0,
        parseInt(document.querySelector("#z").value) || 0
    ];
    
    Body.addCube(point);
    
};

function createCubes() {
    
    stop();
    
    var str = document.querySelector("#area").value,
        numbers = str.match(/([+\-]?[0-9]+)/g);
        len = Math.floor(numbers.length / 3);
    
    for (var i = 0; i < len; i++) {
        
        Body.addCube([
            parseInt(numbers[i * 3]),
            parseInt(numbers[i * 3 + 1]),
            parseInt(numbers[i * 3 + 2])
        ]);
        
    }
    
};

function toggleWireframe() {
    
    Body.drawEdges = !Body.drawEdges;
    
};

function start() {
    
    gravity = [0, 0, -9.81];
    
};

function stop() {
    
    gravity = [0, 0, 0];
    Body.reset();
    
};

function reset() {
    
    stop();
    Body.init();
    
};

var canvas, gl, shader,

    cube,
    
    time,
    
    up, axis, 
    gravity,
    
    mvMatrix, pMatrix, rotMatrix = mat4.create(),
    matrixStack = [],
    
    mouse = {x : 0, y : 0},
    
    end = false,
    rotate = false;

window.onload = function() {

    canvas = document.getElementById("canvas");
    
    if (!window.WebGLRenderingContext) {
        
        canvas.parentNode.innerHTML += '<p>Your browser does not support WebGL.<br/>' + 
            '<a href="http://get.webgl.org">http://get.webgl.org</a></p>';
        return;
        
    }

    canvas.style.backgroundColor = "black";

    canvas.width = window.innerWidth,
    canvas.height = window.innerHeight;
    
    canvas.onmousedown = onMouseDown;
    canvas.onmouseup = onMouseUp;
    canvas.onmousemove = onMouseMove;


    gl = canvas.getContext("experimental-webgl", {stencil: true});

    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    // gl.enable(gl.BLEND);
    
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    
    // gl.enable(gl.STENCIL_TEST);
    
    gl.lineWidth(2);
    
    
    shader = initShader(gl, "vertex-shader", "fragment-shader");
    
    var light = [3.0, 4.0, 5.0];
    vec3.normalize(light);
    
    gl.uniform3fv(shader.lightUniform, light);
    
    
    pMatrix = mat4.create();
    mat4.perspective(45, canvas.width / canvas.height, 0.1, 1000, pMatrix);
    
    gl.uniformMatrix4fv(shader.pMatrixUniform, false, pMatrix);
    
    
    var center = [0, 0, -1],
        eye = [10, 8, 4];
    
    up = [0, 0, 1];
    axis = [0, -1, 0];
    
    mvMatrix = mat4.lookAt(eye, center, up);
    
    Cube.init();
    cube = new Cube([0, 0, 0]);
    cube.visible = false;
    
    Body.initBuffers();
    Body.init();
    
    Floor.init();
    
    
    gravity = [0, 0, 0];
    time = (new Date()).getTime();
    
    render();
    
};