"use client";

import { useState } from "react";
import styles from "./budgets.module.css";
import Chart from "../../components/Chart";

interface Budgets {
  [category: string]: number;
}

const initialBudgets: Budgets = {
  Food: 500,
  Transport: 150,
  Utilities: 200,
  Other: 100,
};


export default function Budgets() {
  const [budgets, setBudgets] = useState<Budgets>(initialBudgets);

  function updateCategory(cat: string, amt: number) {
    // ensure we don't store NaN; fall back to 0 if parsing fails
    const safe = isNaN(amt) ? 0 : amt;
    setBudgets((prev) => ({ ...prev, [cat]: safe }));
  }

  return (
    <div className={styles.container + ' container'}>
      <h1 className={styles.title}>Budgets</h1>
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

      <div className={styles.chartSection}>
        <h2>Budgets</h2>
        <Chart data={budgets} type="bar" />
      </div>
    </div>
  );
}
