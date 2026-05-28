const SHEET_ID = "1QFPJQUy6nCZZSTGGjNiPPfw1CGA2QxMTkJPJYkNmZLk";
const API_KEY = "AIzaSyALGhSqtVP8WYHQFh4yAw11Eix2mBSO_Xg";
const RANGE = "Bills!A2:H";

let chartInstance = null; // prevents duplicate charts

async function loadData() {

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;

  try {

    const res = await fetch(url);
    const data = await res.json();

    if (!data.values || !Array.isArray(data.values)) {
      document.getElementById("stats").innerText = "No data found";
      console.log("API Response:", data);
      return;
    }

    let total = 0;
    const monthly = {};

    data.values.forEach(row => {

      const amount = parseFloat(row[4]) || 0;

      // ✅ FIXED DD/MM/YYYY parsing (IMPORTANT)
      let date = null;

      if (row[5]) {
        const parts = row[5].split("/"); // "16/06/2026"
        if (parts.length === 3) {
          date = new Date(parts[2], parts[1] - 1, parts[0]); // YYYY, MM, DD
        }
      }

      if (!isNaN(amount)) {
        total += amount;
      }

      if (date && !isNaN(date.getTime())) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthly[key] = (monthly[key] || 0) + amount;
      }
    });

    // ✅ stable sorting (prevents weird chart ordering)
    const sortedKeys = Object.keys(monthly).sort();
    const labels = sortedKeys;
    const values = sortedKeys.map(k => monthly[k]);

    document.getElementById("stats").innerHTML = `
      <p>Total Spending: <b>$${total.toFixed(2)}</b></p>
    `;

    // ✅ destroy previous chart (important for reloads)
    const ctx = document.getElementById("chart");

    if (chartInstance) {
      chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
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
        plugins: {
          legend: {
            display: true
          }
        }
      }
    });

  } catch (err) {
    console.error("Load error:", err);
    document.getElementById("stats").innerText = "Error loading data";
  }
}

loadData();