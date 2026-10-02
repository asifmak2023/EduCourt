import type { ReactNode } from "react";

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface BaseFieldConfig {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  readOnly?: boolean;
  readOnlyOnEdit?: boolean;
  span?: 1 | 2;
  displayKey?: string;
}

export interface TextFieldConfig extends BaseFieldConfig {
  type: "text" | "textarea" | "email";
  placeholder?: string;
}

export interface NumberFieldConfig extends BaseFieldConfig {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

export interface DateFieldConfig extends BaseFieldConfig {
  type: "date";
}

export interface TimeFieldConfig extends BaseFieldConfig {
  type: "time";
}

export interface SelectFieldConfig extends BaseFieldConfig {
  type: "select";
  options: SelectOption[];
}

export interface CheckboxFieldConfig extends BaseFieldConfig {
  type: "checkbox";
  defaultValue?: boolean;
}

export interface LookupFieldConfig extends BaseFieldConfig {
  type: "lookup";
  lookup: string;
  dependsOn?: string;
}

export interface PhotoFieldConfig extends BaseFieldConfig {
  type: "photo";
  path: string;
  fileField?: string;
  urlKey?: string;
}

export type FieldConfig =
  | TextFieldConfig
  | NumberFieldConfig
  | DateFieldConfig
  | TimeFieldConfig
  | SelectFieldConfig
  | CheckboxFieldConfig
  | LookupFieldConfig
  | PhotoFieldConfig;

export type InputFieldConfig = Exclude<FieldConfig, PhotoFieldConfig>;

export type ColumnFormat = "text" | "number" | "money" | "date" | "badge";

export interface ColumnConfig<T = AdminRecord> {
  key?: string;
  label: string;
  align?: "left" | "right";
  format?: ColumnFormat;
  render?: (item: T) => ReactNode;
}

export interface FilterConfig {
  param: string;
  label: string;
  options: SelectOption[];
}

export interface ActionConfig<T = AdminRecord> {
  label: string;
  method?: "POST" | "PUT" | "DELETE";
  path: string | ((item: T) => string);
  body?: Record<string, unknown> | ((item: T) => Record<string, unknown>);
  confirm?: string;
  permission?: string;
  fields?: InputFieldConfig[];
  submitLabel?: string;
  successMessage?: string;
}

export interface ModulePermissions {
  view: string;
  create?: string;
  edit?: string;
  delete?: string;
  photo?: string;
}

export type AdminRecord = Record<string, unknown>;

export interface DetailSection<T = AdminRecord> {
  title: string;
  render: (item: T) => ReactNode;
}

export interface ModuleConfig<T extends AdminRecord = AdminRecord> {
  key: string;
  section: string;
  label: string;
  endpoint: string;
  permissions: ModulePermissions;
  searchable?: boolean;
  filters?: FilterConfig[];
  columns: ColumnConfig<T>[];
  fields: FieldConfig[];
  detailSections?: DetailSection<T>[];
  deleteMessage?: string;
  actions?: ActionConfig<T>[];
}
