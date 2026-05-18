import { useMemo } from 'react';
import { Calendar, Printer, AlertTriangle, CheckCircle } from 'lucide-react';
import Tooltip from './Tooltip.jsx';
import { fmtKRW } from '../utils/taxCalculations.js';
import { useFormattedNumber } from '../hooks/useFormattedNumber.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

// ── 날짜 유틸 ─────────────────────────────────────────────────
function daysBetween(startStr, endStr) {
  return Math.floor((new Date(endStr) - new Date(startStr)) / 86_400_000);
}

/** 퇴사일 직전 3개월의 실제 달력 일수 */
function threeMonthDays(retirementStr) {
  const end   = new Date(retirementStr);
  const start = new Date(retirementStr);
  start.setMonth(start.getMonth() - 3);
  return Math.floor((end - start) / 86_400_000);
}

/** 근속 기간을 "N년 M개월 D일" 형식으로 반환 */
function formatPeriod(startStr, endStr) {
  const s = new Date(startStr);
  const e = new Date(endStr);
  let y = e.getFullYear() - s.getFullYear();
  let m = e.getMonth()    - s.getMonth();
  let d = e.getDate()     - s.getDate();
  if (d < 0) {
    m -= 1;
    d += new Date(e.getFullYear(), e.getMonth(), 0).getDate();
  }
  if (m < 0) { y -= 1; m += 12; }
  const parts = [];
  if (y > 0) parts.push(`${y}년`);
  if (m > 0) parts.push(`${m}개월`);
  if (d > 0) parts.push(`${d}일`);
  return parts.join(' ') || '0일';
}

// ── 퇴직금 계산 로직 ──────────────────────────────────────────
function calcSeverance(startDate, endDate, salary3m, annualBonus, leaveAllowance) {
  if (!startDate || !endDate || endDate <= startDate) return null;

  const totalDays  = daysBetween(startDate, endDate);
  const period3m   = threeMonthDays(endDate);

  // 평균임금 = (3개월 급여 + 연간상여/4 + 연차수당/4) / 직전3개월 일수
  const bonusPart  = annualBonus    / 4;
  const leavePart  = leaveAllowance / 4;
  const total3m    = salary3m + bonusPart + leavePart;
  const avgDaily   = total3m / period3m;

  // 퇴직금 = 평균임금 × 30일 × 총 재직일수 / 365
  const severance  = Math.floor(avgDaily * 30 * totalDays / 365);

  return {
    totalDays,
    period3m,
    bonusPart,
    leavePart,
    total3m,
    avgDaily,
    severance,
    isEligible:   totalDays >= 365,
    periodLabel:  formatPeriod(startDate, endDate),
  };
}

// ── 서브 컴포넌트 ──────────────────────────────────────────────
function InputRow({ label, tooltip, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
      <label className="flex items-center gap-1 text-sm font-medium text-slate-600 sm:w-40 shrink-0">
        {label}
        {tooltip && <Tooltip content={tooltip} />}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function StepRow({ label, value, sub, bold }) {
  return (
    <div className={`flex items-baseline justify-between gap-2 text-sm ${bold ? 'font-bold text-brand-800' : ''}`}>
      <span className={bold ? '' : 'text-slate-600'}>{label}</span>
      <span className={`text-right shrink-0 ${bold ? 'text-base' : 'font-semibold text-slate-800'}`}>
        {value}
        {sub && <span className="text-xs font-normal text-slate-400 ml-1">{sub}</span>}
      </span>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────
export default function SeveranceCalc() {
  const [startDate, setStartDate] = useLocalStorage('sev_startDate', '2023-05-17');
  const [endDate,   setEndDate]   = useLocalStorage('sev_endDate',   '2026-05-17');

  const [salary3m, salary3mDisplay, handleSalary3m] = useFormattedNumber(15_000_000, 'sev_salary3m');
  const [bonus,    bonusDisplay,    handleBonus]     = useFormattedNumber(4_000_000,  'sev_bonus');
  const [leave,    leaveDisplay,    handleLeave]     = useFormattedNumber(1_000_000,  'sev_leave');

  const result    = useMemo(() => calcSeverance(startDate, endDate, salary3m, bonus, leave), [startDate, endDate, salary3m, bonus, leave]);
  const dateError = startDate && endDate && endDate <= startDate;

  const dateInputClass = (hasError) =>
    `w-full rounded-xl border bg-slate-50 px-4 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition ${
      hasError ? 'border-red-300 bg-red-50' : 'border-slate-200'
    }`;

  return (
    <div className="space-y-5">
      {/* 입력 카드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-800 to-brand-600 px-6 py-4">
          <h2 className="text-white font-semibold text-base">재직 및 급여 정보 입력</h2>
          <p className="text-brand-100 text-xs mt-0.5">근로기준법 제34조 기준 퇴직금 산정</p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* 날짜 2열 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                <Calendar size={14} className="text-slate-400" />
                입사일
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={dateInputClass(false)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                <Calendar size={14} className="text-slate-400" />
                퇴사일 (예정일)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={dateInputClass(dateError)}
              />
              {dateError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  퇴사일은 입사일 이후여야 합니다.
                </p>
              )}
            </div>
          </div>

          {/* 직전 3개월 총급여 */}
          <InputRow
            label="직전 3개월 총급여"
            tooltip="퇴직 직전 3개월간 지급받은 기본급·수당 합산 금액입니다. 비과세 포함 총 수령액을 입력하세요."
          >
            <div className="relative">
              <input
                type="text" inputMode="numeric"
                value={salary3mDisplay} onChange={handleSalary3m}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-right text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">원</span>
            </div>
          </InputRow>

          {/* 연간 상여금 */}
          <InputRow
            label="연간 상여금 총액"
            tooltip="퇴직 전 1년간 수령한 상여금·성과급 합계입니다. 평균임금 산정 시 1/4(3개월분)만 반영됩니다."
          >
            <div className="relative">
              <input
                type="text" inputMode="numeric"
                value={bonusDisplay} onChange={handleBonus}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-right text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">원</span>
            </div>
          </InputRow>

          {/* 연차수당 */}
          <InputRow
            label="연차수당"
            tooltip="퇴직 전 1년간 미사용 연차에 대한 수당 합계입니다. 평균임금 산정 시 1/4(3개월분)만 반영됩니다."
          >
            <div className="relative">
              <input
                type="text" inputMode="numeric"
                value={leaveDisplay} onChange={handleLeave}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-right text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">원</span>
            </div>
          </InputRow>
        </div>
      </div>

      {/* 결과 카드 */}
      {result && (
        <div key={result.severance} className="result-animate bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print-section">

          {/* 상단 배너: 자격 + 퇴직금 강조 */}
          <div className={`px-6 py-5 text-white ${
            result.isEligible
              ? 'bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600'
              : 'bg-gradient-to-br from-slate-600 to-slate-500'
          }`}>
            <p className={`text-sm font-medium mb-2 flex items-center gap-1.5 ${result.isEligible ? 'text-brand-200' : 'text-slate-300'}`}>
              {result.isEligible
                ? <><CheckCircle size={14} /> 퇴직금 지급 요건 충족 (1년 이상 근무)</>
                : <><AlertTriangle size={14} /> 1년 미만 근무 — 법정 퇴직금 미발생</>}
            </p>

            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                {result.isEligible && (
                  <>
                    <p className="text-brand-200 text-xs mb-1">예상 세전 퇴직금</p>
                    <p className="text-4xl font-extrabold tracking-tight">
                      {fmtKRW(result.severance)}
                      <span className="text-xl font-medium text-brand-200 ml-1">원</span>
                    </p>
                  </>
                )}
                {!result.isEligible && (
                  <p className="text-slate-200 text-sm mt-1">
                    계속 근로기간 1년 이상 · 주 15시간 이상 조건을 충족해야 퇴직금이 발생합니다.
                  </p>
                )}
              </div>

              <div className={`rounded-xl px-4 py-3 text-center min-w-[112px] ${result.isEligible ? 'bg-white/10' : 'bg-white/10'}`}>
                <p className="text-brand-200 text-xs mb-1">총 재직일수</p>
                <p className="text-white font-extrabold text-2xl">{result.totalDays.toLocaleString()}</p>
                <p className="text-brand-300 text-xs mt-0.5">{result.periodLabel}</p>
              </div>
            </div>
          </div>

          {/* 계산 세부 내역 */}
          <div className="px-6 pb-6">
            <p className="py-4 text-sm font-semibold text-slate-700">계산 세부 내역</p>

            <div className="space-y-3">
              {/* STEP 1 — 평균임금 산정 */}
              <div className="rounded-xl bg-slate-50 px-4 py-4 space-y-2.5">
                <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-3">
                  Step 1 — 평균임금 산정
                </p>
                <StepRow label="직전 3개월 총급여"      value={fmtKRW(salary3m)}          sub="원" />
                <StepRow label={`연간 상여금 × 1/4`}    value={`+ ${fmtKRW(result.bonusPart)}`} sub="원" />
                <StepRow label={`연차수당 × 1/4`}        value={`+ ${fmtKRW(result.leavePart)}`} sub="원" />
                <div className="border-t border-slate-200 pt-2.5">
                  <StepRow
                    label={`합산 ÷ ${result.period3m}일 (직전 3개월 일수)`}
                    value={`${fmtKRW(result.avgDaily)}`}
                    sub="원/일"
                    bold
                  />
                </div>
              </div>

              {/* STEP 2 — 퇴직금 계산 */}
              <div className="rounded-xl bg-slate-50 px-4 py-4 space-y-2.5">
                <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-3">
                  Step 2 — 퇴직금 계산
                </p>
                <div className="rounded-lg bg-white border border-slate-200 px-3 py-2.5 text-xs text-slate-500 font-mono text-center leading-relaxed">
                  평균임금 {fmtKRW(result.avgDaily)}원 × 30일 × {result.totalDays.toLocaleString()}일 ÷ 365
                </div>
                {result.isEligible && (
                  <div className="border-t border-slate-200 pt-2.5">
                    <StepRow
                      label="예상 세전 퇴직금"
                      value={fmtKRW(result.severance)}
                      sub="원"
                      bold
                    />
                  </div>
                )}
              </div>

              {/* 안내문 */}
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700 leading-relaxed">
                세전 금액이며, 퇴직소득세(근속연수 및 퇴직금 규모에 따라 다름) 원천징수 후 실제 수령액은 다를 수 있습니다.
              </div>
            </div>
          </div>

          <div className="no-print px-6 pb-6 flex justify-end">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-5 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-100 active:bg-brand-200 transition-colors"
            >
              <Printer size={15} />
              PDF로 저장
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
