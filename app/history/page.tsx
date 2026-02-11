"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/* ================= TYPES ================= */
type TimeFilter = "Hourly" | "Daily" | "Monthly";

type TrendData = {
  time: string;
  energy: number;
  voltage?: number;
  current?: number;
  hour?: number;
};

type DailyUsageData = {
  day: string;
  usage: number;
  date: string;
};

type Statistics = {
  total_energy: number;
  avg_daily_usage: number;
  peak_usage: number;
  peak_hour: string;
  total_days?: number;
};

type ApiResponse = {
  success: boolean;
  data: any[];
  count: number;
  message?: string;
};

type ApiResponseStats = {
  success: boolean;
  data: Statistics;
};

/* ================= ENERGY CONSUMPTION THRESHOLDS ================= */
// Berdasarkan standar konsumsi listrik rumah tangga Indonesia & Internasional
const ENERGY_THRESHOLDS = {
  // DAILY (per hari dalam kWh)
  daily: {
    veryLow: 3,      // < 3 kWh/hari = Sangat rendah (rumah kecil, 1-2 orang, hemat listrik)
    low: 8,          // 3-8 kWh/hari = Rendah (rumah sedang, 2-3 orang, penggunaan normal)
    normal: 15,      // 8-15 kWh/hari = Normal (rumah sedang-besar, 3-4 orang)
    high: 25,        // 15-25 kWh/hari = Tinggi (rumah besar, 4-5 orang, AC, water heater)
    veryHigh: 25,    // > 25 kWh/hari = Sangat Tinggi (penggunaan berlebih, banyak AC, kolam renang)
  },
  // HOURLY (per jam dalam kWh)
  hourly: {
    veryLow: 0.1,    // < 0.1 kWh/jam = Sangat rendah (lampu & peralatan minimal)
    low: 0.3,        // 0.1-0.3 kWh/jam = Rendah (lampu, TV, charger)
    normal: 0.8,     // 0.3-0.8 kWh/jam = Normal (+ kulkas, kipas angin)
    high: 1.5,       // 0.8-1.5 kWh/jam = Tinggi (+ AC 1 unit, komputer)
    veryHigh: 1.5,   // > 1.5 kWh/jam = Sangat Tinggi (AC multiple, water heater, oven)
  },
  // MONTHLY (per bulan dalam kWh)
  monthly: {
    veryLow: 90,     // < 90 kWh/bulan = Sangat rendah (900 VA)
    low: 240,        // 90-240 kWh/bulan = Rendah (1300 VA)
    normal: 450,     // 240-450 kWh/bulan = Normal (2200 VA)
    high: 750,       // 450-750 kWh/bulan = Tinggi (3500-4400 VA)
    veryHigh: 750,   // > 750 kWh/bulan = Sangat Tinggi (5500 VA+)
  }
};

/* ================= HELPER FUNCTION: GET ENERGY STATUS ================= */
function getEnergyStatus(usage: number, period: 'hourly' | 'daily' | 'monthly'): {
  status: string;
  color: string;
  description: string;
} {
  const thresholds = ENERGY_THRESHOLDS[period];
  
  if (usage < thresholds.veryLow) {
    return {
      status: 'Very Low',
      color: 'bg-green-100 text-green-800',
      description: 'Konsumsi sangat hemat'
    };
  } else if (usage < thresholds.low) {
    return {
      status: 'Low',
      color: 'bg-green-100 text-green-700',
      description: 'Konsumsi rendah'
    };
  } else if (usage < thresholds.normal) {
    return {
      status: 'Normal',
      color: 'bg-blue-100 text-blue-700',
      description: 'Konsumsi normal'
    };
  } else if (usage < thresholds.high) {
    return {
      status: 'High',
      color: 'bg-yellow-100 text-yellow-700',
      description: 'Konsumsi tinggi'
    };
  } else {
    return {
      status: 'Very High',
      color: 'bg-red-100 text-red-700',
      description: 'Konsumsi sangat tinggi'
    };
  }
}

/* ================= HELPER: CALCULATE COST ================= */
// Tarif listrik Indonesia (rata-rata) per kWh
const ELECTRICITY_RATES = {
  R1_900VA: 1444.70,   // Rp per kWh untuk 900 VA
  R1_1300VA: 1444.70,  // Rp per kWh untuk 1300 VA
  R1_2200VA: 1444.70,  // Rp per kWh untuk 2200 VA (subsidi)
  R2_3500VA: 1699.53,  // Rp per kWh untuk 3500-5500 VA (non-subsidi)
};

function calculateCost(kWh: number): { idr: number; usd: number } {
  // Gunakan tarif rata-rata R1 2200VA (paling umum di Indonesia)
  const costIDR = kWh * ELECTRICITY_RATES.R1_2200VA;
  const costUSD = costIDR / 15500; // Kurs rata-rata USD to IDR
  
  return {
    idr: costIDR,
    usd: costUSD
  };
}

/* ================= API CONFIG ================= */
const API_BASE_URL = 'http://localhost:3001';

/* ================= MAIN PAGE ================= */
export default function EnergyUsageHistoryPage() {
  const [activeFilter, setActiveFilter] = useState<TimeFilter>("Daily");
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [dailyUsageData, setDailyUsageData] = useState<DailyUsageData[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    total_energy: 0,
    avg_daily_usage: 0,
    peak_usage: 0,
    peak_hour: "00:00",
    total_days: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  /* ===== FETCH STATISTICS ===== */
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        console.log('📡 [Stats] Fetching statistics from ALL data...');
        const res = await fetch(`${API_BASE_URL}/power/statistics`);
        
        if (!res.ok) {
          console.error('❌ [Stats] API error:', res.status);
          return;
        }
        
        const response: ApiResponseStats = await res.json();
        console.log('✅ [Stats] Raw response:', response);
        
        if (response.success && response.data) {
          setStatistics({
            total_energy: Number(response.data.total_energy) || 0,
            avg_daily_usage: Number(response.data.avg_daily_usage) || 0,
            peak_usage: Number(response.data.peak_usage) || 0,
            peak_hour: response.data.peak_hour || "00:00",
            total_days: Number(response.data.total_days) || 0,
          });
        }
        
      } catch (err) {
        console.error("❌ [Stats] Failed to fetch:", err);
      }
    };

    fetchStatistics();
    const interval = setInterval(fetchStatistics, 60000);
    return () => clearInterval(interval);
  }, []);

  /* ===== FETCH TREND DATA BERDASARKAN FILTER (SEMUA DATA) ===== */
  useEffect(() => {
    const fetchTrendData = async () => {
      console.log(`\n🔄 [${activeFilter}] Starting fetch ALL data...`);
      setLoading(true);

      try {
        let endpoint = "";
        
        if (activeFilter === "Hourly") {
          endpoint = `${API_BASE_URL}/power/hourly/all`;
        } else if (activeFilter === "Daily") {
          endpoint = `${API_BASE_URL}/power/daily/all`;
        } else {
          endpoint = `${API_BASE_URL}/power/monthly/all`;
        }

        console.log(`📡 [${activeFilter}] Endpoint: ${endpoint}`);

        const res = await fetch(endpoint);
        
        if (!res.ok) {
          console.error(`❌ [${activeFilter}] HTTP ${res.status}`);
          setTrendData([]);
          return;
        }
        
        const response: ApiResponse = await res.json();
        console.log(`✅ [${activeFilter}] Raw response:`, response);

        if (!response.success || !Array.isArray(response.data)) {
          console.error(`❌ [${activeFilter}] Invalid response format`);
          setTrendData([]);
          return;
        }

        if (response.data.length === 0) {
          console.warn(`⚠️ [${activeFilter}] Empty data array`);
          setTrendData([]);
          return;
        }

        console.log(`📊 [${activeFilter}] Processing ${response.data.length} records`);

        // Format data
        const formattedData: TrendData[] = response.data.map((item: any) => {
          return {
            time: item.time || `Point ${response.data.indexOf(item) + 1}`,
            energy: Number(item.energy || item.total_energy) || 0,
            voltage: item.voltage ? Number(item.voltage) : undefined,
            current: item.current ? Number(item.current) : undefined,
            hour: item.hour,
          };
        });

        console.log(`✨ [${activeFilter}] Formatted count: ${formattedData.length}`);
        setTrendData(formattedData);
        setLastUpdate(new Date());
        
      } catch (err) {
        console.error(`❌ [${activeFilter}] Fetch error:`, err);
        setTrendData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendData();
  }, [activeFilter]);

  /* ===== FETCH DAILY USAGE DATA (Bar Chart) ===== */
  useEffect(() => {
    const fetchDailyUsage = async () => {
      try {
        console.log('📡 [Bar] Fetching ALL daily data...');
        const res = await fetch(`${API_BASE_URL}/power/daily/all`);
        
        if (!res.ok) {
          console.error('❌ [Bar] API error:', res.status);
          setDailyUsageData([]);
          return;
        }
        
        const response: ApiResponse = await res.json();
        console.log('✅ [Bar] Raw response:', response);

        if (!response.success || !Array.isArray(response.data)) {
          console.warn('⚠️ [Bar] Invalid format');
          setDailyUsageData([]);
          return;
        }
        
        if (response.data.length === 0) {
          console.warn('⚠️ [Bar] No data');
          setDailyUsageData([]);
          return;
        }

        // Format data - ambil 30 terakhir untuk bar chart
        const last30 = response.data.slice(-30);
        const formatted: DailyUsageData[] = last30.map((item: any) => ({
          day: item.day_name || item.time || 'Unknown',
          usage: Number(item.energy || item.total_energy) || 0,
          date: item.date || new Date().toISOString(),
        }));

        console.log('✨ [Bar] Formatted:', formatted.length, 'records');
        setDailyUsageData(formatted);
        
      } catch (err) {
        console.error("❌ [Bar] Failed:", err);
        setDailyUsageData([]);
      }
    };

    fetchDailyUsage();
    const interval = setInterval(fetchDailyUsage, 300000);
    return () => clearInterval(interval);
  }, []);

  /* ===== MANUAL REFRESH ===== */
  const handleRefresh = () => {
    setActiveFilter(activeFilter); // Trigger useEffect
  };

  // Loading state
  if (loading && trendData.length === 0 && dailyUsageData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading energy data...</p>
          <p className="text-sm text-gray-500 mt-2">
            Fetching ALL {activeFilter.toLowerCase()} data from database
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* ================= HEADER ================= */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">
            Energy Usage History
          </h1>
          <p className="text-gray-600 mt-2">
            Complete historical data from <span className="font-semibold text-blue-600">PostgreSQL Database</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {lastUpdate.toLocaleString('id-ID')}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          <RefreshCw size={20} />
          <span className="text-sm font-medium">
            Refresh Data
          </span>
        </button>
      </div>

      {/* ================= TIME FILTER TABS ================= */}
      <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm">
        <div className="flex gap-3">
          {(["Hourly", "Daily", "Monthly"] as TimeFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                activeFilter === filter
                  ? "bg-blue-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
        
        {/* Data Count Indicator */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold text-blue-600">{trendData.length}</span> data points
            <span className="ml-2 text-gray-500">
              ({activeFilter === "Hourly" && "All hourly records"}
              {activeFilter === "Daily" && "All daily records"}
              {activeFilter === "Monthly" && "All monthly records"})
            </span>
          </div>
          
          {loading && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span>Refreshing...</span>
            </div>
          )}
        </div>
      </div>

      {/* ================= ENERGY THRESHOLD LEGEND ================= */}
      <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Energy Consumption Thresholds (Daily)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100"></div>
            <span className="text-sm text-gray-700">
              <span className="font-semibold">Very Low:</span> &lt; {ENERGY_THRESHOLDS.daily.veryLow} kWh
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-100"></div>
            <span className="text-sm text-gray-700">
              <span className="font-semibold">Low:</span> {ENERGY_THRESHOLDS.daily.veryLow}-{ENERGY_THRESHOLDS.daily.low} kWh
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-100"></div>
            <span className="text-sm text-gray-700">
              <span className="font-semibold">Normal:</span> {ENERGY_THRESHOLDS.daily.low}-{ENERGY_THRESHOLDS.daily.normal} kWh
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-100"></div>
            <span className="text-sm text-gray-700">
              <span className="font-semibold">High:</span> {ENERGY_THRESHOLDS.daily.normal}-{ENERGY_THRESHOLDS.daily.high} kWh
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-100"></div>
            <span className="text-sm text-gray-700">
              <span className="font-semibold">Very High:</span> &gt; {ENERGY_THRESHOLDS.daily.high} kWh
            </span>
          </div>
        </div>
      </div>

      {/* ================= CHARTS SECTION ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ===== ENERGY CONSUMPTION TREND (LINE CHART) ===== */}
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Energy Consumption Trend
            </h2>
            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
              {activeFilter} - ALL DATA
            </span>
          </div>

          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={trendData}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#e5e7eb" 
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={Math.floor(trendData.length / 15)}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  label={{ 
                    value: 'Energy (kWh)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: "#6b7280", fontSize: 12 }
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: "12px",
                  }}
                  labelStyle={{ fontWeight: "600", marginBottom: 4 }}
                  formatter={(value: any) => {
                    const numValue = Number(value) || 0;
                    return [`${numValue.toFixed(4)} kWh`, "Energy"];
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="energy"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={trendData.length <= 100 ? { r: 3, fill: "#3b82f6" } : false}
                  activeDot={{ r: 6, fill: "#3b82f6" }}
                  name="Energy"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p className="font-medium">No data available</p>
                <p className="text-sm mt-1">
                  {loading ? "Loading..." : "No data in database"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ===== DAILY USAGE COMPARISON (BAR CHART) ===== */}
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Daily Usage Comparison
            </h2>
            <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
              Last {dailyUsageData.length} Days
            </span>
          </div>

          {dailyUsageData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={dailyUsageData}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#e5e7eb" 
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={Math.floor(dailyUsageData.length / 10)}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  label={{ 
                    value: 'Usage (kWh)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: "#6b7280", fontSize: 12 }
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: "8px 12px",
                  }}
                  cursor={{ fill: "#f3f4f6", opacity: 0.3 }}
                  formatter={(value: any) => {
                    const numValue = Number(value) || 0;
                    return [`${numValue.toFixed(2)} kWh`, "Usage"];
                  }}
                />
                <Legend />
                <Bar
                  dataKey="usage"
                  fill="#10b981"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={60}
                  name="Daily Usage"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p className="font-medium">No daily data</p>
                <p className="text-sm mt-1">Waiting for data...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= STATISTICS SUMMARY ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
        <StatCard
          title="Total Energy Used"
          value={statistics.total_energy.toFixed(2)}
          unit="kWh"
          subtitle={`From ${statistics.total_days || 0} days of data`}
          color="blue"
        />
        <StatCard
          title="Average Daily Usage"
          value={statistics.avg_daily_usage.toFixed(3)}
          unit="kWh"
          subtitle={getEnergyStatus(statistics.avg_daily_usage, 'daily').description}
          color="green"
        />
        <StatCard
          title="Peak Usage"
          value={statistics.peak_usage.toFixed(3)}
          unit="kWh"
          subtitle="Maximum recorded"
          color="orange"
        />
        <StatCard
          title="Peak Hour"
          value={statistics.peak_hour}
          unit=""
          subtitle="Highest consumption"
          color="purple"
        />
      </div>

      {/* ================= DETAILED TABLE ================= */}
      <div className="mt-8 bg-white rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Detailed History (Last {Math.min(dailyUsageData.length, 30)} Days)
          </h2>
          <span className="text-sm text-gray-500">
            Total: {dailyUsageData.length} records
          </span>
        </div>
        
        <div className="overflow-x-auto">
          {dailyUsageData.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Day
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    Energy (kWh)
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    Cost (IDR)
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    Cost (USD)
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {dailyUsageData.slice(-30).map((item, index) => {
                  const status = getEnergyStatus(item.usage, 'daily');
                  const cost = calculateCost(item.usage);
                  
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {new Date(item.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {item.day}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">
                        {item.usage.toFixed(3)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-900">
                        Rp {cost.idr.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-900">
                        ${cost.usd.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span 
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                          title={status.description}
                        >
                          {status.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <div className="text-4xl mb-2">📋</div>
              <p className="font-medium">No historical data</p>
              <p className="text-sm mt-2">Data will appear after collection</p>
            </div>
          )}
        </div>
      </div>

      {/* ================= DATA SOURCE INFO ================= */}
      <div className="mt-8 bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
        <div className="text-green-600 text-2xl">✅</div>
        <div className="flex-1">
          <p className="text-sm text-green-900 font-medium">
            Data Source: PostgreSQL Database (ALL Data - No Time Filter)
          </p>
          <p className="text-xs text-green-700 mt-1">
            Hourly: hourly_energy | Daily: daily_energy | Monthly: monthly_energy | Statistics: Aggregated from all records
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================= STAT CARD COMPONENT ================= */
function StatCard({
  title,
  value,
  unit,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  unit: string;
  subtitle: string;
  color: "blue" | "green" | "orange" | "purple";
}) {
  const colorStyles = {
    blue: "bg-blue-50 border-blue-200",
    green: "bg-green-50 border-green-200",
    orange: "bg-orange-50 border-orange-200",
    purple: "bg-purple-50 border-purple-200",
  };

  const textColors = {
    blue: "text-blue-700",
    green: "text-green-700",
    orange: "text-orange-700",
    purple: "text-purple-700",
  };

  return (
    <div className={`${colorStyles[color]} border rounded-2xl p-6 shadow-sm hover:shadow-md transition`}>
      <p className="text-sm text-gray-600 mb-2">{title}</p>
      <div className="flex items-end gap-2 mb-2">
        <span className={`text-4xl font-bold ${textColors[color]}`}>
          {value}
        </span>
        {unit && <span className="text-lg text-gray-500 pb-1">{unit}</span>}
      </div>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}