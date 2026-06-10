# Winter Family Finance — Claude Instructions
## Governance Protocol v2 — June 2026

## MANDATORY: Three-Agent Approval Before Any Update

Every change to budget data, income, categories, or plan logic MUST pass:

```
PROPOSED CHANGE → QA → CPA → PM → UPDATE SITE + GITHUB
```

**No exceptions. No partial updates. All three must approve.**

---

## Agent 1: QA (quality-assurance)
**File:** `QA_AGENT.md`
**Runs:** First, on every proposed change
**Checks:**
- Math: every sum, every calculation, every percentage
- Installments: annual ÷ payments = monthly (verify both numbers)
- Logic: no double-counting, no cancelled items in totals
- Completeness: all layers present, no known item missing
- Consistency: same numbers across all files

**Output:** APPROVED ✓ / REJECTED ✗ / CONDITIONAL ⚠️

---

## Agent 2: CPA (cpa-controller)
**File:** `CPA_AGENT.md`
**Runs:** After QA approves
**Checks:**
- Income verification
- Category audit with flags
- Financial logic (overdraft, loan, rates)
- Israeli household benchmarks
- Atomic habits alignment

**Output:** Audit report with ✅🟠🔴 flags

---

## Agent 3: PM (project-manager)
**File:** `PM_AGENT.md`
**Runs:** After CPA approves
**Checks:**
- Plan alignment
- Milestone impact
- Action items updated
- Timeline recalculated if needed

**Output:** Updated action plan

---

## Approved Master Budget — June 2026

**QA verified:** 2026-06-09 ✅
**CPA approved:** 2026-06-09 ✅
**PM approved:** 2026-06-09 ✅

| Item | Value |
|------|-------|
| Income | ₪32,311 |
| Layer 1 (Bank+Loans) | ₪8,787 |
| Layer 2 (Fixed CC) | ₪3,082 |
| Layer 3 (Kids) | ₪2,263 |
| Layer 4 (Variable) | ₪8,899 |
| Layer 5 (Travel savings) | ₪2,500 |
| Total expenses | ₪25,531 |
| **Surplus** | **₪6,780 (21%)** |
| Asia trip ready | August 2027 |

---

## What Requires Full Three-Agent Review

🔴 **Always requires QA → CPA → PM:**
- Any income change (salary update, new income source)
- Any fixed expense change (new item, cancellation, amount change)
- Any kids activity change
- Any savings plan change
- Any loan/overdraft change
- Any installment item (must verify annual ÷ payments math)

🟡 **Requires QA math check minimum:**
- Monthly actual spend data
- Category spending updates
- Percentage recalculation

🟢 **Can update directly:**
- Milestone dates (no math impact)
- Notes and descriptions
- New agent rules (no number changes)

---

## Data Integrity Rules

1. **Single source of truth:** `data.js` is master. All HTML files and agents derive from it.
2. **Installments:** always state `annual amount ÷ number of payments = monthly`. QA verifies both.
3. **Cancelled items:** must be removed from all totals before QA review.
4. **Bonus income:** never in base monthly budget. Separate rule: bonus → loan same day.
5. **ביחד בשבילך:** net cost only (~₪80). Never gross. Never counted as category expense.
6. **Travel:** zero on CC. External account only (pikkadon or keren).
7. **Kids:** protected=true. QA rejects any budget that shows kids items as cuttable.
8. **Loan:** ₪875 must be in Layer 1 (loans), not floating.

---

## File Map

| File | Purpose | Updated by |
|------|---------|------------|
| `data.js` | Master data | After all 3 agents approve |
| `budget-monthly.html` | Main budget page | After all 3 agents approve |
| `index.html` | Dashboard | After QA + CPA |
| `overdraft.html` | Loan/OD page | After QA + CPA |
| `budget.html` | Category detail | After all 3 agents approve |
| `QA_AGENT.md` | QA rules + reference | QA self-updates |
| `CPA_AGENT.md` | CPA rules + audit | After QA approves |
| `PM_AGENT.md` | PM rules + plan | After CPA approves |
| `CLAUDE.md` | This file — governance | After all 3 approve |
| `FINAL_PLAN.md` | Agreed plan | After all 3 approve |

---

## Change Log

| Date | Change | QA | CPA | PM |
|------|--------|----|----|-----|
| 2026-06-09 | Initial full budget build | ✅ | ✅ | ✅ |
| 2026-06-09 | Katya +₪1,500, scouts/school/water/car corrections | ✅ | ✅ | ✅ |
| 2026-06-09 | Travel: pikkadon ₪1,000 + keren gemelos ₪1,500 | ✅ | ✅ | ✅ |
| 2026-06-09 | QA agent added to governance protocol | ✅ | ✅ | ✅ |
