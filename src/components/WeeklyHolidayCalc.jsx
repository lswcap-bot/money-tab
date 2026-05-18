import { useMemo } from 'react';
import { AlertTriangle, CheckCircle, Printer, Info } from 'lucide-react';
import Tooltip from './Tooltip.jsx';
import { fmtKRW } from '../utils/taxCalculations.js';
import { useFormattedNumber } from '../hooks/useFormattedNumber.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

// ── 상수 ─────────────────────────────────────────────────────
const MIN_ELIGIBLE_HOURS = 15;
const STD_WORK_HOURS     = 40;
const MAX_HOLIDAY_HOURS  = 8;

// ── 계산 로직 ─────────────────────────────────────────────────
function calcHoliday(hourlyWage, weeklyHours) {
  const eligible = weeklyHours >= MIN_ELIGIBLE_HOURS;

  if (!eligible || hourlyWage <= 0) {
    return { eligible, weeklyHours };
  }

  // 주휴시간 = (소정근로시간 / 40) × 8시간, 최대 8시간
  const rawHolidayHours = (weeklyHours / STD_WORK_HOURS) * MAX_HOLIDAY_HOURS;
  const holidayHours    = Math.min(rawHolidayHours, MAX_HOLIDAY_HOURS);

  const holidayPay    = Math.round(hourlyWage * holidayHours);
  const basePay       = Math.round(hourlyWage * weeklyHours);
  const totalWeekly   = basePay + holidayPay;

  // 월급 환산: 주급 × (365일 / 7일 / 12개월) ≈ × 4.345
  const WEEKS_PER_MONTH = 365 / 7 / 12;
  const monthlyEst      = Math.round(totalWeekly * WEEKS_PER_MONTH);

  return {
    eligible,
    weeklyHours,
    holidayHours: Math.round(holidayHours * 10) / 10,
    holidayPay,
    basePay,
    totalWeekly,
    monthlyEst,
    isCapped: weeklyHours >= STD_WORK_HOURS,
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

// ── 메인 컴포넌트 ──────────────────────────────────────────────
export default function WeeklyHolidayCalc() {
  const [hourlyWage, wageDisplay, handleWageChange] = useFormattedNumber(10_320, 'weekly_wage');
  const [hours, setHours] = useLocalStorage('weekly_hours', 40);

  const r = useMemo(() => calcHoliday(hourlyWage, hours), [hourlyWage, hours]);

  const sliderClass = `w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-200
    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
    [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
    [&::-webkit-slider-thumb]:bg-brand-700 [&::-webkit-slider-thumb]:cursor-pointer`;

  const isBelow15 = hours < MIN_ELIGIBLE_HOURS && hours > 0;

  return (
    <div className="space-y-5">
      {/* 주휴수당 안내 배지 */}
      <div className="flex items-center gap-4 bg-brand-50 border border-brand-100 rounded-2xl px-5 py-4">
        <div className="w-10 h-10 rounded-xl bg-brand-800 flex items-center justify-center shrink-0 shadow-md">
          <Info size={18} className="text-white" />
        </div>
        <div>
          <p className="text-xs text-brand-600 font-medium">주휴수당 발생 요건</p>
          <p className="text-brand-800 font-bold text-sm mt-0.5">
            1주 소정근로시간 <span className="text-brand-700 text-base">15시간 이상</span> 개근 시 발생
          </p>
        </div>
        <div className="ml-auto text-right shrink-0">
          <p className="text-xs text-brand-500">법적 근거</p>
          <p className="text-brand-700 text-xs font-medium">근로기준법 제55조</p>
        </div>
      </div>

      {/* 입력 카드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-800 to-brand-600 px-6 py-4">
          <h2 className="text-white font-semibold text-base">근무 조건 입력</h2>
          <p className="text-brand-100 text-xs mt-0.5">소정근로시간 기준으로 주휴수당을 계산합니다</p>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* 시급 */}
          <InputRow
            label="시급"
            tooltip="통상시급을 입력하세요. 주휴수당은 통상임금(시급)을 기준으로 산정합니다."
          >
            <div className="relative">
              <input
                type="text" inputMode="numeric"
                value={wageDisplay} onChange={handleWageChange}
                placeholder="시급 입력"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-right text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">원</span>
            </div>
          </InputRow>

          {/* 주당 소정근로시간 */}
          <InputRow
            label="주당 소정근로시간"
            tooltip="1주 동안 사용자와 근로자가 합의한 근로시간입니다. 주 15시간 이상이어야 주휴수당이 발생합니다. 법정 상한은 주 40시간입니다."
          >
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input
                  type="range" min="1" max="52" step="0.5"
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className={sliderClass}
                  style={{ accentColor: isBelow15 ? '#ef4444' : '#1e40af' }}
                />
                <span className={`w-16 text-center font-bold text-sm border rounded-lg py-1.5 shrink-0 transition-colors ${
                  isBelow15
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                  {hours}시간
                </span>
              </div>

              {/* 15시간 미만 경고 */}
              {isBelow15 && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                  <AlertTriangle size={14} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-600 font-medium">
                    주 15시간 미만 근로자는 주휴수당 대상이 아닙니다.
                  </p>
                </div>
              )}
              {!isBelow15 && hours > 0 && (
                <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle size={12} /> 주휴수당 발생 요건(주 {MIN_ELIGIBLE_HOURS}시간 이상)을 충족합니다.
                </p>
              )}

              {/* 시간 구간 표시 */}
              <div className="flex justify-between text-[10px] text-slate-300 px-0.5">
                <span>1h</span>
                <span className="text-red-300 font-medium">15h</span>
                <span className="text-brand-300 font-medium">40h</span>
                <span>52h</span>
              </div>
            </div>
          </InputRow>
        </div>
      </div>

      {/* 결과 카드 */}
      {hourlyWage > 0 && hours > 0 && (
        <div key={`${hourlyWage}-${hours}`} className="result-animate bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print-section">

          {/* 주 15시간 미만 불가 배너 */}
          {!r.eligible && (
            <div className="bg-slate-600 px-6 py-8 flex flex-col items-center gap-3 text-center">
              <AlertTriangle size={32} className="text-slate-300" />
              <div>
                <p className="text-white font-semibold text-base">주휴수당 발생 대상이 아닙니다</p>
                <p className="text-slate-300 text-sm mt-1">
                  주 소정근로시간이 {hours}시간으로 15시간 미만입니다.<br />
                  근로기준법 제55조에 따라 주 15시간 이상 근로자에게만 주휴수당이 적용됩니다.
                </p>
              </div>
            </div>
          )}

          {/* 계산 결과 */}
          {r.eligible && (
            <>
              {/* 결과 배너 */}
              <div className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-6 py-5 text-white">
                <p className="text-brand-200 text-sm font-medium mb-3">주급 요약 (주휴수당 포함)</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: '기본 주급',   value: r.basePay },
                    { label: '주휴수당',    value: r.holidayPay },
                    { label: '합계 주급',   value: r.totalWeekly },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/10 rounded-xl py-3 px-2">
                      <p className="text-brand-200 text-xs mb-1.5">{label}</p>
                      <p className="text-white font-bold text-sm sm:text-base">{fmtKRW(value)}</p>
                      <p className="text-brand-300 text-xs mt-0.5">원</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 계산 과정 */}
              <div className="px-6 pb-6">
                <p className="py-4 text-sm font-semibold text-slate-700">계산 상세 내역</p>

                {/* 공식 박스 */}
                <div className="rounded-xl bg-slate-50 px-4 py-4 space-y-3 mb-3">
                  <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">
                    주휴수당 계산 공식
                  </p>
                  <div className="rounded-lg bg-white border border-slate-200 px-3 py-2.5 text-xs text-slate-500 font-mono text-center">
                    (소정근로시간 {hours}h ÷ 40h) × 8h × 시급 {fmtKRW(hourlyWage)}원
                    {r.isCapped && <span className="text-amber-600"> → 최대 8h 적용</span>}
                  </div>

                  <div className="space-y-2.5">
                    {[
                      {
                        label: '인정 주휴시간',
                        value: `${r.holidayHours}시간`,
                        sub: r.isCapped ? '(주 40h 이상 → 최대 8시간 인정)' : `(${hours}h ÷ 40h × 8h)`,
                      },
                      { label: '주휴수당',     value: `${fmtKRW(r.holidayPay)}원`,  sub: `${fmtKRW(hourlyWage)}원 × ${r.holidayHours}시간` },
                      { label: '기본 주급',    value: `${fmtKRW(r.basePay)}원`,     sub: `${fmtKRW(hourlyWage)}원 × ${hours}시간` },
                    ].map(({ label, value, sub }) => (
                      <div key={label} className="flex items-baseline justify-between gap-2 text-sm">
                        <div>
                          <span className="text-slate-600">{label}</span>
                          <span className="text-slate-400 text-xs ml-1.5">{sub}</span>
                        </div>
                        <span className="font-semibold text-slate-800 shrink-0">{value}</span>
                      </div>
                    ))}
                    <div className="border-t border-slate-200 pt-2.5 flex justify-between items-baseline">
                      <span className="font-bold text-brand-800">합계 주급</span>
                      <span className="text-base font-bold text-brand-800">{fmtKRW(r.totalWeekly)}원</span>
                    </div>
                  </div>
                </div>

                {/* 월급 환산 */}
                <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-brand-600 font-medium">월급 환산 예상액</p>
                    <p className="text-[10px] text-brand-400 mt-0.5">주급 × (365일 ÷ 7일 ÷ 12개월)</p>
                  </div>
                  <p className="text-brand-800 font-extrabold text-xl">{fmtKRW(r.monthlyEst)}원</p>
                </div>

                <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5 text-xs text-amber-700">
                  주휴수당은 해당 주 소정근로일을 개근한 경우에 지급됩니다. 결근·지각·조퇴가 있는 경우 사용자 정책에 따라 달라질 수 있습니다.
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
