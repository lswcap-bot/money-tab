import { useMemo } from 'react';
import { Building2, Briefcase, Users, Printer, TrendingDown } from 'lucide-react';
import Tooltip from './Tooltip.jsx';
import BreakdownBar from './BreakdownBar.jsx';
import { fmtKRW } from '../utils/taxCalculations.js';
import { useFormattedNumber } from '../hooks/useFormattedNumber.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

// ── 2026 4대보험 요율 ──────────────────────────────────────────
const R = {
  np: { employee: 0.045, employer: 0.045, lower: 390_000, upper: 6_170_000 },
  hi: { employee: 0.03545, employer: 0.03545, total: 0.0709, ltcRate: 0.1295 },
  ei: {
    employee: 0.009,
    employer: { small: 0.0115, large: 0.0135 },
  },
};

function calcInsurance(wage, isSmall) {
  const npBase = Math.min(Math.max(wage, R.np.lower), R.np.upper);
  const npEmp  = Math.floor(npBase * R.np.employee);
  const npEr   = Math.floor(npBase * R.np.employer);

  const hiEmp  = Math.floor(wage * R.hi.employee);
  const hiEr   = Math.floor(wage * R.hi.employer);

  const ltcFull = wage * R.hi.total * R.hi.ltcRate;
  const ltcEmp  = Math.floor(ltcFull / 2);
  const ltcEr   = Math.ceil(ltcFull / 2);

  const eiEmp  = Math.floor(wage * R.ei.employee);
  const eiEr   = Math.floor(wage * (isSmall ? R.ei.employer.small : R.ei.employer.large));

  return {
    rows: [
      { label: '국민연금',    color: 'bg-blue-500',    empRate: '4.5%',    erRate: '4.5%',    employee: npEmp,  employer: npEr,
        tooltip: `보수월액 기준 각 4.5% 부담. 상한 ${fmtKRW(R.np.upper)}원 · 하한 ${fmtKRW(R.np.lower)}원 적용.` },
      { label: '건강보험',    color: 'bg-emerald-500', empRate: '3.545%',  erRate: '3.545%',  employee: hiEmp,  employer: hiEr,
        tooltip: '전체 보험료율 7.09%를 근로자·사업주가 3.545%씩 반반 부담합니다.' },
      { label: '장기요양보험', color: 'bg-teal-400',   empRate: '건보료×6.475%', erRate: '건보료×6.475%', employee: ltcEmp, employer: ltcEr,
        tooltip: '건강보험료(전체 기준) × 12.95%를 산정한 뒤 근로자·사업주가 절반씩 부담합니다.' },
      { label: '고용보험',    color: 'bg-violet-500',  empRate: '0.9%',    erRate: isSmall ? '1.15%' : '1.35%', employee: eiEmp, employer: eiEr,
        tooltip: isSmall ? '10인 미만: 근로자 0.9% / 사업주 1.15%' : '10인 이상: 근로자 0.9% / 사업주 1.35%' },
    ],
    totalEmployee: npEmp + hiEmp + ltcEmp + eiEmp,
    totalEmployer: npEr  + hiEr  + ltcEr  + eiEr,
    totalBoth:    (npEmp + hiEmp + ltcEmp + eiEmp) + (npEr + hiEr + ltcEr + eiEr),
    npBase,
    npClamped: npBase !== wage,
  };
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

function SummaryBox({ icon, label, value }) {
  return (
    <div className="bg-white/10 rounded-xl py-3 px-2 text-center">
      <p className="text-brand-200 text-xs flex items-center justify-center gap-1 mb-1.5">{icon} {label}</p>
      <p className="text-white font-bold text-sm sm:text-base tabular-nums">{fmtKRW(value)}</p>
      <p className="text-brand-300 text-xs mt-0.5">원/월</p>
    </div>
  );
}

export default function FourInsuranceCalc() {
  const [wage, wageDisplay, handleWageChange] = useFormattedNumber(4_333_333, 'ins_wage');
  const [isSmall, setIsSmall] = useLocalStorage('ins_isSmall', true);

  const result = useMemo(() => calcInsurance(wage, isSmall), [wage, isSmall]);

  // Breakdown bars
  const empBarItems = useMemo(() => result.rows.map(r => ({ label: r.label, value: r.employee, color: r.color })), [result]);
  const erBarItems  = useMemo(() => result.rows.map(r => ({ label: r.label, value: r.employer, color: r.color })), [result]);

  return (
    <div className="space-y-5">
      {/* 입력 카드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-800 to-brand-600 px-6 py-4">
          <h2 className="text-white font-semibold text-base">급여 및 사업장 정보 입력</h2>
          <p className="text-brand-100 text-xs mt-0.5">2026년 기준 4대보험 요율 자동 적용</p>
        </div>

        <div className="px-6 py-5 space-y-5">
          <InputRow label="월 급여액" tooltip="비과세를 제외한 월 보수월액을 입력하세요. 4대보험 모든 항목의 산정 기준이 됩니다.">
            <div className="relative">
              <input type="text" inputMode="numeric" value={wageDisplay} onChange={handleWageChange}
                placeholder="월 급여액 입력"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-right text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition tabular-nums" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">원</span>
            </div>
          </InputRow>

          <InputRow label="사업장 규모" tooltip="고용보험 사업주 부담률 결정에 사용됩니다. 10인 미만 1.15%, 10인 이상 1.35%">
            <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-sm font-medium">
              {[{ label: '10인 미만', val: true }, { label: '10인 이상', val: false }].map(({ label, val }) => (
                <button key={label} type="button" onClick={() => setIsSmall(val)}
                  className={`px-5 py-2 transition-colors flex items-center gap-1.5 ${
                    isSmall === val ? 'bg-brand-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                  }`}>
                  <Building2 size={13} /> {label}
                </button>
              ))}
            </div>
          </InputRow>
        </div>
      </div>

      {/* 결과 카드 */}
      {wage > 0 && (
        <div key={result.totalEmployee} className="result-animate bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print-section">

          {/* 합계 배너 */}
          <div className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-6 py-5">
            <p className="text-brand-200 text-sm font-medium mb-3 flex items-center gap-1.5">
              <TrendingDown size={14} /> 4대보험 월 부담액 요약
            </p>
            <div className="grid grid-cols-3 gap-3">
              <SummaryBox icon={<Users size={13} />}     label="근로자 부담" value={result.totalEmployee} />
              <SummaryBox icon={<Briefcase size={13} />} label="사업주 부담" value={result.totalEmployer} />
              <SummaryBox icon={<Building2 size={13} />} label="합산 총액"   value={result.totalBoth} />
            </div>
          </div>

          {/* 항목별 비교표 */}
          <div className="px-6 pb-6">
            <p className="py-4 text-sm font-semibold text-slate-700">항목별 부담 내역</p>

            {/* 비중 차트 */}
            <div className="rounded-xl bg-slate-50 px-4 py-4 mb-4 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">근로자 부담 비중</p>
                <BreakdownBar items={empBarItems} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-2">사업주 부담 비중</p>
                <BreakdownBar items={erBarItems} />
              </div>
            </div>

            {/* 테이블 헤더 */}
            <div className="grid grid-cols-12 text-xs text-slate-400 font-medium px-3 pb-2 border-b border-slate-100">
              <span className="col-span-5">항목</span>
              <span className="col-span-3 text-center hidden sm:block">요율 (근/사)</span>
              <span className="col-span-2 text-right">근로자</span>
              <span className="col-span-2 text-right">사업주</span>
            </div>

            <div className="space-y-2 mt-2">
              {result.rows.map((row) => (
                <div key={row.label} className="grid grid-cols-12 items-center gap-1 rounded-xl bg-slate-50 px-3 py-3 text-sm">
                  <div className="col-span-5 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${row.color}`} />
                    <span className="font-medium text-slate-700 text-xs sm:text-sm leading-tight">{row.label}</span>
                    <Tooltip content={row.tooltip} />
                  </div>
                  <div className="hidden sm:block col-span-3 text-center text-xs text-slate-400">{row.empRate} / {row.erRate}</div>
                  <div className="col-span-2 text-right font-semibold text-slate-800 text-xs sm:text-sm tabular-nums">
                    {fmtKRW(row.employee)}<span className="text-[10px] font-normal text-slate-400 ml-0.5">원</span>
                  </div>
                  <div className="col-span-2 text-right font-semibold text-slate-800 text-xs sm:text-sm tabular-nums">
                    {fmtKRW(row.employer)}<span className="text-[10px] font-normal text-slate-400 ml-0.5">원</span>
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-12 items-center gap-1 rounded-xl border-2 border-brand-100 bg-brand-50 px-3 py-3">
                <div className="col-span-5 flex items-center gap-2">
                  <TrendingDown size={14} className="text-brand-700" />
                  <span className="font-bold text-brand-800 text-sm">합계</span>
                </div>
                <div className="hidden sm:block col-span-3" />
                <div className="col-span-2 text-right font-bold text-brand-800 text-sm tabular-nums">
                  {fmtKRW(result.totalEmployee)}<span className="text-xs font-normal ml-0.5">원</span>
                </div>
                <div className="col-span-2 text-right font-bold text-brand-800 text-sm tabular-nums">
                  {fmtKRW(result.totalEmployer)}<span className="text-xs font-normal ml-0.5">원</span>
                </div>
              </div>
            </div>

            {result.npClamped && (
              <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5 text-xs text-amber-700">
                <strong>국민연금 기준 조정:</strong> 입력 급여({fmtKRW(wage)}원)가 상·하한 범위를 벗어나 {fmtKRW(result.npBase)}원을 기준으로 산정했습니다.
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
