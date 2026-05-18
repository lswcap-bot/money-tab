import { useMemo } from 'react';
import { AlertTriangle, CheckCircle, Printer, Info } from 'lucide-react';
import Tooltip from './Tooltip.jsx';
import { fmtKRW } from '../utils/taxCalculations.js';
import { useFormattedNumber } from '../hooks/useFormattedNumber.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

// ── 2026 상수 ─────────────────────────────────────────────────
const DAILY_UPPER  = 66_000;           // 1일 상한액
const DAILY_LOWER  = Math.round(10_320 * 0.8 * 8); // 66,048원 — 2026 하한 > 상한
const BENEFIT_RATE = 0.6;             // 평균임금의 60%

// 소정급여일수 매트릭스: [고용보험 가입기간 구간][연령 구간]
// 행: 피보험기간 (1년미만, 1-3년, 3-5년, 5-10년, 10년이상)
// 열: 연령 구간 (50세미만, 50세이상·장애인)
const BENEFIT_DAYS = [
  [120, 120],  // 1년 미만
  [150, 180],  // 1~3년
  [180, 210],  // 3~5년
  [210, 240],  // 5~10년
  [240, 270],  // 10년 이상
];

const PERIOD_LABELS = ['1년 미만', '1~3년', '3~5년', '5~10년', '10년 이상'];
const AGE_LABELS    = ['50세 미만', '50세 이상 / 장애인'];

// ── 계산 로직 ─────────────────────────────────────────────────
function calcUnemployment(monthlyWage, periodIdx, ageIdx) {
  const dailyAvg    = Math.round((monthlyWage * 3) / (3 * 30.4167));  // 3개월 평균
  const rawDaily    = Math.round(dailyAvg * BENEFIT_RATE);

  // 2026: 하한(66,048원) > 상한(66,000원) → 실질 하한이 기준
  const effectiveCap = Math.max(DAILY_UPPER, DAILY_LOWER);
  const dailyBenefit = Math.max(Math.min(rawDaily, effectiveCap), DAILY_LOWER);

  const sojoungDays  = BENEFIT_DAYS[periodIdx][ageIdx];
  const totalBenefit = dailyBenefit * sojoungDays;

  return {
    dailyAvg,
    rawDaily,
    dailyBenefit,
    sojoungDays,
    totalBenefit,
    isCapped:  rawDaily > effectiveCap,
    isFloored: rawDaily < DAILY_LOWER,
    isLowerGtUpper: DAILY_LOWER > DAILY_UPPER,
  };
}

// ── 서브 컴포넌트 ──────────────────────────────────────────────
function SelectBtn({ label, active, onClick }) {
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

// ── 메인 컴포넌트 ──────────────────────────────────────────────
export default function UnemploymentCalc() {
  const [monthlyWageNum, monthlyWage, handleWageChange] = useFormattedNumber(3_000_000, 'unemp_wage');
  const [periodIdx, setPeriodIdx] = useLocalStorage('unemp_period', 1);
  const [ageIdx,    setAgeIdx]    = useLocalStorage('unemp_age',    0);

  const r = useMemo(
    () => calcUnemployment(monthlyWageNum, periodIdx, ageIdx),
    [monthlyWageNum, periodIdx, ageIdx],
  );

  return (
    <div className="space-y-5">
      {/* 안내 배지 */}
      <div className="flex items-start gap-4 bg-brand-50 border border-brand-100 rounded-2xl px-5 py-4">
        <div className="w-10 h-10 rounded-xl bg-brand-800 flex items-center justify-center shrink-0 shadow-md mt-0.5">
          <Info size={18} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-brand-600 font-medium">실업급여(구직급여) 수급 요건</p>
          <p className="text-brand-800 font-bold text-sm mt-0.5">
            비자발적 이직 · 이직 전 18개월 중 피보험기간 <span className="text-brand-700">180일 이상</span>
          </p>
          <p className="text-[11px] text-brand-500 mt-1">고용보험법 제40조 · 제45조 기준</p>
        </div>
      </div>

      {/* 2026 하한 > 상한 안내 */}
      <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4">
        <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-700 leading-relaxed">
          <span className="font-bold">2026년 특이사항:</span> 최저임금 인상으로 하한액(66,048원)이
          상한액(66,000원)보다 높습니다. 실질적으로 모든 수급자의 1일 구직급여는{' '}
          <span className="font-bold">66,048원</span>이 적용됩니다.
        </div>
      </div>

      {/* 입력 카드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-800 to-brand-600 px-6 py-4">
          <h2 className="text-white font-semibold text-base">수급 조건 입력</h2>
          <p className="text-brand-100 text-xs mt-0.5">퇴직 전 3개월 평균 월급 및 피보험 기간을 입력하세요</p>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* 월 급여 */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
            <label className="flex items-center gap-1 text-sm font-medium text-slate-600 sm:w-44 shrink-0">
              퇴직 전 월 급여
              <Tooltip content="퇴직 직전 3개월 평균 세전 월급여입니다. 기본급·수당 포함, 비과세 항목 제외 권장." />
            </label>
            <div className="flex-1 relative">
              <input
                type="text" inputMode="numeric"
                value={monthlyWage} onChange={handleWageChange}
                placeholder="월 급여 입력"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-right text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">원</span>
            </div>
          </div>

          {/* 고용보험 피보험기간 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600">
              고용보험 피보험기간
              <Tooltip content="현 직장 포함 전체 피보험 기간(이전 직장 합산 가능). 이직 전 18개월 중 180일 이상이어야 수급 자격이 됩니다." />
            </p>
            <div className="flex gap-2 flex-wrap">
              {PERIOD_LABELS.map((label, i) => (
                <SelectBtn key={i} label={label} active={periodIdx === i} onClick={() => setPeriodIdx(i)} />
              ))}
            </div>
          </div>

          {/* 연령 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600">
              이직일 기준 연령
              <Tooltip content="이직(퇴직)한 날 기준 만 나이입니다. 50세 이상 또는 장애인인 경우 소정급여일수가 더 길게 적용됩니다." />
            </p>
            <div className="flex gap-2">
              {AGE_LABELS.map((label, i) => (
                <SelectBtn key={i} label={label} active={ageIdx === i} onClick={() => setAgeIdx(i)} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 결과 카드 */}
      {monthlyWageNum > 0 && (
        <div key={r.totalBenefit} className="result-animate bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print-section">
          {/* 배너 */}
          <div className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-6 py-5 text-white">
            <p className="text-brand-200 text-sm font-medium mb-1 flex items-center gap-1.5">
              <CheckCircle size={14} /> 구직급여 예상액
            </p>
            <div className="flex items-end justify-between gap-4 flex-wrap mt-3">
              <div>
                <p className="text-brand-200 text-xs mb-1">총 수령 예상액</p>
                <p className="text-4xl font-extrabold tracking-tight">
                  {fmtKRW(r.totalBenefit)}
                  <span className="text-xl font-medium text-brand-200 ml-1">원</span>
                </p>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-3 text-center min-w-[108px]">
                <p className="text-brand-200 text-xs mb-1">소정급여일수</p>
                <p className="text-white font-extrabold text-2xl">{r.sojoungDays}일</p>
                <p className="text-brand-300 text-xs mt-0.5">{PERIOD_LABELS[periodIdx]} · {AGE_LABELS[ageIdx]}</p>
              </div>
            </div>
          </div>

          {/* 계산 내역 */}
          <div className="px-6 pb-6">
            <p className="py-4 text-sm font-semibold text-slate-700">계산 상세 내역</p>

            <div className="space-y-3">
              {/* STEP 1 */}
              <div className="rounded-xl bg-slate-50 px-4 py-4 space-y-2.5">
                <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-2">
                  Step 1 — 1일 구직급여액 산정
                </p>
                {[
                  { label: '이직 전 3개월 평균 월급', value: fmtKRW(monthlyWageNum), sub: '원' },
                  { label: '1일 평균임금', value: fmtKRW(r.dailyAvg), sub: '원 (월급 ÷ 30.4167일)' },
                  { label: '기준 급여 (60%)', value: fmtKRW(r.rawDaily), sub: '원' },
                ].map(({ label, value, sub }) => (
                  <div key={label} className="flex justify-between gap-2 text-sm">
                    <span className="text-slate-600">{label}</span>
                    <span className="font-semibold text-slate-800 shrink-0">{value} <span className="text-xs font-normal text-slate-400">{sub}</span></span>
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-2.5">
                  <div className="flex justify-between gap-2 text-sm font-bold text-brand-800">
                    <div>
                      <span>적용 1일 구직급여</span>
                      {r.isLowerGtUpper && (
                        <span className="ml-1.5 text-[10px] font-normal bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                          하한 적용
                        </span>
                      )}
                      {r.isCapped && !r.isLowerGtUpper && (
                        <span className="ml-1.5 text-[10px] font-normal bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                          상한 적용
                        </span>
                      )}
                    </div>
                    <span className="text-base">{fmtKRW(r.dailyBenefit)}원</span>
                  </div>
                </div>
              </div>

              {/* STEP 2 */}
              <div className="rounded-xl bg-slate-50 px-4 py-4 space-y-2.5">
                <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-2">
                  Step 2 — 총 구직급여 계산
                </p>
                <div className="rounded-lg bg-white border border-slate-200 px-3 py-2.5 text-xs text-slate-500 font-mono text-center">
                  1일 {fmtKRW(r.dailyBenefit)}원 × 소정급여일수 {r.sojoungDays}일
                </div>
                <div className="border-t border-slate-200 pt-2.5 flex justify-between gap-2 text-sm font-bold text-brand-800">
                  <span>총 구직급여</span>
                  <span className="text-base">{fmtKRW(r.totalBenefit)}원</span>
                </div>
              </div>

              {/* 소정급여일수 표 */}
              <div className="rounded-xl bg-slate-50 px-4 py-4">
                <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-3">
                  소정급여일수 기준표 (2026)
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="py-2 text-left text-slate-500 font-medium pr-3">피보험기간</th>
                        {AGE_LABELS.map((l) => (
                          <th key={l} className="py-2 text-center text-slate-500 font-medium px-2">{l}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PERIOD_LABELS.map((pLabel, pi) => (
                        <tr
                          key={pi}
                          className={`border-b border-slate-100 ${pi === periodIdx ? 'bg-brand-50' : ''}`}
                        >
                          <td className={`py-2 pr-3 font-medium ${pi === periodIdx ? 'text-brand-800' : 'text-slate-600'}`}>
                            {pLabel}
                          </td>
                          {BENEFIT_DAYS[pi].map((days, ai) => (
                            <td
                              key={ai}
                              className={`py-2 text-center font-semibold px-2 ${
                                pi === periodIdx && ai === ageIdx
                                  ? 'text-brand-800 font-bold'
                                  : 'text-slate-700'
                              }`}
                            >
                              {days}일
                              {pi === periodIdx && ai === ageIdx && (
                                <span className="ml-1 text-brand-500">◀</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700 leading-relaxed">
                실업급여는 비자발적 퇴직(권고사직·계약만료 등)에 한해 지급됩니다. 자진 퇴사·중대한 귀책사유에 의한 해고는 원칙적으로 지급 불가합니다. 실제 수급액은 고용센터 심사 결과에 따라 달라질 수 있습니다.
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
