import { useMemo } from 'react';
import { Printer, Scale } from 'lucide-react';
import Tooltip from './Tooltip.jsx';
import BreakdownBar from './BreakdownBar.jsx';
import { fmtKRW } from '../utils/taxCalculations.js';
import { useFormattedNumber } from '../hooks/useFormattedNumber.js';

// ── 2026 종합소득세율표 ────────────────────────────────────────
const BRACKETS = [
  { limit: 14_000_000,    rate: 0.06, deduction:          0 },
  { limit: 50_000_000,    rate: 0.15, deduction:  1_260_000 },
  { limit: 88_000_000,    rate: 0.24, deduction:  5_760_000 },
  { limit: 150_000_000,   rate: 0.35, deduction: 15_440_000 },
  { limit: 300_000_000,   rate: 0.38, deduction: 19_940_000 },
  { limit: 500_000_000,   rate: 0.40, deduction: 25_940_000 },
  { limit: 1_000_000_000, rate: 0.42, deduction: 35_940_000 },
  { limit: Infinity,      rate: 0.45, deduction: 65_940_000 },
];

function calcComprehensive(totalIncome, expenses, personalDeduction, otherDeduction) {
  if (totalIncome <= 0) return null;
  const incomeAmount  = Math.max(0, totalIncome - expenses);
  const totalDeduction = personalDeduction + otherDeduction;
  const taxBase       = Math.max(0, incomeAmount - totalDeduction);
  const bracket       = BRACKETS.find(b => taxBase <= b.limit);
  const incomeTax     = Math.max(0, Math.round(taxBase * bracket.rate - bracket.deduction));
  const localTax      = Math.round(incomeTax * 0.1);
  const totalTax      = incomeTax + localTax;
  const netAfterTax   = Math.max(0, incomeAmount - totalTax);
  const effectiveRate = taxBase > 0 ? incomeTax / taxBase : 0;

  return { incomeAmount, totalDeduction, taxBase, bracket, incomeTax, localTax, totalTax, netAfterTax, effectiveRate };
}

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

function MoneyInput({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <input
        type="text" inputMode="numeric"
        value={value} onChange={onChange}
        placeholder={placeholder ?? '금액 입력'}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-right text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">원</span>
    </div>
  );
}

export default function ComprehensiveTaxCalc() {
  const [totalIncome,    incomeDisplay,   handleIncome]    = useFormattedNumber(50_000_000, 'comp_income');
  const [expenses,       expensesDisplay, handleExpenses]  = useFormattedNumber(0,          'comp_expenses');
  const [personalDeduct, personalDisplay, handlePersonal]  = useFormattedNumber(1_500_000,  'comp_personal');
  const [otherDeduct,    otherDisplay,    handleOther]     = useFormattedNumber(0,           'comp_other');

  const r = useMemo(
    () => calcComprehensive(totalIncome, expenses, personalDeduct, otherDeduct),
    [totalIncome, expenses, personalDeduct, otherDeduct],
  );

  const barItems = useMemo(() => r ? [
    { label: '세후 소득',  value: r.netAfterTax, color: 'bg-brand-700' },
    { label: '소득세',     value: r.incomeTax,   color: 'bg-rose-500'  },
    { label: '지방소득세', value: r.localTax,    color: 'bg-orange-400' },
  ] : [], [r]);

  return (
    <div className="space-y-5">
      {/* 세무사 주의 문구 */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <Scale size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 font-medium leading-relaxed">
          본 계산은 <span className="font-bold">간이 계산</span>이며, 실제 세액은 각종 세액공제·감면·가산세에 따라 달라집니다.
          정확한 신고는 <span className="font-bold">세무사와 상의</span>하세요.
        </p>
      </div>

      {/* 입력 카드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-800 to-brand-600 px-6 py-4">
          <h2 className="text-white font-semibold text-base">소득 및 공제 입력</h2>
          <p className="text-brand-100 text-xs mt-0.5">2026년 종합소득세율 구간 자동 적용</p>
        </div>
        <div className="px-6 py-5 space-y-5">
          <InputRow label="연간 총수입" tooltip="사업소득·금융소득·기타소득 등 합산 총수입금액입니다.">
            <MoneyInput value={incomeDisplay} onChange={handleIncome} placeholder="연간 총수입" />
          </InputRow>
          <InputRow label="필요경비" tooltip="수입에서 차감 가능한 사업 관련 비용입니다. 직종별 경비율 또는 실제 경비를 입력하세요.">
            <MoneyInput value={expensesDisplay} onChange={handleExpenses} placeholder="0 (없으면 0)" />
          </InputRow>
          <InputRow label="인적공제" tooltip="본인 150만 원 + 부양가족 1인당 150만 원. 기본적으로 본인 1인 = 150만 원입니다.">
            <MoneyInput value={personalDisplay} onChange={handlePersonal} />
          </InputRow>
          <InputRow label="기타 소득공제" tooltip="노란우산공제·연금저축·건강보험료 공제 등 추가 소득공제 합계액입니다.">
            <MoneyInput value={otherDisplay} onChange={handleOther} placeholder="0 (없으면 0)" />
          </InputRow>
        </div>
      </div>

      {/* 결과 카드 */}
      {r && (
        <div key={r.totalTax} className="result-animate bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print-section">
          <div className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-6 py-5 text-white">
            <p className="text-brand-200 text-sm font-medium mb-3">종합소득세 요약</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: '소득세',    value: r.incomeTax },
                { label: '지방소득세', value: r.localTax },
                { label: '총 세액',   value: r.totalTax },
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
            <p className="py-4 text-sm font-semibold text-slate-700">계산 상세 내역</p>

            {/* 비중 차트 */}
            <div className="rounded-xl bg-slate-50 px-4 py-4 mb-3">
              <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-3">소득 구성 비중</p>
              <BreakdownBar items={barItems} />
            </div>

            {/* 세율 구간 표 */}
            <div className="mb-3 rounded-xl bg-slate-50 px-4 py-4 space-y-2.5">
              <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-2">과세 단계</p>
              {[
                { label: '연간 총수입',    value: `${fmtKRW(totalIncome)}원` },
                { label: '(−) 필요경비',  value: `${fmtKRW(expenses)}원` },
                { label: '소득금액',       value: `${fmtKRW(r.incomeAmount)}원`, bold: true },
                { label: '(−) 소득공제 합계', value: `${fmtKRW(r.totalDeduction)}원` },
                { label: '과세표준',       value: `${fmtKRW(r.taxBase)}원`, bold: true },
              ].map(({ label, value, bold }) => (
                <div key={label} className={`flex justify-between gap-2 text-sm ${bold ? 'font-bold text-brand-800 border-t border-slate-200 pt-2 mt-1' : ''}`}>
                  <span className={bold ? '' : 'text-slate-600'}>{label}</span>
                  <span className={bold ? '' : 'font-semibold text-slate-800 shrink-0'}>{value}</span>
                </div>
              ))}
            </div>

            {/* 세율 적용 */}
            <div className="mb-3 rounded-xl bg-slate-50 px-4 py-4 space-y-2.5">
              <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-2">세율 적용</p>
              <div className="rounded-lg bg-white border border-slate-200 px-3 py-2.5 text-xs text-slate-500 font-mono text-center">
                과세표준 {fmtKRW(r.taxBase)}원 × {(r.bracket.rate * 100).toFixed(0)}%
                {r.bracket.deduction > 0 && ` − 누진공제 ${fmtKRW(r.bracket.deduction)}원`}
              </div>
              {[
                { label: `적용 세율 (${(r.bracket.rate * 100).toFixed(0)}%)`, value: `${fmtKRW(r.incomeTax)}원` },
                { label: '지방소득세 (소득세 × 10%)',  value: `${fmtKRW(r.localTax)}원` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-2 text-sm">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-semibold text-slate-800 shrink-0">{value}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-brand-800">
                <span>총 세액</span>
                <span className="text-base">{fmtKRW(r.totalTax)}원</span>
              </div>
            </div>

            {/* 세후 소득 */}
            <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-brand-600 font-medium">세후 소득금액</p>
                <p className="text-[10px] text-brand-400 mt-0.5">실효세율 {(r.effectiveRate * 100).toFixed(2)}%</p>
              </div>
              <p className="text-brand-800 font-extrabold text-xl">{fmtKRW(r.netAfterTax)}원</p>
            </div>

            {/* 2026 세율 구간표 */}
            <details className="mt-3 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden">
              <summary className="px-4 py-3 text-xs font-bold text-slate-500 cursor-pointer select-none tracking-widest uppercase hover:bg-slate-100 transition-colors">
                2026년 종합소득세율 구간표 보기
              </summary>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100">
                      <th className="py-2 px-4 text-left text-slate-500 font-medium">과세표준</th>
                      <th className="py-2 px-3 text-center text-slate-500 font-medium">세율</th>
                      <th className="py-2 px-3 text-right text-slate-500 font-medium">누진공제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { range: '1,400만원 이하',         rate: '6%',  ded: '−' },
                      { range: '1,400만~5,000만원',       rate: '15%', ded: '126만원' },
                      { range: '5,000만~8,800만원',       rate: '24%', ded: '576만원' },
                      { range: '8,800만~1.5억원',         rate: '35%', ded: '1,544만원' },
                      { range: '1.5억~3억원',             rate: '38%', ded: '1,994만원' },
                      { range: '3억~5억원',               rate: '40%', ded: '2,594만원' },
                      { range: '5억~10억원',              rate: '42%', ded: '3,594만원' },
                      { range: '10억원 초과',             rate: '45%', ded: '6,594만원' },
                    ].map((row, i) => (
                      <tr key={i} className={`border-b border-slate-100 ${
                        BRACKETS[i] === r.bracket ? 'bg-brand-50 font-semibold' : ''
                      }`}>
                        <td className={`py-2 px-4 ${BRACKETS[i] === r.bracket ? 'text-brand-800' : 'text-slate-600'}`}>{row.range}</td>
                        <td className="py-2 px-3 text-center text-slate-700">{row.rate}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{row.ded}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
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
