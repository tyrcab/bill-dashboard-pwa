const SHEET_ID = "1QFPJQUy6nCZZSTGGjNiPPfw1CGA2QxMTkJPJYkNmZLk";
const API_KEY = "AIzaSyALGhSqtVP8WYHQFh4yAw11Eix2mBSO_Xg";
const RANGE = "Bills!A2:H";

let chartInstance = null;
let chartType = "bar";

window.categoryTotals = {};
window.categoryData = {};

window.addEventListener("DOMContentLoaded", loadData);

/* ================= CATEGORY ENGINE ================= */
function categorizeExpense(subject = "") {
  const s = subject.toLowerCase();

  if (s.includes("electricity") || s.includes("power") || s.includes("energy"))
    return { name: "Electricity", icon: "⚡" };

  if (s.includes("rent") || s.includes("landlord"))
    return { name: "Rent", icon: "🏠" };

  if (s.includes("water")) return { name: "Water", icon: "💧" };

  if (s.includes("internet") || s.includes("wifi") || s.includes("telstra") || s.includes("optus"))
    return { name: "Internet", icon: "📶" };

  if (s.includes("phone") || s.includes("mobile"))
    return { name: "Mobile", icon: "📱" };

  if (s.includes("gas")) return { name: "Gas", icon: "🔥" };

  return { name: "Other", icon: "📦" };
}

/* ================= TIMEZONE-SAFE DATE PARSER ================= */
function parseDate(input) {
  if (!input) return null;

  const str = input.toString().trim();

  // dd/mm/yyyy (your sheet format)
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const d = new Date(Date.UTC(dmy[3], dmy[2] - 1, dmy[1]));
    return d;
  }

  // fallback ISO / Google date
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;

  // normalise to UTC midnight (prevents timezone bugs)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/* ================= MAIN DATA PIPELINE ================= */
async function loadData() {

  try {
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.values || !data.values.length) {
      console.log("No data found", data);
      return;
    }

    let yearlyTotal = 0;
    let currentMonthTotal = 0;
    let count = 0;

    const monthly = {};
    window.categoryTotals = {};
    window.categoryData = {};

    // current month in UTC
    const now = new Date();
    const currentMonth = now.getUTCMonth();
    const currentYear = now.getUTCFullYear();

    data.values.forEach(row => {

      const subject = row[3] || "";
      const amount = parseFloat(row[4]);

      if (!amount || isNaN(amount)) return;

      const date = parseDate(row[5]); // DUE DATE COLUMN

      const category = categorizeExpense(subject);

      yearlyTotal += amount;
      count++;

      /* CURRENT MONTH */
      if (date &&
          date.getUTCMonth() === currentMonth &&
          date.getUTCFullYear() === currentYear) {
        currentMonthTotal += amount;
      }

      /* MONTHLY SERIES */
      if (date) {
        const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
        monthly[key] = (monthly[key] || 0) + amount;
      }

      /* CATEGORY TOTALS */
      window.categoryTotals[category.name] =
        (window.categoryTotals[category.name] || 0) + amount;

      /* CATEGORY DATA */
      if (!window.categoryData[category.name]) {
        window.categoryData[category.name] = { total: 0, count: 0 };
      }

      window.categoryData[category.name].total += amount;
      window.categoryData[category.name].count += 1;
    });

    /* SAFE CHART DATA */
    const labels = Object.keys(monthly).sort();
    const values = labels.map(k => monthly[k]);

    /* KPI FIXED SAFE OUTPUT */
    animateValue("total", yearlyTotal, true);
    animateValue("monthTotal", currentMonthTotal, true);
    animateValue("count", count, false);
    animateValue("avg", count ? yearlyTotal / count : 0, true);

    renderChart(labels, values.length ? values : [0]);
    renderCategories();
    renderCategoryAverages();

  } catch (err) {
    console.error("Load error:", err);
  }
}

/* ================= CHART ================= */
function renderChart(labels, values) {

  const ctx = document.getElementById("chart");
  if (!ctx) return;

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: chartType,
    data: {
      labels,
      datasets: [{
        label: "Spending",
        data: values,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.2)",
        borderWidth: 2,
        fill: chartType === "line"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: "#94a3b8" } },
        y: { ticks: { color: "#94a3b8" } }
      }
    }
  });
}

/* ================= CATEGORIES ================= */
function renderCategories() {

  const el = document.getElementById("categories");
  if (!el) return;

  let html = "";

  Object.entries(window.categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, value]) => {
      html += `
        <div style="display:flex;justify-content:space-between;
        padding:6px 0;border-bottom:1px solid #1f2937;">
          <span>${name}</span>
          <span>$${value.toFixed(2)}</span>
        </div>
      `;
    });

  el.innerHTML = html;
}

/* ================= CATEGORY AVERAGES ================= */
function renderCategoryAverages() {

  const el = document.getElementById("categoryAverages");
  if (!el) return;

  let html = "";

  Object.entries(window.categoryData)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([name, data]) => {

      const avg = data.count ? data.total / data.count : 0;

      html += `
        <div style="display:flex;justify-content:space-between;
        padding:6px 0;border-bottom:1px solid #1f2937;">
          <span>${name}</span>
          <span>$${avg.toFixed(2)}</span>
        </div>
      `;
    });

  el.innerHTML = html;
}

/* ================= KPI ANIMATION ================= */
function animateValue(id, value, money = true) {

  const el = document.getElementById(id);
  if (!el) return;

  let start = 0;
  const step = value / 40;

  function update() {
    start += step;
    if (start >= value) start = value;

    el.innerText = money
      ? "$" + start.toFixed(2)
      : Math.round(start);

    if (start < value) requestAnimationFrame(update);
  }

  update();
}

/* ================= TOGGLE ================= */
function toggleChart() {
  chartType = chartType === "bar" ? "line" : "bar";
  loadData();
}