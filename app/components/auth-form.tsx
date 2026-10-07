"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";


type Mode = "login" | "register";

function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder,
  autoComplete,
  invalid,
  describedBy,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <input
        id={id}
        name={name}
        className="input has-toggle"
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={72}
        required
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
      <button
        type="button"
        className="toggle-pw"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
      >
        {show ? "ซ่อน" : "แสดง"}
      </button>
    </div>
  );
}

function passwordStrength(pw: string) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) score++;
  if (pw.length >= 12 || /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.max(score, 1);
}
const strengthLabels = ["", "อ่อน", "ปานกลาง", "แข็งแรง"];

export default function AuthForm({
  mode,
  notice,
}: {
  mode: Mode;
  notice?: string;
}) {
  const router = useRouter();
  const registering = mode === "register";

  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const strength = passwordStrength(password);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setEmailError("");
    setConfirmError("");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "")
      .trim()
      .toLowerCase();
    const name = String(form.get("name") ?? "").trim();

    if (registering) {
      if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        setFormError("รหัสผ่านต้องประกอบด้วยตัวอักษรและตัวเลข");
        return;
      }
      if (password !== confirm) {
        setConfirmError("รหัสผ่านไม่ตรงกัน");
        return;
      }
    }

    setBusy(true);
    let navigating = false;

    try {
      if (registering) {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          const code = payload?.error?.code;
          if (code === "CONFLICT") {
            setEmailError("อีเมลนี้ถูกใช้แล้ว");
          } else if (code === "VALIDATION_ERROR") {
            setFormError(
              "กรุณาตรวจสอบชื่อ อีเมล และรหัสผ่านอีกครั้ง (รหัสผ่านอย่างน้อย 8 ตัวอักษร)",
            );
          } else {
            setFormError("สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
          }
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        if (registering) {
          // สมัครสำเร็จแต่ล็อกอินอัตโนมัติไม่ได้ → ส่งไปหน้า login พร้อมข้อความแจ้ง
          navigating = true;
          router.replace("/login?registered=1");
          return;
        }
        setFormError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        return;
      }

      // ล็อกอินสำเร็จ → ไปหน้าแรก แล้วรีเฟรชให้ server component อ่าน session ใหม่
      navigating = true;
      router.replace("/");
      router.refresh();
    } catch {
      setFormError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      if (!navigating) setBusy(false);
    }
  }

  async function handleGoogle() {
    setFormError("");
    setBusy(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setBusy(false);
      setFormError("เชื่อมต่อ Google ไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  return (
    <div className="auth-card">
      <h1>{registering ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}</h1>
      <p className="auth-sub">
        {registering
          ? "สร้างบัญชีเพื่อเริ่มบันทึกข้อมูลการเก็บตัวอย่างมด"
          : "ยินดีต้อนรับกลับ เข้าสู่ระบบเพื่อจัดการข้อมูลของคุณ"}
      </p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate={false}>
        {formError && (
          <p className="alert alert-error" role="alert">
            {formError}
          </p>
        )}
        {notice && !formError && (
          <p className="alert alert-ok" role="status">
            {notice}
          </p>
        )}

        {registering && (
          <div className="field">
            <label htmlFor="name">ชื่อที่แสดง</label>
            <input
              id="name"
              name="name"
              className="input"
              type="text"
              placeholder="เช่น สมชาย ใจดี"
              autoComplete="name"
              minLength={2}
              maxLength={100}
              required
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="email">อีเมล</label>
          <input
            id="email"
            name="email"
            className="input"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? "email-error" : undefined}
            onChange={() => emailError && setEmailError("")}
          />
          {emailError && (
            <p id="email-error" className="field-error">
              {emailError}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="password">รหัสผ่าน</label>
          <PasswordInput
            id="password"
            name="password"
            value={password}
            onChange={setPassword}
            placeholder={
              registering ? "อย่างน้อย 8 ตัวอักษร" : "กรอกรหัสผ่านของคุณ"
            }
            autoComplete={registering ? "new-password" : "current-password"}
            describedBy={registering ? "password-hint" : undefined}
          />
          {registering && (
            <>
              {strength > 0 && (
                <div className="strength" aria-live="polite">
                  <div className="strength-bars" aria-hidden="true">
                    {[1, 2, 3].map((n) => (
                      <span
                        key={n}
                        className={n <= strength ? "on" : undefined}
                      />
                    ))}
                  </div>
                  <span className="strength-label">
                    ความแข็งแรง: {strengthLabels[strength]}
                  </span>
                </div>
              )}
              <p id="password-hint" className="field-hint">
                อย่างน้อย 8 ตัว ประกอบด้วยตัวอักษรและตัวเลข
              </p>
            </>
          )}
        </div>

        {registering && (
          <div className="field">
            <label htmlFor="confirm">ยืนยันรหัสผ่าน</label>
            <PasswordInput
              id="confirm"
              name="confirm"
              value={confirm}
              onChange={(v) => {
                setConfirm(v);
                if (confirmError) setConfirmError("");
              }}
              autoComplete="new-password"
              invalid={Boolean(confirmError)}
              describedBy={confirmError ? "confirm-error" : undefined}
            />
            {confirmError && (
              <p id="confirm-error" className="field-error">
                {confirmError}
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={busy}
        >
          {busy
            ? "กำลังดำเนินการ…"
            : registering
              ? "สร้างบัญชี"
              : "เข้าสู่ระบบ"}
        </button>
      </form>

      <div className="divider">
        <span>หรือ</span>
      </div>

      <button
        type="button"
        className="google-btn"
        onClick={handleGoogle}
        disabled={busy}
      >
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#FFC107"
            d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.7c3.9-3.6 6-8.8 6-14.9Z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.7-5c-1.9 1.3-4.2 2.1-6.8 2.1-5.2 0-9.6-3.5-11.2-8.2H5.9v5.2A20 20 0 0 0 24 44Z"
          />
          <path
            fill="#1976D2"
            d="M12.8 28.1a12 12 0 0 1 0-7.7v-5.2H5.9a20 20 0 0 0 0 18.1l6.9-5.2Z"
          />
          <path
            fill="#EA4335"
            d="M24 12.2c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6.2 29.5 4 24 4A20 20 0 0 0 5.9 15.2l6.9 5.2c1.6-4.7 6-8.2 11.2-8.2Z"
          />
        </svg>
        ดำเนินการต่อด้วย Google
      </button>

      <p className="switch-mode">
        {registering ? "มีบัญชีอยู่แล้ว?" : "ยังไม่มีบัญชี?"}{" "}
        <Link href={registering ? "/login" : "/register"}>
          {registering ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
        </Link>
      </p>
    </div>
  );
}
