<template>
  <div class="af-json-form w-full">
    <div ref="hostRef" class="af-jedison-host"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import Jedison from 'jedison';

const props = defineProps<{
  column: any;
  record: any;
  meta: { schema: any; columnName: string; pluginInstanceId: string };
  value: any;
  readonly?: boolean;
}>();

const emit = defineEmits(['update:value', 'update:inValidity', 'update:emptiness']);

const hostRef = ref<HTMLElement | null>(null);
let jedison: any = null;
let lastEmitted = '';

function parse(v: any): any {
  if (v == null) return undefined;
  if (typeof v === 'string') {
    if (!v.trim()) return undefined;
    try {
      return JSON.parse(v);
    } catch {
      return undefined;
    }
  }
  return v;
}

function isEmpty(val: any): boolean {
  return (
    val == null ||
    val === '' ||
    (Array.isArray(val) && val.length === 0) ||
    (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0)
  );
}

function publish() {
  if (!jedison) return;
  const val = jedison.getValue();
  const errors = jedison.getErrors();
  const firstError = errors.length ? (errors[0]?.messages?.[0] || 'Invalid value') : false;
  emit('update:inValidity', firstError);
  emit('update:emptiness', isEmpty(val));
  lastEmitted = JSON.stringify(val ?? null);
  emit('update:value', lastEmitted);
}

onMounted(() => {
  jedison = new Jedison.Create({
    container: hostRef.value,
    theme: new Jedison.Theme(),
    schema: props.meta.schema,
    data: parse(props.value),
    readOnly: !!props.readonly,
  });

  jedison.on('change', () => publish());

  // publish the normalized value (with schema defaults applied) + validity to the form
  publish();
});

watch(
  () => props.value,
  (nv) => {
    if (!jedison) return;
    const incoming = JSON.stringify(parse(nv) ?? null);
    if (incoming !== lastEmitted) {
      jedison.setValue(parse(nv));
    }
  },
);

onBeforeUnmount(() => {
  try {
    jedison?.destroy();
  } catch {
    /* noop */
  }
  jedison = null;
});
</script>

<style scoped>
/* The default jedison theme renders semantic HTML; give it AdminForth-friendly spacing.
   Deep selectors are used because jedison manages this subtree outside of Vue. */
.af-jedison-host {
  width: 100%;
}

.af-jedison-host :deep(input:not([type='checkbox']):not([type='radio']):not([type='range'])),
.af-jedison-host :deep(select),
.af-jedison-host :deep(textarea) {
  width: 100%;
  padding: 0.55rem 0.65rem;
  border: 1px solid rgba(120, 120, 120, 0.35);
  border-radius: 0.5rem;
  background: transparent;
  color: inherit;
  font-size: 0.875rem;
}

.af-jedison-host :deep(input[type='color']) {
  width: 3rem;
  height: 2.5rem;
  padding: 0.15rem;
  cursor: pointer;
}

.af-jedison-host :deep(label) {
  font-size: 0.875rem;
  font-weight: 500;
}

.af-jedison-host :deep(button) {
  padding: 0.4rem 0.75rem;
  border: 1px solid rgba(120, 120, 120, 0.35);
  border-radius: 0.5rem;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 0.8125rem;
}

.af-jedison-host :deep(button:hover) {
  background: rgba(120, 120, 120, 0.12);
}

.af-jedison-host :deep(fieldset) {
  border: 1px solid rgba(120, 120, 120, 0.25);
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
}

.af-jedison-host :deep(.jedi-error-message),
.af-jedison-host :deep([class*='invalid']) {
  color: #e02424;
  font-size: 0.75rem;
}
</style>
