<template>
  <div class="af-json-form w-full">
    <div ref="hostRef" class="af-jedison-host"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import Jedison from 'jedison';
import { makeAdminforthTheme } from './adminforthJedisonTheme';
import { makeKeyValueObjectEditor, markKeyValueTextareas } from './keyValueObjectEditor';

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
let initialValue: any = null;

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
  const validationError = validateFormValue(val);
  if (!validationError.ok) {
    errors.unshift({ messages: [validationError.error] });
  }
  const firstError = errors.length ? (errors[0]?.messages?.[0] || 'Invalid value') : false;
  emit('update:inValidity', firstError);
  if ((props.value === null || props.value === undefined) && Object.keys(val).length === 0) {
    emit('update:emptiness', true);
    lastEmitted = initialValue === null || initialValue === undefined ? '' : JSON.stringify(initialValue);
    emit('update:value', initialValue);
  } else {
    emit('update:emptiness', isEmpty(val));
    lastEmitted = JSON.stringify(val ?? null);
    emit('update:value', lastEmitted);
  }
}

function validateFormValue(value: Record<string, any>): {ok: boolean; error?: string} {
  for (const [key, val] of Object.entries(value)) {
    if (val === null || val === undefined || val === '') {
      return { ok: false, error: `Value for key "${key}" is empty` };
    }
    if (key === null || key === undefined || key === '') {
      return { ok: false, error: `Key is empty` };
    }
  }
  return { ok: true };
}

onMounted(() => {
  initialValue = parse(props.value);
  jedison = new Jedison.Create({
    container: hostRef.value,
    theme: makeAdminforthTheme(Jedison),
    customEditors: [makeKeyValueObjectEditor(Jedison)],
    schema: markKeyValueTextareas(props.meta.schema),
    data: parse(props.value),
    readOnly: !!props.readonly,
    showErrors: 'input',
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
  @apply text-sm text-lightFormFieldTextColor dark:text-darkFormFieldTextColor;
  width: 100%;
}

/* ---------- grid (jedi bootstrap-like row/col) ----------
   A row is a container, its columns follow the width of the row and not of the
   viewport: the sidebar, the agent panel and a nav next to it squeeze it too. */
.af-json-form .jedi-row {
  container-type: inline-size;
  display: flex;
  flex-wrap: wrap;
  row-gap: 0.875rem;
  margin-left: -0.5rem;
  margin-right: -0.5rem;
}
.af-json-form .jedi-col {
  width: 100%;
  padding: 0 0.5rem;
  box-sizing: border-box;
  min-width: 0;
}
@container (min-width: 24rem) {
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
/* fields of an object without a grid are stacked with the same gap */
.af-json-form .jedi-children-slot {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

/* ---------- groups ----------
   A nested object or array is a card with a plain semibold title inside it, the
   legend is floated so that it sits inside the card and not on its border. */
.af-json-form .jedi-editor-fieldset {
  @apply border border-lightFormBorder dark:border-darkFormBorder rounded-lg;
  min-width: 0;
  margin: 0;
  padding: 0 1rem 1rem;
}
.af-json-form .jedi-editor-fieldset > .jedi-editor-legend {
  float: left;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 2.75rem;
  padding: 0.5rem 0;
}
.af-json-form .jedi-editor-fieldset > .jedi-editor-legend + * {
  clear: both;
}
.af-json-form .jedi-editor-fieldset > .jedi-editor-legend .jedi-legend {
  @apply text-sm font-semibold text-lightFormFieldTextColor dark:text-darkFormFieldTextColor;
}
/* the root is named by the label of the field and a pane by its tab, so they
   get no frame and their title is left to screen readers */
.af-json-form .af-jedison-host > div > .jedi-editor-fieldset,
.af-json-form .jedi-tab-pane > .jedi-editor-fieldset {
  border: 0;
  border-radius: 0;
  padding: 0;
}
.af-json-form .af-jedison-host > div > .jedi-editor-fieldset > .jedi-editor-legend,
.af-json-form .jedi-tab-pane > .jedi-editor-fieldset > .jedi-editor-legend {
  justify-content: flex-end;
  min-height: 0;
  padding: 0 0 0.5rem;
}
.af-json-form .af-jedison-host > div > .jedi-editor-fieldset > .jedi-editor-legend .jedi-editor-legend-left,
.af-json-form .jedi-tab-pane > .jedi-editor-fieldset > .jedi-editor-legend .jedi-editor-legend-left,
.af-json-form .af-jedison-host > div > .jedi-editor-fieldset > .jedi-editor-legend:not(:has(button)),
.af-json-form .jedi-tab-pane > .jedi-editor-fieldset > .jedi-editor-legend:not(:has(button)) {
  @apply sr-only;
}
.af-json-form .jedi-editor-card-body > .jedi-description {
  margin: 0 0 0.75rem;
}
.af-json-form .jedi-actions-slot,
.af-json-form .jedi-btn-group {
  display: flex;
  align-items: center;
  gap: 0.125rem;
}

/* ---------- vertical nav: tabs in a gray column next to the pane, one frame around both ---------- */
.af-json-form .jedi-row:has(> .jedi-col > .af-nav-v) {
  @apply border border-lightFormBorder dark:border-darkFormBorder rounded-lg;
  overflow: hidden;
  row-gap: 0;
  margin: 0;
}
/* the column wraps above the pane when the frame is narrow, its border then
   divides them from below; the -1px margin hides the border at the frame edge */
.af-json-form .jedi-col:has(> .af-nav-v) {
  @apply bg-lightFormHeading dark:bg-darkFormHeading border-r border-b border-lightFormBorder dark:border-darkFormBorder;
  flex: 1 1 10.5rem;
  width: auto;
  margin: 0 -1px -1px 0;
  padding: 0.5rem;
}
.af-json-form .jedi-col:has(> .af-nav-v) + .jedi-col {
  flex: 999 1 22.5rem;
  width: auto;
  padding: 1rem 1.125rem 1.125rem;
}
.af-json-form .af-nav {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 0.125rem;
}
.af-json-form .af-nav-v { flex-direction: column; }
.af-json-form .af-nav-h {
  flex-direction: row;
  flex-wrap: wrap;
}
.af-json-form .jedi-nav-link {
  @apply flex items-center gap-2 w-full min-h-8 px-2.5 py-1 rounded-default text-[13px] transition-colors
         text-lightVerticalTabsText dark:text-darkVerticalTabsText
         hover:bg-lightVerticalTabsBackgroundHover hover:text-lightVerticalTabsTextHover
         dark:hover:bg-darkVerticalTabsBackgroundHover dark:hover:text-darkVerticalTabsTextHover
         focus:outline-none focus-visible:ring-[3px] focus-visible:ring-lightFocusRing dark:focus-visible:ring-darkFocusRing;
  text-decoration: none;
}
.af-json-form .jedi-nav-link.af-active {
  @apply font-medium bg-lightVerticalTabsBackgroundActive text-lightVerticalTabsTextActive
         dark:bg-darkVerticalTabsBackgroundActive dark:text-darkVerticalTabsTextActive;
}
.af-json-form .af-nav-h .jedi-nav-link {
  width: auto;
  padding-left: 0.25rem;
}
/* actions of an array item sit in its tab */
.af-json-form .jedi-nav-link > span:first-child:empty {
  display: none;
}

/* ---------- tab panes (only the active one is shown) ---------- */
.af-json-form .tab-content { width: 100%; display: grid; }
/* All panes overlap in the same grid cell so the container always sizes to the
   tallest one and switching tabs never reflows the form height. Inactive panes
   are hidden with opacity (not display:none) so they still occupy the cell.
   opacity — not visibility — because opacity groups the whole subtree: a nested
   active pane inside a hidden parent cannot override opacity:0.
   pointer-events is disabled on inactive panes and left UNSET on active ones so
   they inherit it: a nested active pane inside an inactive parent inherits
   pointer-events:none instead of forcing itself back to auto. */
.af-json-form .jedi-tab-pane { grid-area: 1 / 1; opacity: 0; min-width: 0; }
.af-json-form .jedi-tab-pane:not(.af-active) { pointer-events: none; }
.af-json-form .jedi-tab-pane.af-active { opacity: 1; }

/* ---------- labels, help and messages, like the fields of core forms ---------- */
.af-json-form .jedi-label {
  @apply flex items-center gap-1 mb-1.5 text-[13px] leading-[18px] font-medium text-lightFormFieldTextColor dark:text-darkFormFieldTextColor;
}
.af-json-form .jedi-description:not(:empty) {
  @apply mt-1 text-xs text-lightInputIconColor dark:text-darkInputIconColor;
}
.af-json-form .jedi-error-message,
.af-json-form .jedi-warning-message,
.af-json-form .jedi-nav-warning {
  @apply mt-1 text-xs text-lightInputErrorColor dark:text-darkInputErrorColor;
}

/* ---------- inputs, selects and textareas, like AFCL Input ---------- */
.af-json-form input:not([type='checkbox']):not([type='radio']):not([type='range']):not([type='color']):not([type='hidden']),
.af-json-form select,
.af-json-form textarea {
  @apply block w-full px-2.5 py-1.5 text-sm leading-5 rounded-default border shadow-customLight transition-colors
         bg-lightInputBackground text-lightInputText border-lightInputBorder placeholder-lightInputPlaceholderText
         hover:border-lightInputBorderHover
         focus:outline-none focus:ring-[3px] focus:ring-lightInputFocusRing focus:border-lightInputFocusBorder
         disabled:cursor-not-allowed disabled:opacity-50
         dark:bg-darkInputBackground dark:text-darkInputText dark:border-darkInputBorder dark:placeholder-darkInputPlaceholderText
         dark:hover:border-darkInputBorderHover dark:focus:ring-darkInputFocusRing dark:focus:border-darkInputFocusBorder;
}
.af-json-form textarea { min-height: 4.5rem; }

/* the chevron of AFCL Select over a native select */
.af-json-form .af-json-form-select {
  position: relative;
  display: block;
}
.af-json-form .af-json-form-select select {
  @apply appearance-none pr-9 cursor-pointer;
}
.af-json-form .af-json-form-select-icon {
  @apply absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-lightInputIconColor dark:text-darkInputIconColor;
}

.af-json-form input[type='color'] {
  @apply block h-[2.125rem] w-16 p-1 rounded-default border shadow-customLight cursor-pointer
         bg-lightInputBackground border-lightInputBorder dark:bg-darkInputBackground dark:border-darkInputBorder
         focus:outline-none focus-visible:ring-[3px] focus-visible:ring-lightInputFocusRing dark:focus-visible:ring-darkInputFocusRing;
}
.af-json-form input[type='color']::-webkit-color-swatch-wrapper { padding: 0; }
.af-json-form input[type='color']::-webkit-color-swatch { border: 0; border-radius: 4px; }
.af-json-form input[type='color']::-moz-color-swatch { border: 0; border-radius: 4px; }

/* the value of a range sits at the end of its label */
.af-json-form .af-json-form-range-label {
  justify-content: space-between;
}
.af-json-form .af-json-form-range-label output {
  @apply font-mono font-normal tabular-nums text-lightInputIconColor dark:text-darkInputIconColor;
}
.af-json-form input[type='range'] {
  @apply block w-full h-4 cursor-pointer accent-lightPrimary dark:accent-darkPrimary;
}

/* ---------- radios, checkboxes and switches ---------- */
.af-json-form .jedi-editor-radio-fieldset {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
.af-json-form .af-json-form-check-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.af-json-form .jedi-editor-radio-fieldset > .jedi-editor-legend + .af-json-form-check-row {
  margin-top: 0;
}
.af-json-form .af-json-form-inline > .af-json-form-check-row {
  display: inline-flex;
  margin: 0 1rem 0 0;
}
.af-json-form .af-json-form-check-row > label {
  @apply m-0 text-sm leading-5 font-normal cursor-pointer text-lightTextLabel dark:text-darkTextLabel;
}

.af-json-form input[type='radio'] {
  @apply appearance-none flex-none w-4 h-4 mt-0.5 rounded-full border cursor-pointer transition-colors
         bg-lightCheckboxBgUnchecked border-lightCheckboxBorderColor dark:bg-darkCheckboxBgUnchecked dark:border-darkCheckboxBorderColor
         checked:border-[5px] checked:border-lightCheckboxBgChecked dark:checked:border-darkCheckboxBgChecked
         focus:outline-none focus-visible:ring-[3px] focus-visible:ring-lightFocusRing dark:focus-visible:ring-darkFocusRing;
}

/* the box and the check icon of AFCL Checkbox */
.af-json-form .af-json-form-checkbox {
  @apply relative flex flex-none items-center justify-center mt-0.5;
}
.af-json-form .af-json-form-checkbox input {
  @apply appearance-none w-4 h-4 m-0 rounded border shadow-customLight cursor-pointer transition-colors
         bg-lightCheckboxBgUnchecked border-lightCheckboxBorderColor dark:bg-darkCheckboxBgUnchecked dark:border-darkCheckboxBorderColor
         checked:bg-lightCheckboxBgChecked checked:border-lightCheckboxBgChecked dark:checked:bg-darkCheckboxBgChecked dark:checked:border-darkCheckboxBgChecked
         focus:outline-none focus-visible:ring-[3px] focus-visible:ring-lightFocusRing dark:focus-visible:ring-darkFocusRing;
}
.af-json-form .af-json-form-checkbox-icon {
  @apply absolute hidden pointer-events-none text-lightCheckboxIconColor dark:text-darkCheckboxIconColor;
}
.af-json-form .af-json-form-checkbox-icon g { stroke-width: 3; }
.af-json-form .af-json-form-checkbox input:checked + .af-json-form-checkbox-icon { display: block; }

/* a single boolean is a switch, like AFCL Toggle */
.af-json-form .af-json-form-toggle {
  @apply relative appearance-none flex-none w-9 h-5 m-0 rounded-full border cursor-pointer transition-colors
         bg-lightToggleBgUnactive border-lightToggleBorderUnactive dark:bg-darkToggleBgUnactive dark:border-darkToggleBorderUnactive
         checked:bg-lightToggleBgActive checked:border-lightToggleBgActive dark:checked:bg-darkToggleBgActive dark:checked:border-darkToggleBgActive
         focus:outline-none focus-visible:ring-[3px] focus-visible:ring-lightToggleRing dark:focus-visible:ring-darkToggleRing;
}
.af-json-form .af-json-form-toggle::after {
  @apply absolute top-px start-px w-4 h-4 rounded-full shadow-sm transition-transform
         bg-lightToggleCircleUnactive dark:bg-darkToggleCircleUnactive;
  content: '';
}
.af-json-form .af-json-form-toggle:checked::after {
  @apply translate-x-4 rtl:-translate-x-4 bg-lightToggleCircleActive dark:bg-darkToggleCircleActive;
}
/* label and help of a switch are next to it, not above */
.af-json-form .af-json-form-check-row:has(> .af-json-form-toggle) {
  flex-wrap: wrap;
  align-items: center;
  margin-top: 0;
}
.af-json-form .af-json-form-check-row:has(> .af-json-form-toggle) > label {
  @apply mb-0 font-medium;
}
.af-json-form .af-json-form-check-row:has(> .af-json-form-toggle) > .jedi-description,
.af-json-form .af-json-form-check-row:has(> .af-json-form-toggle) > .jedi-messages-slot {
  flex-basis: 100%;
}

/* ---------- tables (table / table-object arrays) ---------- */
/* a table wider than the form scrolls inside it */
.af-json-form div:has(> table) {
  overflow-x: auto;
}
.af-json-form table {
  width: 100%;
  border-collapse: collapse;
}
.af-json-form th {
  @apply pb-1.5 text-xs font-medium text-left align-bottom text-lightInputIconColor dark:text-darkInputIconColor;
}
.af-json-form th .jedi-label {
  @apply m-0 text-xs font-medium text-lightInputIconColor dark:text-darkInputIconColor;
}
.af-json-form td {
  @apply px-3 py-1.5 border-t border-lightShowTableBodyBorder dark:border-darkShowTableBodyBorder;
  vertical-align: middle;
}
/* the first cell holds the actions of the row, the others an input each */
.af-json-form td:not(:first-child) {
  min-width: 8rem;
}

/* ---------- oneOf switcher ---------- */
.af-json-form .jedi-switcher {
  margin-bottom: 0.75rem;
}
.af-json-form .jedi-switcher-option-btn {
  @apply px-3 py-1.5 text-sm font-medium border rounded-default
         bg-lightButtonGroupBackground text-lightButtonGroupText border-lightButtonGroupBorder
         hover:bg-lightButtonGroupBackgroundHover hover:text-lightButtonGroupTextHover
         dark:bg-darkButtonGroupBackground dark:text-darkButtonGroupText dark:border-darkButtonGroupBorder
         dark:hover:bg-darkButtonGroupBackgroundHover dark:hover:text-darkButtonGroupTextHover;
}
.af-json-form .jedi-switcher-option-active {
  @apply bg-lightButtonGroupActiveBackground text-lightButtonGroupActiveText
         dark:bg-darkButtonGroupActiveBackground dark:text-darkButtonGroupActiveText;
}

/* ---------- dialogs (add property, JSON data, info), like AFCL Dialog ---------- */
.af-json-form .jedi-modal-dialog {
  @apply min-w-72 max-w-[calc(100vw-2rem)] p-5 rounded-xl border-0 shadow-popover dark:shadow-darkPopover
         bg-lightDialogBackgorund text-lightFormFieldTextColor dark:bg-darkDialogBackgorund dark:text-darkFormFieldTextColor;
}
.af-json-form .jedi-modal-dialog[open] {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.af-json-form .jedi-modal-dialog::backdrop {
  @apply bg-lightScrim;
}
.dark .af-json-form .jedi-modal-dialog::backdrop {
  @apply bg-darkScrim;
}

/* ---------- key / value object rows (EditorObjectKeyValue) ----------
   One row per entry: [key input] [value editor] [trash]. The value cell hosts
   the regular jedison child editor, so its own description / error messages
   render below the value input inside the cell. */
.af-json-form .af-kv-rows {
  container-type: inline-size;
  gap: 0.5rem;
}
.af-json-form .af-kv-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) auto;
  align-items: start;
  gap: 0.5rem;
}
.af-json-form .af-kv-value > * {
  margin-bottom: 0;
}
/* the value textarea is sized to its content by the editor (growValue), so it
   starts one line tall - the minimum of the regular textareas and the inner
   scrollbar would both work against that */
.af-json-form .af-kv-value textarea {
  min-height: 0;
  overflow-y: hidden;
  resize: none;
}
/* keep the row compact: the value editor renders these even when it has nothing
   to say, which would push the row apart */
.af-json-form .af-kv-value .jedi-messages-slot:empty,
.af-json-form .af-kv-value .jedi-actions-slot:empty {
  display: none;
}
/* row level message (duplicate key) spans the whole row */
.af-json-form .af-kv-messages {
  grid-column: 1 / -1;
}
.af-json-form .af-kv-messages:empty {
  display: none;
}
/* the trash button is centered on the 34px input next to it */
.af-json-form .af-kv-delete {
  margin-top: 0.1875rem;
}
.af-json-form .af-kv-footer {
  margin-top: 0.75rem;
}
@container (max-width: 22rem) {
  /* key on its own line, value + trash below it, pairs set apart from each other */
  .af-json-form .af-kv-row {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .af-json-form .af-kv-row + .af-kv-row {
    margin-top: 0.5rem;
  }
  .af-json-form .af-kv-key {
    grid-column: 1 / -1;
  }
}
</style>
