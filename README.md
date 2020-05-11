# 3D Triangle Tessellation

A JavaScript (TypeScript) implementation of the triangle tessellation algorithm from [the OpenGL specification for tessellation shaders](https://www.khronos.org/opengl/wiki/Tessellation).

Takes the three endpoints of a single triangle and the level(s) of depth to which to subdivide it, and returns a collection of vertices and faces that tessellate the triangle to that depth.

The tessellation depth is controlled separately for each triangle edge. This allows neighbouring triangles to have matching subdivisions for their shared edge to prevent gaps in the tessellated triangle mesh. Just use the same weight for the shared edge.

![Example tessellation](example.png?raw=true "Example tessellation")

## Install

```
npm install @teropa/triangle-tessellation
```

ES Modules, CommonJS modules, and an UMD build are all provided.

## Usage

```js
import { tessellateTriangle } from "@teropa/triangle-tessellation";

let { vertices, faces } = tessellateTriangle(
  triangle,
  outerLevel1,
  outerLevel2,
  outerLevel3,
  innerLevel
);
```

The arguments are:

- `triangle` - the triangle you wish to tessellate, expressed as a 3x3 numeric array, of three 3D points. This could be in either cartesian or barycentric coordinates.
- `outerLevel1` - the outer tessellation depth for the first edge of the triangle
- `outerLevel2` - the outer tessellation depth for the second edge of the triangle
- `outerLevel3` - the outer tessellation depth for the third edge of the triangle
- `innerLevel` - the inner tessellation depth for the triangle

The return value is an object of two properties, together representing an indexed mesh geometry suitable for 3D rendering:

- `vertices` - an array of points
- `faces` - an array of triangle faces, expressed as indexes into the `vertices` array.

## Example

```js
import { tessellateTriangle } from "@teropa/triangle-tessellation";

let myTriangle = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

let { vertices, faces } = tessellateTriangle(myTriangle, 2, 3, 4, 3);

console.log(vertices);
/*
[
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [0, 0.5, 0.5],
  [0.3333333333333333, 0, 0.6666666666666667],
  [0.6666666666666666, 0, 0.33333333333333337],
  [0.3333333333333333, 0.3333333333333333, 0.3333333333333333]
]
*/

console.log(faces);
/*
[
  [0, 1, 6],
  [1, 3, 6],
  [3, 2, 6],
  [2, 4, 6],
  [4, 5, 6],
  [5, 0, 6]
]
 */
```

## Links

- [OpenGL tessellation shader spec](https://www.khronos.org/registry/OpenGL/extensions/ARB/ARB_tessellation_shader.txt). This library implements the section "2.X.2.1, Triangle Tessellation"
- [Tessellation in the OpenGL Wiki](https://www.khronos.org/opengl/wiki/Tessellation)
- [A useful Stack Overflow answer](https://stackoverflow.com/a/37648093)

