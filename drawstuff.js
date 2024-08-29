// Color class to represent RGBA colors
class Color {
    constructor(r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
}

// Vector class for 3D vector operations
class Vector {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
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

// Fetch the input triangles from the given URL
async function getInputTriangles() {
    const INPUT_TRIANGLES_URL = "https://github.com/NCSUCGClass/prog1/blob/gh-pages/triangles.json";
    try {
        const response = await fetch(INPUT_TRIANGLES_URL);
        if (response.ok) {
            const triangles = await response.json();
            return triangles;
        } else {
            console.log("Failed to load triangle data.");
            return null;
        }
    } catch (error) {
        console.error("Error fetching triangles:", error);
        return null;
    }
}

// Compute Blinn-Phong lighting
function computeBlinnPhongLighting(intersect, normal, view, material, lightPos) {
    const lightColor = new Vector(1, 1, 1);
    const ambient = Vector.scale(material.ambient[0], lightColor);
    
    const lightDir = Vector.normalize(Vector.subtract(lightPos, intersect));
    const viewDir = Vector.normalize(Vector.subtract(view, intersect));
    const halfDir = Vector.normalize(Vector.add(lightDir, viewDir));

    const diffuse = Vector.scale(
        material.diffuse[0], Math.max(Vector.dot(normal, lightDir), 0)
    );
    
    const specular = Vector.scale(
        material.specular[0],
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

// Check ray-triangle intersection using the Möller–Trumbore algorithm
function intersectRayTriangle(origin, direction, v0, v1, v2) {
    const edge1 = Vector.subtract(v1, v0);
    const edge2 = Vector.subtract(v2, v0);

    const h = Vector.cross(direction, edge2);
    const a = Vector.dot(edge1, h);

    if (a > -0.00001 && a < 0.00001) return null;

    const f = 1.0 / a;
    const s = Vector.subtract(origin, v0);
    const u = f * Vector.dot(s, h);

    if (u < 0.0 || u > 1.0) return null;

    const q = Vector.cross(s, edge1);
    const v = f * Vector.dot(direction, q);

    if (v < 0.0 || u + v > 1.0) return null;

    const t = f * Vector.dot(edge2, q);
    if (t > 0.00001) {
        const intersectPoint = Vector.add(origin, Vector.scale(t, direction));
        return {
            t: t,
            intersectPoint: intersectPoint,
            normal: Vector.normalize(Vector.cross(edge1, edge2))
        };
    } else {
        return null;
    }
}

// Draw triangles using ray tracing
async function drawInputTriangles(context) {
    const inputTriangles = await getInputTriangles();
    const w = context.canvas.width;
    const h = context.canvas.height;
    const imagedata = context.createImageData(w, h);
    
    const eye = new Vector(0.5, 0.5, -0.5);
    const lightPos = new Vector(-3, 1, -0.5);

    if (inputTriangles) {
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let nearestT = Number.MAX_VALUE;
                let nearestIntersect = null;
                let nearestNormal = null;
                let nearestMaterial = null;

                const rayDir = Vector.normalize(new Vector(x / w, 1 - y / h, 0.5));

                inputTriangles.forEach(function(triangleSet) {
                    triangleSet.triangles.forEach(function(triangle) {
                        const v0 = new Vector(...triangleSet.vertices[triangle[0]]);
                        const v1 = new Vector(...triangleSet.vertices[triangle[1]]);
                        const v2 = new Vector(...triangleSet.vertices[triangle[2]]);

                        const intersectData = intersectRayTriangle(eye, rayDir, v0, v1, v2);
                        if (intersectData && intersectData.t < nearestT) {
                            nearestT = intersectData.t;
                            nearestIntersect = intersectData.intersectPoint;
                            nearestNormal = intersectData.normal;
                            nearestMaterial = triangleSet.material;
                        }
                    });
                });

                if (nearestIntersect) {
                    const color = computeBlinnPhongLighting(
                        nearestIntersect,
                        nearestNormal,
                        eye,
                        nearestMaterial,
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
async function main() {
    var canvas = document.getElementById("viewport");
    var context = canvas.getContext("2d");
    await drawInputTriangles(context);
}
