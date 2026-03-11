"use client";

import { useState } from "react";
import styles from "./reports.module.css";
import Chart from "../../components/Chart";

// monthly totals dummy data
const monthlyData = {
  "Jan": 1200,
  "Feb": 950,
  "Mar": 1450,
  "Apr": 1300,
  "May": 1600,
  "Jun": 1100,
  "Jul": 1750,
  "Aug": 1400,
  "Sep": 1550,
  "Oct": 1700,
  "Nov": 1650,
  "Dec": 1800,
};

export default function Reports() {
  const [data] = useState(monthlyData);

  return (
    <div className={styles.container + ' container'}>
      <h1 className={styles.title}>Monthly Overview</h1>
      <div className={styles.chartSection}>
        <Chart data={data} type="line" />
      </div>
    </div>
  );
}
