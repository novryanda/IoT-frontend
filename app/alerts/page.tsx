"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Alert {
  id: number;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  date: string;
  created_at: string;
  is_read: boolean;
}

interface AlertSummary {
  total: number;
  critical: number;
  warning: number;
  info: number;
  unread: number;
  by_type: {
    high_consumption: number;
    low_power_factor: number;
    unusual_pattern: number;
    peak_usage: number;
  };
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  useEffect(() => {
    fetchAlerts();
    fetchSummary();

    const interval = setInterval(() => {
      fetchAlerts();
      fetchSummary();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('http://localhost:3001/power/alerts');
      const json = await res.json();
      if (json.success) {
        setAlerts(json.data);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch('http://localhost:3001/power/alerts/summary');
      const json = await res.json();
      if (json.success) {
        setSummary(json.data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-800';
      case 'warning': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'info': return 'bg-blue-100 border-blue-300 text-blue-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📋';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      high_consumption: 'Konsumsi Tinggi',
      low_power_factor: 'Power Factor Rendah',
      unusual_pattern: 'Pola Tidak Biasa',
      peak_usage: 'Puncak Konsumsi',
    };
    return labels[type] || type;
  };

  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(a => a.severity === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <motion.div 
            className="rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-gray-600">Loading alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold text-gray-900">Alerts & Notifications</h1>
        <p className="text-gray-600 mt-2">Monitoring dari 10 hari terakhir data harian</p>
      </motion.div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <SummaryCard
            title="Total Alerts"
            value={summary.total}
            icon="🔔"
            color="bg-blue-500"
          />
          <SummaryCard
            title="Critical"
            value={summary.critical}
            icon="🚨"
            color="bg-red-500"
          />
          <SummaryCard
            title="Warning"
            value={summary.warning}
            icon="⚠️"
            color="bg-yellow-500"
          />
          <SummaryCard
            title="Info"
            value={summary.info}
            icon="ℹ️"
            color="bg-green-500"
          />
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex gap-4">
        {['all', 'critical', 'warning', 'info'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-6 py-2 rounded-full font-semibold transition-all ${
              filter === f
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4"
      >
        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <p className="text-gray-500 text-lg">Tidak ada alerts untuk kategori ini</p>
          </div>
        ) : (
          filteredAlerts.map((alert, index) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-2xl p-6 border-2 ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl">{getSeverityIcon(alert.severity)}</span>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-sm px-3 py-1 rounded-full bg-white">
                      {getTypeLabel(alert.type)}
                    </span>
                    <span className="text-xs text-gray-600">
                      {new Date(alert.date).toLocaleDateString('id-ID', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  
                  <p className="text-lg font-medium mb-2">{alert.message}</p>
                  
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-gray-600">Nilai: </span>
                      <span className="font-bold">{alert.value.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Threshold: </span>
                      <span className="font-bold">{alert.threshold.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}

function SummaryCard({ title, value, icon, color }: {
  title: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl p-6 shadow-lg"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-3xl">{icon}</span>
        <div className={`w-12 h-12 ${color} rounded-full flex items-center justify-center`}>
          <span className="text-white font-bold text-xl">{value}</span>
        </div>
      </div>
      <h3 className="text-gray-600 font-medium">{title}</h3>
    </motion.div>
  );
}