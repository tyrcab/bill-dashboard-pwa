const SHEET_ID = "1QFPJQUy6nCZZSTGGjNiPPfw1CGA2QxMTkJPJYkNmZLk";
const API_KEY = "AIzaSyALGhSqtVP8WYHQFh4yAw11Eix2mBSO_Xg";
const RANGE = "Bills!A2:H";

let chartInstance = null;

// ✅ IMPORTANT: wait for DOM
window.addEventListener("DOMContentLoaded", () => {
  loadData();
});

async function loadData() {

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;

  try {

    const res = await fetch(url);
    const data = await res.json();

    console.log("RAW DATA:", data);

    if (!data.values || !Array.isArray(data.values)) {
      document.getElementById("stats").innerText = "No data found";
      return;
    }

    let total = 0;
    const monthly = {};

    data.values.forEach(row => {

      const amount = parseFloat(row[4]) || 0;

      // FIX: DD/MM/YYYY parsing (CRITICAL)
      let date = null;

      if (row[5]) {
        const parts = row[5].split("/");
        if (parts.length === 3) {
          date = new Date(parts[2], parts[1] - 1, parts[0]);
        }
      }

      total += amount;

      if (date && !isNaN(date.getTime())) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthly[key] = (monthly[key] || 0) + amount;
      }
    });

    const keys = Object.keys(monthly).sort();
    const labels = keys;
    const values = keys.map(k => monthly[k]);

    document.getElementById("stats").innerHTML =
      `<p>Total Spending: <b>$${total.toFixed(2)}</b></p>`;

    // ✅ FIX: ensure canvas exists
    const canvas = document.getElementById("chart");

    if (!canvas) {
      console.error("Chart canvas not found!");
      return;
    }

    // destroy old chart
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Monthly Spending",
          data: values
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });

  } catch (err) {
    console.error("Dashboard error:", err);
    document.getElementById("stats").innerText = "Error loading data";
  }
}