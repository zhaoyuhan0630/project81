// Constants for the eye, light, and window
const eye = {x: 0.5, y: 0.5, z: -0.5};
const light = {x: -3, y: 1, z: -0.5};
const viewport = {width: 1, height: 1, distance: 0.5};

// Helper function to calculate dot product
function dotProduct(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}

// Helper function to calculate cross product
function crossProduct(v1, v2) {
    return {
        x: v1.y * v2.z - v1.z * v2.y,
        y: v1.z * v2.x - v1.x * v2.z,
        z: v1.x * v2.y - v1.y * v2.x
    };
}

// Helper function to subtract two vectors
function subtract(v1, v2) {
    return {x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z};
}

// Helper function to normalize a vector
function normalize(v) {
    let length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    return {x: v.x / length, y: v.y / length, z: v.z / length};
}

// Calculate the ray for a pixel
function calculateRay(x, y, width, height) {
    return normalize({
        x: (x / width) - 0.5,
        y: (1 - y / height) - 0.5,
        z: 0
    });
}

// Determine if a ray intersects with a triangle
function rayIntersectsTriangle(ray, triangle, vertex1, vertex2, vertex3) {
    let edge1 = subtract(vertex2, vertex1);
    let edge2 = subtract(vertex3, vertex1);
    let h = crossProduct(ray, edge2);
    let a = dotProduct(edge1, h);

    if (a > -0.00001 && a < 0.00001) return null;

    let f = 1 / a;
    let s = subtract(eye, vertex1);
    let u = f * dotProduct(s, h);

    if (u < 0 || u > 1) return null;

    let q = crossProduct(s, edge1);
    let v = f * dotProduct(ray, q);

    if (v < 0 || u + v > 1) return null;

    let t = f * dotProduct(edge2, q);

    if (t > 0.00001) return {t: t, point: {x: eye.x + ray.x * t, y: eye.y + ray.y * t, z: eye.z + ray.z * t}};
    else return null;
}

// Blinn-Phong lighting model
function blinnPhongLighting(intersection, normal, material, light, view) {
    const ambient = {r: material.ambient[0], g: material.ambient[1], b: material.ambient[2]};
    const lightDir = normalize(subtract(light, intersection));
    const viewDir = normalize(subtract(view, intersection));
    const halfDir = normalize({
        x: lightDir.x + viewDir.x,
        y: lightDir.y + viewDir.y,
        z: lightDir.z + viewDir.z
    });

    const diffuseIntensity = Math.max(0, dotProduct(normal, lightDir));
    const specularIntensity = Math.pow(Math.max(0, dotProduct(normal, halfDir)), material.n);

    return new Color(
        255 * (ambient.r + material.diffuse[0] * diffuseIntensity + material.specular[0] * specularIntensity),
        255 * (ambient.g + material.diffuse[1] * diffuseIntensity + material.specular[1] * specularIntensity),
        255 * (ambient.b + material.diffuse[2] * diffuseIntensity + material.specular[2] * specularIntensity),
        255
    );
}

// Draw the scene with ray casting and lighting
function drawTriangles(context) {
    const inputTriangles = getInputTriangles();
    const width = context.canvas.width;
    const height = context.canvas.height;
    const imagedata = context.createImageData(width, height);

    if (inputTriangles) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let ray = calculateRay(x, y, width, height);
                let closestT = Infinity;
                let closestIntersection = null;
                let closestTriangle = null;
                let closestNormal = null;

                for (let i = 0; i < inputTriangles.length; i++) {
                    let triangleSet = inputTriangles[i];
                    for (let j = 0; j < triangleSet.triangles.length; j++) {
                        let tri = triangleSet.triangles[j];
                        let vertex1 = {x: triangleSet.vertices[tri[0]][0], y: triangleSet.vertices[tri[0]][1], z: triangleSet.vertices[tri[0]][2]};
                        let vertex2 = {x: triangleSet.vertices[tri[1]][0], y: triangleSet.vertices[tri[1]][1], z: triangleSet.vertices[tri[1]][2]};
                        let vertex3 = {x: triangleSet.vertices[tri[2]][0], y: triangleSet.vertices[tri[2]][1], z: triangleSet.vertices[tri[2]][2]};

                        let intersection = rayIntersectsTriangle(ray, tri, vertex1, vertex2, vertex3);
                        if (intersection && intersection.t < closestT) {
                            closestT = intersection.t;
                            closestIntersection = intersection.point;
                            closestTriangle = triangleSet;
                            closestNormal = normalize(crossProduct(subtract(vertex2, vertex1), subtract(vertex3, vertex1)));
                        }
                    }
                }

                if (closestTriangle) {
                    let color = blinnPhongLighting(closestIntersection, closestNormal, closestTriangle.material, light, eye);
                    drawPixel(imagedata, x, y, color);
                }
            }
        }
    }

    context.putImageData(imagedata, 0, 0);
}

/* main -- here is where execution begins after window load */
function main() {
    var canvas = document.getElementById("viewport"); 
    var context = canvas.getContext("2d");

    drawTriangles(context);
}
