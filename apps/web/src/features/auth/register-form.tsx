import { useRef, useState, type FormEvent } from "react";
import {
  hasRegisterErrors,
  validateRegisterForm,
  type RegisterField,
  type RegisterFieldErrors,
  type RegisterFormValues
} from "./register-schema";

type RegisterFormProps = {
  onValidSubmit?: (values: RegisterFormValues) => void | Promise<void>;
  submitDisabled?: boolean;
};

const INITIAL_VALUES: RegisterFormValues = { name: "", email: "", password: "" };

export function RegisterForm({ onValidSubmit, submitDisabled = false }: RegisterFormProps) {
  const [values, setValues] = useState<RegisterFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<RegisterFieldErrors>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const submittingRef = useRef(false);

  function updateField(field: RegisterField, value: string) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);

    if (hasSubmitted || errors[field]) {
      const nextErrors = validateRegisterForm(nextValues);
      setErrors((current) => {
        const next = { ...current };
        if (nextErrors[field]) {
          next[field] = nextErrors[field];
        } else {
          delete next[field];
        }
        return next;
      });
    }
  }

  function validateField(field: RegisterField) {
    const nextErrors = validateRegisterForm(values);
    setErrors((current) => {
      const next = { ...current };
      if (nextErrors[field]) {
        next[field] = nextErrors[field];
      } else {
        delete next[field];
      }
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);

    const nextErrors = validateRegisterForm(values);
    setErrors(nextErrors);
    if (hasRegisterErrors(nextErrors) || !onValidSubmit || submitDisabled || submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onValidSubmit({ name: values.name.trim(), email: values.email.trim(), password: values.password });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <form className="register-form" noValidate onSubmit={handleSubmit} aria-busy={isSubmitting}>
      <div className="field-group">
        <label className="form-label" htmlFor="register-name">Tên của bạn</label>
        <input
          id="register-name"
          name="name"
          className="text-input"
          type="text"
          autoComplete="name"
          value={values.name}
          onChange={(event) => updateField("name", event.target.value)}
          onBlur={() => validateField("name")}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "register-name-error" : undefined}
          required
        />
        {errors.name ? <p className="form-error" id="register-name-error" role="alert">{errors.name}</p> : null}
      </div>

      <div className="field-group">
        <label className="form-label" htmlFor="register-email">Địa chỉ email</label>
        <input
          id="register-email"
          name="email"
          className="text-input"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(event) => updateField("email", event.target.value)}
          onBlur={() => validateField("email")}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "register-email-error" : undefined}
          required
        />
        {errors.email ? <p className="form-error" id="register-email-error" role="alert">{errors.email}</p> : null}
      </div>

      <div className="field-group">
        <label className="form-label" htmlFor="register-password">Mật khẩu</label>
        <div className="password-field">
          <input
            id="register-password"
            name="password"
            className="text-input"
            type={isPasswordVisible ? "text" : "password"}
            autoComplete="new-password"
            value={values.password}
            onChange={(event) => updateField("password", event.target.value)}
            onBlur={() => validateField("password")}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "register-password-error" : undefined}
            required
          />
          <button
            className="password-toggle"
            type="button"
            aria-label={isPasswordVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            aria-pressed={isPasswordVisible}
            onClick={() => setIsPasswordVisible((visible) => !visible)}
          >
            {isPasswordVisible ? "Ẩn" : "Hiện"}
          </button>
        </div>
        {errors.password ? <p className="form-error" id="register-password-error" role="alert">{errors.password}</p> : null}
      </div>

      <button className="register-submit" type="submit" disabled={isSubmitting || submitDisabled}>
        {isSubmitting ? "Đang xử lý…" : "Tạo tài khoản"}
      </button>
    </form>
  );
}
