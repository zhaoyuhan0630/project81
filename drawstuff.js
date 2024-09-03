/* classes */

// Color constructor
class Color {
    constructor(r, g, b, a) {
        this.r = r; this.g = g; this.b = b; this.a = a;
    }
}

/* utility functions */

// Draw a pixel at x, y using color
function drawPixel(imagedata, x, y, color) {
    var index = (x + y * imagedata.width) * 4;
    imagedata.data[index + 0] = color.r;
    imagedata.data[index + 1] = color.g;
    imagedata.data[index + 2] = color.b;
    imagedata.data[index + 3] = color.a;
}

// Helper to fetch JSON data
function fetchJSONFile(path, callback) {
    var httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = () => {
        if (httpRequest.readyState === 4) {
            if (httpRequest.status === 200) {
                var data = JSON.parse(httpRequest.responseText);
                if (callback) callback(data);
            }
        }
    };
    httpRequest.open('GET', path);
    httpRequest.send();
}

// Vector operations
function vectorSubtract(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vectorCross(a, b) {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
    };
}

function vectorDot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vectorScale(v, s) {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function vectorNormalize(v) {
    var len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    return vectorScale(v, 1.0 / len);
}

// Ray-triangle intersection
function rayIntersectsTriangle(ray, triangle) {
    const EPSILON = 0.0000001;
    var vertex0 = triangle.vertices[0];
    var vertex1 = triangle.vertices[1];
    var vertex2 = triangle.vertices[2];
    var edge1 = vectorSubtract(vertex1, vertex0);
    var edge2 = vectorSubtract(vertex2, vertex0);
    var h = vectorCross(ray.direction, edge2);
    var a = vectorDot(edge1, h);
    if (a > -EPSILON && a < EPSILON)
        return null;    // This ray is parallel to this triangle.
    var f = 1.0/a;
    var s = vectorSubtract(ray.origin, vertex0);
    var u = f * vectorDot(s, h);
    if (u < 0.0 || u > 1.0)
        return null;
    var q = vectorCross(s, edge1);
    var v = f * vectorDot(ray.direction, q);
    if (v < 0.0 || u + v > 1.0)
        return null;
    // At this stage we can compute t to find out where the intersection point is on the line.
    var t = f * vectorDot(edge2, q);
    if (t > EPSILON) // ray intersection
        return { distance: t, point: vectorAdd(ray.origin, vectorScale(ray.direction, t)) };
    else // This means that there is a line intersection but not a ray intersection.
        return null;
}

function vectorAdd(a, b) {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

/* main function */

function main() {
    var canvas = document.getElementById('viewport');
    var context = canvas.getContext('2d');
    var imageData = context.createImageData(canvas.width, canvas.height);

    // Define the view
    var eye = { x: 0.5, y: 0.5, z: -0.5 };
    var lookAt = { x: 0, y: 0, z: 1 };
    var viewUp = { x: 0, y: 1, z: 0 };
    var distToScreen = 0.5;

    // Fetch triangles from JSON
    fetchJSONFile('triangles.json', (trianglesData) => {
        trianglesData.forEach(data => {
            var triangles = data.triangles;
            var vertices = data.vertices;

            // For each triangle, render it
            triangles.forEach(tri => {
                var vertexIndices = tri;
                var triangle = {
                    vertices: vertexIndices.map(index => ({
                        x: vertices[index][0],
                        y: vertices[index][1],
                        z: vertices[index][2]
                    })),
                    material: data.material
                };

                // Check for intersections
                for (let x = 0; x < canvas.width; x++) {
                    for (let y = 0; y < canvas.height; y++) {
                        var dir = {
                            x: (x / canvas.width) - 0.5,
                            y: (y / canvas.height) - 0.5,
                            z: 1
                        };
                        dir = vectorNormalize(dir);
                        var ray = { origin: eye, direction: dir };
                        var hit = rayIntersectsTriangle(ray, triangle);
                        if (hit) {
                            var color = new Color(data.material.diffuse[0] * 255, data.material.diffuse[1] * 255, data.material.diffuse[2] * 255, 255);
                            drawPixel(imageData, x, y, color);
                        }
                    }
                }
            });
        });

        context.putImageData(imageData, 0, 0);
    });
}

// Set the canvas and context
window.onload = main;
