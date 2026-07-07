<template>
  <div class="af-json-form w-full">
    <div ref="hostRef" class="af-jedison-host"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import Jedison from 'jedison';
import { makeAdminforthTheme } from './adminforthJedisonTheme';

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
    theme: makeAdminforthTheme(Jedison),
    schema: props.meta.schema,
    data: parse(props.value),
    readOnly: !!props.readonly,
  });

  jedison.on('change', () => publish());

  publish();
});


onBeforeUnmount(() => {
  try {
    jedison?.destroy();
  } catch {
    /* noop */
  }
  jedison = null;
});
</script>

<!-- Non-scoped: jedison builds its DOM outside Vue, so every rule is prefixed with
     .af-json-form to keep the styles contained to this component. -->
<style>
.af-json-form {
  @apply text-lightInputText dark:text-darkInputText;
  width: 100%;
}

/* ---------- grid (jedi bootstrap-like row/col) ---------- */
.af-json-form .jedi-row {
  display: flex;
  flex-wrap: wrap;
  margin-left: -0.5rem;
  margin-right: -0.5rem;
}
.af-json-form .jedi-col {
  width: 100%;
  padding: 0 0.5rem;
  margin-bottom: 0.75rem;
  box-sizing: border-box;
  min-width: 0;
}
@media (min-width: 768px) {
  .af-json-form .jedi-col-md-1 { width: 8.3333%; }
  .af-json-form .jedi-col-md-2 { width: 16.6667%; }
  .af-json-form .jedi-col-md-3 { width: 25%; }
  .af-json-form .jedi-col-md-4 { width: 33.3333%; }
  .af-json-form .jedi-col-md-5 { width: 41.6667%; }
  .af-json-form .jedi-col-md-6 { width: 50%; }
  .af-json-form .jedi-col-md-7 { width: 58.3333%; }
  .af-json-form .jedi-col-md-8 { width: 66.6667%; }
  .af-json-form .jedi-col-md-9 { width: 75%; }
  .af-json-form .jedi-col-md-10 { width: 83.3333%; }
  .af-json-form .jedi-col-md-11 { width: 91.6667%; }
  .af-json-form .jedi-col-md-12 { width: 100%; }
}

/* ---------- section containers ---------- */
.af-json-form fieldset {
  @apply border border-lightInputBorder dark:border-darkInputBorder rounded-lg;
  padding: 1rem;
  margin-bottom: 1rem;
}
.af-json-form legend,
.af-json-form .jedi-editor-legend,
.af-json-form .jedi-legend,
.af-json-form .jedi-title {
  @apply text-lightTextLabel dark:text-darkTextLabel;
  font-weight: 600;
  font-size: 0.95rem;
  padding: 0 0.25rem;
}

/* ---------- vertical / horizontal nav tabs ---------- */
.af-json-form .af-nav {
  list-style: none;
  margin: 0 0 1rem 0;
  padding: 0;
  display: flex;
  gap: 0.35rem;
}
.af-json-form .af-nav-v { flex-direction: column; }
.af-json-form .af-nav-h { flex-direction: row; flex-wrap: wrap; }
.af-json-form .af-nav > li { display: block; }
.af-json-form .af-nav-v > li { width: 100%; }

.af-json-form .jedi-nav-link {
  @apply text-lightVerticalTabsText dark:text-darkVerticalTabsText
         bg-lightVerticalTabsBackground dark:bg-darkVerticalTabsBackground;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.6rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.af-json-form .jedi-nav-link:hover {
  @apply bg-lightVerticalTabsBackgroundHover dark:bg-darkVerticalTabsBackgroundHover
         text-lightVerticalTabsTextHover dark:text-darkVerticalTabsTextHover;
}
.af-json-form .jedi-nav-link.af-active {
  @apply bg-lightVerticalTabsBackgroundActive dark:bg-darkVerticalTabsBackgroundActive
         text-lightVerticalTabsTextActive dark:text-darkVerticalTabsTextActive;
}

/* ----------- Horizontal nav tabs -------------- */
.af-json-form .af-nav-h .jedi-nav-link {
  @apply border border-lightInputBorder dark:border-darkInputBorder
         bg-transparent dark:bg-transparent
         text-lightInputText dark:text-darkInputText;
}

.af-json-form .af-nav-h .jedi-nav-link.af-active {
  @apply border-2 border-lightPrimary dark:border-darkPrimary 
         bg-lightInputBackground dark:bg-darkInputBackground
         text-lightTextLabel dark:text-darkTextLabel;
}

/* ---------- tab panes (only the active one is shown) ---------- */
.af-json-form .tab-content { width: 100%; }
.af-json-form .jedi-tab-pane { display: none; }
.af-json-form .jedi-tab-pane.af-active { display: block; }

/* ---------- labels & descriptions ---------- */
.af-json-form label,
.af-json-form .jedi-label {
  @apply text-lightTextLabel dark:text-darkTextLabel;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.3rem;
}
.af-json-form .jedi-description {
  @apply text-lightFormFieldTextColor dark:text-darkFormFieldTextColor;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

/* ---------- inputs / selects / textareas ---------- */
.af-json-form input:not([type='checkbox']):not([type='radio']):not([type='range']):not([type='color']),
.af-json-form select,
.af-json-form textarea {
  @apply bg-lightInputBackground dark:bg-darkInputBackground
         border border-lightInputBorder dark:border-darkInputBorder
         text-lightInputText dark:text-darkInputText
         placeholder-lightInputPlaceholderText dark:placeholder-darkInputPlaceholderText
         rounded-lg;
  width: 100%;
  padding: 0.55rem 0.7rem;
  font-size: 0.875rem;
  outline: none;
}
.af-json-form input:not([type='checkbox']):not([type='radio']):not([type='range']):not([type='color']):focus,
.af-json-form select:focus,
.af-json-form textarea:focus {
  @apply border-lightPrimary dark:border-darkPrimary ring-1 ring-lightPrimary dark:ring-darkPrimary;
}
.af-json-form textarea { min-height: 6rem; }

.af-json-form input[type='color'] {
  @apply border border-lightInputBorder dark:border-darkInputBorder
         bg-lightInputBackground dark:bg-darkInputBackground rounded-lg;
  width: 3rem;
  height: 2.5rem;
  padding: 0.2rem;
  cursor: pointer;
}

.af-json-form input[type='range'] {
  @apply accent-lightPrimary dark:accent-darkPrimary;
  width: 100%;
}
.dark .af-json-form input[type='range'] { @apply accent-lightPrimary dark:accent-darkPrimary; }

.af-json-form input[type='checkbox'],
.af-json-form input[type='radio'] {
  @apply accent-lightPrimary dark:accent-darkPrimary;
  width: 1rem;
  height: 1rem;
}
.dark .af-json-form input[type='checkbox'],
.dark .af-json-form input[type='radio'] { @apply accent-lightPrimary dark:accent-darkPrimary; }

/* checkbox / radio rows keep label inline */
.af-json-form .jedi-checkbox-control label,
.af-json-form .jedi-editor-radio-fieldset label {
  margin-bottom: 0;
  margin-left: 0.4rem;
  font-weight: 400;
}

/* ---------- buttons ---------- */
.af-json-form button {
  @apply bg-lightInputBackground dark:bg-darkInputBackground
         text-lightInputText dark:text-darkInputText
         border border-lightInputBorder dark:border-darkInputBorder rounded-lg;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.75rem;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.af-json-form button:hover {
  @apply border-lightInputBorderHover dark:border-darkInputBorderHover;
}

/* ---------- oneOf switcher ---------- */
.af-json-form .jedi-switcher-option-btn {
  @apply bg-lightInputBackground dark:bg-darkInputBackground
         text-lightInputText dark:text-darkInputText
         border border-lightInputBorder dark:border-darkInputBorder;
}
.af-json-form .jedi-switcher-option-active {
  @apply bg-lightPrimary dark:bg-darkPrimary
         text-lightPrimaryContrast dark:text-darkPrimaryContrast
         border-lightPrimary dark:border-darkPrimary;
}

/* ---------- tables (table / table-object arrays) ---------- */
.af-json-form table {
  width: 100%;
  border-collapse: collapse;
}
.af-json-form th,
.af-json-form td {
  @apply border-lightInputBorder dark:border-darkInputBorder;
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid;
  text-align: left;
  vertical-align: top;
}
.af-json-form th {
  @apply text-lightTextLabel dark:text-darkTextLabel;
  font-size: 0.8125rem;
  font-weight: 600;
}

/* ---------- validation messages ---------- */
.af-json-form .jedi-error-message,
.af-json-form .jedi-messages-slot,
.af-json-form .jedi-warning-message,
.af-json-form .jedi-nav-warning,
.af-json-form .jedi-legend-warning {
  @apply text-lightInputErrorColor dark:text-darkInputErrorColor;
  font-size: 0.75rem;
}

.jedi-btn-group {
  display: flex;
  gap: 0.5rem;
}

/* ---------- array move buttons ---------- */
.af-json-form .jedi-array-move-down {
  
}

.af-json-form .jedi-array-move-up {
  
}

.af-json-form .jedi-array-move-delete {
  
}

/* ------------ popup padding ------------- */


/* ---------- jedi editor legend / title ---------- */

.jedi-editor-legend {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.jedi-editor-legend .jedi-quick-add-property-toggle {
  
}

</style>
