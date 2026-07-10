import { AdminForthPlugin, AdminForthDataTypes } from "adminforth";
import type { IAdminForth, AdminForthResource } from "adminforth";
import type { PluginOptions } from './types.js';
import Validator from 'jsonschema';

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

    if (!resourceConfig.hooks) {
      resourceConfig.hooks = {};
    }
    if (!resourceConfig.hooks.create) {
      resourceConfig.hooks.create = {};
    }
    if (!resourceConfig.hooks.edit) {
      resourceConfig.hooks.edit = {};
    }

    const pushHook = (hooks: { beforeSave?: any }, fn: any) => {
      if (Array.isArray(hooks.beforeSave)) {
        hooks.beforeSave.push(fn);
      } else if (hooks.beforeSave) {
        hooks.beforeSave = [hooks.beforeSave, fn];
      } else {
        hooks.beforeSave = [fn];
      }
    };

    pushHook(resourceConfig.hooks.create, async ({ record }: { record: any }) => {
      return this.validateRecord(record);
    });
    pushHook(resourceConfig.hooks.edit, async ({ updates }: { updates: any }) => {
      if (!(this.options.fieldName in updates)) {
        return { ok: true };
      }
      return this.validateRecord(updates);
    });
  }

  validateRecord(record: any): { ok: boolean; error?: string } {
    const value = record?.[this.options.fieldName];

    if (value === undefined || value === null) {
      return { ok: true };
    }

    const validator = new Validator.Validator();
    const result = validator.validate(value, this.options.schema, { nestedErrors: true });

    if (!result.valid) {
      const message = result.errors
        .map((e) => `${e.property.replace(/^instance/, this.options.fieldName)} ${e.message}`)
        .join('; ');
      return {
        ok: false,
        error: `[JsonForm] Invalid value for "${this.options.fieldName}": ${message}`,
      };
    }

    return { ok: true };
  }
}
