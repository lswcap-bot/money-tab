import { useMemo } from 'react';
import { Calendar, Gift, AlertTriangle, ChevronRight, Printer } from 'lucide-react';
import Tooltip from './Tooltip.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

const TODAY = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

// ── 날짜 계산 유틸 ─────────────────────────────────────────────
function getPeriod(startStr, refStr) {
  const s = new Date(startStr);
  const e = new Date(refStr);
  let y = e.getFullYear() - s.getFullYear();
  let m = e.getMonth()    - s.getMonth();
  let d = e.getDate()     - s.getDate();
  if (d < 0) { m--; d += new Date(e.getFullYear(), e.getMonth(), 0).getDate(); }
  if (m < 0) { y--; m += 12; }
  return { years: y, months: m, days: d };
}

function formatPeriod({ years, months, days }) {
  const p = [];
  if (years  > 0) p.push(`${years}년`);
  if (months > 0) p.push(`${months}개월`);
  if (days   > 0) p.push(`${days}일`);
  return p.join(' ') || '0일';
}

/**
 * 근로기준법 제60조 기준 연차 발생일수
 * - 1년 미만: 1개월 개근 시 1일 (최대 11일)
 * - 1년 이상: 15일, 2년마다 1일 가산 (최대 25일)
 */
function getEntitlement(completedYears, completedMonths) {
  if (completedYears === 0) return Math.min(completedMonths, 11);
  return Math.min(15 + Math.floor((completedYears - 1) / 2), 25);
}

// ── 핵심 계산 ─────────────────────────────────────────────────
function calcLeave(startDate, refDate, usedDays) {
  if (!startDate || !refDate) return null;
  const s = new Date(startDate);
  const e = new Date(refDate);
  if (e <= s) return null;

  const { years, months, days } = getPeriod(startDate, refDate);
  const totalDays   = Math.floor((e - s) / 86_400_000);
  const entitlement = getEntitlement(years, months);

  // 이번 발생 기준 설명
  const bonus      = years >= 1 ? Math.floor((years - 1) / 2) : 0;
  const earnBasis  = years === 0
    ? `1년 미만 → 완료 개월(${months}개월)마다 1일 발생`
    : `${years}년 근속 → 기본 15일${bonus > 0 ? ` + ${bonus}일 가산` : ''}`;

  // 다음 anniversary 정보
  const nextAnniv = new Date(s);
  nextAnniv.setFullYear(s.getFullYear() + years + 1);
  const daysToNext      = Math.max(Math.floor((nextAnniv - e) / 86_400_000), 0);
  const nextEntitlement = getEntitlement(years + 1, 0);

  const remaining  = Math.max(entitlement - usedDays, 0);
  const overUsed   = usedDays > entitlement;
  const usedRatio  = entitlement > 0 ? Math.min(usedDays / entitlement, 1) : 0;

  return {
    years, months, days, totalDays,
    periodLabel:    formatPeriod({ years, months, days }),
    entitlement,
    earnBasis,
    usedDays,
    remaining,
    overUsed,
    usedRatio,
    nextAnnivStr:   nextAnniv.toISOString().split('T')[0],
    daysToNext,
    nextEntitlement,
    is1stYear:      years === 0,
    isMaxed:        entitlement >= 25,
  };
}

// ── 서브 컴포넌트 ──────────────────────────────────────────────
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

/** 색상 프로그레스 바 */
function LeaveBar({ used, total }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const overPct = total > 0 && used > total ? ((used - total) / total) * 100 : 0;
  const color = pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>사용 {used}일</span>
        <span>잔여 {Math.max(total - used, 0)}일 / 총 {total}일</span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────
export default function AnnualLeaveCalc() {
  const [startDate, setStartDate] = useLocalStorage('leave_startDate', '2022-01-01');
  const [refDate,   setRefDate]   = useLocalStorage('leave_refDate',   TODAY);
  const [usedDays,  setUsedDays]  = useLocalStorage('leave_usedDays',  5);

  const r = useMemo(() => calcLeave(startDate, refDate, usedDays), [startDate, refDate, usedDays]);
  const dateError = startDate && refDate && refDate <= startDate;

  const dateClass = (err) =>
    `w-full rounded-xl border bg-slate-50 px-4 py-3 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition ${
      err ? 'border-red-300' : 'border-slate-200'
    }`;

  return (
    <div className="space-y-5">
      {/* 입력 카드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-800 to-brand-600 px-6 py-4">
          <h2 className="text-white font-semibold text-base">재직 정보 입력</h2>
          <p className="text-brand-100 text-xs mt-0.5">근로기준법 제60조 기준 연차 발생 계산</p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* 날짜 2열 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                <Calendar size={14} className="text-slate-400" /> 입사일
              </label>
              <input type="date" value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={dateClass(false)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                <Calendar size={14} className="text-slate-400" />
                기준일
                <Tooltip content="연차 발생 기준이 되는 날짜입니다. 오늘 날짜로 현재 보유 연차를 확인하거나, 특정 날짜를 지정할 수 있습니다." />
              </label>
              <input type="date" value={refDate}
                onChange={(e) => setRefDate(e.target.value)}
                className={dateClass(dateError)} />
              {dateError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle size={12} /> 기준일은 입사일 이후여야 합니다.
                </p>
              )}
            </div>
          </div>

          {/* 사용한 연차 */}
          <InputRow
            label="사용한 연차"
            tooltip="현재 연차 기간(가장 최근 입사 기념일부터 기준일까지) 동안 이미 사용한 연차 일수를 입력하세요."
          >
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setUsedDays(Math.max(0, usedDays - 1))}
                className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-brand-50 hover:border-brand-300 transition text-lg font-bold">
                −
              </button>
              <span className="w-20 text-center text-base font-semibold text-slate-800">
                {usedDays}일
              </span>
              <button type="button" onClick={() => setUsedDays(usedDays + 1)}
                className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-brand-50 hover:border-brand-300 transition text-lg font-bold">
                +
              </button>
            </div>
          </InputRow>
        </div>
      </div>

      {/* 결과 카드 */}
      {r && (
        <div key={`${r.entitlement}-${r.remaining}`} className="result-animate bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print-section">

          {/* 상단 배너 */}
          <div className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-6 py-5 text-white">
            <p className="text-brand-200 text-sm font-medium mb-2 flex items-center gap-1.5">
              <Gift size={14} />
              {r.is1stYear ? '1년 미만 월별 연차' : `${r.years}년 근속 연차`}
            </p>
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <p className="text-brand-200 text-xs mb-1">이번 연도 발생 연차</p>
                <p className="text-5xl font-extrabold tracking-tight">
                  {r.entitlement}
                  <span className="text-2xl font-medium text-brand-200 ml-1">일</span>
                </p>
                {r.isMaxed && (
                  <p className="text-amber-300 text-xs mt-1 flex items-center gap-1">
                    <AlertTriangle size={11} /> 법정 최대 25일 상한 적용
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-white/10 rounded-xl px-4 py-2.5">
                  <p className="text-brand-200 text-xs mb-1">근속 기간</p>
                  <p className="text-white font-bold text-sm">{r.periodLabel}</p>
                </div>
                <div className={`rounded-xl px-4 py-2.5 ${r.overUsed ? 'bg-red-400/40' : 'bg-white/10'}`}>
                  <p className="text-brand-200 text-xs mb-1">잔여 연차</p>
                  <p className={`font-bold text-sm ${r.overUsed ? 'text-red-200' : 'text-white'}`}>
                    {r.overUsed ? `−${r.usedDays - r.entitlement}일 초과` : `${r.remaining}일`}
                  </p>
                </div>
              </div>
            </div>

            {/* 프로그레스 바 */}
            <LeaveBar used={r.usedDays} total={r.entitlement} />
          </div>

          {/* 상세 내역 */}
          <div className="px-6 pb-6">
            <p className="py-4 text-sm font-semibold text-slate-700">연차 발생 상세</p>

            <div className="space-y-3">
              {/* 발생 기준 */}
              <div className="rounded-xl bg-slate-50 px-4 py-4 space-y-2.5">
                <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-3">
                  발생 기준 — 근로기준법 제60조
                </p>
                {[
                  { label: '입사일',     value: startDate },
                  { label: '기준일',     value: refDate },
                  { label: '근속 기간',  value: r.periodLabel },
                  { label: '총 재직일수', value: `${r.totalDays.toLocaleString()}일` },
                  { label: '발생 기준',  value: r.earnBasis },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="text-slate-500 shrink-0">{label}</span>
                    <span className="font-semibold text-slate-800 text-right">{value}</span>
                  </div>
                ))}
              </div>

              {/* 연차 사용 현황 */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '총 발생',  value: r.entitlement, sub: '일', color: 'bg-brand-50 border-brand-100', text: 'text-brand-800' },
                  { label: '사용',     value: r.usedDays,    sub: '일', color: r.overUsed ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100', text: r.overUsed ? 'text-red-700' : 'text-slate-700' },
                  { label: '잔여',     value: Math.max(r.remaining, 0), sub: '일', color: r.overUsed ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-100', text: r.overUsed ? 'text-red-700' : 'text-emerald-700' },
                ].map(({ label, value, sub, color, text }) => (
                  <div key={label} className={`rounded-xl border px-3 py-3 text-center ${color}`}>
                    <p className="text-xs text-slate-500 mb-1">{label}</p>
                    <p className={`text-2xl font-extrabold ${text}`}>{value}</p>
                    <p className="text-xs text-slate-400">{sub}</p>
                  </div>
                ))}
              </div>

              {/* 초과 사용 경고 */}
              {r.overUsed && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2.5">
                  <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700">
                    발생 연차({r.entitlement}일)보다 {r.usedDays - r.entitlement}일 초과 사용했습니다.
                    사용자의 동의 없이 연차를 초과 사용하게 하는 것은 근로기준법 위반입니다.
                  </p>
                </div>
              )}

              {/* 다음 anniversary */}
              <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-brand-600 font-medium mb-0.5 flex items-center gap-1">
                    <ChevronRight size={12} /> 다음 입사 기념일 ({r.nextAnnivStr})
                  </p>
                  <p className="text-sm text-brand-800">
                    <strong>{r.nextEntitlement}일</strong> 발생 예정
                    {r.is1stYear && <span className="text-xs ml-1">(1년 만근 시 15일)</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-brand-500">D−{r.daysToNext.toLocaleString()}</p>
                </div>
              </div>

              {/* 연차 발생 기준 요약표 */}
              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700 leading-relaxed">
                <strong>연차 발생 기준 (근로기준법 제60조):</strong><br />
                1년 미만 — 1개월 개근 시 1일 발생, 최대 11일<br />
                1년 이상 — 기본 15일 / 3년 이상부터 2년마다 1일 추가 (최대 25일)
              </div>
            </div>
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
