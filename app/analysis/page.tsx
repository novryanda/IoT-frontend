"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  Lightbulb,
  Clock,
  TrendingDown,
  DollarSign,
} from "lucide-react";

/* ================= TYPES ================= */
type Suggestion = {
  id: string;
  title: string;
  savings: string;
  borderColor: string;
  bgColor: string;
};

type PeakData = {
  time: string;
  usage: number;
  timestamp?: Date;
};

type LoadPatternDay = {
  day: string;
  morning: number;
  afternoon: number;
  evening: number;
  total_energy?: number;
};

/* ================= DUMMY DATA ================= */
const DUMMY_PEAK_DATA: PeakData[] = [
  { time: "18:11", usage: 365 },
  { time: "18:12", usage: 395 },
  { time: "18:13", usage: 455 },
  { time: "18:13", usage: 375 },
  { time: "18:14", usage: 505 },
  { time: "18:14", usage: 525 },
  { time: "18:14", usage: 610 },
];

const DUMMY_LOAD_PATTERN: LoadPatternDay[] = [
  { day: "Mon", morning: 365, afternoon: 455, evening: 610 },
  { day: "Tue", morning: 395, afternoon: 375, evening: 525 },
  { day: "Wed", morning: 365, afternoon: 505, evening: 455 },
  { day: "Thu", morning: 455, afternoon: 610, evening: 395 },
  { day: "Fri", morning: 375, afternoon: 525, evening: 505 },
  { day: "Sat", morning: 505, afternoon: 365, evening: 610 },
  { day: "Sun", morning: 525, afternoon: 395, evening: 455 },
];

/* ================= MAIN PAGE ================= */
export default function PowerAnalysisPage() {
  const [hoveredPoint, setHoveredPoint] = useState<PeakData | null>(null);
  const [hoveredBar, setHoveredBar] = useState<LoadPatternDay | null>(null);
  
  // State untuk data dari backend
  const [powerFactor, setPowerFactor] = useState(0.95);
  const [peakUsageData, setPeakUsageData] = useState<PeakData[]>(DUMMY_PEAK_DATA);
  const [loadPatternData, setLoadPatternData] = useState<LoadPatternDay[]>(DUMMY_LOAD_PATTERN);
  const [statistics, setStatistics] = useState({
    peakHours: { time: "8PM - 10PM", description: "Highest consumption period" },
    efficiencyTrend: { value: "+5%", description: "Improvement this month" },
    savingsPotential: { value: "$35/mo", description: "With optimizations" },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = "http://localhost:3001";

  /* ===== FETCH DATA DARI BACKEND ===== */
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch semua data secara parallel
      await Promise.all([
        fetchPeakUsageData(),
        fetchLoadPatternData(),
        fetchPowerFactor(),
        fetchStatistics(),
      ]);
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(null); // Don't show error to user, use dummy data
      setLoading(false);
    }
  };

  // ===== FETCH PEAK USAGE (dari endpoint analysis/peak-usage) =====
  const fetchPeakUsageData = async () => {
    try {
      console.log('🔍 Fetching peak usage data...');
      const response = await fetch(`${API_URL}/power/analysis/peak-usage`);
      
      if (!response.ok) {
        console.error(`❌ Peak usage API error: ${response.status}`);
        setPeakUsageData(DUMMY_PEAK_DATA);
        return;
      }
      
      const data = await response.json();
      console.log('✅ Peak usage data:', data);

      if (!Array.isArray(data) || data.length === 0) {
        console.log('⚠️ No peak usage data, using dummy data');
        setPeakUsageData(DUMMY_PEAK_DATA);
        return;
      }

      const formattedData = data.map((item: any) => ({
        time: item.time,
        usage: Number(item.usage) || 0,
        timestamp: item.timestamp ? new Date(item.timestamp) : undefined,
      }));

      setPeakUsageData(formattedData);
    } catch (error) {
      console.error("❌ Error fetching peak usage:", error);
      setPeakUsageData(DUMMY_PEAK_DATA);
    }
  };

  // ===== FETCH LOAD PATTERN (dari endpoint analysis/load-pattern) =====
  const fetchLoadPatternData = async () => {
    try {
      console.log('🔍 Fetching load pattern data...');
      const response = await fetch(`${API_URL}/power/analysis/load-pattern`);
      
      if (!response.ok) {
        console.error(`❌ Load pattern API error: ${response.status}`);
        setLoadPatternData(DUMMY_LOAD_PATTERN);
        return;
      }
      
      const data = await response.json();
      console.log('✅ Load pattern data:', data);

      if (!Array.isArray(data) || data.length === 0) {
        console.log('⚠️ No load pattern data, using dummy data');
        setLoadPatternData(DUMMY_LOAD_PATTERN);
        return;
      }

      const formattedData = data.map((item: any) => ({
        day: item.day,
        morning: Number(item.morning) || 0,
        afternoon: Number(item.afternoon) || 0,
        evening: Number(item.evening) || 0,
        total_energy: item.total_energy ? Number(item.total_energy) : undefined,
      }));

      setLoadPatternData(formattedData);
    } catch (error) {
      console.error("❌ Error fetching load pattern:", error);
      setLoadPatternData(DUMMY_LOAD_PATTERN);
    }
  };

  // ===== FETCH POWER FACTOR (dari endpoint analysis/power-factor) =====
  const fetchPowerFactor = async () => {
    try {
      console.log('🔍 Fetching power factor...');
      const response = await fetch(`${API_URL}/power/analysis/power-factor`);
      
      if (!response.ok) {
        console.error(`❌ Power factor API error: ${response.status}`);
        return;
      }
      
      const data = await response.json();
      console.log('✅ Power factor:', data);

      if (data && data.power_factor) {
        const pf = Number(data.power_factor) || 0.95;
        setPowerFactor(parseFloat(pf.toFixed(2)));
      }
    } catch (error) {
      console.error("❌ Error fetching power factor:", error);
    }
  };

  // ===== FETCH STATISTICS (dari endpoint statistics) =====
  const fetchStatistics = async () => {
    try {
      console.log('🔍 Fetching statistics...');
      const response = await fetch(`${API_URL}/power/statistics?days=30`);
      
      if (!response.ok) {
        console.error(`❌ Statistics API error: ${response.status}`);
        return;
      }
      
      const data = await response.json();
      console.log('✅ Statistics:', data);

      const statsData = data.data || data;
      const totalEnergy = Number(statsData.total_energy) || 0;

      setStatistics({
        peakHours: {
          time: statsData.peak_hour || "6PM - 7PM",
          description: "Highest consumption period",
        },
        efficiencyTrend: {
          value: "+5%",
          description: "Improvement this month",
        },
        savingsPotential: {
          value: `$${Math.round(totalEnergy * 0.15)}/mo`,
          description: "With optimizations",
        },
      });
    } catch (error) {
      console.error("❌ Error fetching statistics:", error);
    }
  };

  const powerFactorStatus = powerFactor >= 0.95 
    ? "Excellent" 
    : powerFactor >= 0.85 
    ? "Good" 
    : "Fair";

  /* ===== ENERGY SAVING SUGGESTIONS ===== */
  const suggestions: Suggestion[] = [
    {
      id: "1",
      title: "Shift high-power usage to off-peak hours",
      savings: "$12/month",
      borderColor: "border-l-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      id: "2",
      title: "Improve power factor with capacitor banks",
      savings: "$8/month",
      borderColor: "border-l-green-500",
      bgColor: "bg-green-50",
    },
    {
      id: "3",
      title: "Replace inefficient devices",
      savings: "$15/month",
      borderColor: "border-l-yellow-500",
      bgColor: "bg-yellow-50",
    },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-xl text-gray-600">Loading power analysis...</p>
        </div>
      </div>
    );
  }

  // Calculate max value for Load Pattern scaling
  const maxLoadValue = Math.max(
    ...loadPatternData.flatMap(d => [d.morning, d.afternoon, d.evening])
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* ================= HEADER ================= */}
      <div className="mb-8 animate-fadeInDown">
        <h1 className="text-4xl font-bold text-gray-900">Power Analysis</h1>
        <p className="text-gray-600 mt-2">Smart energy insights and recommendations</p>
      </div>

      {/* ================= POWER FACTOR EFFICIENCY ================= */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-3xl p-8 shadow-sm mb-8 animate-fadeInUp">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Power Factor Efficiency
            </h2>
            <p className="text-gray-600">Current system efficiency rating</p>
          </div>

          {/* TREND ICON */}
          <div className="w-16 h-16 bg-green-200 rounded-2xl flex items-center justify-center animate-bounce-slow">
            <TrendingUp size={32} className="text-green-600" />
          </div>
        </div>

        {/* POWER FACTOR VALUE */}
        <div className="flex items-end gap-4 mb-4">
          <h3 className="text-8xl font-bold text-gray-900 animate-countUp">{powerFactor}</h3>
          <span className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold mb-4 animate-slideInRight">
            {powerFactorStatus}
          </span>
        </div>

        {/* PROGRESS BAR */}
        <div className="w-full h-3 bg-green-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-1000 ease-out animate-progressBar"
            style={{ width: `${powerFactor * 100}%` }}
          />
        </div>
      </div>

      {/* ================= CHARTS GRID ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* PEAK USAGE TIME CHART */}
        <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 animate-fadeInLeft">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Peak Usage Time (Last 7 Records)</h2>

          {/* CHART AREA */}
          <div className="relative h-80">
            <svg width="100%" height="100%" viewBox="0 0 400 300" className="overflow-visible">
              {/* Grid Lines */}
              {[250, 200, 150, 100, 50].map((y, i) => (
                <line
                  key={`peak-grid-${y}-${i}`}
                  x1="40"
                  y1={y}
                  x2="380"
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  className="animate-fadeIn"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}

              {/* Y-axis labels */}
              <text x="10" y="255" fontSize="12" fill="#9ca3af">0</text>
              <text x="5" y="205" fontSize="12" fill="#9ca3af">200</text>
              <text x="5" y="155" fontSize="12" fill="#9ca3af">400</text>
              <text x="5" y="105" fontSize="12" fill="#9ca3af">600</text>
              <text x="5" y="55" fontSize="12" fill="#9ca3af">800</text>

              {/* Area Chart Path */}
              <defs>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
                </linearGradient>
              </defs>

              {/* Dynamic Area & Line based on real data */}
              {peakUsageData.length > 0 && (
                <>
                  {/* Area Path */}
                  <path
                    d={`M ${peakUsageData.map((p, i) => {
                      const x = 40 + (i * 340 / (peakUsageData.length - 1));
                      const y = 250 - (p.usage / 800 * 200);
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ')} L ${40 + (340 / (peakUsageData.length - 1)) * (peakUsageData.length - 1)} 250 L 40 250 Z`}
                    fill="url(#areaGradient)"
                    className="animate-drawArea"
                  />

                  {/* Line Path */}
                  <path
                    d={peakUsageData.map((p, i) => {
                      const x = 40 + (i * 340 / (peakUsageData.length - 1));
                      const y = 250 - (p.usage / 800 * 200);
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="1000"
                    strokeDashoffset="1000"
                    className="animate-drawLine"
                  />

                  {/* Interactive Points */}
                  {peakUsageData.map((point, i) => {
                    const x = 40 + (i * 340 / (peakUsageData.length - 1));
                    const y = 250 - (point.usage / 800 * 200);
                    return (
                      <g key={`peak-point-${i}`}>
                        <circle
                          cx={x}
                          cy={y}
                          r="6"
                          fill="#3b82f6"
                          className="cursor-pointer hover:r-8 transition-all animate-popIn"
                          style={{ animationDelay: `${1 + i * 0.1}s` }}
                          onMouseEnter={() => setHoveredPoint(point)}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                        <circle
                          cx={x}
                          cy={y}
                          r="12"
                          fill="#3b82f6"
                          fillOpacity="0.2"
                          className="animate-pulse-ring"
                          style={{ animationDelay: `${1 + i * 0.1}s` }}
                        />
                      </g>
                    );
                  })}
                </>
              )}

              {/* X-axis labels */}
              {peakUsageData.map((p, i) => {
                const x = 40 + (i * 340 / (peakUsageData.length - 1));
                return (
                  <text key={`peak-label-${i}`} x={x - 15} y="275" fontSize="11" fill="#9ca3af">
                    {p.time}
                  </text>
                );
              })}
            </svg>

            {/* Dynamic Tooltip */}
            {hoveredPoint && (
              <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-white px-5 py-3 rounded-xl shadow-2xl border-2 border-blue-500 animate-tooltipIn z-10">
                <p className="text-xl font-bold text-gray-900">{hoveredPoint.time}</p>
                <p className="text-sm text-blue-600 font-semibold">{hoveredPoint.usage}W</p>
              </div>
            )}
          </div>
        </div>

        {/* LOAD PATTERN ANALYSIS CHART - IMPROVED */}
        <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 animate-fadeInRight">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Load Pattern Analysis</h2>

          {/* CHART AREA */}
          <div className="relative h-80">
            <svg width="100%" height="100%" viewBox="0 0 500 320" className="overflow-visible">
              {/* Grid Lines */}
              {[280, 220, 160, 100, 40].map((y, i) => (
                <line
                  key={`load-grid-${y}-${i}`}
                  x1="50"
                  y1={y}
                  x2="480"
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  className="animate-fadeIn"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}

              {/* Y-axis labels */}
              <text x="15" y="285" fontSize="12" fill="#9ca3af">0</text>
              <text x="5" y="225" fontSize="12" fill="#9ca3af">200</text>
              <text x="5" y="165" fontSize="12" fill="#9ca3af">400</text>
              <text x="5" y="105" fontSize="12" fill="#9ca3af">600</text>
              <text x="5" y="45" fontSize="12" fill="#9ca3af">800</text>

              {/* Bars for each day - IMPROVED SPACING */}
              {loadPatternData.map((day, index) => {
                const totalDays = loadPatternData.length;
                const chartWidth = 430; // Total width for bars
                const groupWidth = chartWidth / totalDays;
                const x = 50 + (index * groupWidth) + (groupWidth * 0.15); // Start position with padding
                
                const barWidth = (groupWidth * 0.7) / 3; // Divide remaining space by 3 bars
                const spacing = barWidth * 0.15; // Small spacing between bars

                // Scale bars to fit nicely (max height 240px)
                const maxHeight = 240;
                const morningHeight = (day.morning / maxLoadValue) * maxHeight;
                const afternoonHeight = (day.afternoon / maxLoadValue) * maxHeight;
                const eveningHeight = (day.evening / maxLoadValue) * maxHeight;

                return (
                  <g
                    key={`bar-group-${index}`}
                    onMouseEnter={() => setHoveredBar(day)}
                    onMouseLeave={() => setHoveredBar(null)}
                    className="cursor-pointer"
                  >
                    {/* Morning Bar (Blue) */}
                    <rect
                      x={x}
                      y={280 - morningHeight}
                      width={barWidth}
                      height={morningHeight}
                      fill="#3b82f6"
                      rx="4"
                      className="hover:fill-blue-700 transition-all animate-barGrow"
                      style={{
                        animationDelay: `${0.5 + index * 0.1}s`,
                        transformOrigin: `${x + barWidth / 2}px 280px`,
                      }}
                    />

                    {/* Afternoon Bar (Green) */}
                    <rect
                      x={x + barWidth + spacing}
                      y={280 - afternoonHeight}
                      width={barWidth}
                      height={afternoonHeight}
                      fill="#22c55e"
                      rx="4"
                      className="hover:fill-green-700 transition-all animate-barGrow"
                      style={{
                        animationDelay: `${0.6 + index * 0.1}s`,
                        transformOrigin: `${x + barWidth + spacing + barWidth / 2}px 280px`,
                      }}
                    />

                    {/* Evening Bar (Orange) */}
                    <rect
                      x={x + (barWidth + spacing) * 2}
                      y={280 - eveningHeight}
                      width={barWidth}
                      height={eveningHeight}
                      fill="#f59e0b"
                      rx="4"
                      className="hover:fill-yellow-700 transition-all animate-barGrow"
                      style={{
                        animationDelay: `${0.7 + index * 0.1}s`,
                        transformOrigin: `${x + (barWidth + spacing) * 2 + barWidth / 2}px 280px`,
                      }}
                    />

                    {/* Day Label */}
                    <text
                      x={x + (barWidth * 1.5) + spacing}
                      y="305"
                      fontSize="13"
                      fill="#6b7280"
                      textAnchor="middle"
                      className="font-semibold"
                    >
                      {day.day}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip for Bars */}
            {hoveredBar && (
              <div className="absolute top-8 right-8 bg-white px-6 py-4 rounded-2xl shadow-2xl border-2 border-gray-300 animate-tooltipIn z-10">
                <p className="text-2xl font-bold text-gray-900 mb-3">{hoveredBar.day}</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                    <span className="text-sm font-semibold text-blue-600">
                      Morning: {hoveredBar.morning}W
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="text-sm font-semibold text-green-600">
                      Afternoon: {hoveredBar.afternoon}W
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                    <span className="text-sm font-semibold text-yellow-600">
                      Evening: {hoveredBar.evening}W
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2 animate-slideInUp" style={{ animationDelay: "1.5s" }}>
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm text-gray-700 font-medium">Morning</span>
              </div>
              <div className="flex items-center gap-2 animate-slideInUp" style={{ animationDelay: "1.6s" }}>
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm text-gray-700 font-medium">Afternoon</span>
              </div>
              <div className="flex items-center gap-2 animate-slideInUp" style={{ animationDelay: "1.7s" }}>
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm text-gray-700 font-medium">Evening</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= ENERGY SAVING SUGGESTIONS ================= */}
      <div className="bg-white rounded-3xl p-8 shadow-sm mb-8 animate-fadeInUp" style={{ animationDelay: "0.3s" }}>
        {/* HEADER */}
        <div className="flex items-start gap-4 mb-8">
          <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center shrink-0 animate-wiggle">
            <Lightbulb size={32} className="text-yellow-600" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              Energy Saving Suggestions
            </h2>
            <p className="text-gray-600 mt-1">
              Personalized recommendations to reduce consumption
            </p>
          </div>
        </div>

        {/* SUGGESTIONS LIST */}
        <div className="space-y-4">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={`${suggestion.bgColor} border-l-4 ${suggestion.borderColor} rounded-2xl p-6 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 animate-slideInLeft cursor-pointer`}
              style={{ animationDelay: `${0.5 + index * 0.1}s` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    {suggestion.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 font-semibold">
                    Potential savings: {suggestion.savings}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= STATISTICS GRID ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* PEAK HOURS */}
        <StatCard
          icon={Clock}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          title="Peak Hours"
          value={statistics.peakHours.time}
          description={statistics.peakHours.description}
          delay="0.4s"
        />

        {/* EFFICIENCY TREND */}
        <StatCard
          icon={TrendingUp}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          title="Efficiency Trend"
          value={statistics.efficiencyTrend.value}
          description={statistics.efficiencyTrend.description}
          valueColor="text-green-600"
          delay="0.5s"
        />

        {/* SAVINGS POTENTIAL */}
        <StatCard
          icon={Lightbulb}
          iconBg="bg-yellow-100"
          iconColor="text-yellow-600"
          title="Savings Potential"
          value={statistics.savingsPotential.value}
          description={statistics.savingsPotential.description}
          valueColor="text-yellow-600"
          delay="0.6s"
        />
      </div>

      {/* ================= CUSTOM STYLES ================= */}
      <style jsx>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes drawLine {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes drawArea {
          from {
            opacity: 0;
            transform: scaleY(0);
            transform-origin: bottom;
          }
          to {
            opacity: 1;
            transform: scaleY(1);
          }
        }

        @keyframes barGrow {
          from {
            transform: scaleY(0);
          }
          to {
            transform: scaleY(1);
          }
        }

        @keyframes popIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes tooltipIn {
          from {
            opacity: 0;
            transform: translate(-50%, -10px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }

        @keyframes bounceGentle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }

        @keyframes bounceSlow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes wiggle {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-5deg);
          }
          75% {
            transform: rotate(5deg);
          }
        }

        @keyframes pulseRing {
          0% {
            transform: scale(0.8);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.4;
          }
          100% {
            transform: scale(0.8);
            opacity: 0.8;
          }
        }

        @keyframes progressBar {
          from {
            width: 0%;
          }
        }

        @keyframes countUp {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeInDown {
          animation: fadeInDown 0.6s ease-out forwards;
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
          opacity: 0;
        }

        .animate-fadeInLeft {
          animation: fadeInLeft 0.8s ease-out forwards;
          opacity: 0;
        }

        .animate-fadeInRight {
          animation: fadeInRight 0.8s ease-out forwards;
          opacity: 0;
        }

        .animate-slideInLeft {
          animation: slideInLeft 0.6s ease-out forwards;
          opacity: 0;
        }

        .animate-slideInRight {
          animation: slideInRight 0.6s ease-out forwards;
          opacity: 0;
        }

        .animate-slideInUp {
          animation: slideInUp 0.5s ease-out forwards;
          opacity: 0;
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
          opacity: 0;
        }

        .animate-drawLine {
          animation: drawLine 2s ease-out forwards;
        }

        .animate-drawArea {
          animation: drawArea 1.5s ease-out forwards;
        }

        .animate-barGrow {
          animation: barGrow 0.8s ease-out forwards;
        }

        .animate-popIn {
          animation: popIn 0.5s ease-out forwards;
          opacity: 0;
        }

        .animate-tooltipIn {
          animation: tooltipIn 0.3s ease-out forwards;
        }

        .animate-bounce-gentle {
          animation: bounceGentle 2s ease-in-out infinite;
        }

        .animate-bounce-slow {
          animation: bounceSlow 3s ease-in-out infinite;
        }

        .animate-wiggle {
          animation: wiggle 2s ease-in-out infinite;
        }

        .animate-pulse-ring {
          animation: pulseRing 2s ease-in-out infinite;
        }

        .animate-progressBar {
          animation: progressBar 1.5s ease-out forwards;
        }

        .animate-countUp {
          animation: countUp 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

/* ================= STAT CARD COMPONENT ================= */
function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  value,
  description,
  valueColor = "text-gray-900",
  delay = "0s",
}: {
  icon: any;
  iconBg: string;
  iconColor: string;
  title: string;
  value: string;
  description: string;
  valueColor?: string;
  delay?: string;
}) {
  return (
    <div
      className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-2xl hover:scale-105 transition-all duration-500 animate-fadeInUp cursor-pointer group"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon size={24} className={iconColor} />
        </div>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      </div>

      <p className={`text-5xl font-bold ${valueColor} mb-2 group-hover:scale-110 transition-transform duration-300`}>
        {value}
      </p>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}