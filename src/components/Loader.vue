<template>
  <transition name="fade">
    <div
      v-show="isLoading"
      id="modal-loading"
      class="modal"
    >
      <div class="container">
        <slot :loading="isLoading">
          <div class="spinner"></div>
          <p>Loading …</p>
        </slot>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
const isLoading = defineModel<boolean>({ default: true });

defineSlots<{
  // not sure the return type is important. docs use any, but others use void
  default(props: { loading: boolean}): void;
}>();

</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.modal {
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  z-index: 100;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

#modal-loading {
  background-color: #000;
}

#modal-loading .container {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}

#modal-loading .container .spinner {
  background-image: url("https://projects.cosmicds.cfa.harvard.edu/cds-website/misc/lunar_loader.gif");
  background-repeat: no-repeat;
  background-size: contain;
  width: 3rem;
  height: 3rem;
}

#modal-loading .container p {
  margin: 0 0 0 1rem;
  padding: 0;
  font-size: 2rem;
}
</style>
