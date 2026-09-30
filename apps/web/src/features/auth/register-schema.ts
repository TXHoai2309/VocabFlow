export type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
};

export type RegisterField = keyof RegisterFormValues;
export type RegisterFieldErrors = Partial<Record<RegisterField, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegisterForm(values: RegisterFormValues): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();

  if (!name) {
    errors.name = "Vui lòng nhập tên phụ huynh.";
  }

  if (!email) {
    errors.email = "Vui lòng nhập địa chỉ email.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Vui lòng nhập địa chỉ email hợp lệ.";
  }

  if (!values.password) {
    errors.password = "Vui lòng nhập mật khẩu.";
  }

  return errors;
}

export function hasRegisterErrors(errors: RegisterFieldErrors) {
  return Object.keys(errors).length > 0;
}
