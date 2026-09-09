export type LoginFormValues = {
  email: string;
  password: string;
};

export type LoginField = keyof LoginFormValues;
export type LoginFieldErrors = Partial<Record<LoginField, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginForm(values: LoginFormValues): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const email = values.email.trim();

  if (!email) {
    errors.email = "Vui lòng nhập email.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Vui lòng nhập email hợp lệ.";
  }

  if (!values.password) {
    errors.password = "Vui lòng nhập mật khẩu.";
  }

  return errors;
}

export function hasLoginErrors(errors: LoginFieldErrors) {
  return Object.keys(errors).length > 0;
}
