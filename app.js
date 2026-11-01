/**
 * SalesPulse - Sales Analytics Dashboard
 * Pure Vanilla JavaScript (No Frameworks, No Backend, WebStorage Enabled)
 */

(function () {
  'use strict';

  // --- Storage Keys ---
  const STORAGE_KEY_DATA = 'sales_transactions_v1';
  const STORAGE_KEY_TARGET = 'sales_target_v1';
  const STORAGE_KEY_CURRENCY = 'sales_currency_v1';
  const STORAGE_KEY_TIMEFRAME = 'sales_timeframe_v1';

  // --- Currency Configuration ---
  const CURRENCIES = {
    USD: { symbol: '$', rate: 1.0, precision: 2 },
    EUR: { symbol: '€', rate: 0.92, precision: 2 },
    GBP: { symbol: '£', rate: 0.79, precision: 2 },
    CAD: { symbol: 'C$', rate: 1.36, precision: 2 },
    AUD: { symbol: 'A$', rate: 1.52, precision: 2 },
    JPY: { symbol: '¥', rate: 153.0, precision: 0 }
  };

  // --- Global State ---
  let state = {
    transactions: [],
    targetGoal: 150000,
    currency: 'USD',
    timeframe: '30days',
    trendInterval: 'daily', // 'daily' | 'monthly'
    
    // Table filter & pagination state
    searchQuery: '',
    filterCategory: 'all',
    filterChannel: 'all',
    filterStatus: 'all',
    sortColumn: 'date',
    sortDirection: 'desc',
    currentPage: 1,
    rowsPerPage: 10,

    // Active hovered chart items
    hoveredTrendPoint: null,
    hoveredDonutSlice: null,
    hoveredChannelBar: null
  };

  // --- Realistic Demo Dataset Generation ---
  function getDemoTransactions() {
    const categories = [
      'Enterprise SaaS', 
      'Cloud Hardware', 
      'Professional Services', 
      'Security & Compliance', 
      'Developer Tools'
    ];
    
    const channels = [
      'Direct Sales', 
      'Online Portal', 
      'Partner Network', 
      'Inbound Marketing'
    ];

    const productsByCategory = {
      'Enterprise SaaS': [
        { name: 'Nexus Cloud Suite Annual', amount: 4800, cost: 850 },
        { name: 'SaaS Pro Multi-Seat', amount: 2400, cost: 420 },
        { name: 'Analytics Pro Tier', amount: 1600, cost: 280 }
      ],
      'Cloud Hardware': [
        { name: 'Edge Acceleration Node', amount: 3200, cost: 1800 },
        { name: 'Secure Gateway Appliance', amount: 1950, cost: 1100 },
        { name: 'Rackmount Storage Unit', amount: 4200, cost: 2400 }
      ],
      'Professional Services': [
        { name: 'Architecture Audit & Review', amount: 5500, cost: 1900 },
        { name: 'Implementation Fast-Track', amount: 3800, cost: 1400 },
        { name: 'Dedicated Onboarding 10d', amount: 2500, cost: 950 }
      ],
      'Security & Compliance': [
        { name: 'Zero-Trust Shield Gateway', amount: 3600, cost: 720 },
        { name: 'SOC-2 Compliance Automation', amount: 2900, cost: 580 },
        { name: 'Penetration Testing Bundle', amount: 4100, cost: 1600 }
      ],
      'Developer Tools': [
        { name: 'CI/CD Pipeline Enterprise', amount: 1850, cost: 350 },
        { name: 'DevOps Orchestrator Seat', amount: 1200, cost: 220 },
        { name: 'API Gateway Commercial Pack', amount: 2100, cost: 410 }
      ]
    };

    const customers = [
      { name: 'Acme Technologies', email: 'procurement@acme.com' },
      { name: 'Vanguard Systems', email: 'finance@vanguard.io' },
      { name: 'Apex Data Labs', email: 'billing@apexdata.co' },
      { name: 'Starlight Media Group', email: 'ops@starlightmedia.com' },
      { name: 'Quantum Core Inc', email: 'accounts@quantumcore.net' },
      { name: 'Horizon Logistics', email: 'admin@horizonlogistics.com' },
      { name: 'Nova Healthtech', email: 'payables@novahealth.org' },
      { name: 'Beacon Fintech', email: 'treasury@beaconfin.com' },
      { name: 'Bluecrest Capital', email: 'invoices@bluecrest.com' },
      { name: 'Helios Renewable', email: 'sales@heliosenergy.com' },
      { name: 'Omni Retailers', email: 'vendor@omniretail.com' },
      { name: 'Ironclad Security', email: 'licensing@ironcladsec.com' },
      { name: 'Polaris Robotics', email: 'orders@polarisrobotics.ai' },
      { name: 'Summit Consulting', email: 'partners@summitconsult.com' },
      { name: 'Strata Telecom', email: 'enterprise@stratatelecom.com' }
    ];

    const transactions = [];
    const now = new Date(2026, 10, 1); // Nov 1, 2026 anchor date
    let invoiceCounter = 1042;

    // Generate 42 transactions spanning over the last ~120 days
    for (let i = 0; i < 42; i++) {
      invoiceCounter++;
      // distribute dates backwards over the past 110 days
      const daysAgo = Math.floor(i * 2.6);
      const txDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const dateStr = txDate.toISOString().split('T')[0];

      const cat = categories[i % categories.length];
      const prodList = productsByCategory[cat];
      const prod = prodList[i % prodList.length];
      const cust = customers[i % customers.length];
      const chan = channels[(i * 3) % channels.length];

      // Add a slight variance to amount and cost
      const variance = 0.85 + (i % 5) * 0.08;
      const amount = Math.round(prod.amount * variance * 100) / 100;
      const cost = Math.round(prod.cost * variance * 100) / 100;
      const profit = Math.round((amount - cost) * 100) / 100;

      // Status distribution: ~80% Completed, ~12% Pending, ~8% Refunded
      let status = 'Completed';
      if (i % 9 === 0) {
        status = 'Pending';
      } else if (i === 14 || i === 31) {
        status = 'Refunded';
      }

      transactions.push({
        id: `INV-2026-${invoiceCounter}`,
        date: dateStr,
        customer: cust.name,
        email: cust.email,
        product: prod.name,
        category: cat,
        channel: chan,
        amount: amount,
        cost: cost,
        profit: profit,
        status: status
      });
    }

    // Sort newest date first
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    return transactions;
  }

  // --- Persistence Handlers (WebStorage) ---
  function loadDataFromStorage() {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY_DATA);
      if (storedData) {
        state.transactions = JSON.parse(storedData);
      } else {
        state.transactions = getDemoTransactions();
        saveTransactionsToStorage();
      }

      const storedTarget = localStorage.getItem(STORAGE_KEY_TARGET);
      if (storedTarget) {
        state.targetGoal = parseFloat(storedTarget) || 150000;
      }

      const storedCurrency = localStorage.getItem(STORAGE_KEY_CURRENCY);
      if (storedCurrency && CURRENCIES[storedCurrency]) {
        state.currency = storedCurrency;
        const curEl = document.getElementById('currencySelect');
        if (curEl) curEl.value = storedCurrency;
      }

      const storedTimeframe = localStorage.getItem(STORAGE_KEY_TIMEFRAME);
      if (storedTimeframe) {
        state.timeframe = storedTimeframe;
        const tfEl = document.getElementById('dateRangeSelect');
        if (tfEl) tfEl.value = storedTimeframe;
      }
    } catch (e) {
      console.warn('LocalStorage error or unavailable, falling back to memory state', e);
      state.transactions = getDemoTransactions();
    }
  }

  function saveTransactionsToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(state.transactions));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
      showToast('Warning: Could not save data to browser storage', 'warning');
    }
  }

  function saveTargetToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_TARGET, state.targetGoal.toString());
    } catch (e) {
      console.error('Failed to save target', e);
    }
  }

  // --- Formatting Helpers ---
  function formatMoney(amountInUSD) {
    const cfg = CURRENCIES[state.currency] || CURRENCIES.USD;
    const converted = amountInUSD * cfg.rate;
    return cfg.symbol + converted.toLocaleString(undefined, {
      minimumFractionDigits: cfg.precision,
      maximumFractionDigits: cfg.precision
    });
  }

  function formatCompactMoney(amountInUSD) {
    const cfg = CURRENCIES[state.currency] || CURRENCIES.USD;
    const converted = amountInUSD * cfg.rate;
    if (Math.abs(converted) >= 1000000) {
      return cfg.symbol + (converted / 1000000).toFixed(1) + 'M';
    }
    if (Math.abs(converted) >= 1000) {
      return cfg.symbol + (converted / 1000).toFixed(1) + 'k';
    }
    return cfg.symbol + converted.toFixed(0);
  }

  function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return dateStr;
  }

  // --- Toast Notifications ---
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3200);
  }

  // --- Timeframe Filter Helper ---
  function getFilteredTransactionsByTimeframe(transactions, timeframe) {
    if (timeframe === 'all') return transactions;

    // Use Nov 1, 2026 as reference base, or current highest date in dataset
    let refDate = new Date(2026, 10, 1);
    if (transactions.length > 0) {
      const latestTimestamp = Math.max(...transactions.map(t => new Date(t.date).getTime()));
      if (!isNaN(latestTimestamp)) {
        refDate = new Date(latestTimestamp);
      }
    }

    const cutoffDate = new Date(refDate);

    if (timeframe === '7days') {
      cutoffDate.setDate(cutoffDate.getDate() - 7);
    } else if (timeframe === '30days') {
      cutoffDate.setDate(cutoffDate.getDate() - 30);
    } else if (timeframe === '90days') {
      cutoffDate.setDate(cutoffDate.getDate() - 90);
    } else if (timeframe === 'thisYear') {
      cutoffDate.setMonth(0, 1); // Jan 1st of same year
    }

    return transactions.filter(t => new Date(t.date) >= cutoffDate);
  }

  // --- Previous Period Filter Helper for Trend % ---
  function getPreviousPeriodTransactions(transactions, timeframe) {
    if (timeframe === 'all') return [];

    let days = 30;
    if (timeframe === '7days') days = 7;
    else if (timeframe === '90days') days = 90;
    else if (timeframe === 'thisYear') days = 365;

    let refDate = new Date(2026, 10, 1);
    if (transactions.length > 0) {
      const latestTimestamp = Math.max(...transactions.map(t => new Date(t.date).getTime()));
      if (!isNaN(latestTimestamp)) {
        refDate = new Date(latestTimestamp);
      }
    }

    const periodEnd = new Date(refDate);
    periodEnd.setDate(periodEnd.getDate() - days);

    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - days);

    return transactions.filter(t => {
      const d = new Date(t.date);
      return d >= periodStart && d < periodEnd;
    });
  }

  // --- Recalculate and Render KPI Cards ---
  function updateKPIs(currentTx, prevTx) {
    // Current period metrics
    let totalRevenue = 0;
    let netProfit = 0;
    let completedOrders = 0;
    let pendingOrders = 0;

    currentTx.forEach(t => {
      if (t.status === 'Completed') {
        totalRevenue += t.amount;
        netProfit += t.profit;
        completedOrders++;
      } else if (t.status === 'Pending') {
        pendingOrders++;
      } else if (t.status === 'Refunded') {
        // Refunded is excluded from active revenue
      }
    });

    const aov = completedOrders > 0 ? totalRevenue / completedOrders : 0;
    const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Previous period metrics for comparison
    let prevRevenue = 0;
    let prevOrders = 0;
    prevTx.forEach(t => {
      if (t.status === 'Completed') {
        prevRevenue += t.amount;
        prevOrders++;
      }
    });

    // Calculate revenue trend %
    let revChangePct = 0;
    if (prevRevenue > 0) {
      revChangePct = ((totalRevenue - prevRevenue) / prevRevenue) * 100;
    } else if (totalRevenue > 0) {
      revChangePct = 100;
    }

    // Calculate orders trend %
    let ordChangePct = 0;
    if (prevOrders > 0) {
      ordChangePct = ((completedOrders - prevOrders) / prevOrders) * 100;
    } else if (completedOrders > 0) {
      ordChangePct = 100;
    }

    // DOM Updates
    const totalRevEl = document.getElementById('kpiTotalRevenue');
    if (totalRevEl) totalRevEl.textContent = formatMoney(totalRevenue);

    const netProfitEl = document.getElementById('kpiNetProfit');
    if (netProfitEl) netProfitEl.textContent = formatMoney(netProfit);

    const marginBadgeEl = document.getElementById('kpiMarginBadge');
    if (marginBadgeEl) marginBadgeEl.textContent = `Margin: ${margin.toFixed(1)}%`;

    const totalOrdersEl = document.getElementById('kpiTotalOrders');
    if (totalOrdersEl) totalOrdersEl.textContent = completedOrders.toLocaleString();

    const pendingTextEl = document.getElementById('kpiPendingText');
    if (pendingTextEl) pendingTextEl.textContent = `${pendingOrders} pending confirmation`;

    const aovEl = document.getElementById('kpiAOV');
    if (aovEl) aovEl.textContent = formatMoney(aov);

    // Revenue Trend Badge
    const revBadge = document.getElementById('revenueTrendBadge');
    const revVal = document.getElementById('revenueTrendVal');
    if (revBadge && revVal) {
      if (revChangePct >= 0) {
        revBadge.className = 'trend-badge trend-up';
        revVal.textContent = `+${revChangePct.toFixed(1)}%`;
      } else {
        revBadge.className = 'trend-badge trend-down';
        revVal.textContent = `${revChangePct.toFixed(1)}%`;
      }
    }

    // Orders Trend Badge
    const ordBadge = document.getElementById('ordersTrendBadge');
    const ordVal = document.getElementById('ordersTrendVal');
    if (ordBadge && ordVal) {
      if (ordChangePct >= 0) {
        ordBadge.className = 'trend-badge trend-up';
        ordVal.textContent = `+${ordChangePct.toFixed(1)}%`;
      } else {
        ordBadge.className = 'trend-badge trend-down';
        ordVal.textContent = `${ordChangePct.toFixed(1)}%`;
      }
    }

    // Sales Target / Quota Card
    const targetCurrentEl = document.getElementById('kpiTargetCurrent');
    const targetGoalEl = document.getElementById('kpiTargetGoal');
    const progressBarEl = document.getElementById('kpiProgressBar');
    const targetPctEl = document.getElementById('kpiTargetPercent');
    const targetRemEl = document.getElementById('kpiTargetRemaining');

    const targetPct = state.targetGoal > 0 ? (totalRevenue / state.targetGoal) * 100 : 0;
    const remaining = Math.max(0, state.targetGoal - totalRevenue);

    if (targetCurrentEl) targetCurrentEl.textContent = formatMoney(totalRevenue);
    if (targetGoalEl) targetGoalEl.textContent = `/ ${formatMoney(state.targetGoal)}`;
    if (progressBarEl) progressBarEl.style.width = `${Math.min(100, Math.max(0, targetPct))}%`;
    if (targetPctEl) targetPctEl.textContent = `${targetPct.toFixed(1)}% achieved`;
    if (targetRemEl) targetRemEl.textContent = `${formatMoney(remaining)} remaining`;
  }

  // ==========================================================================
  // Custom High-DPI Canvas Charts (Pure Vanilla HTML5 Canvas)
  // ==========================================================================

  function setupCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.resetTransform();
    ctx.scale(dpr, dpr);

    return { ctx, width: rect.width, height: rect.height, dpr };
  }

  // --- Chart 1: Revenue & Profit Trend ---
  let trendChartDataCache = null;

  function renderRevenueTrendChart(transactions) {
    const setup = setupCanvas('revenueTrendCanvas');
    if (!setup) return;
    const { ctx, width, height } = setup;

    // Only consider Completed & Pending transactions for trajectory
    const validTx = transactions.filter(t => t.status !== 'Refunded');

    // Aggregate by day or month
    const aggregated = {};
    validTx.forEach(t => {
      let key = t.date;
      if (state.trendInterval === 'monthly') {
        key = t.date.substring(0, 7); // YYYY-MM
      }
      if (!aggregated[key]) {
        aggregated[key] = { revenue: 0, profit: 0, dateKey: key };
      }
      aggregated[key].revenue += t.amount;
      aggregated[key].profit += t.profit;
    });

    const sortedKeys = Object.keys(aggregated).sort();
    const dataPoints = sortedKeys.map(k => aggregated[k]);

    trendChartDataCache = { dataPoints, width, height };

    if (dataPoints.length === 0) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available for the selected timeframe', width / 2, height / 2);
      return;
    }

    const padding = { top: 25, right: 25, bottom: 35, left: 60 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxVal = Math.max(
      ...dataPoints.map(d => Math.max(d.revenue, d.profit)),
      1000
    ) * 1.15; // 15% headroom

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw horizontal grid lines & Y labels
    const gridLines = 4;
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= gridLines; i++) {
      const val = (maxVal / gridLines) * i;
      const y = padding.top + chartH - (i / gridLines) * chartH;

      ctx.beginPath();
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.fillText(formatCompactMoney(val), padding.left - 8, y);
    }

    // Coordinates mapper
    const getX = index => {
      if (dataPoints.length === 1) return padding.left + chartW / 2;
      return padding.left + (index / (dataPoints.length - 1)) * chartW;
    };
    const getY = val => padding.top + chartH - (val / maxVal) * chartH;

    // Cache coordinate points for tooltips
    dataPoints.forEach((d, idx) => {
      d.x = getX(idx);
      d.yRev = getY(d.revenue);
      d.yProfit = getY(d.profit);
    });

    // 1. Draw Revenue Gradient Area
    ctx.beginPath();
    ctx.moveTo(dataPoints[0].x, padding.top + chartH);
    dataPoints.forEach((d) => ctx.lineTo(d.x, d.yRev));
    ctx.lineTo(dataPoints[dataPoints.length - 1].x, padding.top + chartH);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.22)');
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0.01)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // 2. Draw Revenue Line
    ctx.beginPath();
    dataPoints.forEach((d, idx) => {
      if (idx === 0) ctx.moveTo(d.x, d.yRev);
      else ctx.lineTo(d.x, d.yRev);
    });
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 3. Draw Profit Line
    ctx.beginPath();
    dataPoints.forEach((d, idx) => {
      if (idx === 0) ctx.moveTo(d.x, d.yProfit);
      else ctx.lineTo(d.x, d.yProfit);
    });
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. Draw X-axis labels (skip some if too dense)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#94a3b8';

    const step = Math.ceil(dataPoints.length / 8);
    dataPoints.forEach((d, idx) => {
      if (idx % step === 0 || idx === dataPoints.length - 1) {
        let label = d.dateKey;
        if (state.trendInterval === 'daily') {
          const parts = d.dateKey.split('-');
          label = `${parts[1]}/${parts[2]}`;
        } else {
          const parts = d.dateKey.split('-');
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          label = monthNames[parseInt(parts[1], 10) - 1] || d.dateKey;
        }
        ctx.fillText(label, d.x, padding.top + chartH + 10);
      }
    });

    // 5. Draw Active Hover Crosshair & Dots
    if (state.hoveredTrendPoint) {
      const p = state.hoveredTrendPoint;

      // Vertical guide line
      ctx.beginPath();
      ctx.strokeStyle = '#cbd5e1';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.moveTo(p.x, padding.top);
      ctx.lineTo(p.x, padding.top + chartH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point circles
      ctx.beginPath();
      ctx.arc(p.x, p.yRev, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#2563eb';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(p.x, p.yProfit, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    }
  }

  // --- Chart 2: Category Donut Chart ---
  let donutChartDataCache = null;

  function renderCategoryDonutChart(transactions) {
    const setup = setupCanvas('categoryDonutCanvas');
    if (!setup) return;
    const { ctx, width, height } = setup;

    const validTx = transactions.filter(t => t.status === 'Completed');
    const categoryTotals = {};
    let grandTotal = 0;

    validTx.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      grandTotal += t.amount;
    });

    const categoryColors = {
      'Enterprise SaaS': '#2563eb',
      'Cloud Hardware': '#10b981',
      'Professional Services': '#8b5cf6',
      'Security & Compliance': '#f59e0b',
      'Developer Tools': '#ec4899'
    };

    const categories = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]);
    const slices = [];
    let startAngle = -Math.PI / 2;

    categories.forEach(cat => {
      const val = categoryTotals[cat];
      const sliceAngle = grandTotal > 0 ? (val / grandTotal) * (Math.PI * 2) : 0;
      slices.push({
        category: cat,
        value: val,
        color: categoryColors[cat] || '#64748b',
        startAngle: startAngle,
        endAngle: startAngle + sliceAngle,
        pct: grandTotal > 0 ? (val / grandTotal) * 100 : 0
      });
      startAngle += sliceAngle;
    });

    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(centerX, centerY) - 15;
    const innerRadius = outerRadius * 0.65;

    donutChartDataCache = { slices, centerX, centerY, outerRadius, innerRadius, grandTotal };

    ctx.clearRect(0, 0, width, height);

    if (slices.length === 0 || grandTotal === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No completed sales in this period', centerX, centerY);
      return;
    }

    // Draw Slices
    slices.forEach(slice => {
      const isHovered = state.hoveredDonutSlice && state.hoveredDonutSlice.category === slice.category;
      const rOuter = isHovered ? outerRadius + 6 : outerRadius;
      const rInner = isHovered ? innerRadius - 2 : innerRadius;

      ctx.beginPath();
      ctx.arc(centerX, centerY, rOuter, slice.startAngle, slice.endAngle);
      ctx.arc(centerX, centerY, rInner, slice.endAngle, slice.startAngle, true);
      ctx.closePath();

      ctx.fillStyle = slice.color;
      ctx.fill();

      // Slice separator border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Center Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (state.hoveredDonutSlice) {
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText(state.hoveredDonutSlice.category, centerX, centerY - 10);

      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(formatCompactMoney(state.hoveredDonutSlice.value), centerX, centerY + 10);
    } else {
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Total Sales', centerX, centerY - 10);

      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(formatCompactMoney(grandTotal), centerX, centerY + 10);
    }

    // Render HTML Donut Legend
    renderDonutLegend(slices);
  }

  function renderDonutLegend(slices) {
    const container = document.getElementById('categoryLegendList');
    if (!container) return;
    container.innerHTML = '';

    slices.forEach(s => {
      const row = document.createElement('div');
      row.className = 'donut-legend-row';
      row.innerHTML = `
        <span class="donut-legend-label">
          <span class="donut-legend-color" style="background-color: ${s.color};"></span>
          ${s.category}
        </span>
        <span class="donut-legend-numbers">
          <span>${formatMoney(s.value)}</span>
          <span class="donut-legend-pct">${s.pct.toFixed(0)}%</span>
        </span>
      `;
      container.appendChild(row);
    });
  }

  // --- Chart 3: Channel Performance Bar Chart ---
  let channelChartDataCache = null;

  function renderChannelBarChart(transactions) {
    const setup = setupCanvas('channelBarCanvas');
    if (!setup) return;
    const { ctx, width, height } = setup;

    const channels = ['Direct Sales', 'Online Portal', 'Partner Network', 'Inbound Marketing'];
    const channelData = {};
    channels.forEach(ch => { channelData[ch] = { revenue: 0, count: 0 }; });

    transactions.forEach(t => {
      if (t.status === 'Completed' && channelData[t.channel]) {
        channelData[t.channel].revenue += t.amount;
        channelData[t.channel].count++;
      }
    });

    const bars = channels.map(ch => ({
      channel: ch,
      revenue: channelData[ch].revenue,
      count: channelData[ch].count
    }));

    const maxRev = Math.max(...bars.map(b => b.revenue), 1000) * 1.15;
    const padding = { top: 25, right: 20, bottom: 45, left: 60 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    channelChartDataCache = { bars, padding, chartW, chartH, maxRev };

    ctx.clearRect(0, 0, width, height);

    // Draw horizontal grid lines & Y labels
    const gridLines = 4;
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= gridLines; i++) {
      const val = (maxRev / gridLines) * i;
      const y = padding.top + chartH - (i / gridLines) * chartH;

      ctx.beginPath();
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.fillText(formatCompactMoney(val), padding.left - 8, y);
    }

    // Render Bars
    const totalBars = bars.length;
    const slotW = chartW / totalBars;
    const barW = Math.min(slotW * 0.55, 48);

    bars.forEach((b, idx) => {
      const barX = padding.left + (idx * slotW) + (slotW - barW) / 2;
      const barHeight = (b.revenue / maxRev) * chartH;
      const barY = padding.top + chartH - barHeight;

      b.x = barX;
      b.y = barY;
      b.w = barW;
      b.h = barHeight;

      const isHovered = state.hoveredChannelBar && state.hoveredChannelBar.channel === b.channel;

      // Rounded top bar drawing
      const radius = 6;
      ctx.beginPath();
      if (barHeight > radius) {
        ctx.moveTo(barX, padding.top + chartH);
        ctx.lineTo(barX, barY + radius);
        ctx.quadraticCurveTo(barX, barY, barX + radius, barY);
        ctx.lineTo(barX + barW - radius, barY);
        ctx.quadraticCurveTo(barX + barW, barY, barX + barW, barY + radius);
        ctx.lineTo(barX + barW, padding.top + chartH);
      } else {
        ctx.rect(barX, barY, barW, barHeight);
      }
      ctx.closePath();

      ctx.fillStyle = isHovered ? '#1d4ed8' : '#2563eb';
      ctx.fill();

      // Top value text
      if (b.revenue > 0) {
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(formatCompactMoney(b.revenue), barX + barW / 2, barY - 4);
      }

      // X Channel Label
      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(b.channel, barX + barW / 2, padding.top + chartH + 10);
    });
  }

  // --- Top Performing Products List ---
  function renderTopProducts(transactions) {
    const container = document.getElementById('topProductsList');
    if (!container) return;
    container.innerHTML = '';

    const validTx = transactions.filter(t => t.status === 'Completed');
    const productStats = {};

    validTx.forEach(t => {
      if (!productStats[t.product]) {
        productStats[t.product] = { name: t.product, category: t.category, revenue: 0, units: 0 };
      }
      productStats[t.product].revenue += t.amount;
      productStats[t.product].units++;
    });

    const sorted = Object.values(productStats).sort((a, b) => b.revenue - a.revenue);
    const top5 = sorted.slice(0, 5);

    if (top5.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p class="empty-title">No completed product sales recorded</p>
        </div>
      `;
      return;
    }

    const maxRev = top5[0].revenue || 1;

    top5.forEach((prod, idx) => {
      const pct = (prod.revenue / maxRev) * 100;
      const itemEl = document.createElement('div');
      itemEl.className = 'top-product-item';
      itemEl.innerHTML = `
        <div class="top-product-info">
          <span class="top-product-name">
            <span class="top-product-rank">${idx + 1}</span>
            ${prod.name}
          </span>
          <div class="top-product-metrics">
            <div class="top-product-revenue">${formatMoney(prod.revenue)}</div>
            <div class="top-product-units">${prod.units} unit${prod.units > 1 ? 's' : ''} sold</div>
          </div>
        </div>
        <div class="top-product-bar-track">
          <div class="top-product-bar-fill" style="width: ${pct}%;"></div>
        </div>
      `;
      container.appendChild(itemEl);
    });
  }

  // ==========================================================================
  // Interactive Chart Tooltips & Hover Handlers
  // ==========================================================================

  function setupChartInteractions() {
    // 1. Trend Line Chart Interactions
    const trendCanvas = document.getElementById('revenueTrendCanvas');
    const trendTooltip = document.getElementById('trendChartTooltip');

    if (trendCanvas && trendTooltip) {
      trendCanvas.addEventListener('mousemove', (e) => {
        if (!trendChartDataCache || !trendChartDataCache.dataPoints.length) return;

        const rect = trendCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;

        // Find nearest point
        let nearest = null;
        let minDist = Infinity;

        trendChartDataCache.dataPoints.forEach(p => {
          const dist = Math.abs(p.x - mouseX);
          if (dist < minDist) {
            minDist = dist;
            nearest = p;
          }
        });

        if (nearest && minDist < 40) {
          state.hoveredTrendPoint = nearest;
          trendCanvas.style.cursor = 'crosshair';

          trendTooltip.style.display = 'block';
          trendTooltip.style.left = `${nearest.x}px`;
          trendTooltip.style.top = `${Math.min(nearest.yRev, nearest.yProfit)}px`;

          let dateLabel = nearest.dateKey;
          if (state.trendInterval === 'daily') {
            dateLabel = formatDateDisplay(nearest.dateKey);
          }

          trendTooltip.innerHTML = `
            <div style="font-weight: 700; margin-bottom: 4px; color: #f8fafc;">${dateLabel}</div>
            <div style="color: #60a5fa; font-size: 11px;">Revenue: <strong>${formatMoney(nearest.revenue)}</strong></div>
            <div style="color: #34d399; font-size: 11px;">Net Profit: <strong>${formatMoney(nearest.profit)}</strong></div>
          `;

          // Re-render to show crosshair dot
          const filtered = getFilteredTransactionsByTimeframe(state.transactions, state.timeframe);
          renderRevenueTrendChart(filtered);
        } else {
          hideTrendTooltip();
        }
      });

      trendCanvas.addEventListener('mouseleave', hideTrendTooltip);

      function hideTrendTooltip() {
        if (state.hoveredTrendPoint) {
          state.hoveredTrendPoint = null;
          trendTooltip.style.display = 'none';
          trendCanvas.style.cursor = 'default';
          const filtered = getFilteredTransactionsByTimeframe(state.transactions, state.timeframe);
          renderRevenueTrendChart(filtered);
        }
      }
    }

    // 2. Category Donut Interactions
    const donutCanvas = document.getElementById('categoryDonutCanvas');
    const donutTooltip = document.getElementById('donutChartTooltip');

    if (donutCanvas && donutTooltip) {
      donutCanvas.addEventListener('mousemove', (e) => {
        if (!donutChartDataCache || !donutChartDataCache.slices.length) return;

        const rect = donutCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const { centerX, centerY, outerRadius, innerRadius, slices } = donutChartDataCache;
        const dx = mouseX - centerX;
        const dy = mouseY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let hovered = null;
        if (dist >= innerRadius - 5 && dist <= outerRadius + 8) {
          let angle = Math.atan2(dy, dx);
          // Normalize to match slice ranges
          slices.forEach(s => {
            let sAngle = s.startAngle;
            let eAngle = s.endAngle;

            // Handle circle wrapping
            let testAngle = angle;
            if (testAngle < sAngle) testAngle += Math.PI * 2;
            if (testAngle >= sAngle && testAngle <= eAngle) {
              hovered = s;
            }
          });
        }

        if (hovered !== state.hoveredDonutSlice) {
          state.hoveredDonutSlice = hovered;
          const filtered = getFilteredTransactionsByTimeframe(state.transactions, state.timeframe);
          renderCategoryDonutChart(filtered);
        }

        if (hovered) {
          donutCanvas.style.cursor = 'pointer';
          donutTooltip.style.display = 'block';
          donutTooltip.style.left = `${mouseX}px`;
          donutTooltip.style.top = `${mouseY}px`;
          donutTooltip.innerHTML = `
            <div style="font-weight: 700;">${hovered.category}</div>
            <div style="color: #60a5fa;">${formatMoney(hovered.value)} (${hovered.pct.toFixed(1)}%)</div>
          `;
        } else {
          donutTooltip.style.display = 'none';
          donutCanvas.style.cursor = 'default';
        }
      });

      donutCanvas.addEventListener('mouseleave', () => {
        if (state.hoveredDonutSlice) {
          state.hoveredDonutSlice = null;
          donutTooltip.style.display = 'none';
          const filtered = getFilteredTransactionsByTimeframe(state.transactions, state.timeframe);
          renderCategoryDonutChart(filtered);
        }
      });
    }

    // 3. Channel Bar Interactions
    const channelCanvas = document.getElementById('channelBarCanvas');
    const channelTooltip = document.getElementById('channelChartTooltip');

    if (channelCanvas && channelTooltip) {
      channelCanvas.addEventListener('mousemove', (e) => {
        if (!channelChartDataCache || !channelChartDataCache.bars.length) return;

        const rect = channelCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let hovered = null;
        channelChartDataCache.bars.forEach(b => {
          if (
            mouseX >= b.x &&
            mouseX <= b.x + b.w &&
            mouseY >= b.y &&
            mouseY <= b.y + b.h
          ) {
            hovered = b;
          }
        });

        if (hovered !== state.hoveredChannelBar) {
          state.hoveredChannelBar = hovered;
          const filtered = getFilteredTransactionsByTimeframe(state.transactions, state.timeframe);
          renderChannelBarChart(filtered);
        }

        if (hovered) {
          channelCanvas.style.cursor = 'pointer';
          channelTooltip.style.display = 'block';
          channelTooltip.style.left = `${hovered.x + hovered.w / 2}px`;
          channelTooltip.style.top = `${hovered.y}px`;
          channelTooltip.innerHTML = `
            <div style="font-weight: 700;">${hovered.channel}</div>
            <div style="color: #60a5fa;">Sales: ${formatMoney(hovered.revenue)}</div>
            <div style="color: #94a3b8; font-size: 11px;">${hovered.count} completed deal${hovered.count !== 1 ? 's' : ''}</div>
          `;
        } else {
          channelTooltip.style.display = 'none';
          channelCanvas.style.cursor = 'default';
        }
      });

      channelCanvas.addEventListener('mouseleave', () => {
        if (state.hoveredChannelBar) {
          state.hoveredChannelBar = null;
          channelTooltip.style.display = 'none';
          const filtered = getFilteredTransactionsByTimeframe(state.transactions, state.timeframe);
          renderChannelBarChart(filtered);
        }
      });
    }
  }

  // ==========================================================================
  // Transactions Table Management (Sorting, Filtering, Pagination)
  // ==========================================================================

  function getProcessedTableTransactions() {
    // 1. Timeframe filter
    let list = getFilteredTransactionsByTimeframe(state.transactions, state.timeframe);

    // 2. Search query filter
    if (state.searchQuery.trim() !== '') {
      const q = state.searchQuery.toLowerCase().trim();
      list = list.filter(t => (
        t.customer.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.product.toLowerCase().includes(q)
      ));
    }

    // 3. Category filter
    if (state.filterCategory !== 'all') {
      list = list.filter(t => t.category === state.filterCategory);
    }

    // 4. Channel filter
    if (state.filterChannel !== 'all') {
      list = list.filter(t => t.channel === state.filterChannel);
    }

    // 5. Status filter
    if (state.filterStatus !== 'all') {
      list = list.filter(t => t.status === state.filterStatus);
    }

    // 6. Sorting
    list.sort((a, b) => {
      let valA = a[state.sortColumn];
      let valB = b[state.sortColumn];

      if (state.sortColumn === 'date') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return state.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return state.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }

  function renderTransactionsTable() {
    const list = getProcessedTableTransactions();
    const tbody = document.getElementById('transactionsTableBody');
    const emptyState = document.getElementById('tableEmptyState');
    const recordCountEl = document.getElementById('tableRecordCount');

    if (recordCountEl) {
      recordCountEl.textContent = `Showing ${list.length} transaction${list.length === 1 ? '' : 's'}`;
    }

    if (list.length === 0) {
      if (tbody) tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      updatePaginationControls(0);
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    // Pagination slice
    const totalPages = Math.ceil(list.length / state.rowsPerPage) || 1;
    if (state.currentPage > totalPages) state.currentPage = totalPages;
    if (state.currentPage < 1) state.currentPage = 1;

    const startIndex = (state.currentPage - 1) * state.rowsPerPage;
    const paginatedList = list.slice(startIndex, startIndex + state.rowsPerPage);

    if (tbody) {
      tbody.innerHTML = '';

      paginatedList.forEach(t => {
        const tr = document.createElement('tr');

        // Status badge class
        let statusClass = 'status-completed';
        if (t.status === 'Pending') statusClass = 'status-pending';
        else if (t.status === 'Refunded') statusClass = 'status-refunded';

        tr.innerHTML = `
          <td><span class="cell-invoice">${escapeHtml(t.id)}</span></td>
          <td>${formatDateDisplay(t.date)}</td>
          <td>
            <div class="cell-customer">
              <span class="customer-name">${escapeHtml(t.customer)}</span>
              <span class="customer-email">${escapeHtml(t.email)}</span>
            </div>
          </td>
          <td>${escapeHtml(t.product)}</td>
          <td>${escapeHtml(t.category)}</td>
          <td>${escapeHtml(t.channel)}</td>
          <td class="text-right"><span class="cell-amount">${formatMoney(t.amount)}</span></td>
          <td class="text-right"><span class="cell-profit">${formatMoney(t.profit)}</span></td>
          <td><span class="status-pill ${statusClass}">${escapeHtml(t.status)}</span></td>
          <td>
            <div class="row-actions">
              <button class="btn-table-action" data-action="edit" data-id="${t.id}" title="Edit transaction">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="btn-table-action btn-table-delete" data-action="delete" data-id="${t.id}" title="Delete transaction">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </td>
        `;

        tbody.appendChild(tr);
      });
    }

    updatePaginationControls(list.length);
  }

  function updatePaginationControls(totalRecords) {
    const totalPages = Math.ceil(totalRecords / state.rowsPerPage) || 1;
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageText = document.getElementById('paginationCurrentPage');
    const rangeText = document.getElementById('paginationRangeText');

    if (prevBtn) prevBtn.disabled = state.currentPage <= 1;
    if (nextBtn) nextBtn.disabled = state.currentPage >= totalPages;

    if (pageText) pageText.textContent = `Page ${state.currentPage} of ${totalPages}`;

    if (rangeText) {
      if (totalRecords === 0) {
        rangeText.textContent = '0 records';
      } else {
        const start = (state.currentPage - 1) * state.rowsPerPage + 1;
        const end = Math.min(start + state.rowsPerPage - 1, totalRecords);
        rangeText.textContent = `${start} - ${end} of ${totalRecords}`;
      }
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================================================
  // Entire Dashboard Refresh Pipeline
  // ==========================================================================

  function refreshDashboard() {
    const currentTx = getFilteredTransactionsByTimeframe(state.transactions, state.timeframe);
    const prevTx = getPreviousPeriodTransactions(state.transactions, state.timeframe);

    // Update KPI metrics
    updateKPIs(currentTx, prevTx);

    // Render Canvas Charts
    renderRevenueTrendChart(currentTx);
    renderCategoryDonutChart(currentTx);
    renderChannelBarChart(currentTx);
    renderTopProducts(currentTx);

    // Render Table
    renderTransactionsTable();
  }

  // ==========================================================================
  // Modal Handlers & Form Management
  // ==========================================================================

  function openTransactionModal(editId = null) {
    const modal = document.getElementById('transactionModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('transactionForm');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('editTransactionId').value = '';

    if (editId) {
      const tx = state.transactions.find(t => t.id === editId);
      if (tx) {
        modalTitle.textContent = `Edit Sale (${tx.id})`;
        document.getElementById('editTransactionId').value = tx.id;
        document.getElementById('inputCustomerName').value = tx.customer;
        document.getElementById('inputCustomerEmail').value = tx.email;
        document.getElementById('inputProduct').value = tx.product;
        document.getElementById('inputCategory').value = tx.category;
        document.getElementById('inputChannel').value = tx.channel;
        document.getElementById('inputDate').value = tx.date;
        document.getElementById('inputAmount').value = tx.amount;
        document.getElementById('inputCost').value = tx.cost;
        document.getElementById('inputStatus').value = tx.status;
      }
    } else {
      modalTitle.textContent = 'Record New Sale';
      // Default to today
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('inputDate').value = today;
    }

    updateModalProfitPreview();
    modal.classList.add('active');
  }

  function closeTransactionModal() {
    const modal = document.getElementById('transactionModal');
    if (modal) modal.classList.remove('active');
  }

  function updateModalProfitPreview() {
    const amount = parseFloat(document.getElementById('inputAmount').value) || 0;
    const cost = parseFloat(document.getElementById('inputCost').value) || 0;
    const profit = amount - cost;
    const margin = amount > 0 ? (profit / amount) * 100 : 0;

    const preview = document.getElementById('modalCalculatedProfit');
    if (preview) {
      preview.textContent = `${formatMoney(profit)} (${margin.toFixed(1)}% margin)`;
      if (profit >= 0) {
        preview.style.backgroundColor = '#f0fdf4';
        preview.style.color = '#166534';
      } else {
        preview.style.backgroundColor = '#fef2f2';
        preview.style.color = '#991b1b';
      }
    }
  }

  function saveTransactionFromModal(e) {
    e.preventDefault();

    const editId = document.getElementById('editTransactionId').value;
    const customer = document.getElementById('inputCustomerName').value.trim();
    const email = document.getElementById('inputCustomerEmail').value.trim();
    const product = document.getElementById('inputProduct').value.trim();
    const category = document.getElementById('inputCategory').value;
    const channel = document.getElementById('inputChannel').value;
    const date = document.getElementById('inputDate').value;
    const amount = parseFloat(document.getElementById('inputAmount').value) || 0;
    const cost = parseFloat(document.getElementById('inputCost').value) || 0;
    const status = document.getElementById('inputStatus').value;
    const profit = Math.round((amount - cost) * 100) / 100;

    if (!customer || !product || !date || amount <= 0) {
      showToast('Please fill out all required fields with valid values.', 'warning');
      return;
    }

    if (editId) {
      // Update existing
      const idx = state.transactions.findIndex(t => t.id === editId);
      if (idx !== -1) {
        state.transactions[idx] = {
          ...state.transactions[idx],
          customer,
          email,
          product,
          category,
          channel,
          date,
          amount,
          cost,
          profit,
          status
        };
        showToast(`Transaction ${editId} updated successfully!`, 'success');
      }
    } else {
      // Create new
      const newId = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      state.transactions.unshift({
        id: newId,
        customer,
        email,
        product,
        category,
        channel,
        date,
        amount,
        cost,
        profit,
        status
      });
      showToast(`Sale recorded successfully as ${newId}!`, 'success');
    }

    saveTransactionsToStorage();
    closeTransactionModal();
    refreshDashboard();
  }

  function deleteTransaction(id) {
    if (confirm(`Are you sure you want to delete transaction ${id}?`)) {
      state.transactions = state.transactions.filter(t => t.id !== id);
      saveTransactionsToStorage();
      refreshDashboard();
      showToast(`Transaction ${id} deleted.`, 'info');
    }
  }

  // --- Quota Modal Handlers ---
  function openTargetModal() {
    const modal = document.getElementById('targetModal');
    const input = document.getElementById('inputTargetGoal');
    if (modal && input) {
      input.value = state.targetGoal;
      modal.classList.add('active');
    }
  }

  function closeTargetModal() {
    const modal = document.getElementById('targetModal');
    if (modal) modal.classList.remove('active');
  }

  function saveTargetGoal(e) {
    e.preventDefault();
    const val = parseFloat(document.getElementById('inputTargetGoal').value);
    if (val > 0) {
      state.targetGoal = val;
      saveTargetToStorage();
      closeTargetModal();
      refreshDashboard();
      showToast(`Sales quota target set to ${formatMoney(val)}!`, 'success');
    }
  }

  // --- Export CSV Handler ---
  function exportToCsv() {
    const list = getProcessedTableTransactions();
    if (list.length === 0) {
      showToast('No transactions to export.', 'warning');
      return;
    }

    const headers = ['Invoice ID', 'Date', 'Customer', 'Email', 'Product', 'Category', 'Channel', 'Amount (USD)', 'Cost (USD)', 'Profit (USD)', 'Status'];
    const rows = list.map(t => [
      `"${t.id}"`,
      `"${t.date}"`,
      `"${t.customer.replace(/"/g, '""')}"`,
      `"${t.email.replace(/"/g, '""')}"`,
      `"${t.product.replace(/"/g, '""')}"`,
      `"${t.category}"`,
      `"${t.channel}"`,
      t.amount.toFixed(2),
      t.cost.toFixed(2),
      t.profit.toFixed(2),
      `"${t.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sales_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${list.length} transactions to CSV.`, 'success');
  }

  // --- Reset Demo Data Handler ---
  function resetDemoData() {
    if (confirm('Reset all sales data back to default demo records? Any custom entries will be replaced.')) {
      state.transactions = getDemoTransactions();
      saveTransactionsToStorage();
      state.currentPage = 1;
      refreshDashboard();
      showToast('Dashboard reset to rich demo dataset.', 'info');
    }
  }

  // ==========================================================================
  // Event Listeners Binding
  // ==========================================================================

  function bindEvents() {
    // Currency Selector
    const curSelect = document.getElementById('currencySelect');
    if (curSelect) {
      curSelect.addEventListener('change', (e) => {
        state.currency = e.target.value;
        try { localStorage.setItem(STORAGE_KEY_CURRENCY, state.currency); } catch (err) {}
        refreshDashboard();
      });
    }

    // Timeframe Selector
    const tfSelect = document.getElementById('dateRangeSelect');
    if (tfSelect) {
      tfSelect.addEventListener('change', (e) => {
        state.timeframe = e.target.value;
        try { localStorage.setItem(STORAGE_KEY_TIMEFRAME, state.timeframe); } catch (err) {}
        state.currentPage = 1;
        refreshDashboard();
      });
    }

    // Action buttons
    const exportBtn = document.getElementById('exportCsvBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportToCsv);

    const resetBtn = document.getElementById('resetDemoBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetDemoData);

    const openModalBtn = document.getElementById('openAddModalBtn');
    if (openModalBtn) openModalBtn.addEventListener('click', () => openTransactionModal(null));

    // Trend Interval toggle buttons (Daily / Monthly)
    const toggleContainer = document.getElementById('trendIntervalToggle');
    if (toggleContainer) {
      toggleContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
          const interval = e.target.getAttribute('data-interval');
          if (interval && interval !== state.trendInterval) {
            state.trendInterval = interval;
            toggleContainer.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            const currentTx = getFilteredTransactionsByTimeframe(state.transactions, state.timeframe);
            renderRevenueTrendChart(currentTx);
          }
        }
      });
    }

    // Target Quota Modal triggers
    const editTargetBtn = document.getElementById('editTargetBtn');
    if (editTargetBtn) editTargetBtn.addEventListener('click', openTargetModal);

    const closeTargetBtn = document.getElementById('closeTargetModalBtn');
    if (closeTargetBtn) closeTargetBtn.addEventListener('click', closeTargetModal);

    const cancelTargetBtn = document.getElementById('cancelTargetModalBtn');
    if (cancelTargetBtn) cancelTargetBtn.addEventListener('click', closeTargetModal);

    const targetForm = document.getElementById('targetForm');
    if (targetForm) targetForm.addEventListener('submit', saveTargetGoal);

    // Record / Edit Modal triggers
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeTransactionModal);

    const cancelModalBtn = document.getElementById('cancelModalBtn');
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeTransactionModal);

    const txForm = document.getElementById('transactionForm');
    if (txForm) txForm.addEventListener('submit', saveTransactionFromModal);

    const amountInput = document.getElementById('inputAmount');
    const costInput = document.getElementById('inputCost');
    if (amountInput) amountInput.addEventListener('input', updateModalProfitPreview);
    if (costInput) costInput.addEventListener('input', updateModalProfitPreview);

    // Table Search & Filters
    const searchInput = document.getElementById('tableSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        state.currentPage = 1;
        renderTransactionsTable();
      });
    }

    const catSelect = document.getElementById('filterCategorySelect');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        state.filterCategory = e.target.value;
        state.currentPage = 1;
        renderTransactionsTable();
      });
    }

    const chanSelect = document.getElementById('filterChannelSelect');
    if (chanSelect) {
      chanSelect.addEventListener('change', (e) => {
        state.filterChannel = e.target.value;
        state.currentPage = 1;
        renderTransactionsTable();
      });
    }

    const statusSelect = document.getElementById('filterStatusSelect');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        state.filterStatus = e.target.value;
        state.currentPage = 1;
        renderTransactionsTable();
      });
    }

    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        state.searchQuery = '';
        state.filterCategory = 'all';
        state.filterChannel = 'all';
        state.filterStatus = 'all';
        if (searchInput) searchInput.value = '';
        if (catSelect) catSelect.value = 'all';
        if (chanSelect) chanSelect.value = 'all';
        if (statusSelect) statusSelect.value = 'all';
        state.currentPage = 1;
        renderTransactionsTable();
        showToast('Filters cleared', 'info');
      });
    }

    // Table Column Sorting
    const sortHeaders = document.querySelectorAll('.data-table th.sortable');
    sortHeaders.forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort');
        if (state.sortColumn === col) {
          state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortColumn = col;
          state.sortDirection = 'desc';
        }
        renderTransactionsTable();
      });
    });

    // Table Action Delegations (Edit / Delete)
    const tbody = document.getElementById('transactionsTableBody');
    if (tbody) {
      tbody.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');

        if (action === 'edit') {
          openTransactionModal(id);
        } else if (action === 'delete') {
          deleteTransaction(id);
        }
      });
    }

    // Pagination controls
    const prevBtn = document.getElementById('prevPageBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (state.currentPage > 1) {
          state.currentPage--;
          renderTransactionsTable();
        }
      });
    }

    const nextBtn = document.getElementById('nextPageBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        state.currentPage++;
        renderTransactionsTable();
      });
    }

    const rowsPerPageSelect = document.getElementById('rowsPerPageSelect');
    if (rowsPerPageSelect) {
      rowsPerPageSelect.addEventListener('change', (e) => {
        state.rowsPerPage = parseInt(e.target.value, 10) || 10;
        state.currentPage = 1;
        renderTransactionsTable();
      });
    }

    // Window Resize handler to redraw high-DPI canvases
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const currentTx = getFilteredTransactionsByTimeframe(state.transactions, state.timeframe);
        renderRevenueTrendChart(currentTx);
        renderCategoryDonutChart(currentTx);
        renderChannelBarChart(currentTx);
      }, 150);
    });

    // Modal background close
    window.addEventListener('click', (e) => {
      const txModal = document.getElementById('transactionModal');
      const targetModal = document.getElementById('targetModal');
      if (e.target === txModal) closeTransactionModal();
      if (e.target === targetModal) closeTargetModal();
    });

    // ESC key closes modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeTransactionModal();
        closeTargetModal();
      }
    });
  }

  // --- Initialization ---
  function init() {
    loadDataFromStorage();
    bindEvents();
    setupChartInteractions();
    refreshDashboard();
  }

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

