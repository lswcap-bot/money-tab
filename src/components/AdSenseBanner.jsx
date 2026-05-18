import { useEffect, useRef } from 'react';

/**
 * Google AdSense 배너 컴포넌트
 * - useEffect로 push()를 한 번만 호출 (StrictMode 이중 실행 방어)
 * - adsbygoogle.js는 index.html <head>에서 로드
 */
export default function AdSenseBanner({ slot, format = 'auto', responsive = 'true', className = '' }) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // 광고 차단 등으로 실패 시 무시
    }
  }, []);

  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={{ display: 'block' }}
      data-ad-client="ca-pub-7873015898368786"
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive}
    />
  );
}
