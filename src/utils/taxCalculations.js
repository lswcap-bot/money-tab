// ────────────────────────────────────────────────────────────
// 2026년 기준 한국 근로소득 공제 · 세금 계산 유틸리티
// ────────────────────────────────────────────────────────────

/** 2026 적용 요율 상수 */
export const RATES_2026 = {
  nationalPension: {
    rate: 0.045,          // 근로자 부담 4.5%
    lowerLimit: 400_000,  // 기준소득월액 하한 (2026 예상)
    upperLimit: 6_370_000, // 기준소득월액 상한 (2026 예상)
  },
  healthInsurance: {
    totalRate: 0.0709,    // 전체 7.09%
    employeeRate: 0.03545, // 근로자 절반 부담
  },
  longTermCare: {
    // 건강보험료(전체) * 12.95% → 절반이 근로자 부담
    rateOfHealthTotal: 0.1295,
  },
  employmentInsurance: {
    rate: 0.009,          // 근로자 부담 0.9%
  },
  localIncomeTax: 0.1,    // 지방소득세 = 근로소득세의 10%
};

// ── 근로소득공제 ──────────────────────────────────────────────
function getEmploymentIncomeDeduction(annualGross) {
  let d;
  if (annualGross <= 5_000_000)        d = annualGross * 0.70;
  else if (annualGross <= 15_000_000)  d = 3_500_000 + (annualGross - 5_000_000) * 0.40;
  else if (annualGross <= 45_000_000)  d = 7_500_000 + (annualGross - 15_000_000) * 0.15;
  else if (annualGross <= 100_000_000) d = 12_000_000 + (annualGross - 45_000_000) * 0.05;
  else                                  d = 14_750_000;
  return Math.min(d, 20_000_000); // 상한 2,000만 원
}

// ── 소득세율 적용 (8 구간, 2026년 기준) ────────────────────────
function applyTaxBrackets(taxBase) {
  if (taxBase <= 14_000_000)          return taxBase * 0.06;
  if (taxBase <= 50_000_000)          return 840_000   + (taxBase - 14_000_000) * 0.15;
  if (taxBase <= 88_000_000)          return 6_240_000  + (taxBase - 50_000_000) * 0.24;
  if (taxBase <= 150_000_000)         return 15_360_000 + (taxBase - 88_000_000) * 0.35;
  if (taxBase <= 300_000_000)         return 37_060_000 + (taxBase - 150_000_000) * 0.38;
  if (taxBase <= 500_000_000)         return 94_060_000 + (taxBase - 300_000_000) * 0.40;
  if (taxBase <= 1_000_000_000)       return 174_060_000 + (taxBase - 500_000_000) * 0.42;
  return 384_060_000 + (taxBase - 1_000_000_000) * 0.45;
}

// ── 근로소득세액공제 ──────────────────────────────────────────
function getEmploymentTaxCredit(calculatedTax, annualGross) {
  // 공제액 계산
  const credit = calculatedTax <= 1_300_000
    ? calculatedTax * 0.55
    : 715_000 + (calculatedTax - 1_300_000) * 0.30;

  // 한도 계산
  let limit;
  if (annualGross <= 33_000_000) {
    limit = 740_000;
  } else if (annualGross <= 70_000_000) {
    limit = Math.max(740_000 - (annualGross - 33_000_000) * 0.008, 660_000);
  } else {
    limit = Math.max(660_000 - (annualGross - 70_000_000) * 0.05, 500_000);
  }

  return Math.min(credit, limit);
}

/**
 * 연간 근로소득세(결정세액) 계산
 * @param {number} annualTaxableGross - 연간 과세 급여 (비과세 제외)
 * @param {number} dependents - 부양가족 수 (본인 포함)
 * @returns {number} 연간 결정세액
 */
export function calcAnnualIncomeTax(annualTaxableGross, dependents) {
  const employmentDeduction = getEmploymentIncomeDeduction(annualTaxableGross);
  const personalDeduction   = 1_500_000 * Math.max(dependents, 1);
  const standardTaxCredit   = 130_000; // 표준세액공제

  const taxBase        = Math.max(annualTaxableGross - employmentDeduction - personalDeduction, 0);
  const calculatedTax  = applyTaxBrackets(taxBase);
  const taxCredit      = getEmploymentTaxCredit(calculatedTax, annualTaxableGross);
  const finalTax       = Math.max(calculatedTax - taxCredit - standardTaxCredit, 0);

  return finalTax;
}

/**
 * 급여 전체 실수령액 분석
 * @param {number} inputAmount  - 연봉 또는 월급 (원)
 * @param {boolean} isMonthly   - true면 월급 입력, false면 연봉 입력
 * @param {number} nonTaxable   - 월 비과세액 (원)
 * @param {number} dependents   - 부양가족 수 (본인 포함)
 */
export function calcSalaryBreakdown(inputAmount, isMonthly, nonTaxable, dependents) {
  const annualSalary  = isMonthly ? inputAmount * 12 : inputAmount;
  const monthly       = annualSalary / 12;
  const taxableMonthly = Math.max(monthly - nonTaxable, 0);
  const taxableAnnual  = taxableMonthly * 12;

  const { nationalPension: np, healthInsurance: hi, longTermCare: ltc, employmentInsurance: ei } = RATES_2026;

  // 국민연금 (상·하한 클램프)
  const npBase          = Math.min(Math.max(taxableMonthly, np.lowerLimit), np.upperLimit);
  const nationalPension = Math.floor(npBase * np.rate);

  // 건강보험 (근로자 절반)
  const healthInsurance = Math.floor(taxableMonthly * hi.employeeRate);

  // 장기요양보험 (건강보험 전체액 * 12.95% / 2)
  const healthTotal     = taxableMonthly * hi.totalRate;
  const longTermCare    = Math.floor((healthTotal * ltc.rateOfHealthTotal) / 2);

  // 고용보험
  const employmentIns   = Math.floor(taxableMonthly * ei.rate);

  // 근로소득세 (간이세액표 근사 로직)
  const annualTax       = calcAnnualIncomeTax(taxableAnnual, dependents);
  const monthlyIncomeTax = Math.max(Math.floor(annualTax / 12), 0);

  // 지방소득세
  const localIncomeTax  = Math.floor(monthlyIncomeTax * RATES_2026.localIncomeTax);

  const totalDeductions = nationalPension + healthInsurance + longTermCare + employmentIns + monthlyIncomeTax + localIncomeTax;
  const netSalary       = Math.floor(monthly - totalDeductions);

  return {
    annualSalary,
    monthly:           Math.floor(monthly),
    taxableMonthly:    Math.floor(taxableMonthly),
    nationalPension,
    healthInsurance,
    longTermCare,
    employmentInsurance: employmentIns,
    monthlyIncomeTax,
    localIncomeTax,
    totalDeductions,
    netSalary,
  };
}

/** 숫자 → 한국식 천단위 콤마 포맷 */
export const fmtKRW = (n) =>
  new Intl.NumberFormat('ko-KR').format(Math.round(n));
