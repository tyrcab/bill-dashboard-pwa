const SHEET_ID = "1QFPJQUy6nCZZSTGGjNiPPfw1CGA2QxMTkJPJYkNmZLk";
const API_KEY = "AIzaSyALGhSqtVP8WYHQFh4yAw11Eix2mBSO_Xg";
const RANGE = "Bills!A2:H";

let chart = null;

let state = {
  yearly: 0,
  month: 0,
  count: 0,
  monthly: {},
  categories: {}
};

/* ================= AUTO SYNC ================= */
window.addEventListener("DOMContentLoaded", loadData);
setInterval(loadData, 60000);

/* ================= CATEGORY ENGINE ================= */
function categorize(text = "") {
  const s = text.toLowerCase();

  if (s.includes("electric")) return "Electricity";
  if (s.includes("rent") || s.includes("landlord")) return "Rent";
  if (s.includes("water")) return "Water";
  if (s.includes("internet") || s.includes("wifi") || s.includes("telstra") || s.includes("optus")) return "Internet";
  if (s.includes("phone") || s.includes("mobile")) return "Mobile";
  if (s.includes("gas")) return "Gas";

  return "Other";
}

/* ================= SAFE DATE PARSER (YYYY-MM-DD READY) ================= */
function parseDate(value) {
  if (!value) return null;

  const str = value.toString().trim();

  // YYYY-MM-DD (your new format)
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return isNaN(d.getTime()) ? null : d;
  }

  // fallback: native JS parse
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/* ================= LOAD DATA ================= */
async function loadData() {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.values || !Array.isArray(data.values)) {
    console.log("No data", data);
    return;
  }

  resetState();

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  for (const row of data.values) {

    const subject = row?.[3] || "";
    const amount = parseFloat(row?.[4]);
    const date = parseDate(row?.[5]);

    // SKIP INVALID AMOUNTS
    if (!amount || isNaN(amount) || amount <= 0) continue;

    const cat = categorize(subject);

    state.yearly += amount;
    state.count++;

    // CURRENT MONTH
    if (date &&
        date.getMonth() === thisMonth &&
        date.getFullYear() === thisYear) {
      state.month += amount;
    }

    // MONTHLY GROUPING
    if (date) {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      state.monthly[key] = (state.monthly[key] || 0) + amount;
    }

    // CATEGORY TOTALS
    state.categories[cat] = (state.categories[cat] || 0) + amount;
  }

  render();
}

/* ================= RESET ================= */
function resetState() {
  state.yearly = 0;
  state.month = 0;
  state.count = 0;
  state.monthly = {};
  state.categories = {};
}

/* ================= RENDER UI ================= */
function render() {

  // KPI SAFETY
  document.getElementById("yearly") &&
    (document.getElementById("yearly").innerText = "$" + state.yearly.toFixed(2));

  document.getElementById("month") &&
    (document.getElementById("month").innerText = "$" + state.month.toFixed(2));

  document.getElementById("count") &&
    (document.getElementById("count").innerText = state.count);

  renderCategories();
  renderChart();
}

/* ================= CATEGORY UI (FIXED EMPTY BUG) ================= */
function renderCategories() {

  const el = document.getElementById("categories");
  if (!el) return;

  const entries = Object.entries(state.categories);

  if (entries.length === 0) {
    el.innerHTML = `<div style="color:#94a3b8;">No categories found</div>`;
    return;
  }

  el.innerHTML = entries
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `
      <div style="display:flex;justify-content:space-between;
        padding:6px 0;border-bottom:1px solid #1f2937;">
        <span>${k}</span>
        <span>$${v.toFixed(2)}</span>
      </div>
    `).join("");
}

/* ================= CHART (FIXED AXIS) ================= */
function renderChart() {

  const ctx = document.getElementById("chart");
  if (!ctx) return;

  const labels = Object.keys(state.monthly).sort();
  const values = labels.map(l => state.monthly[l] || 0);

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Monthly Spending",
        data: values,
        backgroundColor: "rgba(59,130,246,0.3)",
        borderColor: "#3b82f6",
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: "Months"
          }
        },
        y: {
          title: {
            display: true,
            text: "Amount ($)"
          }
        }
      }
    }
  });
}