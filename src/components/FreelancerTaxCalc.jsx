import { useMemo } from 'react';
import { Printer, Scale, Info } from 'lucide-react';
import { fmtKRW } from '../utils/taxCalculations.js';
import { useFormattedNumber } from '../hooks/useFormattedNumber.js';

// ── 상수 ─────────────────────────────────────────────────────
const INCOME_TAX_RATE  = 0.03;    // 사업소득세 3%
const LOCAL_TAX_RATE   = 0.003;   // 지방소득세 0.3%
const TOTAL_RATE       = INCOME_TAX_RATE + LOCAL_TAX_RATE;  // 3.3%

// ── 계산 ─────────────────────────────────────────────────────
function calcFreelancer(amount) {
  if (amount <= 0) return null;
  const incomeTax  = Math.round(amount * INCOME_TAX_RATE);
  const localTax   = Math.round(amount * LOCAL_TAX_RATE);
  const totalWh    = incomeTax + localTax;
  const netAmount  = amount - totalWh;
  return { incomeTax, localTax, totalWh, netAmount };
}

export default function FreelancerTaxCalc() {
  const [amount, display, handleChange] = useFormattedNumber(3_000_000, 'free_amount');
  const r = useMemo(() => calcFreelancer(amount), [amount]);

  return (
    <div className="space-y-5">
      {/* 세무사 주의 문구 */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <Scale size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 font-medium leading-relaxed">
          본 계산은 <span className="font-bold">간이 계산</span>이며, 연간 소득에 따른 종합소득세 신고 의무가 발생할 수 있습니다.
          정확한 신고는 <span className="font-bold">세무사와 상의</span>하세요.
        </p>
      </div>

      {/* 안내 */}
      <div className="flex items-start gap-3 bg-brand-50 border border-brand-100 rounded-2xl px-5 py-4">
        <Info size={16} className="text-brand-600 shrink-0 mt-0.5" />
        <div className="text-xs text-brand-700 leading-relaxed space-y-1">
          <p className="font-bold">프리랜서 세금 구조</p>
          <p>프리랜서·강사·용역 등 <span className="font-semibold">사업소득자</span>는 지급처가 대금의 3.3%를 원천징수 후 지급합니다.</p>
          <p>연간 소득이 발생하면 다음 해 5월 <span className="font-semibold">종합소득세 신고</span>가 필요합니다.</p>
        </div>
      </div>

      {/* 입력 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-800 to-brand-600 px-6 py-4">
          <h2 className="text-white font-semibold text-base">계약 금액 입력</h2>
          <p className="text-brand-100 text-xs mt-0.5">세전 계약 금액 기준 원천징수(3.3%)를 계산합니다</p>
        </div>
        <div className="px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
            <label className="text-sm font-medium text-slate-600 sm:w-44 shrink-0">세전 계약 금액</label>
            <div className="flex-1 relative">
              <input
                type="text" inputMode="numeric"
                value={display} onChange={handleChange}
                placeholder="계약 금액 입력"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-right text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">원</span>
            </div>
          </div>
        </div>
      </div>

      {/* 결과 */}
      {r && (
        <div key={r.totalWh} className="result-animate bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print-section">
          {/* 배너 */}
          <div className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-6 py-5 text-white">
            <p className="text-brand-200 text-sm font-medium mb-3">원천징수 후 실지급액</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: '계약 금액',   value: amount },
                { label: '원천징수(3.3%)', value: r.totalWh },
                { label: '실지급액',    value: r.netAmount },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/10 rounded-xl py-3 px-2">
                  <p className="text-brand-200 text-xs mb-1.5">{label}</p>
                  <p className="text-white font-bold text-sm sm:text-base">{fmtKRW(value)}</p>
                  <p className="text-brand-300 text-xs mt-0.5">원</p>
                </div>
              ))}
            </div>
          </div>

          {/* 내역 */}
          <div className="px-6 pb-6">
            <p className="py-4 text-sm font-semibold text-slate-700">원천징수 내역</p>
            <div className="rounded-xl bg-slate-50 px-4 py-4 space-y-2.5 mb-3">
              <div className="rounded-lg bg-white border border-slate-200 px-3 py-2.5 text-xs text-slate-500 font-mono text-center">
                계약금액 {fmtKRW(amount)}원 × 3.3% (사업소득세 3% + 지방소득세 0.3%)
              </div>
              {[
                { label: '사업소득세 (3%)',    value: `${fmtKRW(r.incomeTax)}원` },
                { label: '지방소득세 (0.3%)',  value: `${fmtKRW(r.localTax)}원` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-2 text-sm">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-semibold text-slate-800 shrink-0">{value}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-red-700">
                <span>총 원천징수액</span>
                <span className="text-base">{fmtKRW(r.totalWh)}원</span>
              </div>
            </div>

            <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-brand-600 font-medium">실지급액</p>
                <p className="text-[10px] text-brand-400 mt-0.5">세전 금액의 96.7%</p>
              </div>
              <p className="text-brand-800 font-extrabold text-xl">{fmtKRW(r.netAmount)}원</p>
            </div>

            {/* 종합소득세 안내 */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-4 space-y-2 text-xs text-slate-600">
              <p className="font-bold text-slate-700">종합소득세 신고 안내</p>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span>신고 기간</span>
                  <span className="font-medium text-slate-800">매년 5월 1일 ~ 5월 31일</span>
                </div>
                <div className="flex justify-between">
                  <span>원천징수 세금 처리</span>
                  <span className="font-medium text-slate-800">기납부세액으로 공제</span>
                </div>
                <div className="flex justify-between">
                  <span>연 수입 2,000만원 미만</span>
                  <span className="font-medium text-slate-800">성실신고 or 단순경비율 적용 가능</span>
                </div>
              </div>
            </div>
          </div>

          <div className="no-print px-6 pb-6 flex justify-end">
            <button type="button" onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-5 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-100 transition-colors">
              <Printer size={15} /> PDF로 저장
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
