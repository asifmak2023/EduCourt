"use client";

import {
  Children,
  Fragment,
  isValidElement,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type ComponentProps,
  type InputHTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import {
  Button as HeroButton,
  Checkbox as HeroCheckbox,
  Input,
  ListBox,
  Select as HeroSelect,
  Spinner,
  TextArea as HeroTextArea,
} from "@heroui/react";

export function Field({
  label,
  htmlFor,
  required = false,
  hint,
  error,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-sm font-medium text-foreground"
      >
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

export function TextInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <Input fullWidth {...props} className={className} />;
}

type OptionEntry = {
  value: string;
  label: ReactNode;
  textValue: string;
  disabled: boolean;
};

function nodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(nodeToText).join("");
  }
  if (isValidElement(node)) {
    return nodeToText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

function collectOptions(children: ReactNode, out: OptionEntry[]) {
  Children.forEach(children, (child) => {
    if (child === null || child === undefined || typeof child === "boolean") {
      return;
    }
    if (Array.isArray(child)) {
      collectOptions(child, out);
      return;
    }
    if (!isValidElement(child)) {
      return;
    }

    const element = child as ReactElement<{
      value?: unknown;
      children?: ReactNode;
      disabled?: boolean;
    }>;

    if (element.type === "option") {
      const value =
        element.props.value === undefined ? "" : String(element.props.value);
      out.push({
        value,
        label: element.props.children,
        textValue: nodeToText(element.props.children) || value,
        disabled: Boolean(element.props.disabled),
      });
      return;
    }

    if (element.type === "optgroup" || element.type === Fragment) {
      collectOptions(element.props.children, out);
    }
  });
}

export function Select({
  className = "",
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  required,
  name,
  id,
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const options: OptionEntry[] = [];
  collectOptions(children, options);

  const selectedKey =
    value === undefined || value === null ? undefined : String(value);
  const defaultKey =
    defaultValue === undefined || defaultValue === null
      ? undefined
      : String(defaultValue);
  const disabledKeys = options.filter((o) => o.disabled).map((o) => o.value);

  return (
    <HeroSelect
      fullWidth
      className={className}
      name={name}
      isDisabled={disabled}
      isRequired={required}
      selectedKey={selectedKey}
      defaultSelectedKey={defaultKey}
      disabledKeys={disabledKeys}
      onSelectionChange={(key) => {
        const next = key === null ? "" : String(key);
        onChange?.({
          target: { value: next, name },
        } as unknown as ChangeEvent<HTMLSelectElement>);
      }}
    >
      <HeroSelect.Trigger id={id}>
        <HeroSelect.Value />
        <HeroSelect.Indicator />
      </HeroSelect.Trigger>
      <HeroSelect.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item
              key={option.value}
              id={option.value}
              textValue={option.textValue}
            >
              {option.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </HeroSelect.Popover>
    </HeroSelect>
  );
}

export function TextArea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <HeroTextArea fullWidth {...props} className={className} />;
}

export function Checkbox({
  label,
  checked,
  defaultChecked,
  disabled,
  name,
  id,
  value,
  onChange,
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <HeroCheckbox
      id={id}
      name={name}
      value={value === undefined ? undefined : String(value)}
      isSelected={checked}
      defaultSelected={defaultChecked}
      isDisabled={disabled}
      onChange={(isSelected) => {
        onChange?.({
          target: {
            checked: isSelected,
            value: value === undefined ? "on" : String(value),
            name,
            type: "checkbox",
          },
        } as unknown as ChangeEvent<HTMLInputElement>);
      }}
    >
      <HeroCheckbox.Content>
        <HeroCheckbox.Control>
          <HeroCheckbox.Indicator />
        </HeroCheckbox.Control>
        {label}
      </HeroCheckbox.Content>
    </HeroCheckbox>
  );
}

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "button--primary",
  secondary: "button--secondary",
  danger: "button--danger",
  ghost: "button--ghost",
};

export function buttonClasses(variant: ButtonVariant = "primary"): string {
  return `button button--md ${BUTTON_VARIANT_CLASSES[variant]}`;
}

export function Button({
  variant = "primary",
  loading = false,
  className = "",
  children,
  disabled,
  onClick,
  type,
  value,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
}) {
  const heroProps = {
    ...props,
    type,
    value: value === undefined ? undefined : String(value),
    variant,
    className,
    isDisabled: disabled || loading,
    isPending: loading,
    onPress: onClick
      ? (event: unknown) =>
          onClick(event as MouseEvent<HTMLButtonElement>)
      : undefined,
  } as unknown as ComponentProps<typeof HeroButton>;

  return (
    <HeroButton {...heroProps}>
      {loading ? <Spinner size="sm" color="current" /> : null}
      {children}
    </HeroButton>
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-border px-6 py-5 last:border-b-0">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
