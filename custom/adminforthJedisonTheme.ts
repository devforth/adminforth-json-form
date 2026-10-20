/**
 * A jedison `Theme` subclass which draws the form with AFCL styles.
 *
 * jedison builds plain DOM outside Vue, so AFCL components can not be used as
 * they are. Instead this theme:
 *   - gives every button the classes of an AFCL button (`getButtonClasses`) and
 *     a Lucide icon, actions of a group and of an array item are ghost icon buttons,
 *   - wraps selects and checkboxes the way AFCL Select and Checkbox are built,
 *     so they get the same chevron and check icons,
 *   - tags the nav list with `af-nav` + `af-nav-v` / `af-nav-h` so vertical and
 *     horizontal navs can be styled differently,
 *   - marks the active tab link and active pane with `af-active`, and
 *   - switches panes on click via plain DOM toggling (no `:target`, no full
 *     re-render), scoped to the clicked nav so nested navs stay independent.
 *
 * Colors, borders and spacing of the rest live in JsonForm.vue's <style> block.
 */
import { h, render, type Component } from 'vue';
import {
  IconArrowDown,
  IconArrowUp,
  IconBraces,
  IconCheck,
  IconChevronDown,
  IconCopy,
  IconGripVertical,
  IconListChecks,
  IconPlus,
  IconSave,
  IconTrash2,
  IconX,
} from '@iconify-prerendered/vue-lucide';
import { getButtonClasses, type ButtonSize, type ButtonVariant } from '@/afcl/buttonStyles';

// jedison names the icon of each button it builds
const BUTTON_ICONS: Record<string, Component> = {
  add: IconPlus,
  delete: IconTrash2,
  moveUp: IconArrowUp,
  moveDown: IconArrowDown,
  drag: IconGripVertical,
  edit: IconBraces,
  copy: IconCopy,
  save: IconSave,
  close: IconX,
  collapse: IconChevronDown,
  properties: IconListChecks,
};

/**
 * Renders a Lucide component on its own and takes its <svg> out, so it can be
 * put into the DOM jedison builds.
 */
function lucideIcon(icon: Component, className: string): Element {
  const host = document.createElement('div');
  render(h(icon, { class: className, 'aria-hidden': 'true' }), host);
  return host.firstElementChild as Element;
}

// the AFCL classes a button got last, so a restyle drops them and keeps the jedi-* classes
const afclButtonClasses = new WeakMap<HTMLElement, string[]>();

export function styleButton(
  button: HTMLElement,
  variant: ButtonVariant,
  { size = 'sm', iconOnly = false }: { size?: ButtonSize; iconOnly?: boolean } = {},
) {
  button.classList.remove(...(afclButtonClasses.get(button) ?? []));
  const classes = getButtonClasses({ variant, size, iconOnly, shadow: true }).split(/\s+/).filter(Boolean);
  button.classList.add(...classes);
  afclButtonClasses.set(button, classes);
}

/**
 * Actions next to a group title and on array items are icons, their label
 * stays for screen readers and as a tooltip.
 */
function toIconButton(button: HTMLElement, label?: string): HTMLElement {
  styleButton(button, 'ghost', { iconOnly: true });
  button.querySelector(':scope > span')?.classList.add('sr-only');
  if (label) {
    button.title = label;
  }
  return button;
}

export function makeAdminforthTheme(Jedison: any) {
  class AdminforthTheme extends Jedison.Theme {
    getButton(config: any) {
      const button = super.getButton(config);
      // jedison writes " undefined" into a button which has no label
      if (config.content === undefined) {
        button.querySelector(':scope > span')?.remove();
      }
      const icon = BUTTON_ICONS[config.icon];
      if (icon) {
        button.prepend(lucideIcon(icon, 'w-4 h-4 shrink-0'));
      }
      styleButton(button, 'secondary');
      return button;
    }

    getArrayBtnAdd(config: any) {
      return toIconButton(super.getArrayBtnAdd(config), config.content);
    }

    getArrayBtnDeleteAll(config: any) {
      return toIconButton(super.getArrayBtnDeleteAll(config), config.content);
    }

    getAddAfterItemBtn(config: any) {
      return toIconButton(super.getAddAfterItemBtn(config), config.content);
    }

    getDeleteItemBtn(config: any) {
      return toIconButton(super.getDeleteItemBtn(config), config.content);
    }

    getMoveUpItemBtn(config: any) {
      return toIconButton(super.getMoveUpItemBtn(config), config.content);
    }

    getMoveDownItemBtn(config: any) {
      return toIconButton(super.getMoveDownItemBtn(config), config.content);
    }

    getDragItemBtn(config: any) {
      return toIconButton(super.getDragItemBtn(config), config.content);
    }

    getQuickAddPropertyToggle(config: any) {
      return toIconButton(super.getQuickAddPropertyToggle(config), config.content);
    }

    getPropertiesToggle(config: any) {
      return toIconButton(super.getPropertiesToggle(config), config.content);
    }

    getCollapseToggle(config: any) {
      return toIconButton(super.getCollapseToggle(config), config.content);
    }

    getJsonData(config: any) {
      const jsonData = super.getJsonData(config);
      toIconButton(jsonData.toggle, 'JSON');
      return jsonData;
    }

    // the main action of the "add property" dialog
    getAddPropertyButton(config: any) {
      const button = super.getAddPropertyButton(config);
      styleButton(button, 'primary');
      return button;
    }

    // jedison draws its dialogs with inline borders, the panel and the backdrop are styled in JsonForm.vue
    getDialog() {
      const dialog = super.getDialog();
      dialog.removeAttribute('style');
      return dialog;
    }

    // the chevron of AFCL Select over a native select
    getSelectControl(config: any) {
      const control = super.getSelectControl(config);
      const wrapper = document.createElement('span');
      wrapper.classList.add('af-json-form-select');
      control.input.replaceWith(wrapper);
      wrapper.appendChild(control.input);
      wrapper.appendChild(lucideIcon(IconChevronDown, 'af-json-form-select-icon w-4 h-4'));
      return control;
    }

    // a single boolean is a switch, like AFCL Toggle
    getCheckboxControl(config: any) {
      const control = super.getCheckboxControl(config);
      control.formGroup.classList.add('af-json-form-check-row');
      control.input.classList.add('af-json-form-toggle');
      control.input.setAttribute('role', 'switch');
      return control;
    }

    // a list of options is a group of checkboxes with the check icon of AFCL Checkbox
    getCheckboxesControl(config: any) {
      const control = super.getCheckboxesControl(config);
      control.fieldset.removeAttribute('style');
      control.fieldset.classList.toggle('af-json-form-inline', !!config.inline);
      control.checkboxControls.forEach((checkboxControl: HTMLElement, index: number) => {
        checkboxControl.classList.add('af-json-form-check-row');
        const checkbox = control.checkboxes[index];
        const box = document.createElement('span');
        box.classList.add('af-json-form-checkbox');
        checkbox.replaceWith(box);
        box.appendChild(checkbox);
        box.appendChild(lucideIcon(IconCheck, 'af-json-form-checkbox-icon w-3 h-3'));
      });
      return control;
    }

    getRadiosControl(config: any) {
      const control = super.getRadiosControl(config);
      control.fieldset.removeAttribute('style');
      control.fieldset.classList.toggle('af-json-form-inline', !!config.inline);
      control.radioControls.forEach((radioControl: HTMLElement) => radioControl.classList.add('af-json-form-check-row'));
      return control;
    }

    // a color is a swatch, not a bar over the whole width
    getInputControl(config: any) {
      const control = super.getInputControl(config);
      if (config.type === 'color') {
        control.input.style.removeProperty('width');
      }
      return control;
    }

    // the value of a range sits at the end of its label row
    getInputRangeControl(config: any) {
      const control = super.getInputRangeControl(config);
      control.output.removeAttribute('style');
      control.label.classList.add('af-json-form-range-label');
      control.label.appendChild(control.output);
      return control;
    }

    getTabList(config: any) {
      const list = super.getTabList(config);
      list.classList.add('af-nav');
      list.classList.add(config && config.variant === 'horizontal' ? 'af-nav-h' : 'af-nav-v');
      return list;
    }

    getTab(config: any) {
      const tab = super.getTab(config);
      if (config && config.active) {
        tab.link.classList.add('af-active');
      }
      tab.link.addEventListener('click', (event: Event) => {
        // let array action buttons (delete / move / add) perform their own action
        if ((event.target as HTMLElement)?.closest('button')) {
          return;
        }
        event.preventDefault();
        const navList = tab.link.closest('.af-nav');
        const row = navList?.parentElement?.parentElement; // navList -> col -> row
        if (!navList || !row) {
          return;
        }
        const content = row.querySelector(':scope > .jedi-col > .tab-content');
        navList
          .querySelectorAll(':scope > li .jedi-nav-link')
          .forEach((link: Element) => link.classList.remove('af-active'));
        tab.link.classList.add('af-active');
        if (content) {
          content
            .querySelectorAll(':scope > .jedi-tab-pane')
            .forEach((pane: Element) => pane.classList.remove('af-active'));
          const activePane = content.querySelector(`:scope > [id="tab-pane-${config.id}"]`);
          if (activePane) {
            activePane.classList.add('af-active');
          }
        }
      });
      return tab;
    }

    setTabPaneAttributes(element: HTMLElement, active: boolean, id: string) {
      super.setTabPaneAttributes(element, active, id);
      element.classList.toggle('af-active', !!active);
    }
  }

  return new AdminforthTheme();
}
