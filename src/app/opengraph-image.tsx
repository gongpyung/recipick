import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = '레시픽 - 당신이 본 요리 영상, 스마트하게 픽하다';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to bottom, #fce4ec, #fef7f9, #fce4ec)',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Logo circle */}
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: 28,
          background: 'linear-gradient(135deg, #f8bbd9, #e8a4b8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32,
          boxShadow: '0 8px 24px rgba(248, 187, 217, 0.4)',
        }}
      >
        <span style={{ fontSize: 52 }}>🍳</span>
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 64,
          fontWeight: 900,
          color: '#4a4a4a',
          marginBottom: 12,
          letterSpacing: '-1px',
        }}
      >
        레시픽
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 28,
          color: '#e8a4b8',
          fontWeight: 700,
          marginBottom: 24,
        }}
      >
        Recipick
      </div>

      {/* Slogan */}
      <div
        style={{
          fontSize: 24,
          color: '#8b7b7b',
          textAlign: 'center',
          maxWidth: 600,
        }}
      >
        당신이 본 요리 영상, 스마트하게 픽하다
      </div>

      {/* Feature pills */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginTop: 40,
        }}
      >
        {['🎬 영상·쇼츠 지원', '🤖 AI 자동 추출', '⚖️ 인분 조절'].map(
          (text) => (
            <div
              key={text}
              style={{
                background: 'white',
                borderRadius: 20,
                padding: '10px 20px',
                fontSize: 16,
                color: '#6b5b4f',
                border: '1px solid rgba(248, 187, 217, 0.3)',
                boxShadow: '0 2px 8px rgba(248, 187, 217, 0.15)',
              }}
            >
              {text}
            </div>
          ),
        )}
      </div>
    </div>,
    { ...size },
  );
}
