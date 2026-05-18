import { useState } from 'react';
import { Briefcase, Receipt, TrendingUp, BadgeCheck } from 'lucide-react';
import SalaryCalculator    from './components/SalaryCalculator.jsx';
import FourInsuranceCalc   from './components/FourInsuranceCalc.jsx';
import SeveranceCalc       from './components/SeveranceCalc.jsx';
import MinWageCalc         from './components/MinWageCalc.jsx';
import AnnualLeaveCalc     from './components/AnnualLeaveCalc.jsx';
import WeeklyHolidayCalc   from './components/WeeklyHolidayCalc.jsx';
import UnemploymentCalc    from './components/UnemploymentCalc.jsx';
import ParentalLeaveCalc   from './components/ParentalLeaveCalc.jsx';
import ComprehensiveTaxCalc from './components/ComprehensiveTaxCalc.jsx';
import StockOptionCalc     from './components/StockOptionCalc.jsx';
import FreelancerTaxCalc   from './components/FreelancerTaxCalc.jsx';
import WithholdingTaxCalc  from './components/WithholdingTaxCalc.jsx';
import DailyWorkerTaxCalc  from './components/DailyWorkerTaxCalc.jsx';

// ── 그룹 및 탭 정의 ───────────────────────────────────────────
const GROUPS = [
  {
    id: 'labor',
    label: '노무·급여',
    Icon: Briefcase,
    tabs: [
      { id: 'salary',         label: '연봉 실수령액',  component: <SalaryCalculator /> },
      { id: 'insurance',      label: '4대보험',        component: <FourInsuranceCalc /> },
      { id: 'severance',      label: '퇴직금',          component: <SeveranceCalc /> },
      { id: 'minimum-wage',   label: '최저임금',        component: <MinWageCalc /> },
      { id: 'annual-leave',   label: '연차',            component: <AnnualLeaveCalc /> },
      { id: 'weekly-pay',     label: '주휴수당',        component: <WeeklyHolidayCalc /> },
      { id: 'unemployment',   label: '실업급여',        component: <UnemploymentCalc /> },
      { id: 'parental-leave', label: '출산·육아휴직',  component: <ParentalLeaveCalc /> },
    ],
  },
  {
    id: 'tax',
    label: '세무·정산',
    Icon: Receipt,
    tabs: [
      { id: 'comprehensive-tax', label: '종합소득세',    component: <ComprehensiveTaxCalc /> },
      { id: 'stock-option',      label: '스톡옵션',      component: <StockOptionCalc /> },
      { id: 'freelancer',        label: '프리랜서 세금', component: <FreelancerTaxCalc /> },
      { id: 'withholding',       label: '원천세',         component: <WithholdingTaxCalc /> },
      { id: 'daily-worker',      label: '일용직 소득세', component: <DailyWorkerTaxCalc /> },
    ],
  },
];

// ── 메인 앱 ───────────────────────────────────────────────────
export default function App() {
  const [activeGroupId, setActiveGroupId] = useState('labor');
  const [activeTabId,   setActiveTabId]   = useState('salary');

  const activeGroup = GROUPS.find(g => g.id === activeGroupId) ?? GROUPS[0];
  const activeTab   = activeGroup.tabs.find(t => t.id === activeTabId) ?? activeGroup.tabs[0];

  function handleGroupChange(groupId) {
    if (groupId === activeGroupId) return;
    const group = GROUPS.find(g => g.id === groupId);
    setActiveGroupId(groupId);
    setActiveTabId(group.tabs[0].id);
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">

      {/* ── 헤더 ───────────────────────────────────────────── */}
      <header className="no-print bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-brand-800 flex items-center justify-center shadow-md">
              <TrendingUp size={16} className="text-white" />
            </div>
            <div className="leading-tight">
              <span className="text-brand-800 font-extrabold text-lg tracking-tight">Money</span>
              <span className="text-slate-700 font-extrabold text-lg tracking-tight"> Tab</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── 2단계 내비게이션 ───────────────────────────────── */}
      <nav className="no-print bg-white border-b border-slate-100 shadow-sm sticky top-14 z-30">
        <div className="max-w-3xl mx-auto">

          {/* 1단계: 그룹 선택 + 배지 */}
          <div className="flex items-stretch border-b border-slate-100">
            {GROUPS.map(({ id, label, Icon }) => {
              const isActive = id === activeGroupId;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleGroupChange(id)}
                  className={`
                    flex items-center gap-2 px-5 sm:px-7 py-3 text-sm font-semibold
                    border-b-2 -mb-px transition-colors
                    ${isActive
                      ? 'border-brand-700 text-brand-800 bg-brand-50/60'
                      : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }
                  `}
                >
                  <Icon size={14} className={isActive ? 'text-brand-700' : 'text-slate-400'} />
                  {label}
                  <span className={`
                    text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center
                    ${isActive ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-400'}
                  `}>
                    {GROUPS.find(g => g.id === id)?.tabs.length}
                  </span>
                </button>
              );
            })}
            {/* 배지 — 오른쪽 끝 */}
            <div className="ml-auto flex items-center pr-4">
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                <BadgeCheck size={12} className="text-emerald-600 shrink-0" />
                <span className="text-[11px] font-semibold text-emerald-700 whitespace-nowrap">2026년 최신 개정법 반영</span>
              </div>
            </div>
          </div>

          {/* 2단계: 세부 탭 선택 */}
          <div className="px-3 py-2 flex flex-wrap gap-1">
            {activeGroup.tabs.map((tab) => {
              const isActive = tab.id === activeTab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium
                    whitespace-nowrap transition-colors
                    ${isActive
                      ? 'bg-brand-800 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    }
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ── 콘텐츠 ─────────────────────────────────────────── */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* 인쇄 전용 리포트 헤더 */}
        <div className="print-only mb-5 pb-4 border-b-2 border-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-2xl font-bold text-slate-900">Money Tab 정산 리포트</p>
              <p className="text-sm text-slate-600 mt-0.5">{activeTab.label} 계산기 · 2026년 최신 개정법 기준</p>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 기준
            </p>
          </div>
        </div>

        {/* 화면 전용 타이틀 */}
        <div className="mb-5 no-print">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              activeGroupId === 'labor'
                ? 'bg-brand-100 text-brand-700'
                : 'bg-violet-100 text-violet-700'
            }`}>
              {activeGroup.label}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">{activeTab.label} 계산기</h1>
          <p className="text-sm text-slate-500 mt-0.5">2026년 기준 요율 자동 적용 · 실시간 계산</p>
        </div>

        {activeTab.component}
      </main>

      {/* ── 면책 조항 ───────────────────────────────────────── */}
      <footer className="no-print mt-auto border-t border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 text-center">
          <p className="text-xs text-slate-400 leading-relaxed">
            본 계산 결과는 2026년 한국 법규 및 요율을 기준으로 하며,
            실제 수령액·세액과 오차가 발생할 수 있습니다.
            세무·노무 전문가와 상의하시기 바랍니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
