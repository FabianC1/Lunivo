"use client";

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ChartProps {
  data: Record<string, number>;
}

export default function Chart({ data }: ChartProps) {
  const labels = Object.keys(data);
  const values = Object.values(data);

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: [
          'var(--primary-color)',
          'var(--accent-color)',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
        ],
        hoverOffset: 4,
      },
    ],
  };

  return (
    <div>
      <Doughnut data={chartData} />
    </div>
  );
}