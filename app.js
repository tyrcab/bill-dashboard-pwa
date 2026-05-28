const SHEET_ID = "1QFPJQUy6nCZZSTGGjNiPPfw1CGA2QxMTkJPJYkNmZLk";
const API_KEY = "AIzaSyALGhSqtVP8WYHQFh4yAw11Eix2mBSO_Xg";
const RANGE = "Bills!A2:H";

let chartInstance = null;
let chartType = "bar";
window.categoryTotals = {};

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

  let total = 0;
  let count = 0;
  const monthly = {};
  window.categoryTotals = {};

  data.values.forEach(row => {

    const subject = row[3] || "";
    const amount = parseFloat(row[4]) || 0;
    const date = parseDate(row[5]);

    const category = categorizeExpense(subject);

    total += amount;
    count++;

    /* MONTHLY */
    if (date && !isNaN(date.getTime())) {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthly[key] = (monthly[key] || 0) + amount;
    }

    /* CATEGORY */
    window.categoryTotals[category.name] =
      (window.categoryTotals[category.name] || 0) + amount;
  });

  const labels = Object.keys(monthly).sort();
  const values = labels.map(k => monthly[k]);

  animateValue("total", total, true);
  animateValue("count", count, false);
  animateValue("avg", total / count, true);

  renderChart(labels, values);
  renderCategories();
}

/* ================= CHART ================= */
function renderChart(labels, values) {

  const ctx = document.getElementById("chart");

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

/* ================= CATEGORY UI ================= */
function renderCategories() {

  const el = document.getElementById("categories");
  if (!el) return;

  let html = "";

  Object.entries(window.categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, value]) => {

      html += `
        <div style="display:flex;justify-content:space-between;
        padding:8px 0;border-bottom:1px solid #1f2937;">
          <span>${name}</span>
          <span>$${value.toFixed(2)}</span>
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