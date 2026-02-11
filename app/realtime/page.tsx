"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

/* ================= TYPES ================= */
type RawPowerData = {
  id: number;
  tegangan: number;
  arus: number;
  daya_watt: number;
  energi_kwh: number;
  frekuensi: number;
  pf: number;
  created_at: string;
};

type LiveChartData = {
  time: string;
  power: number;
};

// ✅ NEW: API Response Type
type ApiResponse = {
  success: boolean;
  data: RawPowerData[];
  count: number;
};

/* ================= PAGE ================= */
export default function RealtimeMonitoringPage() {
  const [last7Data, setLast7Data] = useState<RawPowerData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLive, setIsLive] = useState(true);

  /* ===== FETCH 7 DATA TERAKHIR DARI HOURLY_ENERGY TABLE ===== */
  useEffect(() => {
    const fetch7Data = async () => {
      try {
        console.log('📡 Fetching 7 latest data from hourly_energy table...');
        
        const res = await fetch("http://localhost:3001/power/last7");
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        // ✅ FIX: Parse the new response structure
        const json: ApiResponse = await res.json();
        
        console.log('✅ API Response:', json);
        
        // ✅ FIX: Extract data array from response object
        if (json.success && json.data && json.data.length > 0) {
          console.log(`✅ Received ${json.data.length} records from hourly_energy`);
          setLast7Data(json.data);
          setIsLive(true);
        } else {
          console.warn('⚠️ No data received or empty data array');
          setIsLive(false);
        }
      } catch (e) {
        console.error("❌ API error:", e);
        setIsLive(false);
      }
    };

    // Initial fetch
    fetch7Data();

    // Refresh every 5 seconds
    const interval = setInterval(fetch7Data, 5000);

    return () => clearInterval(interval);
  }, []);

  /* ===== CYCLE THROUGH 7 DATA EVERY 3 SECONDS ===== */
  useEffect(() => {
    if (last7Data.length === 0) return;

    const cycleInterval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % last7Data.length);
    }, 3000);

    return () => clearInterval(cycleInterval);
  }, [last7Data]);

  if (last7Data.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <motion.div 
            className="rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-gray-600">Loading 7 latest records from hourly_energy...</p>
          <p className="text-gray-400 text-sm mt-2">Connecting to database...</p>
        </div>
      </div>
    );
  }

  // Current data being displayed
  const currentData = last7Data[currentIndex];

  // ✅ FIX: Safely convert data to numbers
  const chartData: LiveChartData[] = last7Data.map((item) => ({
    time: new Date(item.created_at).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    power: Number(item.daya_watt) || 0,
  }));

  return (
    <div className="space-y-8 p-8 bg-gray-50 min-h-screen">
      {/* ================= HEADER ================= */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold text-gray-900">
            Real-time Monitoring
          </h1>
          <p className="text-gray-600 mt-2">
            Live data from <span className="font-semibold text-blue-600">hourly_energy</span> table
          </p>
        </div>

        {/* LIVE BADGE */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            isLive ? "bg-green-100" : "bg-red-100"
          }`}
        >
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`h-3 w-3 rounded-full ${
              isLive ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span
            className={`font-semibold ${
              isLive ? "text-green-700" : "text-red-700"
            }`}
          >
            {isLive ? "Live Streaming" : "Disconnected"}
          </span>
        </motion.div>
      </motion.div>

      {/* ================= DATA INFO BADGE ================= */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-center gap-3"
      >
        <div className="text-blue-600 text-3xl">🔄</div>
        <div className="flex-1">
          <p className="text-sm text-blue-900 font-bold">
            Displaying Record {currentIndex + 1} of {last7Data.length}
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Auto-cycling every 3 seconds | Database refresh every 5 seconds | 
            Current: {new Date(currentData.created_at).toLocaleString("id-ID")}
          </p>
        </div>
      </motion.div>

      {/* ================= GAUGE CARDS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <GaugeCard
          title="Voltage"
          value={Number(currentData?.tegangan) || 0}
          unit="V"
          max={250}
          color="#3b82f6"
          recordNumber={currentIndex + 1}
        />

        <GaugeCard
          title="Current"
          value={Number(currentData?.arus) || 0}
          unit="A"
          max={10}
          color="#10b981"
          recordNumber={currentIndex + 1}
        />

        <GaugeCard
          title="Power"
          value={Number(currentData?.daya_watt) || 0}
          unit="W"
          max={2000}
          color="#f59e0b"
          recordNumber={currentIndex + 1}
        />
      </div>

      {/* ================= ADDITIONAL METRICS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Frequency"
          value={Number(currentData?.frekuensi) || 50}
          unit="Hz"
          icon="📡"
          status={
            (Number(currentData?.frekuensi) || 0) >= 49 && 
            (Number(currentData?.frekuensi) || 0) <= 51 
              ? "Stable" 
              : "Unstable"
          }
        />

        <MetricCard
          title="Power Factor"
          value={Number(currentData?.pf) || 0}
          unit=""
          icon="⚡"
          status={(Number(currentData?.pf) || 0) > 0.8 ? "Good" : "Poor"}
        />

        <MetricCard
          title="Energy Used"
          value={Number(currentData?.energi_kwh) || 0}
          unit="kWh"
          icon="🔋"
          status={(Number(currentData?.energi_kwh) || 0) < 2 ? "Efficient" : "High"}
        />
      </div>

      {/* ================= ALL 7 RECORDS CHART ================= */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl p-8 shadow-lg"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Power Consumption Trend</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <motion.span 
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-2 w-2 bg-blue-500 rounded-full"
            />
            <span>Last 7 records from hourly_energy</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <defs>
              <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              tick={{ fill: "#6b7280", fontSize: 12 }}
            />
            <YAxis 
              tick={{ fill: "#6b7280" }}
              label={{ value: 'Power (W)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: "12px",
              }}
              labelStyle={{ fontWeight: "bold", marginBottom: "8px" }}
            />
            <Line
              type="monotone"
              dataKey="power"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={(props: any) => {
                const isCurrentPoint = props.index === currentIndex;
                return (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={isCurrentPoint ? 8 : 5}
                    fill={isCurrentPoint ? "#ef4444" : "#3b82f6"}
                    stroke={isCurrentPoint ? "#fff" : "none"}
                    strokeWidth={isCurrentPoint ? 2 : 0}
                  />
                );
              }}
              activeDot={{ r: 8 }}
              animationDuration={1000}
              animationEasing="ease-in-out"
            />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Historical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-600">Current Display</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Now: </span>
            <motion.span 
              key={Number(currentData?.daya_watt) || 0}
              initial={{ scale: 1.2, color: "#3b82f6" }}
              animate={{ scale: 1, color: "#2563eb" }}
              className="font-bold"
            >
              {Number(currentData?.daya_watt) || 0} W
            </motion.span>
          </div>
        </div>
      </motion.div>

      {/* ================= RECORDS TABLE ================= */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-3xl p-8 shadow-lg overflow-hidden"
      >
        <h2 className="text-2xl font-bold mb-6">Latest 7 Records from Database</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">#</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Time</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Voltage (V)</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Current (A)</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Power (W)</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Energy (kWh)</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">PF</th>
              </tr>
            </thead>
            <tbody>
              {last7Data.map((item, index) => (
                <motion.tr 
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                    index === currentIndex ? 'bg-blue-100' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      index === currentIndex 
                        ? 'bg-red-500 text-white' 
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(item.created_at).toLocaleTimeString("id-ID")}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold">
                    {Number(item.tegangan).toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold">
                    {Number(item.arus).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold">
                    {Number(item.daya_watt).toFixed(0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold">
                    {Number(item.energi_kwh).toFixed(3)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold">
                    {Number(item.pf).toFixed(2)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ================= DATA SOURCE INFO ================= */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3"
      >
        <div className="text-green-600 text-2xl">✅</div>
        <div className="flex-1">
          <p className="text-sm text-green-900 font-medium">
            Data Source: PostgreSQL Database (hourly_energy table)
          </p>
          <p className="text-xs text-green-700 mt-1">
            Fetching 7 latest records every 5 seconds | Auto-cycling display every 3 seconds
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/* ================= CIRCULAR GAUGE WITH FRAMER MOTION ================= */
function GaugeCard({
  title,
  value,
  unit,
  max,
  color,
  recordNumber,
}: {
  title: string;
  value: number;
  unit: string;
  max: number;
  color: string;
  recordNumber: number;
}) {
  // ✅ Convert to number safely
  const safeValue = Number(value) || 0;
  const percentage = Math.min((safeValue / max) * 100, 100);
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <motion.div 
      key={recordNumber}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-100 text-red-600">
          Record #{recordNumber}
        </span>
      </div>

      <div className="relative flex items-center justify-center mb-4">
        <svg width="200" height="200" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
          />

          <motion.circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeInOut" }}
            transform="rotate(-90 100 100)"
          />

          <text
            x="100"
            y="95"
            textAnchor="middle"
            className="text-4xl font-bold"
            fill="#111827"
          >
            {safeValue.toFixed(1)}
          </text>
          <text
            x="100"
            y="115"
            textAnchor="middle"
            className="text-lg"
            fill="#9ca3af"
          >
            {unit}
          </text>
        </svg>

        <motion.div
          key={safeValue}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full"
        >
          {percentage.toFixed(0)}%
        </motion.div>
      </div>

      <div className="text-center text-sm text-gray-500">
        Range: 0 - {max} {unit}
      </div>
    </motion.div>
  );
}

/* ================= METRIC CARD WITH ANIMATION ================= */
function MetricCard({
  title,
  value,
  unit,
  icon,
  status,
}: {
  title: string;
  value: number;
  unit: string;
  icon: string;
  status: string;
}) {
  // ✅ Convert to number safely
  const safeValue = Number(value) || 0;
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-2xl p-6 shadow-lg transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <motion.span 
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          className="text-3xl"
        >
          {icon}
        </motion.span>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
          status === "Good" || status === "Stable" || status === "Efficient"
            ? "bg-green-100 text-green-700"
            : "bg-yellow-100 text-yellow-700"
        }`}>
          {status}
        </span>
      </div>
      <h3 className="text-sm text-gray-600 mb-2">{title}</h3>
      <div className="flex items-end gap-2">
        <motion.span 
          key={safeValue}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-bold text-gray-900"
        >
          {safeValue.toFixed(2)}
        </motion.span>
        {unit && <span className="text-xl text-gray-400 pb-1">{unit}</span>}
      </div>
    </motion.div>
  );
}