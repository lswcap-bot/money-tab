import { useMemo } from 'react';
import { Baby, Printer, Info, ChevronDown, ChevronUp } from 'lucide-react';
import Tooltip from './Tooltip.jsx';
import { fmtKRW } from '../utils/taxCalculations.js';
import { useFormattedNumber } from '../hooks/useFormattedNumber.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

// ── 2026 상수 ─────────────────────────────────────────────────
// 육아휴직급여 (고용보험법 제70조)
const PARENTAL = {
  // 1~3개월: 통상임금의 100% (상한 250만, 하한 70만)
  p1: { rate: 1.0,  upper: 2_500_000, lower: 700_000, months: 3, label: '1~3개월 (100%)' },
  // 4~6개월: 통상임금의 100% (상한 200만, 하한 70만)
  p2: { rate: 1.0,  upper: 2_000_000, lower: 700_000, months: 3, label: '4~6개월 (100%)' },
  // 7개월~: 통상임금의 80% (상한 160만, 하한 70만)
  p3: { rate: 0.8,  upper: 1_600_000, lower: 700_000, label: '7개월 이후 (80%)' },
};

// 부모 동시·순차 육아휴직 특례 (6+6 부모육아휴직제) 2024~ 확대
// 첫 달 통상임금 100%, 상한 월 450만원
const SPECIAL_MONTHS = 6;
const SPECIAL_UPPER  = 4_500_000;

// 사후지급금: 각 구간 급여의 25%를 복직 6개월 후 지급
const DEFERRED_RATE  = 0.25;

// 출산전후휴가급여 (고용보험법 제75조)
// 최초 60일: 통상임금 100% (상한 월 200만/60일 기준)
// 후 30일: 고용보험 지급, 상한 동일 적용
const MATERNITY_DAILY_UPPER = Math.round(2_000_000 / 30);  // 일 66,667원

// ── 계산 로직 ─────────────────────────────────────────────────
function clamp(val, lower, upper) {
  return Math.max(lower, Math.min(upper, val));
}

function calcMaternity(monthlyWage) {
  const dailyWage    = Math.round(monthlyWage / 30);
  const dailyCapped  = Math.min(dailyWage, MATERNITY_DAILY_UPPER);
  const pay90        = dailyCapped * 90;  // 90일
  return { dailyWage, dailyCapped, pay90, days: 90 };
}

function calcParental(monthlyWage, leaveDurationMonths, useSpecial) {
  const sections = [];

  if (useSpecial) {
    // 6+6 특례: 첫 6개월 상한 450만 적용 (부모 모두 첫 6개월 사용 시)
    const specialMonths = Math.min(leaveDurationMonths, SPECIAL_MONTHS);
    const specialGross  = clamp(monthlyWage, PARENTAL.p1.lower, SPECIAL_UPPER);
    const specialImm    = Math.round(specialGross * (1 - DEFERRED_RATE));
    const specialDefer  = Math.round(specialGross * DEFERRED_RATE);

    sections.push({
      label:    `1~${specialMonths}개월 (6+6 특례, 100%, 상한 ${fmtKRW(SPECIAL_UPPER)}원)`,
      months:   specialMonths,
      gross:    specialGross,
      immediate: specialImm,
      deferred:  specialDefer,
      total:     specialGross,
    });

    const remaining = leaveDurationMonths - specialMonths;
    if (remaining > 0) {
      const p3Gross = clamp(monthlyWage * PARENTAL.p3.rate, PARENTAL.p3.lower, PARENTAL.p3.upper);
      sections.push({
        label:    `${specialMonths + 1}~${leaveDurationMonths}개월 (80%, 상한 160만원)`,
        months:   remaining,
        gross:    p3Gross,
        immediate: Math.round(p3Gross * (1 - DEFERRED_RATE)),
        deferred:  Math.round(p3Gross * DEFERRED_RATE),
        total:     p3Gross,
      });
    }
  } else {
    // 일반 육아휴직 3단계
    const tiers = [
      { ...PARENTAL.p1, from: 1,  to: 3 },
      { ...PARENTAL.p2, from: 4,  to: 6 },
      { ...PARENTAL.p3, from: 7,  to: leaveDurationMonths, months: Math.max(0, leaveDurationMonths - 6) },
    ];

    for (const tier of tiers) {
      const tierMonths = Math.min(
        Math.max(0, leaveDurationMonths - (tier.from - 1)),
        tier.to - tier.from + 1,
      );
      if (tierMonths <= 0) continue;

      const gross = clamp(monthlyWage * tier.rate, tier.lower, tier.upper);
      sections.push({
        label:     tier.label ?? `${tier.from}~${tier.to}개월`,
        months:    tierMonths,
        gross,
        immediate: Math.round(gross * (1 - DEFERRED_RATE)),
        deferred:  Math.round(gross * DEFERRED_RATE),
        total:     gross,
      });
    }
  }

  const totalGross     = sections.reduce((s, sec) => s + sec.gross     * sec.months, 0);
  const totalImmediate = sections.reduce((s, sec) => s + sec.immediate * sec.months, 0);
  const totalDeferred  = sections.reduce((s, sec) => s + sec.deferred  * sec.months, 0);

  return { sections, totalGross, totalImmediate, totalDeferred };
}

// ── 서브 컴포넌트 ──────────────────────────────────────────────
function ToggleBtn({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
        active
          ? 'bg-brand-800 border-brand-800 text-white shadow-sm'
          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}

function Stepper({ value, min, max, onChange, unit }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition"
      >
        <ChevronDown size={16} />
      </button>
      <span className="w-16 text-center font-bold text-slate-800 text-sm bg-slate-50 border border-slate-200 rounded-xl py-1.5">
        {value}{unit}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition"
      >
        <ChevronUp size={16} />
      </button>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────
export default function ParentalLeaveCalc() {
  const [mode,          setMode]          = useLocalStorage('par_mode',     'parental');
  const [monthlyWage,   wageDisplay,      handleWageChange] = useFormattedNumber(4_000_000, 'par_wage');
  const [leaveDuration, setLeaveDuration] = useLocalStorage('par_duration', 12);
  const [useSpecial,    setUseSpecial]    = useLocalStorage('par_special',  false);

  const parentalResult = useMemo(
    () => calcParental(monthlyWage, leaveDuration, useSpecial),
    [monthlyWage, leaveDuration, useSpecial],
  );

  const maternityResult = useMemo(
    () => calcMaternity(monthlyWage),
    [monthlyWage],
  );

  return (
    <div className="space-y-5">
      {/* 안내 배지 */}
      <div className="flex items-start gap-4 bg-brand-50 border border-brand-100 rounded-2xl px-5 py-4">
        <div className="w-10 h-10 rounded-xl bg-brand-800 flex items-center justify-center shrink-0 shadow-md">
          <Baby size={18} className="text-white" />
        </div>
        <div>
          <p className="text-xs text-brand-600 font-medium">육아휴직급여 · 출산전후휴가급여</p>
          <p className="text-brand-800 font-bold text-sm mt-0.5">
            2026년 기준 · 고용보험법 제70조·제75조 적용
          </p>
          <p className="text-[11px] text-brand-500 mt-1">급여의 25%는 복직 후 6개월 이상 근무 시 사후지급</p>
        </div>
      </div>

      {/* 모드 선택 */}
      <div className="flex gap-2">
        <ToggleBtn label="육아휴직급여"    active={mode === 'parental'}  onClick={() => setMode('parental')} />
        <ToggleBtn label="출산전후휴가급여" active={mode === 'maternity'} onClick={() => setMode('maternity')} />
      </div>

      {/* 입력 카드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-800 to-brand-600 px-6 py-4">
          <h2 className="text-white font-semibold text-base">
            {mode === 'parental' ? '육아휴직' : '출산전후휴가'} 정보 입력
          </h2>
          <p className="text-brand-100 text-xs mt-0.5">
            {mode === 'parental'
              ? '통상임금과 육아휴직 기간을 입력하세요'
              : '출산전후휴가는 총 90일(다태아 120일)이 적용됩니다'}
          </p>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* 통상 월급 */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
            <label className="flex items-center gap-1 text-sm font-medium text-slate-600 sm:w-44 shrink-0">
              통상 월급여
              <Tooltip content="육아휴직 개시 직전 3개월 평균 통상임금(월급)입니다. 기본급·고정수당을 포함하고 비정기 수당은 제외합니다." />
            </label>
            <div className="flex-1 relative">
              <input
                type="text" inputMode="numeric"
                value={wageDisplay} onChange={handleWageChange}
                placeholder="월 통상임금 입력"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-right text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">원</span>
            </div>
          </div>

          {/* 육아휴직 전용 옵션 */}
          {mode === 'parental' && (
            <>
              {/* 휴직 기간 */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                <label className="flex items-center gap-1 text-sm font-medium text-slate-600 sm:w-44 shrink-0">
                  육아휴직 기간
                  <Tooltip content="자녀 1명당 최대 12개월(부·모 각각). 2024년부터 부모 모두 사용 시 합산 24개월까지 가능합니다." />
                </label>
                <Stepper
                  value={leaveDuration} min={1} max={12}
                  onChange={setLeaveDuration}
                  unit="개월"
                />
              </div>

              {/* 6+6 특례 */}
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  id="useSpecial"
                  checked={useSpecial}
                  onChange={(e) => setUseSpecial(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-brand-700 cursor-pointer"
                />
                <label htmlFor="useSpecial" className="cursor-pointer">
                  <p className="text-sm font-medium text-slate-700">6+6 부모육아휴직제 적용</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    부모 모두 육아휴직 사용 시 각자 첫 6개월 상한 <span className="font-semibold">월 450만원</span> 적용.
                    한 자녀에 대해 부모가 동시 또는 순차적으로 육아휴직 사용 시 해당
                  </p>
                </label>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 결과 카드 */}
      {monthlyWage > 0 && (
        <div key={`${monthlyWage}-${mode}-${leaveDuration}-${useSpecial}`} className="result-animate bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print-section">

          {mode === 'parental' ? (
            <>
              {/* 육아휴직 결과 배너 */}
              <div className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-6 py-5 text-white">
                <p className="text-brand-200 text-sm font-medium mb-3">
                  육아휴직급여 예상액 ({leaveDuration}개월)
                </p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: '총 급여 합계',    value: parentalResult.totalGross },
                    { label: '즉시 지급 (75%)', value: parentalResult.totalImmediate },
                    { label: '사후지급 (25%)',  value: parentalResult.totalDeferred },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/10 rounded-xl py-3 px-2">
                      <p className="text-brand-200 text-xs mb-1.5">{label}</p>
                      <p className="text-white font-bold text-sm sm:text-base">{fmtKRW(value)}</p>
                      <p className="text-brand-300 text-xs mt-0.5">원</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 구간별 내역 */}
              <div className="px-6 pb-6">
                <p className="py-4 text-sm font-semibold text-slate-700">구간별 급여 내역</p>
                <div className="space-y-3">
                  {parentalResult.sections.map((sec, i) => (
                    <div key={i} className="rounded-xl bg-slate-50 px-4 py-4 space-y-2">
                      <p className="text-xs font-bold text-brand-700">{sec.label}</p>
                      <div className="space-y-1.5">
                        {[
                          { label: '월 급여액',            value: fmtKRW(sec.gross) + '원' },
                          { label: '즉시 지급 (월 75%)',   value: fmtKRW(sec.immediate) + '원' },
                          { label: '사후지급 (월 25%)',    value: fmtKRW(sec.deferred) + '원' },
                          { label: `${sec.months}개월 합계`, value: fmtKRW(sec.gross * sec.months) + '원', bold: true },
                        ].map(({ label, value, bold }) => (
                          <div key={label} className={`flex justify-between gap-2 text-sm ${bold ? 'font-bold text-brand-800 border-t border-slate-200 pt-1.5 mt-1' : ''}`}>
                            <span className={bold ? '' : 'text-slate-600'}>{label}</span>
                            <span className={bold ? '' : 'font-semibold text-slate-800 shrink-0'}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* 사후지급금 안내 */}
                  <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
                    <p className="text-xs font-semibold text-brand-700 mb-1">사후지급금 안내</p>
                    <p className="text-xs text-brand-600 leading-relaxed">
                      총 급여의 25%인 <span className="font-bold">{fmtKRW(parentalResult.totalDeferred)}원</span>은
                      육아휴직 종료 후 해당 사업장에 복직하여 6개월 이상 계속 근무한 경우 일괄 지급됩니다.
                    </p>
                  </div>

                  <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700 leading-relaxed">
                    위 금액은 고용보험에서 지급하는 급여이며, 회사 자체 지원금은 별도입니다. 피보험 단위기간 180일 이상이어야 수급 자격이 발생합니다.
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 출산전후휴가 결과 배너 */}
              <div className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-6 py-5 text-white">
                <p className="text-brand-200 text-sm font-medium mb-3">출산전후휴가급여 예상액 (90일)</p>
                <div className="flex items-end justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-brand-200 text-xs mb-1">총 수령 예상액</p>
                    <p className="text-4xl font-extrabold tracking-tight">
                      {fmtKRW(maternityResult.pay90)}
                      <span className="text-xl font-medium text-brand-200 ml-1">원</span>
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-xl px-4 py-3 text-center">
                    <p className="text-brand-200 text-xs mb-1">1일 급여</p>
                    <p className="text-white font-extrabold text-xl">{fmtKRW(maternityResult.dailyCapped)}원</p>
                    <p className="text-brand-300 text-xs mt-0.5">상한 {fmtKRW(MATERNITY_DAILY_UPPER)}원/일</p>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6">
                <p className="py-4 text-sm font-semibold text-slate-700">계산 내역</p>
                <div className="rounded-xl bg-slate-50 px-4 py-4 space-y-2.5">
                  {[
                    { label: '통상 월급여',       value: fmtKRW(monthlyWage) + '원' },
                    { label: '1일 통상임금',       value: fmtKRW(maternityResult.dailyWage) + '원', sub: '(월급 ÷ 30일)' },
                    { label: '적용 1일 급여 (상한)', value: fmtKRW(maternityResult.dailyCapped) + '원' },
                  ].map(({ label, value, sub }) => (
                    <div key={label} className="flex justify-between gap-2 text-sm">
                      <span className="text-slate-600">{label}{sub && <span className="text-slate-400 text-xs ml-1">{sub}</span>}</span>
                      <span className="font-semibold text-slate-800 shrink-0">{value}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-200 pt-2.5 flex justify-between text-sm font-bold text-brand-800">
                    <span>90일 합계</span>
                    <span className="text-base">{fmtKRW(maternityResult.pay90)}원</span>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700 leading-relaxed">
                  출산전후휴가 90일 중 최초 60일은 사업주 의무 지급, 후 30일은 고용보험 부담입니다 (우선지원대상기업은 90일 전액 고용보험 지급). 다태아의 경우 120일이 적용됩니다.
                </div>
              </div>
            </>
          )}

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
