/* classes */

// Color constructor
class Color {
    constructor(r, g, b, a) {
        this.change(r, g, b, a);
    }
    
    change(r, g, b, a) {
        this.r = r; this.g = g; this.b = b; this.a = a;
    }
}

// Vector class from exercise 4
class Vector {
    constructor(x, y, z) {
        this.set(x, y, z);
    }

    set(x, y, z) {
        this.x = x; this.y = y; this.z = z;
    }

    static dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    }

    static cross(v1, v2) {
        return new Vector(
            v1.y * v2.z - v1.z * v2.y,
            v1.z * v2.x - v1.x * v2.z,
            v1.x * v2.y - v1.y * v2.x
        );
    }

    static subtract(v1, v2) {
        return new Vector(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z);
    }

    static add(v1, v2) {
        return new Vector(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z);
    }

    static scale(c, v) {
        return new Vector(c * v.x, c * v.y, c * v.z);
    }

    static normalize(v) {
        const length = Math.sqrt(Vector.dot(v, v));
        return Vector.scale(1 / length, v);
    }
}

// Utility function to draw a pixel
function drawPixel(imagedata, x, y, color) {
    const pixelindex = (y * imagedata.width + x) * 4;
    imagedata.data[pixelindex] = color.r;
    imagedata.data[pixelindex + 1] = color.g;
    imagedata.data[pixelindex + 2] = color.b;
    imagedata.data[pixelindex + 3] = color.a;
}

// Get the input triangles from the URL
function getInputTriangles() {
    const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog1/triangles.json";
    var httpReq = new XMLHttpRequest();
    httpReq.open("GET", INPUT_TRIANGLES_URL, false);
    httpReq.send(null);

    if (httpReq.status === 200) {
        return JSON.parse(httpReq.response);
    } else {
        console.log("Unable to open input triangles file!");
        return null;
    }
}

// Blinn-Phong lighting computation
function computeBlinnPhongLighting(intersect, normal, view, material, lightPos) {
    const ambient = Vector.scale(material.ambient, new Vector(1, 1, 1));
    
    const lightDir = Vector.normalize(Vector.subtract(lightPos, intersect));
    const viewDir = Vector.normalize(Vector.subtract(view, intersect));
    const halfDir = Vector.normalize(Vector.add(lightDir, viewDir));

    const diffuse = Vector.scale(
        material.diffuse, Math.max(Vector.dot(normal, lightDir), 0)
    );
    
    const specular = Vector.scale(
        material.specular,
        Math.pow(Math.max(Vector.dot(normal, halfDir), 0), material.n)
    );

    const color = Vector.add(Vector.add(ambient, diffuse), specular);
    return new Color(
        Math.min(255, color.x * 255),
        Math.min(255, color.y * 255),
        Math.min(255, color.z * 255),
        255
    );
}

// Check if a point is inside a triangle using barycentric coordinates
function isInsideTriangle(p, v0, v1, v2) {
    const d00 = Vector.dot(v0, v0);
    const d01 = Vector.dot(v0, v1);
    const d11 = Vector.dot(v1, v1);
    const d20 = Vector.dot(v2, v0);
    const d21 = Vector.dot(v2, v1);
    const denom = d00 * d11 - d01 * d01;

    const v = (d11 * d20 - d01 * d21) / denom;
    const w = (d00 * d21 - d01 * d20) / denom;
    const u = 1 - v - w;

    return u >= 0 && v >= 0 && w >= 0;
}

// Draw triangles using ray tracing
function drawInputTriangles(context) {
    const inputTriangles = getInputTriangles();
    const w = context.canvas.width;
    const h = context.canvas.height;
    const imagedata = context.createImageData(w, h);
    
    const eye = new Vector(0.5, 0.5, -0.5);
    const lightPos = new Vector(-0.5, 1.5, -0.5);

    if (inputTriangles) {
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let nearestT = Number.MAX_VALUE;
                let nearestTri = null;
                let nearestIntersect = null;
                let nearestNormal = null;

                const rayDir = Vector.normalize(new Vector(x / w - 0.5, (h - y) / h - 0.5, 0));

                inputTriangles.forEach(function(triangleSet) {
                    triangleSet.triangles.forEach(function(triangle, triIdx) {
                        const v0Idx = triangle[0];
                        const v1Idx = triangle[1];
                        const v2Idx = triangle[2];

                        const v0 = new Vector(...triangleSet.vertices[v0Idx]);
                        const v1 = new Vector(...triangleSet.vertices[v1Idx]);
                        const v2 = new Vector(...triangleSet.vertices[v2Idx]);

                        const edge1 = Vector.subtract(v1, v0);
                        const edge2 = Vector.subtract(v2, v0);

                        const h = Vector.cross(rayDir, edge2);
                        const a = Vector.dot(edge1, h);

                        if (a > -0.00001 && a < 0.00001) return;

                        const f = 1 / a;
                        const s = Vector.subtract(eye, v0);
                        const u = f * Vector.dot(s, h);

                        if (u < 0 || u > 1) return;

                        const q = Vector.cross(s, edge1);
                        const v = f * Vector.dot(rayDir, q);

                        if (v < 0 || u + v > 1) return;

                        const t = f * Vector.dot(edge2, q);
                        if (t > 0.00001 && t < nearestT) {
                            nearestT = t;
                            nearestTri = triangleSet;
                            nearestIntersect = Vector.add(eye, Vector.scale(t, rayDir));
                            nearestNormal = Vector.normalize(Vector.cross(edge1, edge2));
                        }
                    });
                });

                if (nearestTri) {
                    const color = computeBlinnPhongLighting(
                        nearestIntersect,
                        nearestNormal,
                        eye,
                        nearestTri.material,
                        lightPos
                    );
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
    drawInputTriangles(context);
}
