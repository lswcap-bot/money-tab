import { useMemo } from 'react';
import { TrendingUp, Printer, Scale, Info } from 'lucide-react';
import Tooltip from './Tooltip.jsx';
import { fmtKRW } from '../utils/taxCalculations.js';
import { useFormattedNumber } from '../hooks/useFormattedNumber.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

// ── 2026 종합소득세율 (근로소득세 근사) ───────────────────────
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

function calcIncomeTax(taxBase) {
  if (taxBase <= 0) return { tax: 0, rate: 0.06, deduction: 0, bracket: BRACKETS[0] };
  const bracket = BRACKETS.find(b => taxBase <= b.limit);
  const tax = Math.max(0, Math.round(taxBase * bracket.rate - bracket.deduction));
  return { tax, rate: bracket.rate, deduction: bracket.deduction, bracket };
}

function calcStockOption(marketPrice, exercisePrice, shares, annualSalary) {
  if (shares <= 0 || marketPrice <= exercisePrice) return null;
  const exerciseGain = (marketPrice - exercisePrice) * shares;

  // 행사이익을 근로소득(연봉)에 합산해 세율 적용
  const combinedIncome  = annualSalary + exerciseGain;
  const { tax: totalTax, bracket: combinedBracket } = calcIncomeTax(combinedIncome);
  const { tax: salaryTax } = calcIncomeTax(annualSalary);

  // 스톡옵션으로 인한 추가 세액
  const addedTax     = Math.max(0, totalTax - salaryTax);
  const localTax     = Math.round(addedTax * 0.1);
  const totalAdded   = addedTax + localTax;
  const netGain      = exerciseGain - totalAdded;
  const effectiveRate = exerciseGain > 0 ? totalAdded / exerciseGain : 0;

  return {
    exerciseGain,
    addedTax,
    localTax,
    totalAdded,
    netGain,
    effectiveRate,
    combinedBracket,
  };
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
      <input type="text" inputMode="numeric"
        value={value} onChange={onChange} placeholder={placeholder ?? '금액 입력'}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-right text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">원</span>
    </div>
  );
}

export default function StockOptionCalc() {
  const [marketPrice,   marketDisplay,   handleMarket]   = useFormattedNumber(50_000,      'stock_market');
  const [exercisePrice, exerciseDisplay, handleExercise] = useFormattedNumber(20_000,      'stock_exercise');
  const [shares,        setShares]                       = useLocalStorage('stock_shares', 1000);
  const [annualSalary,  salaryDisplay,   handleSalary]   = useFormattedNumber(60_000_000,  'stock_salary');

  const r = useMemo(
    () => calcStockOption(marketPrice, exercisePrice, shares, annualSalary),
    [marketPrice, exercisePrice, shares, annualSalary],
  );

  const isUnderwater = marketPrice > 0 && exercisePrice > 0 && marketPrice <= exercisePrice;

  return (
    <div className="space-y-5">
      {/* 세무사 주의 문구 */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <Scale size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 font-medium leading-relaxed">
          본 계산은 <span className="font-bold">간이 계산</span>이며, 벤처기업 특례·소득 분류 방식에 따라 세액이 달라질 수 있습니다.
          정확한 신고는 <span className="font-bold">세무사와 상의</span>하세요.
        </p>
      </div>

      {/* 벤처 특례 안내 */}
      <div className="flex items-start gap-3 bg-brand-50 border border-brand-100 rounded-2xl px-5 py-4">
        <Info size={16} className="text-brand-600 shrink-0 mt-0.5" />
        <div className="text-xs text-brand-700 leading-relaxed">
          <p className="font-bold mb-0.5">과세 방식 안내</p>
          <p>일반 법인: 행사이익 → <span className="font-semibold">근로소득</span> (연봉에 합산 과세)</p>
          <p>벤처기업 특례: 행사이익 → <span className="font-semibold">기타소득</span> (분리과세 22%, 또는 납부유예 가능)</p>
          <p className="mt-1 text-brand-500">본 계산기는 일반 법인 기준 근로소득 합산 방식을 적용합니다.</p>
        </div>
      </div>

      {/* 입력 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-800 to-brand-600 px-6 py-4">
          <h2 className="text-white font-semibold text-base">스톡옵션 행사 정보</h2>
          <p className="text-brand-100 text-xs mt-0.5">행사이익에 대한 근로소득세를 계산합니다</p>
        </div>
        <div className="px-6 py-5 space-y-5">
          <InputRow label="행사 당시 시가" tooltip="스톡옵션을 행사하는 날의 주식 1주 시가(공정가치)입니다.">
            <MoneyInput value={marketDisplay} onChange={handleMarket} placeholder="주당 시가" />
          </InputRow>
          <InputRow label="행사 가격" tooltip="스톡옵션 계약서에 명시된 주당 행사가격(부여가격)입니다.">
            <MoneyInput value={exerciseDisplay} onChange={handleExercise} placeholder="주당 행사가" />
          </InputRow>
          <InputRow label="주식 수" tooltip="이번에 행사할 스톡옵션 주식 수입니다.">
            <div className="relative">
              <input type="text" inputMode="numeric"
                value={shares.toLocaleString('ko-KR')}
                onChange={(e) => setShares(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-right text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">주</span>
            </div>
          </InputRow>
          <InputRow label="연간 근로소득" tooltip="해당 연도 기존 연봉(총급여)입니다. 행사이익을 합산해 세율 구간을 결정합니다.">
            <MoneyInput value={salaryDisplay} onChange={handleSalary} placeholder="연간 총급여" />
          </InputRow>
        </div>
      </div>

      {/* 결과 */}
      {isUnderwater && (
        <div className="rounded-2xl bg-slate-100 border border-slate-200 px-6 py-5 text-center text-slate-500">
          <TrendingUp size={28} className="mx-auto mb-2 text-slate-300" />
          <p className="font-semibold">시가 ≤ 행사가 — 행사이익이 없습니다 (Underwater)</p>
          <p className="text-sm mt-1">시가가 행사가보다 높을 때 행사 이익이 발생합니다.</p>
        </div>
      )}

      {r && !isUnderwater && (
        <div key={r.totalAdded} className="result-animate bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden print-section">
          <div className="bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-6 py-5 text-white">
            <p className="text-brand-200 text-sm font-medium mb-3">행사이익 세금 요약</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: '행사이익',   value: r.exerciseGain },
                { label: '부담 세액',  value: r.totalAdded },
                { label: '세후 이익',  value: r.netGain },
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
            <div className="rounded-xl bg-slate-50 px-4 py-4 space-y-2.5 mb-3">
              <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-2">행사이익 산출</p>
              <div className="rounded-lg bg-white border border-slate-200 px-3 py-2.5 text-xs text-slate-500 font-mono text-center">
                ({fmtKRW(marketPrice)}원 − {fmtKRW(exercisePrice)}원) × {shares.toLocaleString('ko-KR')}주
              </div>
              {[
                { label: '1주당 이익',          value: `${fmtKRW(marketPrice - exercisePrice)}원` },
                { label: '행사이익 합계',        value: `${fmtKRW(r.exerciseGain)}원`, bold: true },
                { label: '추가 소득세 (근로소득 합산)', value: `${fmtKRW(r.addedTax)}원` },
                { label: '지방소득세 (소득세 × 10%)',   value: `${fmtKRW(r.localTax)}원` },
                { label: `실효세율 (행사이익 기준)`,    value: `${(r.effectiveRate * 100).toFixed(2)}%` },
              ].map(({ label, value, bold }) => (
                <div key={label} className={`flex justify-between gap-2 text-sm ${bold ? 'font-bold text-brand-800 border-t border-slate-200 pt-2 mt-1' : ''}`}>
                  <span className={bold ? '' : 'text-slate-600'}>{label}</span>
                  <span className={bold ? '' : 'font-semibold text-slate-800 shrink-0'}>{value}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-brand-800">
                <span>세후 행사이익</span>
                <span className="text-base">{fmtKRW(r.netGain)}원</span>
              </div>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700 leading-relaxed">
              행사이익은 행사일 속하는 연도 종합소득세 신고 시 근로소득 합산 신고 대상입니다.
              벤처기업의 경우 조세특례제한법 제16조의2에 따라 기타소득으로 분리과세(22%)하거나 납부 유예 신청이 가능합니다.
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
