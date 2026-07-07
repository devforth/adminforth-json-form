/**
 * A jedison `Theme` subclass with AdminForth-friendly behaviour.
 *
 * The default jedison theme does not mark the active tab / pane and relies on
 * `:target` for switching (which is unusable inside a SPA). This subclass:
 *   - tags the nav list with `af-nav` + `af-nav-v` / `af-nav-h` so vertical and
 *     horizontal navs can be styled differently,
 *   - marks the active tab link and active pane with `af-active`, and
 *   - switches panes on click via plain DOM toggling (no `:target`, no full
 *     re-render), scoped to the clicked nav so nested navs stay independent.
 *
 * All the actual colors / borders / radii live in JsonForm.vue's <style> block.
 */
export function makeAdminforthTheme(Jedison: any) {
  class AdminforthTheme extends Jedison.Theme {
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
