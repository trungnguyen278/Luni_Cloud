/* ============================================================
   LandingPage — public product page (the marketing site a visitor
   sees before signing in). Ported from web-landing.jsx.
   The prototype's window.__lpScroll global is replaced by a React
   context (useLandingScroll) backed by the scroll-container ref.
   ============================================================ */
'use client';

import { createContext, useCallback, useContext, useRef, type ReactNode } from 'react';
import { hexA2 } from '@/lib/format';
import { specialDay } from '@/lib/moon/engine';
import { useLunar } from '@/lib/moon/useLunar';
import { MY_DEVICES } from '@/lib/mock/data';
import { Icon } from '@/components/brand/Icon';
import { LuniFace } from '@/components/brand/LuniFace';
import { MoonGlyph } from '@/components/brand/MoonGlyph';
import { MoonStrip } from '@/components/brand/MoonStrip';
import { RobotStage } from '@/components/studio/RobotStage';
import { AppMirror } from '@/components/studio/AppMirror';
import { luniToast } from '@/components/base/ui';

type ScrollFn = (id: string) => void;
const LandingScrollContext = createContext<ScrollFn>(() => {});
const useLandingScroll = () => useContext(LandingScrollContext);

interface LoginProp {
  onLogin: () => void;
}

/* ---------- top nav: brand left, login in the corner ---------- */
function LandingNav({ onLogin }: LoginProp) {
  const moon = useLunar();
  const scrollTo = useLandingScroll();
  const links: [string, string][] = [
    ['features', 'Tính năng'],
    ['lunar', 'Tuần trăng'],
    ['preview', 'Sản phẩm'],
    ['safety', 'An toàn'],
  ];
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '15px 32px',
        background: 'rgba(9,12,21,.72)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--hairline)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <MoonGlyph p={moon.p} size={32} color="#5BE9FF" eyes />
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1 }}>Luni</div>
          <div className="t-over" style={{ margin: '3px 0 0', fontSize: 9 }}>
            Người bạn AI
          </div>
        </div>
      </div>
      <nav className="lp-nav-links" style={{ display: 'flex', gap: 4, marginLeft: 22 }}>
        {links.map(([id, lab]) => (
          <button
            key={id}
            className="press lp-navlink"
            onClick={() => scrollTo(id)}
            style={{ padding: '8px 13px', borderRadius: 9, fontSize: 13.5, fontWeight: 600, color: 'var(--tx-mute)' }}
          >
            {lab}
          </button>
        ))}
      </nav>
      {/* login in the corner */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="lp-status" style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--tx-faint)' }}>
          <span className="cdot" style={{ background: 'var(--green)', boxShadow: '0 0 7px var(--green)' }} />
          Hệ thống ổn định
        </span>
        <button className="btn btn-acc" onClick={onLogin}>
          <Icon name="power" size={16} color="var(--acc-ink)" />
          Đăng nhập
        </button>
      </div>
    </header>
  );
}

/* ---------- hero ---------- */
function LandingHero({ onLogin }: LoginProp) {
  const moon = useLunar();
  const scrollTo = useLandingScroll();
  const sp = specialDay(moon);
  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: '78px 32px 70px' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(80% 60% at 78% 18%, rgba(91,233,255,.12), transparent 60%), radial-gradient(70% 60% at 8% 90%, rgba(180,140,255,.10), transparent 60%)',
        }}
      />
      <div
        style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 40, alignItems: 'center' }}
        className="lp-hero-grid"
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 13px',
              borderRadius: 99,
              background: 'var(--acc-12)',
              border: '1px solid var(--acc-20)',
              marginBottom: 22,
            }}
          >
            <Icon name="sparkle" size={14} color="var(--acc)" />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--acc)' }}>
              {sp ? sp.vi + ' — Luni đang đổi tâm trạng' : 'Robot AI cho gia đình Việt'}
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(38px, 5vw, 60px)', fontWeight: 800, letterSpacing: '-.035em', lineHeight: 1.04, margin: 0 }}>
            Người bạn AI
            <br />
            đồng bộ theo
            <br />
            <span style={{ color: 'var(--acc)' }}>tuần trăng.</span>
          </h1>
          <p style={{ fontSize: 17, color: 'var(--tx-mute)', lineHeight: 1.6, margin: '22px 0 0', maxWidth: 470 }}>
            Luni lắng nghe, trò chuyện và biểu lộ cảm xúc — rồi rạng rỡ vào đêm Rằm, trầm lắng ngày Mùng Một. Một robot nhỏ bầu bạn cùng cả nhà, theo nhịp âm
            lịch.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 30, flexWrap: 'wrap' }}>
            <button className="btn btn-acc" style={{ height: 50, padding: '0 22px', fontSize: 15 }} onClick={onLogin}>
              <Icon name="power" size={18} color="var(--acc-ink)" />
              Vào bảng điều khiển
            </button>
            <button className="btn" style={{ height: 50, padding: '0 20px', fontSize: 15 }} onClick={() => scrollTo('preview')}>
              <Icon name="play" size={16} color="var(--tx-soft)" />
              Xem sản phẩm
            </button>
          </div>
          <div style={{ display: 'flex', gap: 26, marginTop: 34, flexWrap: 'wrap' }}>
            {(
              [
                ['9', 'tông cảm xúc'],
                ['30', 'ngày âm lịch'],
                ['OTA', 'tự cập nhật'],
              ] as [string, string][]
            ).map(([v, l]) => (
              <div key={l}>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.03em' }}>{v}</div>
                <div style={{ fontSize: 12.5, color: 'var(--tx-faint)', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        {/* robot orb */}
        <div style={{ display: 'grid', placeItems: 'center', position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              inset: '4% 14%',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${hexA2(sp ? sp.color : '#5BE9FF', 0.18)}, transparent 66%)`,
              animation: 'glowPulse 5s var(--ease) infinite',
            }}
          />
          <div style={{ position: 'relative', animation: 'floatY 6s ease-in-out infinite' }}>
            <LuniFace emotion={sp ? sp.emotion : 'happy'} size={300} state="idle" />
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 2,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '8px 15px',
              borderRadius: 99,
              background: 'var(--bg-1)',
              border: '1px solid var(--hairline-2)',
              boxShadow: 'var(--shadow-soft)',
            }}
          >
            <MoonGlyph p={moon.p} size={22} color={sp ? sp.color : '#5BE9FF'} />
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>{moon.phase.vi}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--tx-faint)' }}>
              ÂL {moon.lunarDay}/30
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- features ---------- */
interface Feature {
  icon: string;
  c: string;
  t: string;
  d: string;
}
const LP_FEATURES: Feature[] = [
  { icon: 'chat', c: '#5BE9FF', t: 'Trò chuyện tự nhiên', d: 'Hỏi thời tiết, đặt báo thức, kể chuyện trước khi ngủ. Luni nghe giọng nói và trả lời bằng giọng thân thiện.' },
  { icon: 'moon', c: '#FFD166', t: 'Đồng bộ tuần trăng', d: 'Luni chính là mặt trăng — gương mặt tròn khuyết theo âm lịch, rạng rỡ đêm Rằm, dịu dàng ngày Sóc.' },
  { icon: 'sparkle', c: '#FF6B9D', t: '9 tông cảm xúc', d: 'Vui vẻ, tò mò, thư giãn, buồn ngủ… Luni thể hiện cảm xúc bằng ánh mắt và sắc màu sống động.' },
  { icon: 'download', c: '#7BE88E', t: 'Tự cập nhật OTA', d: 'Tính năng mới về thẳng robot khi đang sạc — an toàn 2 phân vùng, mất điện vẫn quay lại bản cũ.' },
  { icon: 'shield', c: '#B48CFF', t: 'Riêng tư & an toàn', d: 'Dữ liệu mã hoá, kiểm soát của phụ huynh, giờ yên tĩnh ban đêm. Bạn nắm toàn quyền.' },
  { icon: 'battery', c: '#76B8FF', t: 'Pin cả ngày', d: 'Một lần sạc dùng trọn ngày. Đặt lên đế là Luni tự nạp và sẵn sàng bầu bạn tiếp.' },
];
function LandingFeatures() {
  return (
    <section id="lp-features" style={{ padding: '20px 32px 64px', scrollMarginTop: 78 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <LandingHead
          over="Tính năng"
          title={
            <>
              Mọi thứ một người bạn nhỏ
              <br />
              cần có — gói gọn trong Luni.
            </>
          }
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }} className="lp-feat-grid">
          {LP_FEATURES.map((f) => (
            <div key={f.t} className="panel panel-pad" style={{ position: 'relative', overflow: 'hidden' }}>
              <div
                style={{ position: 'absolute', right: -20, top: -20, width: 90, height: 90, borderRadius: '50%', background: `radial-gradient(circle, ${hexA2(f.c, 0.14)}, transparent 70%)` }}
              />
              <span style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: hexA2(f.c, 0.14), position: 'relative' }}>
                <Icon name={f.icon} size={21} color={f.c} strokeWidth={1.9} />
              </span>
              <h3 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.01em', margin: '16px 0 8px' }}>{f.t}</h3>
              <p style={{ fontSize: 13.5, color: 'var(--tx-mute)', lineHeight: 1.6, margin: 0 }}>{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- lunar signature section ---------- */
function LandingLunar() {
  const moon = useLunar();
  const cards: [string, string, string, string][] = [
    ['sparkle', '#FFD166', 'Đêm Rằm', 'Trăng tròn vành vạnh — Luni rạng rỡ, vầng sáng nở hết cỡ.'],
    ['moon', '#B48CFF', 'Mùng Một', 'Trăng tối (Sóc) — Luni trầm lắng, thắp ánh dịu để bầu bạn.'],
  ];
  return (
    <section id="lp-lunar" style={{ padding: '64px 32px', scrollMarginTop: 78, background: 'linear-gradient(180deg, transparent, rgba(180,140,255,.04), transparent)' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
        <div className="t-over" style={{ color: '#FFD166' }}>
          Điều khiến Luni khác biệt
        </div>
        <h2 style={{ fontSize: 'clamp(28px,3.4vw,40px)', fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.1, margin: '12px 0 14px' }}>
          Luni <span style={{ color: '#FFD166' }}>chính là mặt trăng.</span>
        </h2>
        <p style={{ fontSize: 16, color: 'var(--tx-mute)', lineHeight: 1.6, maxWidth: 600, margin: '0 auto 38px' }}>
          Gương mặt Luni tròn khuyết theo đúng ngày âm lịch. Mỗi đêm một dáng vẻ — và vào những ngày đặc biệt, Luni tự đổi tâm trạng để bầu bạn cùng bạn.
        </p>
        <div className="panel panel-pad" style={{ maxWidth: 760, margin: '0 auto' }}>
          <MoonStrip activeIndex={moon.phaseIndex} color="#FFD166" />
        </div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 22, flexWrap: 'wrap' }}>
          {cards.map(([ic, c, t, d]) => (
            <div
              key={t}
              className="panel panel-pad"
              style={{ flex: 1, minWidth: 260, maxWidth: 372, display: 'flex', gap: 13, alignItems: 'flex-start', textAlign: 'left' }}
            >
              <span style={{ width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', background: hexA2(c, 0.15), flex: 'none' }}>
                <Icon name={ic} size={18} color={c} />
              </span>
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: c }}>{t}</div>
                <div style={{ fontSize: 12.5, color: 'var(--tx-mute)', lineHeight: 1.5, marginTop: 3 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- product preview (robot ⇄ app) ---------- */
function LandingPreview() {
  const device = MY_DEVICES[0];
  return (
    <section id="lp-preview" style={{ padding: '64px 32px', scrollMarginTop: 78 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <LandingHead
          over="Sản phẩm"
          title={
            <>
              Robot và ứng dụng,
              <br />
              luôn soi gương cùng nhau.
            </>
          }
          sub="Mọi biểu cảm trên robot hiện ngay trong app. Theo dõi pin, sóng, cảm xúc và trò chuyện — tất cả từ điện thoại của bạn."
        />
        <div className="panel" style={{ overflow: 'hidden', marginTop: 6 }}>
          <div
            style={{ display: 'flex', gap: 30, alignItems: 'center', padding: '34px 28px', background: 'radial-gradient(120% 120% at 28% 0%, var(--acc-12), transparent 60%)', flexWrap: 'wrap', justifyContent: 'center' }}
          >
            <RobotStage emotion="happy" state="idle" device={device} accent="var(--acc)" />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
              <span className="t-over" style={{ margin: 0 }}>
                Bản xem trên app
              </span>
              <AppMirror emotion="happy" scene="weather" state="idle" device={device} accent="var(--acc)" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- safety / trust strip ---------- */
function LandingSafety() {
  const rows: [string, string, string][] = [
    ['lock', 'Mã hoá đầu cuối', 'Hội thoại và dữ liệu được mã hoá khi truyền và lưu trữ.'],
    ['users', 'Kiểm soát phụ huynh', 'Đặt giờ yên tĩnh, giới hạn nội dung và xem lịch sử bất cứ lúc nào.'],
    ['cpu', 'Chạy trên ESP32', 'Phần cứng tối ưu điện năng, firmware mở rộng qua OTA an toàn.'],
  ];
  return (
    <section id="lp-safety" style={{ padding: '20px 32px 64px', scrollMarginTop: 78 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }} className="lp-feat-grid">
        {rows.map(([ic, t, d]) => (
          <div key={t} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--bg-2)', border: '1px solid var(--hairline)', flex: 'none' }}>
              <Icon name={ic} size={20} color="var(--acc)" />
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{t}</div>
              <div style={{ fontSize: 13, color: 'var(--tx-mute)', lineHeight: 1.55, marginTop: 4 }}>{d}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- final CTA ---------- */
function LandingCTA({ onLogin }: LoginProp) {
  const moon = useLunar();
  return (
    <section style={{ padding: '20px 32px 72px' }}>
      <div
        className="panel"
        style={{
          position: 'relative',
          overflow: 'hidden',
          maxWidth: 1180,
          margin: '0 auto',
          padding: '52px 40px',
          textAlign: 'center',
          background: 'radial-gradient(110% 130% at 50% -10%, var(--acc-12), transparent 60%), var(--bg-1)',
          borderColor: 'var(--acc-20)',
        }}
      >
        <div style={{ display: 'grid', placeItems: 'center', marginBottom: 18 }}>
          <MoonGlyph p={moon.p} size={56} color="#5BE9FF" eyes />
        </div>
        <h2 style={{ fontSize: 'clamp(26px,3.2vw,38px)', fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.1, margin: 0 }}>Sẵn sàng gặp Luni?</h2>
        <p style={{ fontSize: 15.5, color: 'var(--tx-mute)', lineHeight: 1.6, maxWidth: 460, margin: '14px auto 26px' }}>
          Đăng nhập vào bảng điều khiển để xem robot của bạn theo thời gian thực, phát hành cập nhật và theo dõi chi phí AI.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-acc" style={{ height: 50, padding: '0 24px', fontSize: 15 }} onClick={onLogin}>
            <Icon name="power" size={18} color="var(--acc-ink)" />
            Đăng nhập
          </button>
          <button className="btn" style={{ height: 50, padding: '0 20px', fontSize: 15 }} onClick={() => luniToast('Liên hệ: hello@luni.vn', 'acc', 'mail')}>
            <Icon name="mail" size={16} color="var(--tx-soft)" />
            Liên hệ mua hàng
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------- footer ---------- */
function LandingFooter({ onLogin }: LoginProp) {
  const moon = useLunar();
  const cols: [string, string[]][] = [
    ['Sản phẩm', ['Tính năng', 'Tuần trăng', 'Bảng giá', 'Ứng dụng']],
    ['Hỗ trợ', ['Hướng dẫn', 'Tài liệu API', 'Trạng thái hệ thống', 'Liên hệ']],
    ['Công ty', ['Về Luni', 'Quyền riêng tư', 'Điều khoản', 'Tuyển dụng']],
  ];
  return (
    <footer style={{ borderTop: '1px solid var(--hairline)', padding: '40px 32px 30px', background: 'var(--bg-void)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.4fr repeat(3,1fr)', gap: 30 }} className="lp-foot-grid">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 13 }}>
            <MoonGlyph p={moon.p} size={30} color="#5BE9FF" eyes />
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.02em' }}>Luni</div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--tx-faint)', lineHeight: 1.6, margin: 0, maxWidth: 280 }}>
            Người bạn AI đồng bộ theo tuần trăng. Thiết kế tại Việt Nam.
          </p>
          <div className="mono" style={{ fontSize: 11.5, color: 'var(--tx-faint)', marginTop: 14 }}>
            lunirobot.io.vn · FastAPI · PostgreSQL · ESP32
          </div>
        </div>
        {cols.map(([h, items]) => (
          <div key={h}>
            <div className="t-over" style={{ marginBottom: 13 }}>
              {h}
            </div>
            <div style={{ display: 'grid', gap: 9 }}>
              {items.map((it) => (
                <button
                  key={it}
                  className="lp-footlink press"
                  onClick={() => luniToast('Trang demo — chưa có nội dung thật', 'acc', 'info')}
                  style={{ fontSize: 13, color: 'var(--tx-mute)', textAlign: 'left' }}
                >
                  {it}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{ maxWidth: 1180, margin: '26px auto 0', paddingTop: 20, borderTop: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}
      >
        <span style={{ fontSize: 12.5, color: 'var(--tx-faint)' }}>© 2026 Luni Robot. Bảo lưu mọi quyền.</span>
        <button className="press" onClick={onLogin} style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 700, color: 'var(--acc)' }}>
          Đăng nhập console →
        </button>
      </div>
    </footer>
  );
}

/* ---------- shared section header ---------- */
function LandingHead({ over, title, sub }: { over?: string; title: ReactNode; sub?: ReactNode }) {
  return (
    <div style={{ marginBottom: 30, maxWidth: 620 }}>
      {over && (
        <div className="t-over" style={{ color: 'var(--acc)', marginBottom: 11 }}>
          {over}
        </div>
      )}
      <h2 style={{ fontSize: 'clamp(26px,3vw,36px)', fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.12, margin: 0 }}>{title}</h2>
      {sub && <p style={{ fontSize: 15.5, color: 'var(--tx-mute)', lineHeight: 1.6, margin: '14px 0 0' }}>{sub}</p>}
    </div>
  );
}

/* ---------- the page ---------- */
export function LandingPage({ onLogin }: LoginProp) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTo = useCallback<ScrollFn>((id) => {
    const root = scrollRef.current;
    const el = document.getElementById('lp-' + id);
    if (root && el) root.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' });
  }, []);

  return (
    <LandingScrollContext.Provider value={scrollTo}>
      <div
        ref={scrollRef}
        className="scrolly lp-root"
        style={{ height: '100vh', position: 'relative', background: 'radial-gradient(130% 70% at 80% -5%, rgba(91,233,255,.06), transparent 55%), var(--bg-base)' }}
      >
        <LandingNav onLogin={onLogin} />
        <LandingHero onLogin={onLogin} />
        <LandingFeatures />
        <LandingLunar />
        <LandingPreview />
        <LandingSafety />
        <LandingCTA onLogin={onLogin} />
        <LandingFooter onLogin={onLogin} />
      </div>
    </LandingScrollContext.Provider>
  );
}
