import { WEBGL } from "./webgl_constants";

type ShaderType = typeof WEBGL.VERTEX_SHADER | typeof WEBGL.FRAGMENT_SHADER;

export function createShader(
  gl: WebGLRenderingContextBase,
  src: string,
  type: ShaderType
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    return null;
  }
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  return shader;
}

export function createVertexShader(gl: WebGLRenderingContextBase, src: string) {
  return createShader(gl, src, WEBGL.VERTEX_SHADER);
}

export function createFragmentShader(gl: WebGLRenderingContextBase, src: string) {
  return createShader(gl, src, WEBGL.FRAGMENT_SHADER);
}

export function displayShaderCompileError(gl: WebGLRenderingContextBase, shader: WebGLShader) {
  const status = gl.getShaderParameter(shader, WEBGL.COMPILE_STATUS);
  if (!status) {
    console.error(gl.getShaderInfoLog(shader));
  }
}

export function createProgram(gl: WebGLRenderingContextBase, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  return program;
}

export function displayProgramLinkError(gl: WebGLRenderingContextBase, program: WebGLProgram) {
  const status = gl.getProgramParameter(program, WEBGL.LINK_STATUS);
  if (!status) {
    console.error(gl.getProgramInfoLog(program));
  }
}
