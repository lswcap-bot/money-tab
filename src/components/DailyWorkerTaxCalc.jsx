import { useMemo } from 'react';
import { Printer, Scale, ChevronDown, ChevronUp } from 'lucide-react';
import Tooltip from './Tooltip.jsx';
import { fmtKRW } from '../utils/taxCalculations.js';
import { useFormattedNumber } from '../hooks/useFormattedNumber.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

// ── 상수 ─────────────────────────────────────────────────────
const DAILY_DEDUCTION  = 150_000;  // 근로소득공제 (일용직)
const INCOME_TAX_RATE  = 0.06;     // 일용근로소득세율 6%
const TAX_CREDIT_RATE  = 0.55;     // 근로소득세액공제 55%
const LOCAL_TAX_RATE   = 0.1;      // 지방소득세 = 소득세 × 10%

function calcDailyWorker(dailyWage, workDays) {
  if (dailyWage <= 0 || workDays <= 0) return null;

  const taxablePerDay  = Math.max(0, dailyWage - DAILY_DEDUCTION);
  const grossTaxPerDay = Math.round(taxablePerDay * INCOME_TAX_RATE);
  const creditPerDay   = Math.round(grossTaxPerDay * TAX_CREDIT_RATE);
  const incomeTaxPerDay = Math.max(0, grossTaxPerDay - creditPerDay);
  const localTaxPerDay  = Math.round(incomeTaxPerDay * LOCAL_TAX_RATE);
  const totalWhPerDay   = incomeTaxPerDay + localTaxPerDay;
  const netPerDay       = dailyWage - totalWhPerDay;

  const totalGross   = dailyWage * workDays;
  const totalWh      = totalWhPerDay * workDays;
  const totalNet     = netPerDay * workDays;
  const effectiveRate = dailyWage > 0 ? totalWhPerDay / dailyWage : 0;

  return {
    taxablePerDay,
    grossTaxPerDay,
    creditPerDay,
    incomeTaxPerDay,
    localTaxPerDay,
    totalWhPerDay,
    netPerDay,
    totalGross,
    totalWh,
    totalNet,
    effectiveRate,
    isExempt: dailyWage <= DAILY_DEDUCTION,
  };
}

function Stepper({ value, min, max, onChange, unit }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}
        className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition">
        <ChevronDown size={16} />
      </button>
      <span className="w-20 text-center font-bold text-slate-800 text-sm bg-slate-50 border border-slate-200 rounded-xl py-1.5">
        {value.toLocaleString('ko-KR')}{unit}
      </span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}
        className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition">
        <ChevronUp size={16} />
      </button>
    </div>
  );
}

export default function DailyWorkerTaxCalc() {
  const [dailyWage, wageDisplay, handleWageChange] = useFormattedNumber(200_000, 'daily_wage');
  const [workDays,  setWorkDays]                   = useLocalStorage('daily_workDays', 20);

  const r = useMemo(() => calcDailyWorker(dailyWage, workDays), [dailyWage, workDays]);

  return (
    <div className="space-y-5">
      {/* 세무사 주의 문구 */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <Scale size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 font-medium leading-relaxed">
          본 계산은 <span className="font-bold">간이 계산</span>이며, 3개월 초과 계속 근로 시 일반 근로소득으로 전환될 수 있습니다.
          정확한 신고는 <span className="font-bold">세무사와 상의</span>하세요.
        </p>
      </div>

      {/* 입력 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-800 to-brand-600 px-6 py-4">
          <h2 className="text-white font-semibold text-base">일용직 근로 조건 입력</h2>
          <p className="text-brand-100 text-xs mt-0.5">일당 15만 원 공제 후 6% 세율 적용 (세액공제 55%)</p>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
            <label className="flex items-center gap-1 text-sm font-medium text-slate-600 sm:w-44 shrink-0">
              일당
              <Tooltip content="하루 일용근로 대가로 지급받는 금액입니다. 15만 원 이하이면 소득세 없음(비과세)." />
            </label>
            <div className="flex-1 relative">
              <input type="text" inputMode="numeric"
                value={wageDisplay} onChange={handleWageChange} placeholder="일당 입력"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-right text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">원</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
            <label className="flex items-center gap-1 text-sm font-medium text-slate-600 sm:w-44 shrink-0">
              근무 일수
              <Tooltip content="이번 달 일용 근무 일수입니다." />
            </label>
            <Stepper value={workDays} min={1} max={31} onChange={setWorkDays} unit="일" />
          </div>
        </div>
      </div>

      {/* 결과 */}
      {r && (
        <div key={`${r.totalNet}-${workDays}`} className="result-animate bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print-section">
          {r.isExempt ? (
            <div className="bg-emerald-600 px-6 py-6 text-center text-white">
              <p className="font-bold text-lg">비과세 — 세금 없음</p>
              <p className="text-emerald-200 text-sm mt-1">일당 {fmtKRW(dailyWage)}원은 15만 원 이하로 소득세가 없습니다.</p>
              <div className="mt-4 grid grid-cols-2 gap-3 max-w-xs mx-auto">
                <div className="bg-white/10 rounded-xl py-3">
                  <p className="text-emerald-200 text-xs">총 지급액</p>
                  <p className="text-white font-bold">{fmtKRW(r.totalGross)}원</p>
                </div>
                <div className="bg-white/10 rounded-xl py-3">
                  <p className="text-emerald-200 text-xs">원천징수</p>
                  <p className="text-white font-bold">0원</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-6 py-5 text-white">
                <p className="text-brand-200 text-sm font-medium mb-3">{workDays}일 근무 합계</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: '총 지급액',   value: r.totalGross },
                    { label: '총 원천징수', value: r.totalWh },
                    { label: '총 실수령',   value: r.totalNet },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/10 rounded-xl py-3 px-2">
                      <p className="text-brand-200 text-xs mb-1.5">{label}</p>
                      <p className="text-white font-bold text-sm sm:text-base">{fmtKRW(value)}</p>
                      <p className="text-brand-300 text-xs mt-0.5">원</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-6 pb-6">
                <p className="py-4 text-sm font-semibold text-slate-700">1일 기준 계산 내역</p>
                <div className="rounded-xl bg-slate-50 px-4 py-4 space-y-2.5 mb-3">
                  <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-2">1일 세금 계산</p>
                  <div className="rounded-lg bg-white border border-slate-200 px-3 py-2.5 text-xs text-slate-500 font-mono text-center leading-relaxed">
                    ({fmtKRW(dailyWage)}원 − 150,000원) × 6% × (1 − 55%)
                  </div>
                  {[
                    { label: '일당',                             value: `${fmtKRW(dailyWage)}원` },
                    { label: '(−) 근로소득공제 (15만원)',        value: `${fmtKRW(DAILY_DEDUCTION)}원` },
                    { label: '과세표준',                          value: `${fmtKRW(r.taxablePerDay)}원`, bold: true },
                    { label: '산출세액 (× 6%)',                  value: `${fmtKRW(r.grossTaxPerDay)}원` },
                    { label: '(−) 근로소득세액공제 (× 55%)',     value: `${fmtKRW(r.creditPerDay)}원` },
                    { label: '소득세',                            value: `${fmtKRW(r.incomeTaxPerDay)}원`, bold: true },
                    { label: '지방소득세 (소득세 × 10%)',        value: `${fmtKRW(r.localTaxPerDay)}원` },
                  ].map(({ label, value, bold }) => (
                    <div key={label} className={`flex justify-between gap-2 text-sm ${bold ? 'font-bold text-brand-800 border-t border-slate-200 pt-2 mt-1' : ''}`}>
                      <span className={bold ? '' : 'text-slate-600'}>{label}</span>
                      <span className={bold ? '' : 'font-semibold text-slate-800 shrink-0'}>{value}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-red-700">
                    <span>1일 원천징수 합계</span>
                    <span className="text-base">{fmtKRW(r.totalWhPerDay)}원</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-brand-800">
                    <span>1일 실수령액</span>
                    <span className="text-base">{fmtKRW(r.netPerDay)}원</span>
                  </div>
                </div>

                <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-brand-600 font-medium">{workDays}일 실지급 합계</p>
                    <p className="text-[10px] text-brand-400 mt-0.5">실효세율 {(r.effectiveRate * 100).toFixed(2)}% (일당 기준)</p>
                  </div>
                  <p className="text-brand-800 font-extrabold text-xl">{fmtKRW(r.totalNet)}원</p>
                </div>

                <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700 leading-relaxed">
                  일용근로자는 하루 15만 원 초과분에 대해 2.97% (소득세 2.7% + 지방세 0.27%)를 원천징수합니다.
                  동일 고용주에게 3개월 이상 계속 고용되면 일반 근로소득으로 전환됩니다.
                </div>
              </div>
            </>
          )}

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
