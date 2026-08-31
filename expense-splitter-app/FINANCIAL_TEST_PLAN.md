# Eplitt Financial Calculations Test Plan

## 1. Executive Summary & Existing Representation Audit

### Current Financial Data Representation
In the existing codebase (`src/utils/splitLogic.js`, `src/components/AddExpenseModal.jsx`, `src/components/QuickAddExpense.jsx`, `src/components/SettleUpModal.jsx`):
- All amounts, shares, and balances are represented using native JavaScript **IEEE 754 double-precision binary floating-point numbers** (`Number` / `parseFloat`).
- Equal splits divide amounts directly: `amount / selected.length` (e.g., `100 / 3` yields `33.333333333333336`).
- Rounding is applied inconsistently and late at the presentation layer using `.toFixed(2)` or `Number(amount.toFixed(2))`.
- Settlements are modeled as synthetic expense records (`isSettlement: true`) and mutate `totalPaid` and `totalShare` in `calculateBalances`, directly contaminating expense metrics on the Dashboard.

### Risks of the Existing Representation
1. **Penny Leakage / Unallocated Remainders**: Dividing amounts like $100 among 3 users results in each user paying $33.33 when formatted with `.toFixed(2)`, summing to $99.99 ($0.01 unallocated).
2. **Floating-Point Accumulator Drift**: Successive binary addition of floats (e.g., `0.1 + 0.2 !== 0.3`) causes non-zero residue balances (e.g., `$0.0000000000000004`), breaking the zero-sum balance invariant.
3. **Settlement Cash-Flow Distortion**: Because settlements increase `totalPaid`, recording a debt reimbursement inflates total group spending and distorts spending percentage progress bars.
4. **ID Collision on Rapid Creation**: Expenses generated with `id: Date.now()` collide when submitted within the same millisecond or during batch operations.
5. **No Concurrency Control / Idempotency**: Submitting an expense multiple times during a network delay duplicates transactions.

### Recommended Target Decimal Model: Integer Minor Units (Cents)
- All internal calculations, storage, and transfers must operate in **integer cents** (e.g., `$100.00` = `10000` integer cents).
- Splitting must use deterministic integer division with **remainder distribution** (distributing remainder cents to the payer or first $K$ participants) so that:
  $$\sum_{i=1}^{N} \text{share}_i \equiv \text{totalAmount}$$
- Net group balance zero-sum invariant must be strictly conserved:
  $$\sum_{i=1}^{N} \text{Balance}_i \equiv 0 \quad \text{(in integer cents)}$$

---

## 2. Calculation Matrix & Test Coverage Plan

| Test ID | Category | Scenario / Inputs | Expected Output & Invariant Checks |
|---|---|---|---|
| **FIN-01** | Equal Split | $100.00 split equally among 3 participants (A, B, C). Payer: A. | Shares: A=$33.34, B=$33.33, C=$33.33.<br>Sum of shares = $100.00.<br>Balances: A = +$66.66, B = -$33.33, C = -$33.33.<br>Sum of balances = $0.00. |
| **FIN-02** | Uneven Cents Division | $10.01 split equally among 3 participants. Payer: A. | Shares: A=$3.35, B=$3.33, C=$3.33.<br>Sum of shares = $10.01.<br>Balances: A = +$6.66, B = -$3.33, C = -$3.33.<br>Sum of balances = $0.00. |
| **FIN-03** | Sub-Penny Splits | $0.05 split equally among 2 participants. Payer: A. | Shares: A=$0.03, B=$0.02.<br>Sum of shares = $0.05.<br>Balances: A = +$0.02, B = -$0.02.<br>Sum of balances = $0.00. |
| **FIN-04** | One Payer, Multiple Beneficiaries | Payer A pays $150.00 for beneficiaries B, C, D (A is NOT a beneficiary). | Shares: B=$50.00, C=$50.00, D=$50.00, A=$0.00.<br>Balances: A = +$150.00, B = -$50.00, C = -$50.00, D = -$50.00.<br>Sum of balances = $0.00. |
| **FIN-05** | Multiple Payers (Split Payment) | Expense of $100.00 where A paid $60.00 and B paid $40.00; split equally among A, B, C. | If multi-payer supported: A paid 60, B paid 40, each share 33.33/33.34. Balances: A = +$26.66, B = +$6.67, C = -$33.33. Sum = $0.00.<br>*(If multi-payer not supported, must validate single-payer requirement or accept multiple atomic transactions).* |
| **FIN-06** | Exact Amount Split (Valid) | $125.50 split as: A=$40.00, B=$50.50, C=$35.00. Payer: A. | Validation passes (`40.00 + 50.50 + 35.00 == 125.50`).<br>Balances: A = +$85.50, B = -$50.50, C = -$35.00.<br>Sum of balances = $0.00. |
| **FIN-07** | Exact Amount Split (Mismatched) | $100.00 with manual entries: A=$30.00, B=$40.00, C=$29.99 (Sum = $99.99). | Validation fails with clear error: `Shares ($99.99) do not equal total amount ($100.00). Difference: $0.01`. Transaction rejected. |
| **FIN-08** | Percentage Split (100% Exact) | $200.00 split by percentages: A=50%, B=30%, C=20%. Payer: A. | Shares: A=$100.00, B=$60.00, C=$40.00.<br>Balances: A = +$100.00, B = -$60.00, C = -$40.00.<br>Sum of balances = $0.00. |
| **FIN-09** | Percentage Split (Uneven & Invalid) | $100.00 split: A=33.33%, B=33.33%, C=33.34% vs Invalid (Total = 99% or 105%). | Valid: Allocates $33.33, $33.33, $33.34.<br>Invalid: Rejects any split where sum of percentages $\neq 100.00\%$. |
| **FIN-10** | Share/Ratio Split | $120.00 split by weights: A=2 parts, B=1 part, C=1 part (Total 4 parts). Payer: B. | Unit value = $120 / 4 = $30.00.<br>Shares: A=$60.00, B=$30.00, C=$30.00.<br>Balances: A = -$60.00, B = +$90.00, C = -$30.00.<br>Sum of balances = $0.00. |
| **FIN-11** | Settlement After Expenses | A pays $90 for A, B, C ($30 each). B settles $30 to A. | After expense: A=+$60, B=-$30, C=-$30.<br>After settlement: A=+$30, B=$0, C=-$30.<br>Dashboard total group spending remains exactly $90.00 (not $120.00). |
| **FIN-12** | Edit Expense After Settlement | Expense edited from $90 to $120 after B has already settled $30 to A. | New shares: $40 each.<br>Balances: A net = $120 (paid) - $40 (share) + $30 (settlement received) = +$110; wait, netting: A = +$120 - $40 + $30 = +$110? No: A balance = +$50, B balance = -$10, C balance = -$40.<br>Sum of balances = $0.00. |
| **FIN-13** | Delete Expense | Expense of $60 (A paid for A, B) deleted from group history. | Balances immediately revert to prior state.<br>Audit activity log appends deletion record.<br>Zero-sum invariant preserved. |
| **FIN-14** | Multi-Currency Handling | Attempting to add an expense with mixed currency symbol or unsupported format. | Validates explicit ISO-4217 currency code (e.g. `USD`). Prevents mixing currencies without explicit exchange rate conversion. |
| **FIN-15** | Boundary & Extreme Values | Test inputs: `$0.00`, `-$50.00`, `$10,000,000.00`, `NaN`, `"abc"`, `1e20`. | `$0.00` and negative values rejected with validation error.<br>Exceedingly large numbers ($>10^8$) rejected to avoid overflow.<br>Non-numeric/NaN inputs sanitized and rejected. |
| **FIN-16** | Idempotency & Duplicate Submission | User clicks "Save Expense" 3 times in 200ms due to slow network. | Client generates a unique transaction UUID (`clientMutationId`). Server/state ensures only 1 expense record is persisted. |
| **FIN-17** | Cross-Group Record Isolation | User in Group 1 attempts to query, settle, or modify expenses belonging to Group 2. | Supabase RLS and client state reject request with `403 Forbidden` / RLS violation; no data leak. |
| **FIN-18** | Global Net Balance Invariant | Property-based testing generating 500 randomized transactions (expenses, custom splits, settlements, edits, deletions). | In all 500 generated states: $\sum_{p \in P} \text{Balance}_p \equiv 0$ with 0 cent deviation. |

---

## 3. Test Implementation Specifications

### Automated Test Suite Architecture
1. **Unit Tests (`src/utils/__tests__/splitLogic.test.js`)**:
   - Pure mathematical calculations for integer cent conversion, equal/unequal allocation, remainder distribution, and balance netting.
2. **Settlement Minimization Tests (`src/utils/__tests__/settlementAlgorithm.test.js`)**:
   - Greedy two-pointer debt simplification verifying optimal $O(N)$ settlement transaction graphs.
3. **Property-Based Invariant Tests (`src/utils/__tests__/financialInvariants.test.js`)**:
   - Automated randomized simulation asserting $\sum \text{Balances} \equiv 0$ across arbitrary combinations of splits and deletions.
4. **Component & Modal Validation Tests (`src/components/__tests__/ExpenseValidation.test.jsx`)**:
   - Form input validation for negative numbers, zero, mismatched exact splits, and invalid percentages.

---

## 4. Approval Request

> [!IMPORTANT]
> The calculation code has **not** been modified.
> Please review and approve this financial test plan before we proceed with implementing integer-cent arithmetic and calculation repairs.
