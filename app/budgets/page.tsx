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

// dummy spending so chart has something
const dummySpending: Budgets = {
  Food: 420,
  Transport: 90,
  Utilities: 160,
  Other: 72,
};

export default function Budgets() {
  const [budgets, setBudgets] = useState<Budgets>(initialBudgets);

  function updateCategory(cat: string, amt: number) {
    setBudgets((prev) => ({ ...prev, [cat]: amt }));
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
                    value={amt}
                    onChange={(e) => updateCategory(cat, parseFloat(e.target.value))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.chartSection}>
        <h2>Budget vs Spending</h2>
        <Chart data={{
          ...budgets,
          ...(Object.keys(dummySpending).reduce((acc, k) => ({
            ...acc,
            [k + " spent"]: dummySpending[k],
          }), {} as Record<string, number>))
        }} type="bar" />
      </div>
    </div>
  );
}
