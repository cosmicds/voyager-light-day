/* eslint-disable */
// @ts-nocheck

import { CameraParameters, Color, Matrix3d, RenderContext } from "@wwtelescope/engine";
import { createVertexShader, createFragmentShader, createProgram, displayShaderCompileError, displayProgramLinkError } from "./webgl_utils";
import { WEBGL } from "./webgl_constants";

export class TriangleShader {
  static initialized = false;
  static _frag: WebGLShader;
  static _vert: WebGLShader;
  static _prog: WebGLProgram;
  static posLoc = 0;
  static colorLoc = 0;
  static pointSizeLoc = 0;
  static timeLoc = 0;
  static showLoc = 0;
  static mvMatrixLoc = 0;
  static pMatrixLoc = 0;
  static nowLoc = 0;
  static cameraPosLoc = 0;
  static decayLoc = 0;
  static scaleLoc = 0;
  static minSizeLoc = 0;
  static skyLoc = 0;
  static showFarSideLoc = 0;
  static lineColorLoc = 0;

  static init(renderContext: RenderContext) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error `gl` exists on `RenderContext`
    const gl: WebGLRenderingContextBase = renderContext.gl;

    const fragShaderText = `\
      #version 300 es
      precision mediump float;
      in vec4 vColor;
      out vec4 fragColor;

      // Taken from https://www.shadertoy.com/view/XsXSz4
      float dot2(in vec2 v) { return dot(v,v); }
      float signedDistanceFromTriangle(in vec2 p, in vec2 p0, in vec2 p1, in vec2 p2) {
        vec2 e0 = p1 - p0, e1 = p2 - p1, e2 = p0 - p2;
        vec2 v0 = p - p0, v1 = p - p1, v2 = p - p2;
      	float d0 = dot2(v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0));
      	float d1 = dot2(v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0));
        float d2 = dot2(v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0));

          float s = e0.x * e2.y - e0.y * e2.x;
          vec2 d = min(min(vec2(d0, s * (v0.x * e0.y - v0.y * e0.x)),
                           vec2(d1, s * (v1.x * e1.y - v1.y * e1.x))),
                           vec2(d2, s * (v2.x * e2.y - v2.y * e2.x)));
      	return -sqrt(d.x) * sign(d.y);
      }

      void main() {
        vec2 p = gl_PointCoord - vec2(0.5);
        // y runs top-down, but we want bottom-up
        float side = sqrt(2.0);
        float sqrt3 = sqrt(3.0);
        float distance = signedDistanceFromTriangle(
          vec2(p.x, 0.5 - p.y),
          vec2(0.0, side * sqrt3 / 3.0),
          vec2(-0.5 * side, -side * sqrt3 / 6.0),
          vec2(0.5 * side, -side * sqrt3 / 6.0)
        );
        float fw = fwidth(distance);
        float alpha = vColor.a * (1.0 - smoothstep(-fw * 0.5, fw * 0.5, distance));
        fragColor = vec4(vColor.rgb, alpha);
      }
    `;

    const vertShaderText = `\
      #version 300 es
      in vec3 aVertexPosition;
      in vec4 aVertexColor;
      in vec2 aTime;
      in float aPointSize;
      in float aShow;
      uniform mat4 uMVMatrix;
      uniform mat4 uPMatrix;
      uniform float jNow;
      uniform vec3 cameraPosition;
      uniform float decay;
      uniform float scale;
      uniform float minSize;
      uniform float sky;
      uniform float showFarSide;

      out lowp vec4 vColor;

      void main(void)
      {
          float dotCam = dot( normalize(cameraPosition-aVertexPosition), normalize(aVertexPosition));
          float dist = distance(aVertexPosition, cameraPosition);
          gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
          float dAlpha = aShow;

          if ( dAlpha > 0.0 && decay > 0.0 )
          {
                  dAlpha = 1.0 - ((jNow - aTime.y) / decay);
                  if (dAlpha > 1.0 )
                  {
                      dAlpha = 1.0;
                  }
          }

          if ( showFarSide == 0.0 && (dotCam * sky) < 0.0 || (jNow < aTime.x && decay > 0.0))
          {
              vColor = vec4(0.0, 0.0, 0.0, 0.0);
          }
          else
          {
              vColor = vec4(aVertexColor.r, aVertexColor.g, aVertexColor.b, aVertexColor.a * dAlpha);
          }

          float lSize = scale;

          if (scale < 0.0)
          {
              lSize = -scale;
              dist = 1.0;
          }

          gl_PointSize = max(minSize, (lSize * ( aPointSize ) / dist));
      }
    `;

    const vert = createVertexShader(gl, vertShaderText);
    TriangleShader._vert = vert;
    displayShaderCompileError(gl, vert);

    const frag = createFragmentShader(gl, fragShaderText);
    TriangleShader._frag = frag;
    displayShaderCompileError(gl, frag);

    const program = createProgram(gl, vert, frag);
    TriangleShader._prog = program;
    displayProgramLinkError(gl, program);

    gl.useProgram(program);
    TriangleShader.posLoc = gl.getAttribLocation(program, "aVertexPosition");
    TriangleShader.colorLoc = gl.getAttribLocation(program, "aVertexColor");
    TriangleShader.pointSizeLoc = gl.getAttribLocation(program, "aPointSize");
    TriangleShader.timeLoc = gl.getAttribLocation(program, "aTime");
    TriangleShader.showLoc = gl.getAttribLocation(program, "aShow");
    TriangleShader.mvMatrixLoc = gl.getUniformLocation(program, "uMVMatrix");
    TriangleShader.pMatrixLoc = gl.getUniformLocation(program, "uPMatrix");
    TriangleShader.nowLoc = gl.getUniformLocation(program, "jNow");
    TriangleShader.cameraPosLoc = gl.getUniformLocation(program, "cameraPosition");
    TriangleShader.decayLoc = gl.getUniformLocation(program, "decay");
    TriangleShader.scaleLoc = gl.getUniformLocation(program, "scale");
    TriangleShader.minSizeLoc = gl.getUniformLocation(program, "minSize");
    TriangleShader.skyLoc = gl.getUniformLocation(program, "sky");
    TriangleShader.showFarSideLoc = gl.getUniformLocation(program, "showFarSide");
    TriangleShader.lineColorLoc = gl.getUniformLocation(program, "lineColor");

    gl.enable(WEBGL.BLEND);
    gl.blendFunc(WEBGL.SRC_ALPHA, WEBGL.ONE_MINUS_SRC_ALPHA);
    TriangleShader.initialized = true;
  }

    static use(
    renderContext: RenderContext,
    vertex: WebGLBuffer,
    lineColor: Color,
    zBuffer: boolean,
    jNow: number,
    decay: number,
    camera: CameraParameters,
    scale: number,
    minSize: number,
    showFarSide: boolean,
    sky: booleam,
    mask: WebGLBuffer,
  ) {

    const gl = renderContext.gl as WebGLRenderingContextBase;
    if (!TriangleShader.initialized) {
      TriangleShader.init(renderContext);
    }

    gl.useProgram(TriangleShader._prog);
    const mvMat = Matrix3d.multiplyMatrix(renderContext.get_world(), renderContext.get_view());
    gl.uniformMatrix4fv(TriangleShader.mvMatrixLoc, false, mvMat.floatArray());
    gl.uniformMatrix4fv(TriangleShader.pMatrixLoc, false, renderContext.get_projection().floatArray());
    gl.uniform1f(TriangleShader.nowLoc, jNow);
    gl.uniform1f(TriangleShader.decayLoc, decay);
    gl.uniform1f(TriangleShader.scaleLoc, scale);
    gl.uniform1f(TriangleShader.minSizeLoc, minSize);
    gl.uniform1f(TriangleShader.showFarSideLoc, showFarSide ? 1 : 0);
    gl.uniform1f(TriangleShader.skyLoc, sky ? -1 : 1);
    gl.uniform3f(TriangleShader.cameraPosLoc, camera.x, camera.y, camera.z);
    gl.uniform4f(TriangleShader.lineColorLoc, lineColor.r / 255, lineColor.g / 255, lineColor.b / 255, lineColor.a / 255);

    if (zBuffer) {
      gl.enable(WEBGL.DEPTH_TEST);
    } else {
      gl.disable(WEBGL.DEPTH_TEST);
    }
    gl.disableVertexAttribArray(0);
    gl.disableVertexAttribArray(1);
    gl.disableVertexAttribArray(2);
    gl.disableVertexAttribArray(3);
    gl.bindBuffer(WEBGL.ARRAY_BUFFER, vertex);
    gl.bindBuffer(WEBGL.ELEMENT_ARRAY_BUFFER, null);
    gl.enableVertexAttribArray(TriangleShader.vertLoc);
    gl.enableVertexAttribArray(TriangleShader.colorLoc);
    gl.enableVertexAttribArray(TriangleShader.pointSizeLoc);
    gl.enableVertexAttribArray(TriangleShader.timeLoc);
    gl.vertexAttribPointer(TriangleShader.vertLoc, 3, WEBGL.FLOAT, false, 40, 0);
    gl.vertexAttribPointer(TriangleShader.colorLoc, 4, WEBGL.FLOAT, false, 40, 12);
    gl.vertexAttribPointer(TriangleShader.pointSizeLoc, 1, WEBGL.FLOAT, false, 40, 36);
    gl.vertexAttribPointer(TriangleShader.timeLoc, 2, WEBGL.FLOAT, false, 40, 28);

    if (mask != null) {
      gl.bindBuffer(WEBGL.ARRAY_BUFFER, mask);
      gl.enableVertexAttribArray(TriangleShader.showLoc);
      gl.vertexAttribPointer(TriangleShader.showLoc, 1, WEBGL.UNSIGNED_BYTE, false, 0, 0);
    } else {
      gl.disableVertexAttribArray(TriangleShader.showLoc);
      gl.vertexAttrib1f(TriangleShader.showLoc, 1.0);
    }

    gl.lineWidth(1);
    gl.enable(WEBGL.BLEND);
    gl.blendFunc(WEBGL.SRC_ALPHA, WEBGL.ONE_MINUS_SRC_ALPHA);
  }
}
