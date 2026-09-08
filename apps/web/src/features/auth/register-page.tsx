import { Link } from "react-router";
import { RegisterForm } from "./register-form";

export function RegisterPage() {
  return (
    <main className="auth-page" aria-labelledby="register-title">
      <section className="auth-card">
        <Link className="auth-brand" to="/" aria-label="VocabFlow home">
          <span className="auth-brand-mark" aria-hidden="true">V</span>
          <span>VocabFlow</span>
        </Link>
        <p className="auth-eyebrow">Dành cho gia đình</p>
        <h1 className="auth-title" id="register-title">Tạo tài khoản</h1>
        <p className="auth-copy">Tạo tài khoản để bắt đầu quản lý việc học từ vựng của gia đình.</p>
        <RegisterForm />
        <p className="auth-switch">
          Đã có tài khoản? <Link className="auth-link" to="/login">Đăng nhập</Link>
        </p>
      </section>
    </main>
  );
}

