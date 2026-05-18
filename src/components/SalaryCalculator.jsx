import { useState, useMemo } from 'react';
import {
  Printer, ChevronDown, ChevronUp,
  TrendingDown, Wallet, BadgePercent,
} from 'lucide-react';
import Tooltip from './Tooltip.jsx';
import BreakdownBar from './BreakdownBar.jsx';
import { calcSalaryBreakdown, fmtKRW, RATES_2026 } from '../utils/taxCalculations.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

const DEFAULTS = { amount: 52_000_000, nonTaxable: 200_000, dependents: 1 };
const LS = (k) => 'sal_' + k;

function ls(key, def) {
  try {
    const v = localStorage.getItem('mt_' + key);
    return v !== null ? JSON.parse(v) : def;
  } catch { return def; }
}
function lsNum(key, def) {
  try {
    const v = localStorage.getItem('mt_' + key);
    return v !== null ? (Number(v) || def) : def;
  } catch { return def; }
}
function lsSet(key, val) {
  try { localStorage.setItem('mt_' + key, JSON.stringify(val)); } catch {}
}

function buildDeductionRows(result) {
  const { nationalPension: np, healthInsurance: hi, longTermCare: ltc, employmentInsurance: ei } = RATES_2026;
  return [
    { label: '국민연금',    amount: result.nationalPension,     rate: `4.5% (상한 ${fmtKRW(np.upperLimit / 10000)}만원)`, color: 'bg-blue-500' },
    { label: '건강보험',    amount: result.healthInsurance,     rate: `${(hi.employeeRate * 100).toFixed(3)}%`,             color: 'bg-emerald-500' },
    { label: '장기요양보험', amount: result.longTermCare,        rate: `건보료의 ${(ltc.rateOfHealthTotal * 100 / 2).toFixed(3)}%`, color: 'bg-teal-400' },
    { label: '고용보험',    amount: result.employmentInsurance, rate: `${(ei.rate * 100).toFixed(1)}%`,                    color: 'bg-violet-500' },
    { label: '근로소득세',  amount: result.monthlyIncomeTax,    rate: '간이세액표 기준',                                    color: 'bg-rose-500' },
    { label: '지방소득세',  amount: result.localIncomeTax,      rate: '근로소득세의 10%',                                   color: 'bg-orange-400' },
  ];
}

function InputRow({ label, tooltip, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
      <label className="flex items-center gap-1 text-sm font-medium text-slate-600 sm:w-36 shrink-0">
        {label}
        {tooltip && <Tooltip content={tooltip} />}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export default function SalaryCalculator() {
  const [isMonthly,  setIsMonthly]  = useLocalStorage(LS('isMonthly'), false);
  const [amount,     setAmount]     = useState(() => lsNum(LS('amount'), DEFAULTS.amount));
  const [amtDisplay, setAmtDisplay] = useState(() => fmtKRW(lsNum(LS('amount'), DEFAULTS.amount)));
  const [nonTaxable, setNonTaxable] = useState(() => lsNum(LS('nonTaxable'), DEFAULTS.nonTaxable));
  const [ntDisplay,  setNtDisplay]  = useState(() => fmtKRW(lsNum(LS('nonTaxable'), DEFAULTS.nonTaxable)));
  const [dependents, setDependents] = useLocalStorage(LS('dependents'), DEFAULTS.dependents);
  const [showDetail, setShowDetail] = useState(true);

  const result       = useMemo(() => calcSalaryBreakdown(amount, isMonthly, nonTaxable, dependents), [amount, isMonthly, nonTaxable, dependents]);
  const deductionRows = useMemo(() => buildDeductionRows(result), [result]);
  const netRatio      = result.monthly > 0 ? Math.round((result.netSalary / result.monthly) * 100) : 0;

  // Breakdown bar items
  const barItems = useMemo(() => [
    { label: '실수령액',  value: result.netSalary,           color: 'bg-brand-700' },
    { label: '국민연금',  value: result.nationalPension,     color: 'bg-blue-500' },
    { label: '건강보험',  value: result.healthInsurance,     color: 'bg-emerald-500' },
    { label: '장기요양',  value: result.longTermCare,        color: 'bg-teal-400' },
    { label: '고용보험',  value: result.employmentInsurance, color: 'bg-violet-500' },
    { label: '근로소득세', value: result.monthlyIncomeTax,   color: 'bg-rose-500' },
    { label: '지방소득세', value: result.localIncomeTax,     color: 'bg-orange-400' },
  ], [result]);

  function handleAmountChange(e) {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const num = Number(raw) || 0;
    setAmount(num);
    setAmtDisplay(raw === '' ? '' : fmtKRW(num));
    lsSet(LS('amount'), num);
  }

  function handleNonTaxChange(e) {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const num = Number(raw) || 0;
    setNonTaxable(num);
    setNtDisplay(raw === '' ? '' : fmtKRW(num));
    lsSet(LS('nonTaxable'), num);
  }

  function handleToggle(monthly) {
    setIsMonthly(monthly);
    setAmount(DEFAULTS.amount);
    setAmtDisplay(fmtKRW(DEFAULTS.amount));
    lsSet(LS('amount'), DEFAULTS.amount);
  }

  return (
    <div className="space-y-5">
      {/* 입력 카드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-800 to-brand-600 px-6 py-4">
          <h2 className="text-white font-semibold text-base">급여 정보 입력</h2>
          <p className="text-brand-100 text-xs mt-0.5">2026년 기준 요율이 자동 적용됩니다</p>
        </div>

        <div className="px-6 py-5 space-y-5">
          <InputRow label="입력 방식">
            <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-sm font-medium">
              {['연봉', '월급'].map((label, i) => {
                const active = isMonthly === (i === 1);
                return (
                  <button key={label} type="button" onClick={() => handleToggle(i === 1)}
                    className={`px-5 py-2 transition-colors ${active ? 'bg-brand-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                    {label}
                  </button>
                );
              })}
            </div>
          </InputRow>

          <InputRow label={isMonthly ? '월급' : '연봉'}>
            <div className="relative">
              <input type="text" inputMode="numeric" value={amtDisplay} onChange={handleAmountChange}
                placeholder="금액을 입력하세요"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-right text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition tabular-nums" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">원</span>
            </div>
            {amount > 0 && (
              <p className="mt-1.5 text-xs text-slate-400 text-right">
                {isMonthly ? `연봉 환산 ≈ ${fmtKRW(amount * 12)}원` : `월 환산 ≈ ${fmtKRW(amount / 12)}원`}
              </p>
            )}
          </InputRow>

          <InputRow label="월 비과세액" tooltip="식대, 자가운전보조금 등 비과세 항목 합계입니다. 식대 한도 월 20만원, 자가운전보조금 월 20만원 등이 해당됩니다.">
            <div className="relative">
              <input type="text" inputMode="numeric" value={ntDisplay} onChange={handleNonTaxChange}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-right text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition tabular-nums" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">원</span>
            </div>
          </InputRow>

          <InputRow label="부양가족 수" tooltip="본인을 포함한 기본공제 대상 인원수입니다. 인원수에 따라 인적공제(1인당 150만원)와 근로소득세가 달라집니다.">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setDependents(Math.max(1, dependents - 1))}
                className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-brand-50 hover:border-brand-300 transition text-lg font-bold">−</button>
              <span className="w-20 text-center text-base font-semibold text-slate-800">{dependents}명</span>
              <button type="button" onClick={() => setDependents(Math.min(11, dependents + 1))}
                className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-brand-50 hover:border-brand-300 transition text-lg font-bold">+</button>
              <span className="text-xs text-slate-400">(본인 포함)</span>
            </div>
          </InputRow>
        </div>
      </div>

      {/* 결과 카드 */}
      {amount > 0 && (
        <div key={result.netSalary} className="result-animate bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print-section">

          {/* 실수령액 강조 배너 */}
          <div className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-6 py-6 text-white">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-brand-200 text-sm font-medium mb-1 flex items-center gap-1.5">
                  <Wallet size={14} /> 월 예상 실수령액
                </p>
                <p className="text-4xl font-extrabold tracking-tight tabular-nums">
                  {fmtKRW(result.netSalary)}
                  <span className="text-xl font-medium text-brand-200 ml-1">원</span>
                </p>
                <p className="text-brand-300 text-xs mt-2">연 실수령 ≈ {fmtKRW(result.netSalary * 12)}원</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="relative w-16 h-16">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="white" strokeWidth="3"
                      strokeDasharray={`${netRatio} ${100 - netRatio}`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{netRatio}%</span>
                </div>
                <p className="text-brand-200 text-xs">실수령 비율</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              {[
                { icon: <BadgePercent size={13} />, label: '월 총급여',  value: fmtKRW(result.monthly) },
                { icon: <TrendingDown size={13} />, label: '총 공제액', value: fmtKRW(result.totalDeductions) },
                { icon: <Wallet size={13} />,        label: '실수령액',  value: fmtKRW(result.netSalary) },
              ].map(({ icon, label, value }) => (
                <div key={label} className="bg-white/10 rounded-xl py-2.5 px-2">
                  <p className="text-brand-200 text-xs flex items-center justify-center gap-0.5 mb-1">{icon} {label}</p>
                  <p className="text-white font-bold text-sm tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 공제 상세 */}
          <div className="px-6 pb-6">
            <button type="button" onClick={() => setShowDetail(!showDetail)}
              className="no-print w-full flex items-center justify-between py-4 text-sm font-semibold text-slate-700 hover:text-brand-700 transition-colors">
              <span>공제 항목 상세 내역</span>
              {showDetail ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showDetail && (
              <div className="space-y-3 print-section">
                {/* 비중 차트 */}
                <div className="rounded-xl bg-slate-50 px-4 py-4 mb-1">
                  <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-3">월 급여 구성 비중</p>
                  <BreakdownBar items={barItems} total={result.monthly} />
                </div>

                {/* 테이블 헤더 */}
                <div className="hidden sm:grid grid-cols-12 text-xs text-slate-400 font-medium px-1 pb-1 border-b border-slate-100">
                  <span className="col-span-5">항목</span>
                  <span className="col-span-4 text-right">공제율</span>
                  <span className="col-span-3 text-right">공제액</span>
                </div>

                {deductionRows.map((row) => (
                  <div key={row.label} className="grid grid-cols-12 items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                    <div className="col-span-12 sm:col-span-5 flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${row.color}`} />
                      <span className="font-medium text-slate-700">{row.label}</span>
                    </div>
                    <div className="col-span-6 sm:col-span-4 text-right text-xs text-slate-400">{row.rate}</div>
                    <div className="col-span-6 sm:col-span-3 text-right font-semibold text-slate-800 tabular-nums">
                      {fmtKRW(row.amount)}<span className="text-xs font-normal text-slate-400 ml-0.5">원</span>
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-12 items-center gap-2 rounded-xl border-2 border-brand-100 bg-brand-50 px-4 py-3 text-sm mt-2">
                  <div className="col-span-6 sm:col-span-9 flex items-center gap-2.5">
                    <TrendingDown size={14} className="text-brand-700 shrink-0" />
                    <span className="font-semibold text-brand-800">총 공제액</span>
                  </div>
                  <div className="col-span-6 sm:col-span-3 text-right font-bold text-brand-800 tabular-nums">
                    {fmtKRW(result.totalDeductions)}<span className="text-xs font-normal ml-0.5">원</span>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700 leading-relaxed">
                  <strong>과세 기준 월 급여:</strong> {fmtKRW(result.taxableMonthly)}원
                  (월 총급여 {fmtKRW(result.monthly)}원 − 비과세 {fmtKRW(nonTaxable)}원)
                </div>
              </div>
            )}
          </div>

          <div className="no-print px-6 pb-6 flex justify-end">
            <button type="button" onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-5 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-100 active:bg-brand-200 transition-colors">
              <Printer size={15} /> PDF로 저장
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
