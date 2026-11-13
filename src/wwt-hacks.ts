// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import * as wwtlib from "@wwtelescope/engine";

/**
 * Attach wwtlib to the window (convenient for dev)
 */
export function addWwtlib(): void {
  window.wwtlib = wwtlib;
}

/* eslint-disable */
// @ts-nocheck

import { Color, Matrix3d, RenderContext, Vector3d } from "@wwtelescope/engine";
import { WEBGL } from "./shaders/webgl_constants";
import { TriangleShader } from "./shaders/triangle";

export function drawPointList(renderContext: RenderContext, opacity: number, cull: boolean, depthMask=true) {
  this._initBuffer(renderContext);
  const gl = renderContext.gl as WebGLRenderingContextBase;
  const zero = new Vector3d();
  const matInv = Matrix3d.multiplyMatrix(renderContext.get_world(), renderContext.get_view());
  matInv.invert();
  const cam = Vector3d._transformCoordinate(zero, matInv);
  this.depthBuffered = false;
  for (const buffer of this._pointBuffers) {
    TriangleShader.use(
      renderContext,
      buffer.vertexBuffer,
      Color.fromArgb(255 * opacity, 255, 255, 255),
      this.depthBuffered,
      this.jNow,
      0,
      cam,
      this.scale * renderContext.height / 960,
      this.minSize,
      this.showFarSide,
      this.sky,
      this._masked ? this._mask.buffer : null,
    );
    gl.drawArrays(WEBGL.POINTS, 0, buffer.count);
  }
}
