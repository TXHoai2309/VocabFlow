import { useRef, useState, type FormEvent } from "react";
import {
  hasLoginErrors,
  validateLoginForm,
  type LoginField,
  type LoginFieldErrors,
  type LoginFormValues
} from "./login-schema";

type LoginFormProps = {
  onValidSubmit?: (values: LoginFormValues) => void | Promise<void>;
  submitDisabled?: boolean;
};

const INITIAL_VALUES: LoginFormValues = { email: "", password: "" };

export function LoginForm({ onValidSubmit, submitDisabled = false }: LoginFormProps) {
  const [values, setValues] = useState<LoginFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const submittingRef = useRef(false);

  function updateField(field: LoginField, value: string) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);

    if (hasSubmitted || errors[field]) {
      const nextErrors = validateLoginForm(nextValues);
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

  function validateField(field: LoginField) {
    const nextErrors = validateLoginForm(values);
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

    const nextErrors = validateLoginForm(values);
    setErrors(nextErrors);
    if (hasLoginErrors(nextErrors) || !onValidSubmit || submitDisabled || submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onValidSubmit({ email: values.email.trim(), password: values.password });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <form className="register-form" noValidate onSubmit={handleSubmit} aria-busy={isSubmitting}>
      <div className="field-group">
        <label className="form-label" htmlFor="login-email">Địa chỉ email</label>
        <input
          id="login-email"
          name="email"
          className="text-input"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(event) => updateField("email", event.target.value)}
          onBlur={() => validateField("email")}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          required
        />
        {errors.email ? <p className="form-error" id="login-email-error" role="alert">{errors.email}</p> : null}
      </div>

      <div className="field-group">
        <label className="form-label" htmlFor="login-password">Mật khẩu</label>
        <div className="password-field">
          <input
            id="login-password"
            name="password"
            className="text-input"
            type={isPasswordVisible ? "text" : "password"}
            autoComplete="current-password"
            value={values.password}
            onChange={(event) => updateField("password", event.target.value)}
            onBlur={() => validateField("password")}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "login-password-error" : undefined}
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
        {errors.password ? <p className="form-error" id="login-password-error" role="alert">{errors.password}</p> : null}
      </div>

      <button className="register-submit" type="submit" disabled={isSubmitting || submitDisabled}>
        {isSubmitting ? "Đang đăng nhập…" : "Đăng nhập"}
      </button>
    </form>
  );
}
