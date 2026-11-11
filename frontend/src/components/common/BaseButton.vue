<script setup>
defineEmits(['click'])
</script>

<template>
  <button class="base-button" type="button" @click="$emit('click')">
    <slot />
  </button>
</template>

<style scoped>
.base-button {
  padding: 8px 16px;
  border: 0;
  border-radius: 6px;
  background: var(--color-primary);
  color: #fff;
  cursor: pointer;
}
</style>
