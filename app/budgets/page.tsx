"use client";

import { useEffect, useState } from "react";
import styles from "./budgets.module.css";
import { initialBudgets, loadBudgets, saveBudgets, type BudgetMap } from "../../lib/budgets";


export default function Budgets() {
  const [budgets, setBudgets] = useState<BudgetMap>(initialBudgets);
  const [hasLoadedBudgets, setHasLoadedBudgets] = useState(false);

  useEffect(() => {
    setBudgets(loadBudgets());
    setHasLoadedBudgets(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedBudgets) {
      return;
    }

    saveBudgets(budgets);
  }, [budgets, hasLoadedBudgets]);

  function updateCategory(cat: string, amt: number) {
    // ensure we don't store NaN; fall back to 0 if parsing fails
    const safe = isNaN(amt) ? 0 : amt;
    setBudgets((prev) => ({ ...prev, [cat]: safe }));
  }

  return (
    <div className={styles.container + ' container'}>
      <h1 className={styles.title}>Budget</h1>
      <div className={styles.budgetList + ' card'}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Category</th>
              <th>Budget</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(budgets).map(([cat, amt]) => (
              <tr key={cat}>
                <td>{cat}</td>
                <td>
                  <input
                    type="number"
                    value={amt === 0 ? "" : amt}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateCategory(cat, v === "" ? 0 : parseFloat(v));
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
