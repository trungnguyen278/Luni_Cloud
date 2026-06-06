'use client';

/* ============================================================
   Login — ported from LoginScreen in web-shell.jsx, wired to the
   real POST /auth/login. The prototype's email-regex role inference
   and fake delay are gone (role comes from the server); the demo
   quick-fill buttons appear only when NEXT_PUBLIC_LUNI_DEV=1.
   ============================================================ */

import { useRouter } from 'next/navigation';
import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { FLAGS } from '@/lib/flags';
import { useLunar } from '@/lib/moon/useLunar';
import { Icon } from '@/components/brand/Icon';
import { LuniFace } from '@/components/brand/LuniFace';
import { MoonGlyph } from '@/components/brand/MoonGlyph';
import { Spinner, ToastHost } from '@/components/base/ui';

function demoCard(): CSSProperties {
  return { display: 'flex', alignItems: 'center', gap: 12, padding: 11, borderRadius: 13, background: 'var(--bg-1)', border: '1px solid var(--hairline)', width: '100%' };
}

export default function LoginPage() {
  const router = useRouter();
  const { login, status } = useAuth();
  const moon = useLunar();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // already signed in → go straight to the console
  useEffect(() => {
    if (status === 'authed') router.replace('/console/overview');
  }, [status, router]);

  const fill = (e: string, p: string) => {
    setEmail(e);
    setPass(p);
    setErr('');
  };

  const submit = async (ev?: FormEvent) => {
    ev?.preventDefault();
    if (!email || !pass) {
      setErr('Nhập email và mật khẩu.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await login(email, pass);
      router.replace('/console/overview');
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 401 ? 'Email hoặc mật khẩu không đúng.' : 'Đăng nhập thất bại. Thử lại sau.';
      setErr(msg);
      setBusy(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'grid', gridTemplateColumns: '1.05fr .95fr', overflow: 'hidden', background: 'var(--bg-base)' }}>
      {/* brand side */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '46px 52px',
          overflow: 'hidden',
          background:
            'radial-gradient(120% 90% at 20% 0%, rgba(91,233,255,.10), transparent 55%), radial-gradient(100% 80% at 100% 100%, rgba(180,140,255,.10), transparent 55%), var(--bg-void)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="press" onClick={() => router.push('/')} title="Về trang chủ" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <MoonGlyph p={moon.p} size={40} color="#5BE9FF" eyes />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.02em' }}>Luni</div>
              <div className="t-over" style={{ margin: 0 }}>
                Cloud Console
              </div>
            </div>
          </button>
        </div>
        <div>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div style={{ position: 'absolute', inset: '-30%', background: 'radial-gradient(circle, rgba(91,233,255,.16), transparent 65%)', animation: 'glowPulse 5s var(--ease) infinite' }} />
            <LuniFace emotion="happy" size={188} state="idle" />
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.08, margin: '30px 0 0', maxWidth: 420 }}>
            Người bạn AI
            <br />
            đồng bộ theo tuần trăng.
          </h1>
          <p style={{ fontSize: 15, color: 'var(--tx-mute)', lineHeight: 1.6, margin: '14px 0 0', maxWidth: 400 }}>
            Bảng điều khiển web cho hệ sinh thái Luni — giám sát fleet, phát hành firmware OTA và xem robot của bạn theo thời gian thực.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 12.5, color: 'var(--tx-faint)' }}>
          <span>lunirobot.io.vn</span>
          <span>FastAPI · PostgreSQL · ESP32</span>
        </div>
      </div>

      {/* form side */}
      <div style={{ display: 'grid', placeItems: 'center', padding: 32, borderLeft: '1px solid var(--hairline)' }}>
        <form onSubmit={submit} style={{ width: '100%', maxWidth: 372 }}>
          <button
            type="button"
            className="press"
            onClick={() => router.push('/')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 32, padding: '0 12px 0 9px', borderRadius: 99, background: 'var(--bg-2)', border: '1px solid var(--hairline)', fontSize: 12.5, fontWeight: 700, color: 'var(--tx-mute)', marginBottom: 22 }}
          >
            <Icon name="back" size={15} color="var(--tx-mute)" />
            Trang chủ
          </button>
          <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.02em', margin: 0 }}>Đăng nhập</h2>
          <p style={{ fontSize: 13.5, color: 'var(--tx-mute)', margin: '7px 0 26px' }}>Đăng nhập bằng tài khoản Luni của bạn.</p>

          <label className="field-label">Email</label>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }}>
              <Icon name="mail" size={17} color="var(--tx-faint)" />
            </span>
            <input
              className="winput"
              style={{ paddingLeft: 40 }}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErr('');
              }}
              placeholder="ban@gmail.com"
              type="email"
              autoComplete="username"
            />
          </div>
          <label className="field-label">Mật khẩu</label>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }}>
              <Icon name="lock" size={17} color="var(--tx-faint)" />
            </span>
            <input
              className="winput"
              style={{ paddingLeft: 40, paddingRight: 42 }}
              value={pass}
              onChange={(e) => {
                setPass(e.target.value);
                setErr('');
              }}
              placeholder="••••••••"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
            />
            <button type="button" onClick={() => setShow((s) => !s)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, display: 'grid', placeItems: 'center' }}>
              <Icon name={show ? 'eyeOff' : 'eye'} size={17} color="var(--tx-faint)" />
            </button>
          </div>
          {err && <div style={{ fontSize: 12.5, color: 'var(--red)', marginBottom: 8 }}>{err}</div>}
          <div style={{ textAlign: 'right', marginBottom: 18 }}>
            <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 12.5, color: 'var(--acc)', textDecoration: 'none', fontWeight: 600 }}>
              Quên mật khẩu?
            </a>
          </div>

          <button type="submit" className="btn btn-acc" style={{ width: '100%', height: 46 }} disabled={busy}>
            {busy ? (
              <Spinner size={18} color="var(--acc-ink)" />
            ) : (
              <>
                <Icon name="power" size={17} color="var(--acc-ink)" />
                Đăng nhập
              </>
            )}
          </button>

          {FLAGS.LUNI_DEV && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
                <span className="hr" style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: 'var(--tx-faint)', fontWeight: 600 }}>TÀI KHOẢN DEMO</span>
                <span className="hr" style={{ flex: 1 }} />
              </div>
              <div style={{ display: 'grid', gap: 9 }}>
                <button type="button" className="press" onClick={() => fill('mai.nguyen@gmail.com', 'luni2026')} style={demoCard()}>
                  <span style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(91,233,255,.14)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                    <Icon name="user" size={17} color="#5BE9FF" />
                  </span>
                  <span style={{ flex: 1, textAlign: 'left' }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>Người dùng</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--tx-faint)' }}>
                      mai.nguyen@gmail.com
                    </span>
                  </span>
                  <Icon name="chevron" size={16} color="var(--tx-faint)" />
                </button>
                <button type="button" className="press" onClick={() => fill('admin@luni.vn', 'luni2026')} style={demoCard()}>
                  <span style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(180,140,255,.14)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                    <Icon name="shield" size={17} color="#B48CFF" />
                  </span>
                  <span style={{ flex: 1, textAlign: 'left' }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>Admin · kỹ thuật</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--tx-faint)' }}>
                      admin@luni.vn
                    </span>
                  </span>
                  <Icon name="chevron" size={16} color="var(--tx-faint)" />
                </button>
              </div>
            </>
          )}
        </form>
      </div>
      <ToastHost />
    </div>
  );
}
