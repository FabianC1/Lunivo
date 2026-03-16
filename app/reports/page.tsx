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
  // Example data for each month
  const monthCharts = [
    { title: 'January 2026', data: { Jan: 1200, Feb: 950, Mar: 1450, Apr: 1300, May: 1600, Jun: 1100, Jul: 1750, Aug: 1400, Sep: 1550, Oct: 1700, Nov: 1650, Dec: 1800 } },
    { title: 'February 2026', data: { Jan: 1100, Feb: 1200, Mar: 1250, Apr: 1350, May: 1400, Jun: 1500, Jul: 1600, Aug: 1700, Sep: 1550, Oct: 1650, Nov: 1750, Dec: 1800 } },
    { title: 'March 2026', data: { Jan: 1300, Feb: 1400, Mar: 1500, Apr: 1600, May: 1700, Jun: 1800, Jul: 1750, Aug: 1650, Sep: 1550, Oct: 1450, Nov: 1350, Dec: 1250 } },
  ];

  return (
    <div className={styles.container + ' container'}>
      <h1 className={styles.title}>Monthly Reports</h1>
      {monthCharts.slice().reverse().map((month, idx) => (
        <div className={styles.chartSection} key={idx}>
          <h2>{month.title}</h2>
          <Chart data={month.data} type="line" />
        </div>
      ))}
    </div>
  );
}
