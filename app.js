const SHEET_ID = "1QFPJQUy6nCZZSTGGjNiPPfw1CGA2QxMTkJPJYkNmZLk";
const API_KEY = "AIzaSyALGhSqtVP8WYHQFh4yAw11Eix2mBSO_Xg";
const RANGE = "Bills!A2:H";

async function loadData() {

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.values) {
    document.getElementById("stats").innerText = "No data found";
    console.log(data);
    return;
  }

  let total = 0;
  const monthly = {};

  data.values.forEach(row => {

    const amount = parseFloat(row[4]);

    // safer date parsing (prevents NaN bugs)
    const date = new Date(row[5]);

    if (!isNaN(amount)) {
      total += amount;
    }

    if (date instanceof Date && !isNaN(date.getTime())) {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      monthly[key] = (monthly[key] || 0) + amount;
    }
  });

  const labels = Object.keys(monthly).sort();
  const values = labels.map(k => monthly[k]);

  document.getElementById("stats").innerHTML = `
    <p>Total Spending: <b>$${total.toFixed(2)}</b></p>
  `;

  new Chart(document.getElementById("chart"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Monthly Spending",
        data: values
      }]
    }
  });
}

loadData();