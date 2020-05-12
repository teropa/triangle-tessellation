export type Vector3 = [number, number, number];
export type Face3 = [number, number, number];
export type Geometry3 = { vertices: Vector3[]; faces: Face3[] };

export function tessellateTriangle(
    triangle: [Vector3, Vector3, Vector3],
    outerLevelUV: number,
    outerLevelVW: number,
    outerLevelWU: number,
    innerLevel: number,
): Geometry3 {
    let [u, v, w] = triangle;
    if (outerLevelUV === 1 && outerLevelVW === 1 && outerLevelWU === 1 && innerLevel === 1) {
        return {
            vertices: [u, v, w],
            faces: [[0, 1, 2]],
        };
    }

    if (innerLevel === 1) {
        innerLevel = 1 + 1e-6;
    }

    // Normal vector of the plane formed by the triangle
    let planeNormal = normalizeV3(crossV3(subV3(v, u), subV3(w, u)));

    // Start by subdividing the outer edges according to the inner tessellation level
    let rings: Vector3[][][] = [
        [
            subdivideEdge(u, v, Math.ceil(innerLevel)),
            subdivideEdge(v, w, Math.ceil(innerLevel)),
            subdivideEdge(w, u, Math.ceil(innerLevel)),
        ],
    ];

    // Generate inner rings until there are no more edge subdivisions
    while (rings[rings.length - 1][0].length > 3) {
        rings.push(generateInnerRing(rings[rings.length - 1]));
    }

    // Now replace the outermost ring with one that uses the outer subdivisions
    rings[0][0] = subdivideEdge(u, v, Math.ceil(outerLevelUV));
    rings[0][1] = subdivideEdge(v, w, Math.ceil(outerLevelVW));
    rings[0][2] = subdivideEdge(w, u, Math.ceil(outerLevelWU));

    // Generate vertex array and generate version of ring data structurewith indexes
    let vertices: Vector3[] = [];
    let ringVertexIndices: number[][][] = [];
    for (let [ringUVPoints, ringVWPoints, ringWUPoints] of rings) {
        let ringUVIndices: number[] = [];
        let ringVWIndices: number[] = [];
        let ringWUIndices: number[] = [];

        vertices.push(ringUVPoints[0]);
        ringUVIndices[0] = vertices.length - 1;
        ringWUIndices[ringWUPoints.length - 1] = vertices.length - 1;

        vertices.push(ringVWPoints[0]);
        ringVWIndices[0] = vertices.length - 1;
        ringUVIndices[ringUVPoints.length - 1] = vertices.length - 1;

        vertices.push(ringWUPoints[0]);
        ringWUIndices[0] = vertices.length - 1;
        ringVWIndices[ringVWPoints.length - 1] = vertices.length - 1;

        for (let i = 1; i < ringUVPoints.length - 1; i++) {
            vertices.push(ringUVPoints[i]);
            ringUVIndices[i] = vertices.length - 1;
        }
        for (let i = 1; i < ringVWPoints.length - 1; i++) {
            vertices.push(ringVWPoints[i]);
            ringVWIndices[i] = vertices.length - 1;
        }
        for (let i = 1; i < ringWUPoints.length - 1; i++) {
            vertices.push(ringWUPoints[i]);
            ringWUIndices[i] = vertices.length - 1;
        }

        ringVertexIndices.push([ringUVIndices, ringVWIndices, ringWUIndices]);
    }

    // Generate faces to fill each consecutive ring pair
    let faces: Face3[] = [];
    for (let i = 0; i < rings.length - 1; i++) {
        let [outerRingUVVertexIndices, outerRingVWVertexIndices, outerRingWUVertexIndices] = ringVertexIndices[i];
        let [innerRingUVVertexIndices, innerRingVWVertexIndices, innerRingWUVertexIndices] = ringVertexIndices[i + 1];

        generateFacesBetween(outerRingUVVertexIndices, innerRingUVVertexIndices, vertices, planeNormal, faces);
        generateFacesBetween(outerRingVWVertexIndices, innerRingVWVertexIndices, vertices, planeNormal, faces);
        generateFacesBetween(outerRingWUVertexIndices, innerRingWUVertexIndices, vertices, planeNormal, faces);
    }

    // Generate triangles to fill the innermost ring
    let [innermostUVVertexIndices, innermostVWVertexIndices, innermostWUVertexIndices] = ringVertexIndices[
        rings.length - 1
    ];
    if (
        innermostUVVertexIndices.length === 2 &&
        innermostVWVertexIndices.length === 2 &&
        innermostWUVertexIndices.length === 2
    ) {
        // Innermost ring has no subdivisions; use it as a triangle as-is
        faces.push(buildFace(innermostUVVertexIndices[0], innermostVWVertexIndices[0], innermostWUVertexIndices[0], vertices, planeNormal));
    } else {
        // Innermost triagle is subdivided, generate faces between all the points on the ring and the centerpoint
        let centerVertex = multiplyScalarV3(addV3(addV3(u, v), w), 1 / 3);
        vertices.push(centerVertex);
        let centerVertexIdx = vertices.length - 1;
        for (let i = 0; i < innermostUVVertexIndices.length - 1; i++) {
            faces.push(buildFace(innermostUVVertexIndices[i], innermostUVVertexIndices[i + 1], centerVertexIdx, vertices, planeNormal));
        }
        for (let i = 0; i < innermostVWVertexIndices.length - 1; i++) {
            faces.push(buildFace(innermostVWVertexIndices[i], innermostVWVertexIndices[i + 1], centerVertexIdx, vertices, planeNormal));
        }
        for (let i = 0; i < innermostWUVertexIndices.length - 1; i++) {
            faces.push(buildFace(innermostWUVertexIndices[i], innermostWUVertexIndices[i + 1], centerVertexIdx, vertices, planeNormal));
        }
    }

    return { vertices, faces };
}

function subdivideEdge(a: Vector3, b: Vector3, subdivision: number) {
    let aToB = subV3(b, a);
    let aToBUnit = normalizeV3(aToB);
    let subdivisionLength = lengthV3(aToB) / subdivision;
    let result = [a];
    for (let i = 0; i < subdivision - 1; i++) {
        result.push(addV3(a, multiplyScalarV3(aToBUnit, subdivisionLength * (i + 1))));
    }
    result.push(b);
    return result;
}

function projectPointV3(pt: Vector3, a: Vector3, b: Vector3) {
    let ab = subV3(b, a);
    let apt = subV3(pt, a);
    let t = dotV3(ab, apt) / dotV3(ab, ab);
    return addV3(multiplyScalarV3(ab, t), a);
}

function generateInnerRing(outerRing: Vector3[][]): Vector3[][] {
    let [outerUVPoints, outerVWPoints, outerWUPoints] = outerRing;
    let outerU = outerUVPoints[0];
    let outerV = outerVWPoints[0];
    let outerW = outerWUPoints[0];

    // Outer edge vectors
    let outerUV = subV3(outerV, outerU);
    let outerVW = subV3(outerW, outerV);
    let outerWU = subV3(outerU, outerW);

    // Normal vector of the plane formed by the triangle
    let planeNormal = normalizeV3(crossV3(outerUV, outerVW));

    // Edge normal vectors
    let outerUVNormal = normalizeV3(crossV3(outerUV, planeNormal));
    let outerVWNormal = normalizeV3(crossV3(outerVW, planeNormal));
    let outerWUNormal = normalizeV3(crossV3(outerWU, planeNormal));

    // Vertices on each subdivided outer edge closest to the vertices of the original outer triangle
    let uV = outerUVPoints[1];
    let uW = outerWUPoints[outerWUPoints.length - 2];
    let vW = outerVWPoints[1];
    let vU = outerUVPoints[outerUVPoints.length - 2];
    let wU = outerWUPoints[1];
    let wV = outerVWPoints[outerVWPoints.length - 2];

    // Vertices of the inner triangle
    let innerU = intersectLines(uV, outerUVNormal, uW, outerWUNormal)!;
    let innerV = intersectLines(vW, outerVWNormal, vU, outerUVNormal)!;
    let innerW = intersectLines(wU, outerWUNormal, wV, outerVWNormal)!;

    // Project the rest of the subdivided edge points onto the edges of this inner triangle...
    let innerUVPoints = [innerU];
    for (let i = 2; i < outerUVPoints.length - 2; i++) {
        innerUVPoints.push(projectPointV3(outerUVPoints[i], innerU, innerV));
    }
    innerUVPoints.push(innerV);

    let innerVWPoints = [innerV];
    for (let i = 2; i < outerVWPoints.length - 2; i++) {
        innerVWPoints.push(projectPointV3(outerVWPoints[i], innerV, innerW));
    }
    innerVWPoints.push(innerW);

    let innerWUPoints = [innerW];
    for (let i = 2; i < outerWUPoints.length - 2; i++) {
        innerWUPoints.push(projectPointV3(outerWUPoints[i], innerW, innerU));
    }
    innerWUPoints.push(innerU);

    return [innerUVPoints, innerVWPoints, innerWUPoints];
}

// https://math.stackexchange.com/a/271366
function intersectLines(c: Vector3, e: Vector3, d: Vector3, f: Vector3) {
    let g = subV3(d, c);
    let h = crossV3(f, g);
    let hLength = lengthV3(h);
    if (hLength === 0) return null;
    let k = crossV3(f, e);
    let kLength = lengthV3(k);
    if (kLength === 0) return null;

    let i = multiplyScalarV3(e, hLength / kLength);

    if (lengthV3(crossV3(h, k)) > 1e-6) {
        return addV3(c, i);
    } else {
        return subV3(c, i);
    }
}

function generateFacesBetween(outerVertexIndices: number[], innerVertexIndices: number[], vertices: Vector3[], normal: Vector3, faces: Face3[]) {
    let outerEdge = true;
    let outerIdx = 0;
    let innerIdx = 0;
    while (outerIdx < outerVertexIndices.length - 1 || innerIdx < innerVertexIndices.length - 1) {
        if (outerEdge && outerIdx < outerVertexIndices.length - 1) {
            faces.push(buildFace(outerVertexIndices[outerIdx], outerVertexIndices[outerIdx + 1], innerVertexIndices[innerIdx], vertices, normal));
            outerIdx++;
        } else if (!outerEdge && innerIdx < innerVertexIndices.length - 1) {
            faces.push(buildFace(innerVertexIndices[innerIdx], innerVertexIndices[innerIdx + 1], outerVertexIndices[outerIdx], vertices, normal));
            innerIdx++;
        }
        outerEdge = !outerEdge;
    }
}

function buildFace(a: number, b: number, c: number, vertices: Vector3[], normal: Vector3): Face3 {
    if (isCCW(vertices[a], vertices[b], vertices[c], normal)) {
        return [a, b, c];
    } else {
        return [a, c, b];
    }
}

function isCCW(a: Vector3, b: Vector3, c: Vector3, normal: Vector3) {
    let triNormal = crossV3(subV3(b, a), subV3(c, a));
    return dotV3(triNormal, normal) > 0;
}

function addV3(a: Vector3, b: Vector3): Vector3 {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subV3(a: Vector3, b: Vector3): Vector3 {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function multiplyScalarV3(a: Vector3, m: number): Vector3 {
    return [a[0] * m, a[1] * m, a[2] * m];
}

function lengthV3(a: Vector3): number {
    return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}

function normalizeV3(a: Vector3): Vector3 {
    let length = lengthV3(a);
    return [a[0] / length, a[1] / length, a[2] / length];
}

function dotV3(a: Vector3, b: Vector3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function crossV3(a: Vector3, b: Vector3): Vector3 {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
