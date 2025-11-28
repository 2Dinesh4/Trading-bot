import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';

export default function LiveChart({ isDark, currentPrice, entryPrice, stopLossPrice, targetPrice }) {
  const [chartData, setChartData] = useState([]);
  const [lastPrice, setLastPrice] = useState(0);
  const [lineColor, setLineColor] = useState('#10b981');

  useEffect(() => {
    if (!currentPrice || currentPrice === 0) return;

    const now = new Date().toLocaleTimeString();

    setChartData(prev => {
      const newData = [...prev, { time: now, price: currentPrice }];
      // Keep only last 50 points
      return newData.slice(-50);
    });

    // Change color based on price movement
    if (currentPrice > lastPrice && lastPrice > 0) {
      setLineColor('#10b981'); // Green
    } else if (currentPrice < lastPrice && lastPrice > 0) {
      setLineColor('#ef4444'); // Red
    }

    setLastPrice(currentPrice);
  }, [currentPrice]);

  return (
    <div className="w-full" style={{ height: '350px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={isDark ? '#374151' : '#e5e7eb'}
          />
          <XAxis 
            dataKey="time" 
            stroke={isDark ? '#9ca3af' : '#374151'}
            tick={{ fontSize: 10 }}
          />
          <YAxis 
            domain={['auto', 'auto']}
            stroke={isDark ? '#9ca3af' : '#374151'}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: isDark ? '#1f2937' : '#ffffff',
              border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
              borderRadius: '8px',
              color: isDark ? '#fff' : '#000'
            }}
          />
          
          {/* Entry Line */}
          {entryPrice > 0 && (
            <ReferenceLine 
              y={entryPrice} 
              stroke="#6b7280" 
              strokeDasharray="5 5"
              label={{ value: 'Entry', position: 'right', fill: '#6b7280' }}
            />
          )}
          
          {/* Stop Loss Line */}
          {stopLossPrice > 0 && (
            <ReferenceLine 
              y={stopLossPrice} 
              stroke="#ef4444" 
              strokeWidth={2}
              label={{ value: 'Stop Loss', position: 'right', fill: '#ef4444' }}
            />
          )}
          
          {/* Target Line */}
          {targetPrice > 0 && (
            <ReferenceLine 
              y={targetPrice} 
              stroke="#10b981" 
              strokeWidth={2}
              label={{ value: 'Target', position: 'right', fill: '#10b981' }}
            />
          )}
          
          {/* Price Line */}
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
