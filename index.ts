import { AdminForthPlugin, AdminForthDataTypes } from "adminforth";
import type { IAdminForth, AdminForthResource } from "adminforth";
import type { PluginOptions } from './types.js';

export default class JsonFormPlugin extends AdminForthPlugin {
  options: PluginOptions;
  resourceConfig!: AdminForthResource;

  constructor(options: PluginOptions) {
    super(options, import.meta.url);
    this.options = options;
  }

  instanceUniqueRepresentation(pluginOptions: any): string {
    return pluginOptions.fieldName;
  }

  validateConfigAfterDiscover(adminforth: IAdminForth, resourceConfig: AdminForthResource) {

  }

  async modifyResourceConfig(adminforth: IAdminForth, resourceConfig: AdminForthResource) {
    super.modifyResourceConfig(adminforth, resourceConfig);
    this.resourceConfig = resourceConfig;
    
    if (!this.options.fieldName) {
      throw new Error(`[JsonFormPlugin] "fieldName" option is required`);
    }
    if (!this.options.schema || typeof this.options.schema !== 'object') {
      throw new Error(`[JsonFormPlugin] "schema" option is required and must be a JSON Schema object`);
    }

    const column = resourceConfig.columns.find(c => c.name === this.options.fieldName);
    if (!column) {
      throw new Error(
        `[JsonFormPlugin] Column "${this.options.fieldName}" not found in resource "${resourceConfig.label}"`
      );
    }

    if (column.type !== AdminForthDataTypes.JSON) {
      throw new Error(
        `[JsonFormPlugin] Column "${this.options.fieldName}" must be of type "json", but got "${column.type}". ` +
        `The json-form plugin only works with JSON columns.`
      );
    }

    if (!column.components) {
      column.components = {};
    }

    const meta = {
      pluginInstanceId: this.pluginInstanceId,
      columnName: this.options.fieldName,
      schema: this.options.schema,
    };

    const formComponent = {
      file: this.componentPath('JsonForm.vue'),
      meta,
    };

    column.components.create = formComponent;
    column.components.edit = formComponent;
    column.components.show = formComponent;
  }
}
