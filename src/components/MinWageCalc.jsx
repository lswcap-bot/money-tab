import { useState, useMemo } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Printer } from 'lucide-react';
import Tooltip from './Tooltip.jsx';
import { fmtKRW } from '../utils/taxCalculations.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

const LS_PREFIX = 'mt_';

// ── 2026년 법정 최저시급 ───────────────────────────────────────
const MIN_WAGE_2026 = 10_320; // 원/시간 (2026년 법정 최저임금)
const MONTHLY_STD_HOURS = 209; // 주 40h + 주휴 8h 기준 월 환산

// ── 계산 로직 ─────────────────────────────────────────────────
function calcMinWage(hourlyWage, dailyHours, weeklyDays, monthlyOvertime) {
  const weeklyWorkHours = dailyHours * weeklyDays;

  // 주휴수당 시간: 주 15시간 이상 근무 시 (주당 근무시간/40 × 8), 최대 8시간
  const rawHolidayHours    = weeklyWorkHours >= 15 ? (weeklyWorkHours / 40) * 8 : 0;
  const weeklyHolidayHours = Math.min(rawHolidayHours, 8);

  // 월 환산 시간: 법정 기준 209h(주 48h)에 비례 적용
  // 근거: 최저임금법 시행령 — 주 40h + 주휴 8h = 48h → 월 209h
  const weeklyTotal      = weeklyWorkHours + weeklyHolidayHours;
  const monthlyBaseHours = weeklyTotal * (MONTHLY_STD_HOURS / 48);

  // 주급 = 시급 × (주 근무시간 + 주휴시간)
  const weeklyPay  = Math.round(hourlyWage * (weeklyWorkHours + weeklyHolidayHours));

  // 월 기본급 = 시급 × 월 환산 시간
  const monthlyBase = Math.round(hourlyWage * monthlyBaseHours);

  // 연장근무 수당 = 시급 × 1.5 × 월 연장 시간
  const overtimePay = Math.round(hourlyWage * 1.5 * monthlyOvertime);

  return {
    weeklyWorkHours,
    weeklyHolidayHours: Math.round(weeklyHolidayHours * 10) / 10,
    monthlyBaseHours:   Math.round(monthlyBaseHours * 10) / 10,
    weeklyPay,
    monthlyBase,
    overtimePay,
    totalMonthly:       monthlyBase + overtimePay,
    hasHoliday:         weeklyWorkHours >= 15,
    isBelowMin:         hourlyWage > 0 && hourlyWage < MIN_WAGE_2026,
    minWageGap:         Math.max(MIN_WAGE_2026 - hourlyWage, 0),
    monthlyAtMinWage:   Math.round(MIN_WAGE_2026 * monthlyBaseHours),
    isStandard:         dailyHours === 8 && weeklyDays === 5,
  };
}

// ── 서브 컴포넌트 ──────────────────────────────────────────────
function InputRow({ label, tooltip, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
      <label className="flex items-center gap-1 text-sm font-medium text-slate-600 sm:w-44 shrink-0">
        {label}
        {tooltip && <Tooltip content={tooltip} />}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function TimeBox({ value, label, active = true }) {
  return (
    <div className={`rounded-xl text-center py-3 px-2 ${active ? 'bg-brand-50 border border-brand-100' : 'bg-slate-50 border border-slate-100'}`}>
      <p className={`text-xl font-extrabold ${active ? 'text-brand-800' : 'text-slate-400'}`}>{value}</p>
      <p className={`text-xs mt-0.5 ${active ? 'text-brand-500' : 'text-slate-400'}`}>{label}</p>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────
export default function MinWageCalc() {
  const [dailyHours, setDailyHours] = useLocalStorage('min_dailyHours', 8);
  const [weeklyDays, setWeeklyDays] = useLocalStorage('min_weeklyDays', 5);
  const [overtime,   setOvertime]   = useLocalStorage('min_overtime',   0);

  // Wage with localStorage persistence
  const initWage = (() => {
    try {
      const s = localStorage.getItem(LS_PREFIX + 'min_wage');
      return s !== null ? (Number(s) || MIN_WAGE_2026) : MIN_WAGE_2026;
    } catch { return MIN_WAGE_2026; }
  })();
  const [hourlyWage,    setHourlyWage]    = useState(initWage);
  const [hourlyWageStr, setHourlyWageStr] = useState(initWage > 0 ? fmtKRW(initWage) : '');

  function handleWageChange(e) {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const num = Number(raw) || 0;
    setHourlyWage(num);
    try { localStorage.setItem(LS_PREFIX + 'min_wage', String(num)); } catch {}
    setHourlyWageStr(raw === '' ? '' : fmtKRW(num));
  }

  const r = useMemo(
    () => calcMinWage(hourlyWage, dailyHours, weeklyDays, overtime),
    [hourlyWage, dailyHours, weeklyDays, overtime],
  );

  // 슬라이더 스타일 (accent-* 대신 inline style로 Tailwind 제한 우회)
  const sliderClass = `w-full h-2 rounded-full appearance-none cursor-pointer
    bg-slate-200 [&::-webkit-slider-thumb]:appearance-none
    [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-700
    [&::-webkit-slider-thumb]:cursor-pointer`;

  return (
    <div className="space-y-5">
      {/* 2026 최저임금 정보 배지 */}
      <div className="flex items-center gap-4 bg-brand-50 border border-brand-100 rounded-2xl px-5 py-4">
        <div className="w-10 h-10 rounded-xl bg-brand-800 flex items-center justify-center shrink-0 shadow-md">
          <TrendingUp size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-brand-600 font-medium">2026년 법정 최저시급</p>
          <p className="text-brand-800 font-extrabold text-2xl leading-tight">
            {fmtKRW(MIN_WAGE_2026)}<span className="text-sm font-medium ml-1">원/시간</span>
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-brand-500">월 환산 ({MONTHLY_STD_HOURS}h 기준)</p>
          <p className="text-brand-700 font-bold text-sm">{fmtKRW(MIN_WAGE_2026 * MONTHLY_STD_HOURS)}원</p>
        </div>
      </div>

      {/* 입력 카드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-800 to-brand-600 px-6 py-4">
          <h2 className="text-white font-semibold text-base">근무 조건 입력</h2>
          <p className="text-brand-100 text-xs mt-0.5">주휴수당 포함 월 환산 급여를 계산합니다</p>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* 시급 입력 */}
          <InputRow
            label="시급"
            tooltip={`2026년 법정 최저시급은 ${fmtKRW(MIN_WAGE_2026)}원입니다. 이 금액 미만으로 지급하는 것은 최저임금법 위반입니다.`}
          >
            <div className="space-y-1.5">
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={hourlyWageStr}
                  onChange={handleWageChange}
                  placeholder="시급 입력"
                  className={`w-full rounded-xl border bg-slate-50 px-4 py-3 pr-10 text-right text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:border-transparent transition ${
                    r.isBelowMin
                      ? 'border-red-300 focus:ring-red-400'
                      : 'border-slate-200 focus:ring-brand-500'
                  }`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">원</span>
              </div>

              {/* 최저임금 위반 경고 */}
              {r.isBelowMin && (
                <p className="text-xs text-red-600 flex items-center gap-1.5 font-semibold">
                  <AlertTriangle size={12} />
                  최저시급({fmtKRW(MIN_WAGE_2026)}원) 미만 — 시급 차액 {fmtKRW(r.minWageGap)}원
                </p>
              )}
              {!r.isBelowMin && hourlyWage > 0 && (
                <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle size={12} />
                  2026년 법정 최저시급 이상입니다.
                </p>
              )}
            </div>
          </InputRow>

          {/* 일일 근무시간 */}
          <InputRow
            label="일일 근무시간"
            tooltip="1일 소정근로시간입니다. 법정 한도는 1일 8시간, 주 40시간입니다."
          >
            <div className="flex items-center gap-3">
              <input
                type="range" min="1" max="12" step="0.5"
                value={dailyHours}
                onChange={(e) => setDailyHours(Number(e.target.value))}
                className={sliderClass}
              />
              <span className="w-16 text-center font-bold text-slate-800 text-sm bg-slate-50 border border-slate-200 rounded-lg py-1.5 shrink-0">
                {dailyHours}시간
              </span>
            </div>
          </InputRow>

          {/* 주당 근무일수 */}
          <InputRow
            label="주당 근무일수"
            tooltip="주휴수당은 주 15시간 이상 개근 시 발생합니다. 주 5일·40시간이 법정 기준이며, 비례 적용도 가능합니다."
          >
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5, 6].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setWeeklyDays(d)}
                  className={`w-11 h-10 rounded-xl text-sm font-semibold transition-all ${
                    weeklyDays === d
                      ? 'bg-brand-800 text-white shadow-sm'
                      : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-brand-50 hover:border-brand-200'
                  }`}
                >
                  {d}일
                </button>
              ))}
            </div>
          </InputRow>

          {/* 월 연장근무 시간 */}
          <InputRow
            label="월 연장근무"
            tooltip="법정 근로시간(1일 8h, 주 40h) 초과분입니다. 연장근무에는 통상임금의 50%가 가산됩니다. 월 최대 52시간."
          >
            <div className="flex items-center gap-3">
              <input
                type="range" min="0" max="52" step="1"
                value={overtime}
                onChange={(e) => setOvertime(Number(e.target.value))}
                className={sliderClass}
              />
              <span className="w-16 text-center font-bold text-slate-800 text-sm bg-slate-50 border border-slate-200 rounded-lg py-1.5 shrink-0">
                {overtime}시간
              </span>
            </div>
          </InputRow>
        </div>
      </div>

      {/* 결과 카드 */}
      {hourlyWage > 0 && (
        <div key={`${hourlyWage}-${dailyHours}-${weeklyDays}-${overtime}`} className="result-animate bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print-section">

          {/* 최저임금 위반 경고 배너 */}
          {r.isBelowMin && (
            <div className="bg-red-600 px-6 py-3 flex items-center gap-3">
              <AlertTriangle size={16} className="text-white shrink-0" />
              <p className="text-white text-sm font-semibold">
                최저임금법 위반 — 법정 최저시급({fmtKRW(MIN_WAGE_2026)}원)보다 {fmtKRW(r.minWageGap)}원 낮습니다.
              </p>
            </div>
          )}

          {/* 급여 요약 배너 */}
          <div className={`px-6 py-5 text-white ${
            r.isBelowMin
              ? 'bg-gradient-to-br from-red-700 to-red-600'
              : 'bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600'
          }`}>
            <p className={`text-sm font-medium mb-3 ${r.isBelowMin ? 'text-red-200' : 'text-brand-200'}`}>
              월 예상 급여 요약 (주휴수당 포함)
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: '주급',     value: r.weeklyPay },
                { label: '월 기본급', value: r.monthlyBase },
                { label: '총 월급여', value: r.totalMonthly },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/10 rounded-xl py-3 px-2">
                  <p className={`text-xs mb-1.5 ${r.isBelowMin ? 'text-red-200' : 'text-brand-200'}`}>{label}</p>
                  <p className="text-white font-bold text-sm sm:text-base">{fmtKRW(value)}</p>
                  <p className={`text-xs mt-0.5 ${r.isBelowMin ? 'text-red-300' : 'text-brand-300'}`}>원</p>
                </div>
              ))}
            </div>
          </div>

          {/* 근무시간 분석 */}
          <div className="px-6 pb-6">
            <p className="py-4 text-sm font-semibold text-slate-700">근무시간 분석</p>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <TimeBox value={`${r.weeklyWorkHours}h`} label="주 근무시간" />
              <TimeBox
                value={r.hasHoliday ? `${r.weeklyHolidayHours}h` : '미발생'}
                label="주휴수당 시간"
                active={r.hasHoliday}
              />
              <TimeBox
                value={`${r.monthlyBaseHours}h`}
                label={r.isStandard ? '월 환산 (=209h)' : '월 환산 시간'}
              />
            </div>

            {/* 상세 항목 */}
            <div className="space-y-2">
              {[
                {
                  dot: 'bg-blue-500',
                  label: '주당 근무시간',
                  sub: `${dailyHours}시간 × ${weeklyDays}일`,
                  value: `${r.weeklyWorkHours}시간`,
                },
                {
                  dot: r.hasHoliday ? 'bg-emerald-500' : 'bg-slate-300',
                  label: '주휴수당 시간',
                  sub: r.hasHoliday
                    ? `주 근무시간(${r.weeklyWorkHours}h) / 40 × 8h`
                    : '주 15시간 미만 — 주휴수당 미발생',
                  value: r.hasHoliday ? `${r.weeklyHolidayHours}시간` : '0시간',
                },
                {
                  dot: 'bg-violet-500',
                  label: '월 환산 시간 (52주/12)',
                  sub: `(${r.weeklyWorkHours}h + ${r.weeklyHolidayHours}h) × 4.333`,
                  value: `${r.monthlyBaseHours}시간`,
                },
                ...(overtime > 0 ? [{
                  dot: 'bg-orange-400',
                  label: '월 연장근무 수당',
                  sub: `${overtime}시간 × 시급 × 1.5배`,
                  value: `${fmtKRW(r.overtimePay)}원`,
                }] : []),
              ].map(({ dot, label, sub, value }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{label}</p>
                    <p className="text-xs text-slate-400">{sub}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 shrink-0">{value}</p>
                </div>
              ))}
            </div>

            {/* 최저임금 준수 시 비교 */}
            {r.isBelowMin && (
              <div className="mt-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-xs font-bold text-red-700 mb-1.5">최저임금 준수 시 예상 월급여</p>
                <p className="text-red-800 font-extrabold text-xl">{fmtKRW(r.monthlyAtMinWage)}원</p>
                <p className="text-xs text-red-400 mt-0.5">
                  시급 {fmtKRW(MIN_WAGE_2026)}원 × {r.monthlyBaseHours}시간 기준
                </p>
              </div>
            )}
          </div>

          {/* PDF 버튼 */}
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
