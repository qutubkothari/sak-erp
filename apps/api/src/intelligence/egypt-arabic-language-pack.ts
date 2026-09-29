/** Egyptian Arabic terminology used by the governed planner and answer composer. */
export const EGYPT_ARABIC_ROUTING_GUIDANCE = `
Arabic/Egyptian ERP interpretation rules:
- "خطط إنتاج 50 قطعة صمام النهارده" requests JOB_ORDER, not PRODUCTION_PLAN: named products plus quantities without a linked sales order are job orders even when the verb is خطط. Do not map the word planning alone to PRODUCTION_PLAN.
- Understand Modern Standard Arabic, ordinary Egyptian workplace Arabic, Arabic without diacritics, spelling variation, and Arabic-English code switching.
- Questions such as "المخزون كام؟", "فاضل كام في المخزن؟" and "stock المتاح قد ايه؟" mean an inventory-position REPORT, never an inventory adjustment.
- "علينا كام للموردين؟" means SUPPLIER_DUES. "دفعنا كام للموردين؟" means SUPPLIER_PAYMENTS. "دفعات مقدمة للموردين" means SUPPLIER_ADVANCES. Keep these meanings separate.
- "لينا كام عند العملاء؟" and "مين عليه فلوس؟" mean customer receivables. They do not create a receipt.
- "اعمل طلب شراء" means PURCHASE_REQUISITION; "اعمل أمر شراء للمورد" means PURCHASE_ORDER. "الخامات وصلت" is informational unless the user explicitly requests recording a GOODS_RECEIPT.
- "انتج", "شغل أمر إنتاج", or a product plus quantity means a production instruction only when it explicitly asks to create/plan/execute. "انتجنا كام؟" is a production REPORT.
- "الماكينة واقفة/عطلانة" means maintenance attention. "سجل العطل" is a maintenance mutation; "ايه الأعطال؟" is a REPORT.
- "فيه قطع مرفوضة/عيب" means quality/non-conformance context. Record nothing unless the user explicitly says سجل/أنشئ/افتح.
- "مين اتأخر؟" means EMPLOYEE_ATTENDANCE. "اعتمد الإجازة" is an approval action and must retain normal approval controls.
- "المبيعات", "المشتريات", "المخزن", "الإنتاج", "الحسابات", and "الصيانة" are generic business areas, not named entities.
- Preserve Latin document references such as PO-001, PR-001, JO-001, item codes, account codes, quantities, dates, EGP/USD and UOM values exactly.
- Never treat Arabic politeness or future phrasing as confirmation. Mutation still requires an explicit governed action and normal confirmation.
`;

export const EGYPT_ARABIC_RESPONSE_GUIDANCE = `
Currency examples: "1250.50 EGP" must remain "1250.50 EGP" in Arabic, and "430 USD" must remain "430 USD". An Arabic currency name may follow in parentheses but must never replace the ISO code.
For ar-EG responses, use clear professional Arabic that Egyptian office, stores and factory staff understand. Prefer: طلب شراء, أمر شراء, استلام أصناف, مورد, عميل, مخزن, رصيد المخزون, مواد خام, إنتاج تحت التشغيل, منتجات تامة, أمر إنتاج, قائمة مكونات, فحص الجودة, الصيانة, فاتورة, مديونيات العملاء, مستحقات الموردين, دليل الحسابات, ضريبة القيمة المضافة, جنيه مصري, اعتماد. Use familiar Egyptian wording when it improves clarity, but avoid slang that could make accounting or approval meaning ambiguous. Keep verified codes and all digits unchanged. Do not translate EGP, USD, SKU, PO, PR, GRN, BOM, UOM or document numbers; explain an acronym in Arabic once when useful.
`;

/** Restore translated currency names only when that exact currency is verified. */
export function preserveVerifiedCurrencyCodes(answer: string, facts: string): string {
  const aliases: [string, RegExp][] = [
    ['EGP', /جنيه(?:ًا|ا)?\s+مصري(?:ًا|ا)?/g],
    ['USD', /دولار(?:ًا|ا)?\s+أمريكي(?:ًا|ا)?/g],
  ];
  let result = answer;
  for (const [code, alias] of aliases) {
    if (new RegExp(`\\b${code}\\b`).test(facts) && !new RegExp(`\\b${code}\\b`).test(result)) {
      result = result.replace(alias, code);
    }
  }
  return result;
}

export const EGYPT_ARABIC_ACCEPTANCE_UTTERANCES = [
  "فاضل كام في المخزن؟",
  "stock النحاس المتاح قد ايه؟",
  "علينا كام للموردين؟",
  "دفعنا كام للموردين الشهر ده؟",
  "لينا كام عند العملاء؟",
  "اعمل طلب شراء للخامات الناقصة",
  "اعمل أمر شراء للمورد المذكور",
  "الخامات وصلت ولا لسه؟",
  "انتجنا كام النهارده؟",
  "شغل أمر إنتاج 100 قطعة",
  "الماكينة عطلانة",
  "سجل عطل للماكينة",
  "مين اتأخر النهارده؟",
  "ايه أوامر الشراء المفتوحة؟",
  "اعرض مستحقات الموردين بالدولار",
] as const;
