<template>
  <!-- WebGL2 not enabled dialog -->
  <v-dialog
    v-model="showWebGL2Warning"
    class="error-dialog"
    persistent
  >
    <v-card>
      <div class="error-message">
        <p>
          <strong>This app requires WebGL 2</strong>
        </p>
        <p class="mt-2">Check your browser's settings and enable WebGL 2 ("graphics acceleration" on some browsers).</p>
        <p class="mt-2">
          You can check whether your browser supports WebGL 2 and get assistance
          <a
            href="https://get.webgl.org/webgl2/"
            target="_blank"
            rel="noopener noreferrer"
          >here</a>.
        </p>
      </div>
    </v-card>
  </v-dialog>
</template>
<script setup lang="ts">
import { ref } from "vue";
function isWebGL2Enabled(): boolean {
  // It doesn't seem like there's a better way to do this than just to try and get a context
  // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/By_example/Detect_WebGL
  // NB: The engine specifically wants a webgl2 context
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2");
  return gl instanceof WebGL2RenderingContext;
}

const emits = defineEmits(["webgl2-disabled"]);

const showWebGL2Warning = ref(!isWebGL2Enabled());
if (showWebGL2Warning.value) {
  emits("webgl2-disabled");
}
</script>

<style scoped>
.error-dialog {
  width: auto;
  height: auto;
  max-width: 500px;
  border-radius: 10px;

  .v-card {
    border-radius: 10px !important;
  }
}

.error-message {
  padding: 1rem;
  text-align: center;
  border-radius: 10px;
}
</style>
