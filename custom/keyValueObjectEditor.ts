import { styleButton } from './adminforthJedisonTheme';

function hasOwn(obj: any, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function isObject(value: any): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getXOption(schema: any, option: string): any {
  if (schema['x-' + option] !== undefined) {
    return schema['x-' + option];
  }
  if (schema['x-options'] && schema['x-options'][option] !== undefined) {
    return schema['x-options'][option];
  }
  return undefined;
}

/**
 * True for objects whose keys are data rather than schema: no declared
 * properties, additional properties allowed. Combined schemas are left to
 * jedison's own editors (they are resolved before the type based ones).
 */
function isFreeFormMap(schema: any): boolean {
  if (!isObject(schema) || schema.type !== 'object') {
    return false;
  }
  if (schema.$ref || schema.oneOf || schema.anyOf || schema.allOf || schema.if) {
    return false;
  }
  const format = getXOption(schema, 'format');
  if (format !== undefined && format !== 'key-value') {
    return false;
  }
  if (isObject(schema.properties) && Object.keys(schema.properties).length > 0) {
    return false;
  }
  if (isObject(schema.patternProperties) && Object.keys(schema.patternProperties).length > 0) {
    return false;
  }
  return schema.additionalProperties !== false;
}

/**
 * A string that jedison renders with its plain input editor: anything with an
 * `x-format`, an enum or a combined schema already picks an editor of its own,
 * and a declared `format` (date, email, ...) reads as a single line value.
 */
function isPlainStringSchema(schema: any): boolean {
  if (!isObject(schema)) {
    return false;
  }
  const types = (Array.isArray(schema.type) ? schema.type : [schema.type])
    .filter((type: string) => type !== 'null');
  if (types.length !== 1 || types[0] !== 'string') {
    return false;
  }
  if (schema.enum || schema.$ref || schema.oneOf || schema.anyOf || schema.allOf) {
    return false;
  }
  return schema.format === undefined && getXOption(schema, 'format') === undefined;
}

// every keyword whose value is a subschema / a map of them / a list of them
const SUBSCHEMA_KEYS = ['additionalProperties', 'additionalItems', 'items', 'contains', 'not', 'if', 'then', 'else', 'propertyNames'];
const SUBSCHEMA_MAP_KEYS = ['properties', 'patternProperties', 'dependentSchemas', '$defs', 'definitions'];
const SUBSCHEMA_LIST_KEYS = ['allOf', 'anyOf', 'oneOf', 'prefixItems'];

function markTextareaValues(node: any) {
  if (Array.isArray(node)) {
    node.forEach(markTextareaValues);
    return;
  }
  if (!isObject(node)) {
    return;
  }
  if (isFreeFormMap(node) && isPlainStringSchema(node.additionalProperties)) {
    node.additionalProperties['x-options'] = {
      ...(node.additionalProperties['x-options'] ?? {}),
      format: 'textarea',
    };
  }
  SUBSCHEMA_KEYS.forEach((key) => markTextareaValues(node[key]));
  SUBSCHEMA_LIST_KEYS.forEach((key) => markTextareaValues(node[key]));
  SUBSCHEMA_MAP_KEYS.forEach((key) => {
    if (isObject(node[key])) {
      Object.values(node[key]).forEach(markTextareaValues);
    }
  });
}

/**
 * Returns a copy of the schema in which the string values of every free-form
 * map are marked as textareas, so the rows grow with their value instead of
 * scrolling a one line input - such maps usually hold long strings (urls,
 * tokens, snippets).
 *
 * The hint has to be in the schema rather than applied by the editor: jedison
 * builds the whole instance tree, children included, before it creates any of
 * the editors, so by the time this editor exists its rows already have theirs.
 */
export function markKeyValueTextareas(schema: any): any {
  if (!isObject(schema)) {
    return schema;
  }
  const marked = JSON.parse(JSON.stringify(schema));
  markTextareaValues(marked);
  return marked;
}

/**
 * Value a freshly added entry starts with, so that the created child instance
 * matches the schema right away (jedison drops properties with an undefined value).
 */
function defaultForSchema(schema: any): any {
  if (isObject(schema) && hasOwn(schema, 'default')) {
    return JSON.parse(JSON.stringify(schema.default));
  }
  const type = Array.isArray(schema?.type)
    ? schema.type.find((t: string) => t !== 'null')
    : schema?.type;
  switch (type) {
    case 'boolean': return false;
    case 'number':
    case 'integer': return 0;
    case 'array': return [];
    case 'object': return {};
    case 'null': return null;
    default: return '';
  }
}

export function makeKeyValueObjectEditor(Jedison: any) {
  return class EditorObjectKeyValue extends Jedison.EditorObject {
    static resolves(schema: any) {
      return isFreeFormMap(schema);
    }

    init() {
      super.init();
      // key -> row element, so typing in one row never re-creates the others
      this.rows = new Map();
      // display order, kept across renames so a renamed entry stays in place
      this.keyOrder = [];
    }

    getObjectControlConfig() {
      const config = super.getObjectControlConfig();
      // the inline rows replace both popups jedison would otherwise render
      config.addProperty = false;
      config.enablePropertiesToggle = false;
      return config;
    }

    build() {
      super.build();
      this.control.childrenSlot.classList.add('af-kv-rows');
      this.control.legend?.classList.add('af-kv-legend');
      const footer = document.createElement('div');
      footer.classList.add('af-kv-footer');
      this.addBtn = this.theme.getButton({
        content: getXOption(this.instance.schema, 'addPropertyContent')
          ?? this.instance.jedison.translator.translate('objectAddProperty'),
        icon: 'add',
      });
      this.addBtn.classList.add('af-kv-add');
      styleButton(this.addBtn, 'secondary', { size: 'md' });
      if (this.readOnly) {
        footer.style.display = 'none';
      }
      footer.appendChild(this.addBtn);
      this.control.body.appendChild(footer);
      this.control.footer = footer;

      // how many lines a value wraps into depends on the column width, so the
      // heights have to be re-measured on resize. Only an actual width change
      // counts: growing the rows changes the slot height, which would otherwise
      // trigger the observer again.
      let lastWidth = this.control.childrenSlot.clientWidth;
      this.slotObserver = new ResizeObserver(() => {
        const width = this.control.childrenSlot.clientWidth;
        if (width === lastWidth) {
          return;
        }
        lastWidth = width;
        this.rows.forEach((row: any) => {
          row.grownFor = undefined;
          this.growValue(row);
        });
      });
      this.slotObserver.observe(this.control.childrenSlot);
    }

    destroy() {
      this.slotObserver?.disconnect();
      this.rows.forEach((row: any) => window.clearTimeout(row.errorTimer));
      super.destroy();
    }

    /**
     * Sizes a row's textarea to its content. Skipped while the value it was
     * last measured for still stands, so typing in one row does not force a
     * reflow of every other one.
     */
    growValue(row: any) {
      const el = row.valueTextarea;
      if (!el || row.grownFor === el.value) {
        return;
      }
      row.grownFor = el.value;
      el.style.height = 'auto';
      // scrollHeight ignores borders, which border-box sizing includes
      const borders = el.offsetHeight - el.clientHeight;
      el.style.height = `${el.scrollHeight + borders}px`;
    }

    addEventListeners() {
      super.addEventListeners();
      this.addBtn.addEventListener('click', () => this.addEntry());
    }

    /**
     * Adds an entry with an empty key. Only one can exist at a time - an object
     * can not hold two "" properties - so a second click focuses the pending row.
     */
    addEntry() {
      if (hasOwn(this.instance.getValue(), '')) {
        this.focusKey('');
        return;
      }
      const schema = this.instance.getPropertySchema('');
      // let jedison build the property, so a value of any type starts out with
      // whatever its own editor considers empty (not just this editor's guess)
      const previous = this.instance.getChild('');
      if (previous) {
        // a child deactivated by an earlier rename, reuse it instead of adding a twin
        previous.setValue(defaultForSchema(schema), true, 'user');
        previous.activate();
      } else {
        this.instance.createChild(schema, '', undefined, true);
      }
      this.keyOrder.push('');
      this.commit({ ...this.instance.value });
      this.focusKey('');
    }

    renameEntry(oldKey: string, newKey: string) {
      if (newKey === oldKey) {
        return;
      }
      const row = this.rows.get(oldKey);
      const value = this.instance.getValue();
      if (hasOwn(value, newKey)) {
        if (row) {
          row.keyInput.value = oldKey;
          this.showRowError(row, `Key "${newKey}" already exists`);
        }
        return;
      }
      const next: any = {};
      Object.keys(value).forEach((key) => {
        next[key === oldKey ? newKey : key] = value[key];
      });
      const index = this.keyOrder.indexOf(oldKey);
      if (index === -1) {
        this.keyOrder.push(newKey);
      } else {
        this.keyOrder[index] = newKey;
      }
      // re-key the row so refreshEditors reuses it: the key input keeps its DOM
      // node (and the focus that is currently leaving it) while only the value
      // cell is swapped for the editor of the newly created child.
      if (row) {
        this.rows.delete(oldKey);
        this.rows.set(newKey, row);
      }
      this.commit(next);
    }

    deleteEntry(key: string) {
      const value = this.instance.getValue();
      if (!hasOwn(value, key)) {
        return;
      }
      const next: any = {};
      Object.keys(value).forEach((property) => {
        if (property !== key) {
          next[property] = value[property];
        }
      });
      this.keyOrder = this.keyOrder.filter((property: string) => property !== key);
      this.commit(next);
    }

    /**
     * Writes a new value, keeping the properties in display order.
     */
    commit(value: any) {
      const ordered: any = {};
      this.orderKeys(Object.keys(value)).forEach((key) => {
        ordered[key] = value[key];
      });
      this.instance.setValue(ordered, true, 'user');
      this.sortChildrenByDisplayOrder();
    }

    /**
     * Sorts keys by display order, appending keys set from outside the editor
     * (initial value, "edit json" dialog) in their own order.
     */
    orderKeys(keys: string[]): string[] {
      const ordered = this.keyOrder.filter((key: string) => keys.includes(key));
      keys.forEach((key) => {
        if (!ordered.includes(key)) {
          ordered.push(key);
        }
      });
      this.keyOrder = ordered;
      return ordered;
    }

    /**
     * jedison rebuilds the object value from its children array whenever a child
     * changes, and appends children created by a rename at the end. Keeping the
     * array in display order keeps the stored JSON in the order shown.
     */
    sortChildrenByDisplayOrder() {
      const rank = (key: string) => {
        const index = this.keyOrder.indexOf(key);
        return index === -1 ? this.keyOrder.length : index;
      };
      this.instance.children.sort((a: any, b: any) => rank(a.getKey()) - rank(b.getKey()));
    }

    focusKey(key: string) {
      const row = this.rows.get(key);
      if (row) {
        row.keyInput.focus();
      }
    }

    showRowError(row: any, message: string) {
      row.messages.replaceChildren(this.theme.getErrorFeedback({ message }));
      window.clearTimeout(row.errorTimer);
      row.errorTimer = window.setTimeout(() => row.messages.replaceChildren(), 5000);
    }

    buildRow(key: string) {
      // the row element carries its parts (key input, value cell, messages) so
      // that refreshEditors can update a row in place instead of re-creating it
      const row: any = document.createElement('div');
      const keyCell = document.createElement('div');
      const valueCell = document.createElement('div');
      const messages = document.createElement('div');
      const keyInput = document.createElement('input');
      const deleteLabel = this.instance.jedison.translator.translate('arrayDelete');
      // the theme renders it as a trash icon button, its label stays for screen readers and as a tooltip
      const deleteBtn = this.theme.getDeleteItemBtn({ content: deleteLabel });

      row.classList.add('af-kv-row');
      keyCell.classList.add('af-kv-key');
      valueCell.classList.add('af-kv-value');
      messages.classList.add('af-kv-messages');
      keyInput.classList.add('af-kv-key-input');
      deleteBtn.classList.add('af-kv-delete');

      keyInput.setAttribute('type', 'text');
      keyInput.setAttribute('placeholder', getXOption(this.instance.schema, 'keyPlaceholder') ?? 'Key');
      keyInput.setAttribute('aria-label', 'Property name');
      keyInput.value = key;

      keyInput.addEventListener('input', () => {
        window.clearTimeout(row.errorTimer);
        row.messages.replaceChildren();
      });
      keyInput.addEventListener('change', () => {
        this.renameEntry(row.dataset.key, keyInput.value);
      });
      deleteBtn.addEventListener('click', () => this.deleteEntry(row.dataset.key));

      keyCell.appendChild(keyInput);
      row.appendChild(keyCell);
      row.appendChild(valueCell);
      row.appendChild(deleteBtn);
      row.appendChild(messages);

      row.keyInput = keyInput;
      row.valueCell = valueCell;
      row.messages = messages;
      return row;
    }

    /**
     * Puts the child editor of `key` in the row's value cell. The child instance
     * is re-created on rename, so the cell content can outlive its editor.
     */
    syncRowChild(row: any, child: any) {
      const container = child.ui.control.container;
      if (row.child === child && container.parentNode === row.valueCell) {
        return;
      }
      row.child = child;
      row.valueCell.replaceChildren(container);
      row.valueTextarea = row.valueCell.querySelector('textarea');
      row.grownFor = undefined;
      if (row.valueTextarea && !row.valueTextarea.dataset.afAutogrow) {
        row.valueTextarea.dataset.afAutogrow = '1';
        // `height: auto` in growValue falls back to the height `rows` asks for,
        // which is 2 by default and would keep a one line value two lines tall
        row.valueTextarea.setAttribute('rows', '1');
        row.valueTextarea.addEventListener('input', () => this.growValue(row));
      }
      // the key is already shown in the key input, so the editor's own label
      // (which defaults to the property name) would only repeat it
      if (child.ui.control.label && child.schema.title === undefined) {
        child.ui.control.label.style.display = 'none';
      }
    }

    // rows are always in sync with the value, the "Properties" popup is not used
    refreshPropertiesSlot() {}

    refreshEditors() {
      const value = this.instance.getValue();
      const slot = this.control.childrenSlot;
      const keys = isObject(value)
        ? this.orderKeys(Object.keys(value)).filter((key: string) => {
          const child = this.instance.getChild(key);
          return child && child.isActive && child.ui;
        })
        : [];

      this.rows.forEach((row: any, key: string) => {
        if (!keys.includes(key)) {
          window.clearTimeout(row.errorTimer);
          row.remove();
          this.rows.delete(key);
        }
      });

      keys.forEach((key: string, index: number) => {
        const child = this.instance.getChild(key);
        let row = this.rows.get(key);
        if (!row) {
          row = this.buildRow(key);
          this.rows.set(key, row);
        }
        row.dataset.key = key;
        if (row.keyInput.value !== key && document.activeElement !== row.keyInput) {
          row.keyInput.value = key;
        }
        this.syncRowChild(row, child);
        if (slot.children[index] !== row) {
          slot.insertBefore(row, slot.children[index] || null);
        }
        if (this.disabled || this.instance.isReadOnly()) {
          child.ui.disable();
        } else {
          child.ui.enable();
        }
        // after the insert: a detached textarea reports a scrollHeight of 0
        this.growValue(row);
      });
    }
  };
}
