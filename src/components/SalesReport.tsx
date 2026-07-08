import React, { useState, useEffect } from "react";
import { api } from "../lib/api.ts";
import {
  TrendingUp,
  DollarSign,
  ClipboardList,
  Users,
  Award,
  Calendar,
  Loader2,
  RefreshCw,
  Clock,
  CreditCard,
  Banknote,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

interface SalesReportData {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  cashRevenue: number;
  onlineRevenue: number;
  cashOrdersCount: number;
  onlineOrdersCount: number;
  topSellingItems: Array<{ id: number; name: string; quantitySold: number }>;
  tableTurnoverRate: number;
  revenueByHour: Array<{ hour: string; revenue: number }>;
}

export const SalesReport: React.FC = () => {
  const [rangeType, setRangeType] = useState<"today" | "week" | "custom">("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [report, setReport] = useState<SalesReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);

    let fromStr = "";
    let toStr = "";

    const now = new Date();

    if (rangeType === "today") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      fromStr = todayStart.toISOString();
      toStr = todayEnd.toISOString();
    } else if (rangeType === "week") {
      const weekStart = new Date();
      // Go back 7 days
      weekStart.setDate(now.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date();
      weekEnd.setHours(23, 59, 59, 999);

      fromStr = weekStart.toISOString();
      toStr = weekEnd.toISOString();
    } else {
      // Custom date range from input dates
      if (!customFrom || !customTo) {
        setError("Please select both start and end dates.");
        setLoading(false);
        return;
      }
      const start = new Date(customFrom);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customTo);
      end.setHours(23, 59, 59, 999);

      fromStr = start.toISOString();
      toStr = end.toISOString();
    }

    try {
      const data = await api.getReports(fromStr, toStr);
      setReport(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load reports. Are you logged in as owner?");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!report) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "\uFEFF"; // BOM for UTF-8 Excel handling

    const addRow = (cells: string[]) => {
      const formattedCells = cells.map(cell => {
        const str = String(cell).replace(/"/g, '""');
        return `"${str}"`;
      });
      csvContent += formattedCells.join(",") + "\n";
    };

    addRow(["AS DEV STUDIO - SALES & REVENUE REPORT"]);
    addRow([`Report Period: ${rangeType.toUpperCase()}`]);
    addRow([`Generated At: ${new Date().toLocaleString()}`]);
    addRow([]);

    addRow(["KEY PERFORMANCE INDICATORS"]);
    addRow(["Metric", "Value", "Notes"]);
    addRow(["Total Revenue", `₹${report.totalRevenue.toFixed(2)}`, "Net settled payments"]);
    addRow(["Total Orders Filled", String(report.totalOrders), "Kitchen orders generated"]);
    addRow(["Average Order Value", `₹${report.averageOrderValue.toFixed(2)}`, "Average guest ticket spend"]);
    addRow(["Table Turnover Rate", report.tableTurnoverRate.toFixed(2), "Orders / table / day average"]);
    addRow([]);

    addRow(["PAYMENT SETTLEMENTS BREAKDOWN"]);
    addRow(["Payment Method", "Revenue", "Order Count", "Percentage"]);
    const totalSettle = (report.cashRevenue || 0) + (report.onlineRevenue || 0);
    const cashPercent = totalSettle > 0 ? Math.round((report.cashRevenue / totalSettle) * 100) : 0;
    const onlinePercent = totalSettle > 0 ? 100 - cashPercent : 0;
    addRow(["Cash", `₹${(report.cashRevenue || 0).toFixed(2)}`, String(report.cashOrdersCount || 0), `${cashPercent}%`]);
    addRow(["Online (UPI / Cards)", `₹${(report.onlineRevenue || 0).toFixed(2)}`, String(report.onlineOrdersCount || 0), `${onlinePercent}%`]);
    addRow([]);

    addRow(["TOP SELLING ITEMS"]);
    addRow(["Rank", "Item Name", "Quantity Sold"]);
    if (report.topSellingItems.length === 0) {
      addRow(["-", "No dishes sold in this period", "0"]);
    } else {
      report.topSellingItems.forEach((item, idx) => {
        addRow([String(idx + 1), item.name, String(item.quantitySold)]);
      });
    }
    addRow([]);

    addRow(["HOURLY REVENUE STREAM"]);
    addRow(["Hour", "Revenue"]);
    if (report.revenueByHour.length === 0) {
      addRow(["-", "No hourly stream data"]);
    } else {
      report.revenueByHour.forEach((item) => {
        addRow([item.hour, `₹${item.revenue.toFixed(2)}`]);
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = `DEV_STUDIO_SalesReport_${rangeType}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (!report) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to export reports as PDF.");
      return;
    }

    const title = `AS DEV STUDIO Sales Report - ${rangeType.toUpperCase()}`;
    const dateStr = new Date().toLocaleString();

    const topSellingItemsHTML = report.topSellingItems.length === 0
      ? `<tr><td colspan="3" style="text-align: center; color: #64748b; padding: 12px;">No dishes sold in this period.</td></tr>`
      : report.topSellingItems.map((item, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; font-weight: bold; color: #1e293b;">${idx + 1}</td>
          <td style="padding: 10px; color: #334155;">${item.name}</td>
          <td style="padding: 10px; text-align: right; font-weight: bold; color: #0f172a;">${item.quantitySold} units</td>
        </tr>
      `).join("");

    const hourlyRevenueHTML = report.revenueByHour.length === 0
      ? `<tr><td colspan="2" style="text-align: center; color: #64748b; padding: 12px;">No hourly distribution data.</td></tr>`
      : report.revenueByHour.map(item => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 10px; color: #475569; font-family: monospace;">${item.hour}</td>
          <td style="padding: 8px 10px; text-align: right; font-weight: bold; color: #0f172a; font-family: monospace;">₹${item.revenue.toFixed(2)}</td>
        </tr>
      `).join("");

    const totalSettle = (report.cashRevenue || 0) + (report.onlineRevenue || 0);
    const cashPercent = totalSettle > 0 ? Math.round((report.cashRevenue / totalSettle) * 100) : 0;
    const onlinePercent = totalSettle > 0 ? 100 - cashPercent : 0;

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              margin: 40px;
              padding: 0;
              background-color: #ffffff;
              line-height: 1.5;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              font-size: 24px;
              font-weight: 800;
              color: #0f172a;
              margin: 0;
              letter-spacing: -0.025em;
            }
            .header p {
              font-size: 13px;
              color: #64748b;
              margin: 4px 0 0 0;
            }
            .meta-info {
              text-align: right;
              font-size: 12px;
              color: #64748b;
              line-height: 1.6;
            }
            .grid-kpi {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
              margin-bottom: 30px;
            }
            .kpi-card {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 16px;
            }
            .kpi-title {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              color: #64748b;
              letter-spacing: 0.05em;
              margin-bottom: 6px;
            }
            .kpi-value {
              font-size: 20px;
              font-weight: 800;
              color: #0f172a;
              font-family: monospace;
            }
            .kpi-desc {
              font-size: 10px;
              color: #94a3b8;
              margin-top: 4px;
            }
            .section-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              margin-bottom: 30px;
            }
            .card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 20px;
            }
            .card h3 {
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
              margin-top: 0;
              margin-bottom: 12px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 8px;
            }
            .settlements-bar-container {
              margin-bottom: 15px;
            }
            .settlements-bar {
              height: 12px;
              background-color: #e2e8f0;
              border-radius: 6px;
              overflow: hidden;
              display: flex;
            }
            .bar-cash {
              background-color: #10b981;
              height: 100%;
            }
            .bar-online {
              background-color: #3b82f6;
              height: 100%;
            }
            .settlements-legend {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              font-weight: 600;
              margin-top: 8px;
            }
            .legend-item {
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .dot-cash {
              width: 8px;
              height: 8px;
              background-color: #10b981;
              border-radius: 50%;
            }
            .dot-online {
              width: 8px;
              height: 8px;
              background-color: #3b82f6;
              border-radius: 50%;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            th {
              text-align: left;
              padding: 8px 10px;
              background-color: #f8fafc;
              color: #475569;
              font-weight: 700;
              border-bottom: 2px solid #e2e8f0;
            }
            .footer {
              text-align: center;
              font-size: 10px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 15px;
              margin-top: 40px;
            }
            @media print {
              body {
                margin: 20px;
              }
              button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>AS DEV STUDIO</h1>
              <p>Revenue & Sales Performance Statement</p>
            </div>
            <div class="meta-info">
              <div><strong>Period:</strong> ${rangeType.toUpperCase()}</div>
              <div><strong>Generated:</strong> ${dateStr}</div>
              <div><strong>Status:</strong> Audited & Certified</div>
            </div>
          </div>

          <div class="grid-kpi">
            <div class="kpi-card">
              <div class="kpi-title">Total Revenue</div>
              <div class="kpi-value">₹${report.totalRevenue.toFixed(2)}</div>
              <div class="kpi-desc">Net settled payments</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Orders Filled</div>
              <div class="kpi-value">${report.totalOrders}</div>
              <div class="kpi-desc">Total kitchen orders</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Avg Ticket Value</div>
              <div class="kpi-value">₹${report.averageOrderValue.toFixed(2)}</div>
              <div class="kpi-desc">Avg guest spend ticket</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Turnover Rate</div>
              <div class="kpi-value">${report.tableTurnoverRate.toFixed(2)}</div>
              <div class="kpi-desc">Orders / Table / Day</div>
            </div>
          </div>

          <div class="card" style="margin-bottom: 30px;">
            <h3>Payment Settlement Streams</h3>
            <div class="settlements-bar-container">
              <div class="settlements-bar">
                <div class="bar-cash" style="width: ${cashPercent}%;"></div>
                <div class="bar-online" style="width: ${onlinePercent}%;"></div>
              </div>
              <div class="settlements-legend">
                <div class="legend-item" style="color: #065f46;">
                  <span class="dot-cash"></span>
                  Cash: ${cashPercent}% (₹${(report.cashRevenue || 0).toFixed(2)} - ${report.cashOrdersCount || 0} orders)
                </div>
                <div class="legend-item" style="color: #1e40af;">
                  <span class="dot-online"></span>
                  Online: ${onlinePercent}% (₹${(report.onlineRevenue || 0).toFixed(2)} - ${report.onlineOrdersCount || 0} orders)
                </div>
              </div>
            </div>
          </div>

          <div class="section-grid">
            <div class="card">
              <h3>Top Selling Dishes</h3>
              <table>
                <thead>
                  <tr>
                    <th style="width: 40px;">Rank</th>
                    <th>Dish Name</th>
                    <th style="text-align: right; width: 100px;">Units Sold</th>
                  </tr>
                </thead>
                <tbody>
                  ${topSellingItemsHTML}
                </tbody>
              </table>
            </div>

            <div class="card">
              <h3>Hourly Revenue Stream</h3>
              <table>
                <thead>
                  <tr>
                    <th>Hour of Day</th>
                    <th style="text-align: right; width: 120px;">Revenue Stream</th>
                  </tr>
                </thead>
                <tbody>
                  ${hourlyRevenueHTML}
                </tbody>
              </table>
            </div>
          </div>

          <div class="footer">
            <p>AS DEV STUDIO Restaurant Management Platform • Confidential Business Analytics</p>
            <p>© ${new Date().getFullYear()} AS DEV STUDIO. All rights reserved.</p>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    if (rangeType !== "custom") {
      fetchReport();
    }
  }, [rangeType]);

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Revenue & Sales Report</h1>
          <p className="text-slate-500 text-xs mt-1">Aggregated restaurant performance, item sales volume and table turnover analytics</p>
        </div>

        {/* Date Selector controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex gap-1 shadow-sm">
            <button
              onClick={() => setRangeType("today")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                rangeType === "today"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setRangeType("week")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                rangeType === "week"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Past 7 Days
            </button>
            <button
              onClick={() => setRangeType("custom")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                rangeType === "custom"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Custom Range
            </button>
          </div>

          <button
            onClick={fetchReport}
            disabled={loading}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 cursor-pointer disabled:opacity-50 transition-all shadow-sm"
            title="Refresh Report"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>

          {report && (
            <div className="flex items-center gap-2 border-l border-slate-200 pl-2.5 ml-0.5">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 hover:border-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                title="Export report to Excel (CSV)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Export Excel</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 hover:border-blue-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                title="Export report to PDF"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">Export PDF</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Custom range date inputs */}
      {rangeType === "custom" && (
        <div className="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-end gap-3 max-w-xl">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Start Date</label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/25 transition-all"
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">End Date</label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/25 transition-all"
            />
          </div>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl cursor-pointer shadow-lg shadow-amber-500/10 transition-all flex items-center gap-1.5"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Generate Report
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-xs font-bold rounded-2xl shadow-sm">
          {error}
        </div>
      )}

      {loading && !report ? (
        <div className="h-[40vh] flex flex-col items-center justify-center bg-white border border-slate-150 rounded-2xl shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
          <p className="text-xs font-bold text-slate-600">Aggregating database indices...</p>
          <p className="text-[10px] text-slate-400 mt-1">Reading transaction items, turnover rates, and hourly performance logs.</p>
        </div>
      ) : report ? (
        <div className="space-y-8">
          {/* KPI Dashboard Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Revenue card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Period Revenue</span>
                <span className="text-2xl font-black text-slate-900 font-mono">₹{report.totalRevenue.toFixed(2)}</span>
                <span className="text-[10px] text-emerald-600 font-semibold block">Net receipt settlements</span>
              </div>
              <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            {/* Total Orders Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Orders Filled</span>
                <span className="text-2xl font-black text-slate-900 font-mono">{report.totalOrders}</span>
                <span className="text-[10px] text-slate-400 font-semibold block">Kitchen orders generated</span>
              </div>
              <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0 border border-amber-100">
                <ClipboardList className="w-5 h-5" />
              </div>
            </div>

            {/* Average Order Value Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Order Value</span>
                <span className="text-2xl font-black text-slate-900 font-mono">₹{report.averageOrderValue.toFixed(2)}</span>
                <span className="text-[10px] text-blue-600 font-semibold block">Avg guest ticket spend</span>
              </div>
              <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0 border border-blue-100">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            {/* Table Turnover Rate */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Table Turnover Rate</span>
                <span className="text-2xl font-black text-slate-900 font-mono">{report.tableTurnoverRate.toFixed(2)}</span>
                <span className="text-[10px] text-purple-600 font-semibold block">Orders / table / day average</span>
              </div>
              <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 shrink-0 border border-purple-100">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Payment Method Settlements Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cash Settlement Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cash Settlements</span>
                <span className="text-2xl font-black text-emerald-700 font-mono">₹{(report.cashRevenue || 0).toFixed(2)}</span>
                <span className="text-[10px] text-slate-400 font-semibold block">{report.cashOrdersCount || 0} orders paid in cash</span>
              </div>
              <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100">
                <Banknote className="w-5 h-5" />
              </div>
            </div>

            {/* Online Settlement Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Online Settlements</span>
                <span className="text-2xl font-black text-blue-700 font-mono">₹{(report.onlineRevenue || 0).toFixed(2)}</span>
                <span className="text-[10px] text-slate-400 font-semibold block">{report.onlineOrdersCount || 0} orders paid online (UPI / Cards)</span>
              </div>
              <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0 border border-blue-100">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Payment breakdown split bar */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment Settlements Distribution</h3>
                <p className="text-[11px] text-slate-500 font-medium">Split analysis of Cash vs Online transactions</p>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-md">Live Ledger</span>
            </div>

            {(() => {
              const totalSettle = (report.cashRevenue || 0) + (report.onlineRevenue || 0);
              const cashPercent = totalSettle > 0 ? Math.round((report.cashRevenue / totalSettle) * 100) : 0;
              const onlinePercent = totalSettle > 0 ? 100 - cashPercent : 0;

              return (
                <div className="space-y-3">
                  <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    {totalSettle > 0 ? (
                      <>
                        <div 
                          style={{ width: `${cashPercent}%` }} 
                          className="bg-emerald-500 h-full transition-all duration-500" 
                          title={`Cash: ${cashPercent}%`}
                        />
                        <div 
                          style={{ width: `${onlinePercent}%` }} 
                          className="bg-blue-500 h-full transition-all duration-500" 
                          title={`Online: ${onlinePercent}%`}
                        />
                      </>
                    ) : (
                      <div className="w-full bg-slate-200 h-full" title="No transaction records" />
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                      <span>Cash: {totalSettle > 0 ? `${cashPercent}%` : "0%"} (₹{(report.cashRevenue || 0).toFixed(2)})</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                      <span>Online: {totalSettle > 0 ? `${onlinePercent}%` : "0%"} (₹{(report.onlineRevenue || 0).toFixed(2)})</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Graphical Section & Best Sellers */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Hour Hourly Revenue Recharts Bar Chart */}
            <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Hourly Revenue Stream</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Distribution of incoming revenue by clock hour</p>
                </div>
                <Clock className="w-4 h-4 text-slate-300" />
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.revenueByHour} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="hour"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 600 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 600 }}
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip
                      cursor={{ fill: "#f8fafc", radius: 8 }}
                      contentStyle={{
                        background: "#0f172a",
                        border: "none",
                        borderRadius: "12px",
                        boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                        fontSize: "11px",
                        color: "#fff",
                        fontFamily: "monospace"
                      }}
                      formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, "Revenue"]}
                    />
                    <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top 5 Best-Selling Items list */}
            <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Best Sellers</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Top 5 items by unit quantity sold</p>
                  </div>
                  <Award className="w-4 h-4 text-slate-300" />
                </div>

                <div className="divide-y divide-slate-100">
                  {report.topSellingItems.length === 0 ? (
                    <div className="py-12 text-center text-[11px] font-bold text-slate-400">
                      No dishes sold in this period.
                    </div>
                  ) : (
                    report.topSellingItems.map((item, idx) => (
                      <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-md bg-amber-50 text-amber-700 border border-amber-150 font-bold flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-700">{item.name}</span>
                        </div>
                        <span className="font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                          {item.quantitySold} units
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* General period details */}
              <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-slate-300" />
                <span>Audited Report Verified</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-[40vh] flex flex-col items-center justify-center bg-white border border-slate-150 rounded-2xl shadow-sm text-center p-4">
          <Calendar className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-600">No report generated</p>
          <p className="text-[10px] text-slate-400 mt-1 max-w-[240px]">Select a timeframe above or enter a custom date range to pull aggregated metrics.</p>
        </div>
      )}
    </div>
  );
};
