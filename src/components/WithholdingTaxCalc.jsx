import { useMemo } from 'react';
import { Printer, Scale } from 'lucide-react';
import Tooltip from './Tooltip.jsx';
import { fmtKRW, calcSalaryBreakdown } from '../utils/taxCalculations.js';
import { useFormattedNumber } from '../hooks/useFormattedNumber.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

// ── 소득 유형 정의 ─────────────────────────────────────────────
const INCOME_TYPES = [
  { id: 'employment', label: '근로소득',  desc: '월급·상여·임금 지급 시 간이세액표 기준' },
  { id: 'business',   label: '사업소득',  desc: '용역·프리랜서 지급 시 3.3% 원천징수' },
  { id: 'other',      label: '기타소득',  desc: '강연료·원고료·일시적 소득 (필요경비 60% 인정)' },
];

// ── 계산 로직 ─────────────────────────────────────────────────
function calcWithholding(amount, incomeType) {
  if (amount <= 0) return null;

  if (incomeType === 'employment') {
    // 간이세액표: calcSalaryBreakdown을 월급 기준으로 사용
    const bd = calcSalaryBreakdown(amount, true, 0, 1);
    const incomeTax = bd.incomeTax;
    const localTax  = Math.round(incomeTax * 0.1);
    return {
      label:     '근로소득 원천징수 (간이세액표 80% 기준)',
      incomeTax,
      localTax,
      totalWh:   incomeTax + localTax,
      netAmount: amount - incomeTax - localTax,
      rows: [
        { label: '월 급여',              value: `${fmtKRW(amount)}원` },
        { label: '소득세 (간이세액표)',    value: `${fmtKRW(incomeTax)}원` },
        { label: '지방소득세 (소득세×10%)', value: `${fmtKRW(localTax)}원` },
      ],
    };
  }

  if (incomeType === 'business') {
    const incomeTax = Math.round(amount * 0.03);
    const localTax  = Math.round(amount * 0.003);
    return {
      label:     '사업소득 원천징수 (3.3%)',
      incomeTax,
      localTax,
      totalWh:   incomeTax + localTax,
      netAmount: amount - incomeTax - localTax,
      rows: [
        { label: '지급 금액',          value: `${fmtKRW(amount)}원` },
        { label: '소득세 (3%)',         value: `${fmtKRW(incomeTax)}원` },
        { label: '지방소득세 (0.3%)',   value: `${fmtKRW(localTax)}원` },
      ],
    };
  }

  // 기타소득: 필요경비 60% 인정 → 기타소득금액 = 지급액 × 40%
  if (incomeType === 'other') {
    const incomeAmount = Math.round(amount * 0.4);
    const incomeTax    = Math.round(incomeAmount * 0.2);
    const localTax     = Math.round(incomeTax * 0.1);
    return {
      label:     '기타소득 원천징수 (필요경비 60% 인정)',
      incomeAmount,
      incomeTax,
      localTax,
      totalWh:   incomeTax + localTax,
      netAmount: amount - incomeTax - localTax,
      rows: [
        { label: '지급 금액',                    value: `${fmtKRW(amount)}원` },
        { label: '기타소득금액 (지급액 × 40%)',  value: `${fmtKRW(incomeAmount)}원` },
        { label: '소득세 (기타소득금액 × 20%)',  value: `${fmtKRW(incomeTax)}원` },
        { label: '지방소득세 (소득세 × 10%)',    value: `${fmtKRW(localTax)}원` },
      ],
    };
  }

  return null;
}

export default function WithholdingTaxCalc() {
  const [incomeType, setIncomeType] = useLocalStorage('wth_type',   'employment');
  const [amount, display, handleChange] = useFormattedNumber(3_000_000, 'wth_amount');

  const r = useMemo(() => calcWithholding(amount, incomeType), [amount, incomeType]);

  const activeType = INCOME_TYPES.find(t => t.id === incomeType);

  return (
    <div className="space-y-5">
      {/* 세무사 주의 문구 */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <Scale size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 font-medium leading-relaxed">
          본 계산은 <span className="font-bold">간이 계산</span>이며, 부양가족·비과세·세액공제에 따라 실제 원천징수액이 달라집니다.
          정확한 신고는 <span className="font-bold">세무사와 상의</span>하세요.
        </p>
      </div>

      {/* 입력 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-800 to-brand-600 px-6 py-4">
          <h2 className="text-white font-semibold text-base">원천징수 계산</h2>
          <p className="text-brand-100 text-xs mt-0.5">소득 종류에 따른 법정 원천징수 세율 적용</p>
        </div>
        <div className="px-6 py-5 space-y-5">
          {/* 소득 종류 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600">
              소득 종류
              <span className="ml-2 text-xs text-slate-400">지급하는 소득의 유형을 선택하세요</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {INCOME_TYPES.map(t => (
                <button key={t.id} type="button" onClick={() => setIncomeType(t.id)}
                  className={`text-left rounded-xl border px-4 py-3 transition-colors ${
                    incomeType === t.id
                      ? 'bg-brand-50 border-brand-300 text-brand-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <p className="font-semibold text-sm">{t.label}</p>
                  <p className="text-xs mt-0.5 opacity-70">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 지급액 */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
            <label className="flex items-center gap-1 text-sm font-medium text-slate-600 sm:w-44 shrink-0">
              지급 금액
              <Tooltip content="원천징수 전 세전 지급 금액입니다." />
            </label>
            <div className="flex-1 relative">
              <input type="text" inputMode="numeric"
                value={display} onChange={handleChange} placeholder="지급액 입력"
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
          <div className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-6 py-5 text-white">
            <p className="text-brand-200 text-sm font-medium mb-1">{activeType?.label} 원천징수</p>
            <p className="text-brand-300 text-xs mb-3">{r.label}</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: '지급액',    value: amount },
                { label: '원천징수',  value: r.totalWh },
                { label: '실지급액', value: r.netAmount },
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
            <p className="py-4 text-sm font-semibold text-slate-700">원천징수 내역</p>
            <div className="rounded-xl bg-slate-50 px-4 py-4 space-y-2.5 mb-3">
              {r.rows.map(({ label, value }) => (
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

            <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-brand-600 font-medium">실수령액</p>
              <p className="text-brand-800 font-extrabold text-xl">{fmtKRW(r.netAmount)}원</p>
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
