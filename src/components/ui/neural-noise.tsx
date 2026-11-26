"use client";

import { useEffect, useRef } from "react";

export interface NeuralNoiseProps {
  /** RGB color array (0-1 values), default [0.9, 0.2, 0.4] */
  color?: [number, number, number];
  /** Opacity of the canvas */
  opacity?: number;
  /** Speed of the animation */
  speed?: number;
}

export function NeuralNoise({
  color = [0.9, 0.2, 0.4],
  opacity = 0.95,
  speed = 0.001,
}: NeuralNoiseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [red, green, blue] = color;

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    // Use WebGL or experimental WebGL
    const gl = (canvasEl.getContext("webgl") ||
      canvasEl.getContext("experimental-webgl")) as WebGLRenderingContext | null;

    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    const pointer = { x: 0, y: 0, tX: 0, tY: 0 };
    let uniforms: Record<string, WebGLUniformLocation | null> = {};
    let animationFrameId = 0;
    let width = 1;
    let height = 1;
    let visible = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const vsSource = `
      precision mediump float;
      varying vec2 vUv;
      attribute vec2 a_position;
      void main() {
        vUv = 0.5 * (a_position + 1.0);
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision mediump float;
      varying vec2 vUv;
      uniform float u_time;
      uniform float u_ratio;
      uniform vec2 u_pointer_position;
      uniform vec3 u_color;
      uniform float u_speed;
      vec2 rotate(vec2 uv, float th) {
        return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
      }
      float neuro_shape(vec2 uv, float t, float p) {
        vec2 sine_acc = vec2(0.0);
        vec2 res = vec2(0.0);
        float scale = 8.0;
        for (int j = 0; j < 15; j++) {
          uv = rotate(uv, 1.0);
          sine_acc = rotate(sine_acc, 1.0);
          vec2 layer = uv * scale + float(j) + sine_acc - t;
          sine_acc += sin(layer) + 2.4 * p;
          res += (0.5 + 0.5 * cos(layer)) / scale;
          scale *= 1.2;
        }
        return res.x + res.y;
      }
      void main() {
        vec2 uv = 0.5 * vUv;
        uv.x *= u_ratio;
        vec2 pointer = vUv - u_pointer_position;
        pointer.x *= u_ratio;
        float p = clamp(length(pointer), 0.0, 1.0);
        p = 0.5 * pow(1.0 - p, 2.0);
        float t = u_speed * u_time;
        vec3 col = vec3(0.0);
        float noise = neuro_shape(uv, t, p);
        noise = 1.2 * pow(noise, 3.0);
        noise += pow(noise, 10.0);
        noise = max(0.0, noise - 0.5);
        noise *= (1.0 - length(vUv - 0.5));
        col = u_color * noise;
        gl_FragColor = vec4(col, noise);
      }
    `;

    function createShader(glCtx: WebGLRenderingContext, source: string, type: number) {
      const shader = glCtx.createShader(type);
      if (!shader) return null;
      glCtx.shaderSource(shader, source);
      glCtx.compileShader(shader);
      if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
        console.error("Shader compile error:", glCtx.getShaderInfoLog(shader));
        glCtx.deleteShader(shader);
        return null;
      }
      return shader;
    }

    function createProgram(glCtx: WebGLRenderingContext, vs: WebGLShader, fs: WebGLShader) {
      const program = glCtx.createProgram();
      if (!program) return null;
      glCtx.attachShader(program, vs);
      glCtx.attachShader(program, fs);
      glCtx.linkProgram(program);
      if (!glCtx.getProgramParameter(program, glCtx.LINK_STATUS)) {
        console.error("Program link error:", glCtx.getProgramInfoLog(program));
        glCtx.deleteProgram(program);
        return null;
      }
      return program;
    }

    function getUniforms(glCtx: WebGLRenderingContext, program: WebGLProgram) {
      const result: Record<string, WebGLUniformLocation | null> = {};
      const uniformCount = glCtx.getProgramParameter(program, glCtx.ACTIVE_UNIFORMS);
      for (let i = 0; i < uniformCount; i++) {
        const info = glCtx.getActiveUniform(program, i);
        if (info) {
          result[info.name] = glCtx.getUniformLocation(program, info.name);
        }
      }
      return result;
    }

    const vertexShader = createShader(gl, vsSource, gl.VERTEX_SHADER);
    const fragmentShader = createShader(gl, fsSource, gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return;
    }

    const shaderProgram = createProgram(gl, vertexShader, fragmentShader);
    if (!shaderProgram) {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return;
    }

    uniforms = getUniforms(gl, shaderProgram);
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.useProgram(shaderProgram);

    const positionLocation = gl.getAttribLocation(shaderProgram, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    function resizeCanvas() {
      if (!canvasEl || !gl) return;
      const devicePixelRatio = Math.min(window.devicePixelRatio, 2);
      
      // Calculate dimensions relative to parent if it's absolute, otherwise window
      // Using clientWidth/clientHeight of parent ensures it fits the section
      const parent = canvasEl.parentElement;
      width = Math.max(1, parent ? parent.clientWidth : window.innerWidth);
      height = Math.max(1, parent ? parent.clientHeight : window.innerHeight);

      canvasEl.width = width * devicePixelRatio;
      canvasEl.height = height * devicePixelRatio;

      if (uniforms && uniforms.u_ratio) {
        gl.uniform1f(uniforms.u_ratio, canvasEl.width / canvasEl.height);
      }
      gl.viewport(0, 0, canvasEl.width, canvasEl.height);
    }

    function drawFrame() {
      if (!gl) return;
      const currentTime = performance.now();
      pointer.x += (pointer.tX - pointer.x) * 0.2;
      pointer.y += (pointer.tY - pointer.y) * 0.2;

      gl.uniform1f(uniforms.u_time, currentTime);
      // Dimensions are measured on resize, rather than reading layout every frame.
      gl.uniform2f(
        uniforms.u_pointer_position,
        pointer.x / width,
        1 - pointer.y / height
      );
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function render() {
      drawFrame();
      animationFrameId = requestAnimationFrame(render);
    }

    function syncAnimation() {
      cancelAnimationFrame(animationFrameId);
      if (!visible || document.hidden) return;
      if (reducedMotion.matches) drawFrame();
      else animationFrameId = requestAnimationFrame(render);
    }

    function setupEvents() {
      const updateMousePosition = (x: number, y: number) => {
        if (!visible || document.hidden || reducedMotion.matches) return;
        // If parent exists, get pointer coords relative to parent bounding rect
        const parent = canvasEl?.parentElement;
        if (parent) {
          const rect = parent.getBoundingClientRect();
          pointer.tX = x - rect.left;
          pointer.tY = y - rect.top;
        } else {
          pointer.tX = x;
          pointer.tY = y;
        }
      };

      const pointermove = (e: PointerEvent) => updateMousePosition(e.clientX, e.clientY);
      const touchmove = (e: TouchEvent) => {
        if (e.targetTouches[0]) {
          updateMousePosition(e.targetTouches[0].clientX, e.targetTouches[0].clientY);
        }
      };
      const click = (e: MouseEvent) => updateMousePosition(e.clientX, e.clientY);

      window.addEventListener("pointermove", pointermove as EventListener);
      window.addEventListener("touchmove", touchmove as EventListener);
      window.addEventListener("click", click as EventListener);

      return () => {
        window.removeEventListener("pointermove", pointermove as EventListener);
        window.removeEventListener("touchmove", touchmove as EventListener);
        window.removeEventListener("click", click as EventListener);
      };
    }

    const cleanupEvents = setupEvents();
    resizeCanvas();
    gl.uniform3f(uniforms.u_color, red, green, blue);
    gl.uniform1f(uniforms.u_speed, speed);

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio > 0;
      syncAnimation();
    }, { threshold: 0.001 });
    observer.observe(canvasEl);
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
      syncAnimation();
    });
    resizeObserver.observe(canvasEl.parentElement ?? canvasEl);
    document.addEventListener("visibilitychange", syncAnimation);
    reducedMotion.addEventListener("change", syncAnimation);

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", syncAnimation);
      reducedMotion.removeEventListener("change", syncAnimation);
      cleanupEvents();
      cancelAnimationFrame(animationFrameId);
      gl.deleteBuffer(vertexBuffer);
      gl.deleteProgram(shaderProgram);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, [red, green, blue, speed]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        opacity,
      }}
      aria-hidden="true"
    />
  );
}
