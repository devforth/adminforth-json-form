import { type PluginsCommonOptions } from "adminforth";

/**
 * A JSON-Schema-like node used to describe the form. Only a subset of JSON Schema
 * is supported, extended with `x-*` keywords that control rendering.
 */
export interface JsonFormSchema {
  title?: string;
  description?: string;
  type?: "object" | "array" | "string" | "integer" | "number" | "boolean";

  /** Object */
  properties?: Record<string, JsonFormSchema>;
  required?: string[];
  patternProperties?: Record<string, JsonFormSchema>;
  /** Schema of free-form properties. `false` disables the key/value editor. */
  additionalProperties?: JsonFormSchema | boolean;

  /** Array */
  items?: JsonFormSchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;

  /** Scalar */
  enum?: (string | number | boolean)[];
  const?: string | number | boolean;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  readOnly?: boolean;
  default?: any;

  /** Discriminated union */
  oneOf?: JsonFormSchema[];

  /**
   * Controls how this node is rendered. Supported values:
   * - objects: `grid`, `nav-vertical`
   * - arrays: `nav-horizontal`, `table`, `table-object`, `checkboxes-inline`
   * - scalars: `textarea`, `color`, `range`, `radios`, `radios-inline`, `checkbox`
   */
  "x-format"?: string;

  /** Titles for `enum` values, in the same order as `enum`. */
  "x-enumTitles"?: string[];

  /** Grid placement when parent object uses `x-format: grid`. `columns` out of 12. */
  "x-grid"?: { columns?: number };

  /** Per-validation-rule custom error messages, e.g. `{ minLength: "...", required: "..." }`. */
  "x-messages"?: Record<string, string>;

  /** Bootstrap-icon class shown near a field title, e.g. `bi bi-person-fill`. */
  "x-titleIconClass"?: string;

  /** Enables drag & reorder for arrays. */
  "x-sortable"?: boolean;

  /** Placeholder of the key input in key/value rows of a free-form object. */
  "x-keyPlaceholder"?: string;

  /** Label of the "Add property" button of a free-form object. */
  "x-addPropertyContent"?: string;

  /** Mustache-like template for array item tab titles, e.g. `{{ i1 }}) {{ value.name }}`. */
  "x-titleTemplate"?: string;

  /** Discriminator property name for `oneOf` unions. */
  "x-discriminator"?: string;

  /** Title of a `oneOf` branch shown in the variant switcher. */
  "x-switcherTitle"?: string;

  /** Keep a `const` value locked (used for discriminator markers). */
  "x-enforceConst"?: boolean;
}

export interface PluginOptions extends PluginsCommonOptions {
  /**
   * Name of the field (column) that stores the JSON data.
   * The column MUST be of AdminForth `json` datatype.
   */
  fieldName: string;

  /**
   * JSON Schema describing the form to render for the field.
   */
  schema: JsonFormSchema;
}
