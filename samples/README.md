# Sample Files for Testing

## CSV (Delimited) Files

### `sample_original.csv` → `sample_modified.csv`

These files simulate an employee database export before and after updates.

**Differences to find:**

| Type | Details |
|------|---------|
| Modified | Row 1001: salary changed 95000 → 99000 |
| Modified | Row 1002: last_name "Johnson" → "Johnson-Lee", email changed, salary 72000 → 78000 |
| Modified | Row 1004: department "HR" → "Product", salary 68000 → 71000 |
| Modified | Row 1005: status "active" → "inactive" |
| Modified | Row 1006: salary 112000 → 118000 |
| Removed | Row 1007 (Robert Miller) — deleted in modified |
| Modified | Row 1008: salary 98000 → 102000 |
| Modified | Row 1009: salary 91000 → 95000 |
| Modified | Row 1010: salary 65000 → 69000 |
| Modified | Row 1012: department "Marketing" → "Sales", salary 70000 → 74000 |
| Modified | Row 1014: status "active" → "inactive" |
| Modified | Row 1015: salary 115000 → 120000 |
| Added | Row 1016 (Kevin White) — new employee |
| Added | Row 1017 (Rachel Clark) — new employee |

**Recommended test settings:**
- Delimiter: Comma
- Header: Yes
- Match Strategy: Key Column
- Key Column: 0 (id)

---

## Fixed-Width Files

### `fixed_width_original.dat` → `fixed_width_modified.dat`

Same employee data in fixed-width format (no delimiters, positional columns).

**Layout (use `fixed_width_schema.json` to import):**

| Field | Start | Length | Type |
|-------|-------|--------|------|
| Employee_ID | 0 | 4 | Numeric |
| First_Name | 4 | 10 | String |
| Last_Name | 14 | 10 | String |
| Department | 24 | 12 | String |
| Salary | 36 | 6 | Numeric |
| Hire_Date | 42 | 8 | Date (YYYYMMDD) |
| Sequence | 50 | 4 | Numeric |

**Recommended test settings:**
- Format: Fixed Width
- Import schema: `fixed_width_schema.json`
- Match Strategy: Key Column
- Key Column: 0 (Employee_ID)
