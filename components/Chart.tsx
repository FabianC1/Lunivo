"use client";

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import styles from './Chart.module.css';
import { useTheme } from './ThemeProvider';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ChartProps {
  data: Record<string, number>;
}

export default function Chart({ data }: ChartProps) {
  const labels = Object.keys(data);
  const values = Object.values(data);

  const { theme } = useTheme();

  // helper to resolve CSS variable into computed color string
  const getColor = (varName: string) => {
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName);
    return val ? val.trim() : varName;
  };

  // define base palettes using actual values
  const lightPalette = [
    getColor('--primary-color'),
    getColor('--accent-color'),
    '#FBBF24', // amber-400
    '#EF4444', // red-500
    '#8B5CF6', // indigo-500
    '#10B981', // green-500
  ];

  const darkPalette = [
    '#6366F1',
    '#22C55E',
    '#FBBF24',
    '#EF4444',
    '#8B5CF6',
    '#3B82F6',
  ];

  const palette = theme === 'dark' ? darkPalette : lightPalette;

  // assign a color per label by index; this guarantees uniqueness up to palette length
  const backgroundColor = labels.map((_, idx) => palette[idx % palette.length]);

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor,
        hoverOffset: 6,
        borderWidth: 2,
        borderColor: 'var(--bg-color)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '50%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'var(--text-color)',
        },
      },
    },
  };

  return (
    <div className={styles.chartWrapper}>
      <Doughnut data={chartData} options={options} />
    </div>
  );
}