const SHEET_ID = "1QFPJQUy6nCZZSTGGjNiPPfw1CGA2QxMTkJPJYkNmZLk";
const API_KEY = "AIzaSyALGhSqtVP8WYHQFh4yAw11Eix2mBSO_Xg";
const RANGE = "Bills!A2:H";

let chartInstance = null;
let chartType = "bar";
window.categoryTotals = {};
window.categoryCounts = {};

window.addEventListener("DOMContentLoaded", loadData);

/* ================= CATEGORY ENGINE ================= */
function categorizeExpense(subject = "") {
  const s = subject.toLowerCase();

  if (s.includes("electricity") || s.includes("power") || s.includes("energy")) {
    return { name: "Electricity", icon: "⚡" };
  }

  if (s.includes("rent") || s.includes("landlord")) {
    return { name: "Rent", icon: "🏠" };
  }

  if (s.includes("water")) return { name: "Water", icon: "💧" };

  if (s.includes("internet") || s.includes("wifi") || s.includes("telstra") || s.includes("optus")) {
    return { name: "Internet", icon: "📶" };
  }

  if (s.includes("phone") || s.includes("mobile")) {
    return { name: "Mobile", icon: "📱" };
  }

  if (s.includes("gas")) return { name: "Gas", icon: "🔥" };

  return { name: "Other", icon: "📦" };
}

/* ================= DATE FIX ================= */
function parseDate(str) {
  if (!str) return null;

  if (str.includes("/")) {
    const p = str.split("/");
    return new Date(p[2], p[1] - 1, p[0]);
  }

  return new Date(str);
}

/* ================= MAIN LOAD ================= */
async function loadData() {

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.values) {
    console.log("No data", data);
    return;
  }

  let yearlyTotal = 0;
  let currentMonthTotal = 0;
  let count = 0;

  const monthly = {};

  window.categoryTotals = {};
  window.categoryData = {};

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  data.values.forEach(row => {

    const subject = row[3] || "";
    const amount = parseFloat(row[4]) || 0;

    /* FIXED DATE PARSER */
    let date = null;

    if (row[5]) {

      const parts = row[5].split("/");

      if (parts.length === 3) {

        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const year = parseInt(parts[2]);

        date = new Date(year, month, day);
      }
    }

    const category = categorizeExpense(subject);

    yearlyTotal += amount;
    count++;

    /* CURRENT MONTH */
    if (
      date &&
      !isNaN(date.getTime()) &&
      date.getMonth() === currentMonth &&
      date.getFullYear() === currentYear
    ) {
      currentMonthTotal += amount;
    }

    /* MONTHLY CHART */
    if (date && !isNaN(date.getTime())) {

      const key =
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      monthly[key] = (monthly[key] || 0) + amount;
    }

    /* CATEGORY TOTALS */
window.categoryTotals[category.name] =
  (window.categoryTotals[category.name] || 0) + amount;

/* CATEGORY COUNTS */
window.categoryCounts[category.name] =
  (window.categoryCounts[category.name] || 0) + 1;

    /* CATEGORY AVERAGES */
    if (!window.categoryData[category.name]) {
      window.categoryData[category.name] = {
        total: 0,
        count: 0
      };
    }

    window.categoryData[category.name].total += amount;
    window.categoryData[category.name].count++;
  });

  /* CHART */
  const labels = Object.keys(monthly).sort();
  const values = labels.map(k => monthly[k]);

  /* KPI VALUES */
  animateValue("total", yearlyTotal, true);
  animateValue("monthTotal", currentMonthTotal, true);
  animateValue("count", count, false);
  animateValue("avg", yearlyTotal / count, true);

  renderChart(labels, values);

  renderCategories();

  renderCategoryAverages();
}

function renderCategories() {

  const el = document.getElementById("categories");
  if (!el) return;

  let html = "";

  Object.entries(window.categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, value]) => {

      html += `
        <div style="
          display:flex;
          justify-content:space-between;
          padding:8px 0;
          border-bottom:1px solid #1f2937;
        ">
          <span>${name}</span>
          <span>$${value.toFixed(2)}</span>
        </div>
      `;
    });

  el.innerHTML = html;
}

function renderCategoryAverages() {

  const el = document.getElementById("categoryAverages");
  if (!el) return;

  let html = "";

  Object.entries(window.categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, total]) => {

      const count = window.categoryCounts[name] || 1;
      const avg = total / count;

      html += `
        <div style="
          display:flex;
          justify-content:space-between;
          padding:8px 0;
          border-bottom:1px solid #1f2937;
        ">
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

  let start = 0;
  const duration = 600;
  const step = value / (duration / 16);

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

/* ================= CHART TOGGLE ================= */
function toggleChart() {
  chartType = chartType === "bar" ? "line" : "bar";
  loadData();
}