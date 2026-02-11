"use client";

import { useEffect, useState } from "react";
import { Zap, DollarSign, TrendingUp, Download, FileText, Calendar } from "lucide-react";
import { motion } from "framer-motion";

/* ================= TYPES ================= */
type MonthlyReport = {
  month: number;
  year: number;
  period: string;
  total_energy: number;
  avg_daily_energy: number;
  peak_date: string | null;
};

type CurrentMonthReport = {
  month: number;
  year: number;
  total_energy: number;
  avg_daily_energy: number;
  peak_date: string | null;
};

type Statistics = {
  total_energy: number;
  avg_daily_usage: number;
  peak_usage: number;
  peak_hour: string;
  total_days?: number;
};

type ApiResponseMonthly = {
  success: boolean;
  data: MonthlyReport[];
  count: number;
};

type ApiResponseCurrent = {
  success: boolean;
  data: CurrentMonthReport;
};

type ApiResponseStats = {
  success: boolean;
  data: Statistics;
};

/* ================= ELECTRICITY RATES ================= */
// Tarif Listrik PLN Indonesia (Rp per kWh) - Update 2025
const ELECTRICITY_RATES = {
  R1_2200VA: 1444.70,  // Tarif subsidi untuk 2200 VA (paling umum)
  R2_3500VA: 1699.53,  // Tarif non-subsidi untuk 3500+ VA
};

const USD_TO_IDR = 15500; // Kurs rata-rata

function calculateCost(kWh: number): { idr: number; usd: number } {
  const costIDR = kWh * ELECTRICITY_RATES.R1_2200VA;
  const costUSD = costIDR / USD_TO_IDR;
  
  return {
    idr: costIDR,
    usd: costUSD
  };
}

/* ================= MAIN PAGE ================= */
export default function ReportsPage() {
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [currentMonth, setCurrentMonth] = useState<CurrentMonthReport | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);

  /* ===== FETCH DATA FROM API ===== */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch ALL monthly reports dari monthly_energy table
        try {
          console.log('📡 Fetching monthly reports from /power/reports/monthly');
          const reportsRes = await fetch("http://localhost:3001/power/reports/monthly");
          
          if (reportsRes.ok) {
            const reportsData: ApiResponseMonthly = await reportsRes.json();
            console.log('✅ Monthly reports response:', reportsData);
            
            if (reportsData.success && Array.isArray(reportsData.data)) {
              setMonthlyReports(reportsData.data);
              console.log(`📊 Loaded ${reportsData.data.length} monthly reports`);
            } else {
              console.warn('⚠️ Monthly reports is not an array, using empty array');
              setMonthlyReports([]);
            }
          } else {
            console.error('❌ Failed to fetch monthly reports:', reportsRes.status);
            setMonthlyReports([]);
          }
        } catch (error) {
          console.error("❌ Error fetching monthly reports:", error);
          setMonthlyReports([]);
        }

        // 2. Fetch current month report
        try {
          console.log('📡 Fetching current month from /power/reports/current-month');
          const currentRes = await fetch("http://localhost:3001/power/reports/current-month");
          
          if (currentRes.ok) {
            const currentData: ApiResponseCurrent = await currentRes.json();
            console.log('✅ Current month response:', currentData);
            
            if (currentData.success && currentData.data) {
              setCurrentMonth(currentData.data);
            } else {
              const now = new Date();
              setCurrentMonth({
                month: now.getMonth() + 1,
                year: now.getFullYear(),
                total_energy: 0,
                avg_daily_energy: 0,
                peak_date: null,
              });
            }
          } else {
            console.error('❌ Failed to fetch current month:', currentRes.status);
            const now = new Date();
            setCurrentMonth({
              month: now.getMonth() + 1,
              year: now.getFullYear(),
              total_energy: 0,
              avg_daily_energy: 0,
              peak_date: null,
            });
          }
        } catch (error) {
          console.error("❌ Error fetching current month:", error);
          const now = new Date();
          setCurrentMonth({
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            total_energy: 0,
            avg_daily_energy: 0,
            peak_date: null,
          });
        }

        // 3. Fetch statistics (all data)
        try {
          console.log('📡 Fetching statistics from /power/statistics');
          const statsRes = await fetch("http://localhost:3001/power/statistics");
          
          if (statsRes.ok) {
            const statsData: ApiResponseStats = await statsRes.json();
            console.log('✅ Statistics response:', statsData);
            
            if (statsData.success && statsData.data) {
              setStatistics(statsData.data);
            } else {
              setStatistics({
                total_energy: 0,
                avg_daily_usage: 0,
                peak_usage: 0,
                peak_hour: "00:00",
                total_days: 0,
              });
            }
          } else {
            console.error('❌ Failed to fetch statistics:', statsRes.status);
            setStatistics({
              total_energy: 0,
              avg_daily_usage: 0,
              peak_usage: 0,
              peak_hour: "00:00",
              total_days: 0,
            });
          }
        } catch (error) {
          console.error("❌ Error fetching statistics:", error);
          setStatistics({
            total_energy: 0,
            avg_daily_usage: 0,
            peak_usage: 0,
            peak_hour: "00:00",
            total_days: 0,
          });
        }

        setLoading(false);
      } catch (error) {
        console.error("❌ Failed to fetch reports data:", error);
        setLoading(false);
      }
    };

    fetchData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  /* ===== CALCULATE METRICS ===== */
  const calculateMetrics = () => {
    if (!currentMonth) {
      return {
        monthlyEnergy: 0,
        energyChange: 0,
        estimatedCostIDR: 0,
        estimatedCostUSD: 0,
        efficiencyScore: 0,
      };
    }

    // Current month energy
    const monthlyEnergy = currentMonth.total_energy || 0;

    // Compare with previous month
    let energyChange = 0;
    if (Array.isArray(monthlyReports) && monthlyReports.length > 0) {
      // Find previous month
      const currentMonthNum = currentMonth.month;
      const currentYearNum = currentMonth.year;
      
      const previousMonthNum = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
      const previousYearNum = currentMonthNum === 1 ? currentYearNum - 1 : currentYearNum;
      
      const previousMonth = monthlyReports.find(
        (r) => r.month === previousMonthNum && r.year === previousYearNum
      );
      
      if (previousMonth && previousMonth.total_energy > 0) {
        energyChange = ((monthlyEnergy - previousMonth.total_energy) / previousMonth.total_energy) * 100;
      }
    }

    // Calculate costs
    const costs = calculateCost(monthlyEnergy);

    // Efficiency score (simplified calculation)
    const efficiencyScore = monthlyReports.length > 0 ? 92 : 0;

    return {
      monthlyEnergy,
      energyChange,
      estimatedCostIDR: costs.idr,
      estimatedCostUSD: costs.usd,
      efficiencyScore,
    };
  };

  const metrics = calculateMetrics();

  /* ===== HANDLE REPORT GENERATION ===== */
  const handleGenerateReport = () => {
    setGeneratingReport(true);
    
    setTimeout(() => {
      setGeneratingReport(false);
      
      const cost = calculateCost(currentMonth?.total_energy || 0);
      
      const reportContent = `
📊 LAPORAN ENERGI BULANAN
=========================

Bulan Ini: ${currentMonth?.month}/${currentMonth?.year}
Total Energi: ${currentMonth?.total_energy.toFixed(2)} kWh
Rata-rata Harian: ${currentMonth?.avg_daily_energy.toFixed(2)} kWh
Tanggal Puncak: ${currentMonth?.peak_date || 'N/A'}
Estimasi Biaya: Rp ${cost.idr.toLocaleString('id-ID', { maximumFractionDigits: 0 })}

Statistik (Semua Data):
- Total: ${statistics?.total_energy.toFixed(2)} kWh
- Rata-rata: ${statistics?.avg_daily_usage.toFixed(2)} kWh/hari
- Puncak: ${statistics?.peak_usage.toFixed(2)} kWh
- Jam Puncak: ${statistics?.peak_hour}

Data Historis (${monthlyReports.length} bulan):
${monthlyReports.map(r => {
  const rCost = calculateCost(r.total_energy);
  return `  ${r.month}/${r.year}: ${r.total_energy.toFixed(2)} kWh (Rp ${rCost.idr.toLocaleString('id-ID', { maximumFractionDigits: 0 })})`;
}).join('\n')}
      `;
      
      alert("Laporan Berhasil Dibuat!\n\n" + reportContent);
    }, 2000);
  };

  /* ===== HANDLE EXPORT PDF ===== */
  const handleExportPDF = () => {
    alert(`Mengekspor laporan PDF lengkap...
    
Data yang Disertakan:
- ${monthlyReports.length} bulan data historis
- Bulan ini: ${currentMonth?.total_energy.toFixed(2)} kWh
- Analisis tren dan proyeksi

Dalam produksi, ini akan menghasilkan PDF profesional.`);
  };

  /* ===== LOADING STATE ===== */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div 
            className="rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-gray-600">Memuat data laporan...</p>
        </motion.div>
      </div>
    );
  }

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* HEADER */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between mb-8"
      >
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Laporan Bulanan</h1>
          <p className="text-gray-600 mt-2">Laporan konsumsi listrik bulanan dari database</p>
          <p className="text-sm text-gray-500 mt-1">
            {monthlyReports.length} bulan data historis tersedia dari table monthly_energy
          </p>
        </div>

        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <Download size={20} />
            Export PDF
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
          >
            <FileText size={20} />
            {generatingReport ? "Membuat..." : "Buat Laporan"}
          </motion.button>
        </div>
      </motion.div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <MetricCard
          icon={<Zap size={32} />}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          label="Bulan Ini"
          value={metrics.monthlyEnergy}
          unit="kWh"
          subtitle={
            <span className={`text-sm ${metrics.energyChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {metrics.energyChange >= 0 ? '+' : ''}{metrics.energyChange.toFixed(1)}% vs bulan lalu
            </span>
          }
        />

        <MetricCard
          icon={<DollarSign size={32} />}
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
          label="Estimasi Biaya (IDR)"
          value={metrics.estimatedCostIDR}
          unit="Rp"
          isPrice
          isCurrency="IDR"
          subtitle={
            <span className="text-sm text-gray-600">
              @ Rp {ELECTRICITY_RATES.R1_2200VA.toLocaleString('id-ID')}/kWh
            </span>
          }
        />

        <MetricCard
          icon={<TrendingUp size={32} />}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          label="Rata-rata Harian"
          value={currentMonth?.avg_daily_energy || 0}
          unit="kWh"
          subtitle={<span className="text-sm text-gray-600">Bulan ini</span>}
        />

        <MetricCard
          icon={<Calendar size={32} />}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
          label="Tanggal Puncak"
          value={currentMonth?.peak_date ? new Date(currentMonth.peak_date).getDate() : 0}
          unit=""
          subtitle={
            <span className="text-sm text-gray-600">
              {currentMonth?.peak_date 
                ? monthNames[new Date(currentMonth.peak_date).getMonth()] 
                : 'N/A'}
            </span>
          }
        />
      </div>

      {/* MONTHLY SUMMARY */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 shadow-sm mb-8"
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Ringkasan Bulan Ini</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SummaryItem
            label="Total Energi Bulan Ini"
            value={currentMonth?.total_energy || 0}
            unit="kWh"
          />

          <SummaryItem
            label="Rata-rata Harian"
            value={currentMonth?.avg_daily_energy || 0}
            unit="kWh"
          />

          <SummaryItem
            label="Biaya Bulan Ini (IDR)"
            value={calculateCost(currentMonth?.total_energy || 0).idr}
            unit="Rp"
            isCurrency
          />

          <SummaryItem
            label="Tanggal Puncak"
            value={currentMonth?.peak_date 
              ? new Date(currentMonth.peak_date).toLocaleDateString('id-ID')
              : 'Belum ada data'}
            unit=""
            isText
          />
        </div>
      </motion.div>

      {/* HISTORICAL DATA TABLE */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl p-8 shadow-sm"
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-6">
          Data Historis Bulanan (monthly_energy table)
        </h2>

        <div className="overflow-x-auto">
          {monthlyReports.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Periode</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Energi</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Rata-rata Harian</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tanggal Puncak</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Biaya (IDR)</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Biaya (USD)</th>
                </tr>
              </thead>
              <tbody>
                {monthlyReports.map((report, index) => {
                  const cost = calculateCost(report.total_energy);
                  
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {monthNames[report.month - 1]} {report.year}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">
                        {report.total_energy.toFixed(2)} kWh
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-900">
                        {report.avg_daily_energy.toFixed(2)} kWh
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {report.peak_date 
                          ? new Date(report.peak_date).toLocaleDateString('id-ID') 
                          : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-gray-900">
                        Rp {cost.idr.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">
                        ${cost.usd.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <p className="font-medium">Tidak ada data historis</p>
              <p className="text-sm mt-2">Data akan muncul setelah agregasi bulanan berjalan</p>
              <p className="text-xs mt-2 text-gray-400">
                Pastikan backend sudah menjalankan agregasi: POST /power/aggregate/monthly
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* DATA SOURCE INFO */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
        <div className="text-blue-600 text-2xl">ℹ️</div>
        <div className="flex-1">
          <p className="text-sm text-blue-900 font-medium">
            Sumber Data: PostgreSQL - Table monthly_energy
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Tarif: Rp {ELECTRICITY_RATES.R1_2200VA.toLocaleString('id-ID')}/kWh (R1 2200VA - Subsidi PLN) | 
            Kurs: Rp {USD_TO_IDR.toLocaleString('id-ID')}/USD
          </p>
        </div>
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */
function MetricCard({ 
  icon, 
  iconBgColor, 
  iconColor, 
  label, 
  value, 
  unit, 
  isPrice = false, 
  isCurrency = "USD",
  subtitle 
}: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition"
    >
      <div className={`w-14 h-14 ${iconBgColor} rounded-xl flex items-center justify-center mb-4`}>
        <div className={iconColor}>{icon}</div>
      </div>

      <p className="text-gray-600 text-sm mb-2">{label}</p>

      <div className="flex items-end gap-1 mb-2">
        {isPrice && isCurrency === "IDR" && (
          <span className="text-xl font-bold text-gray-900">{unit}</span>
        )}
        {isPrice && isCurrency === "USD" && (
          <span className="text-3xl font-bold text-gray-900">{unit}</span>
        )}
        <span className="text-3xl font-bold text-gray-900">
          {typeof value === 'number' 
            ? (isCurrency === "IDR" 
                ? value.toLocaleString('id-ID', { maximumFractionDigits: 0 })
                : value.toFixed(2))
            : value}
        </span>
        {!isPrice && unit && <span className="text-xl text-gray-500 pb-1">{unit}</span>}
      </div>

      {subtitle}
    </motion.div>
  );
}

function SummaryItem({ label, value, unit, isText = false, isCurrency = false }: any) {
  return (
    <div className="bg-gray-50 rounded-xl p-6">
      <p className="text-gray-600 text-sm mb-2">{label}</p>
      <div className="flex items-end gap-2">
        {isCurrency && unit && <span className="text-2xl font-bold text-gray-900">{unit}</span>}
        <span className="text-3xl font-bold text-gray-900">
          {isText 
            ? value 
            : (typeof value === 'number' 
                ? (isCurrency 
                    ? value.toLocaleString('id-ID', { maximumFractionDigits: 0 })
                    : value.toFixed(2))
                : value)}
        </span>
        {!isCurrency && unit && <span className="text-lg text-gray-500 pb-1">{unit}</span>}
      </div>
    </div>
  );
}