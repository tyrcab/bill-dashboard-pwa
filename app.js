const SHEET_CSV_URL = "YOUR_GOOGLE_SHEET_CSV_URL";

async function loadData() {
  const res = await fetch(SHEET_CSV_URL);
  const text = await res.text();

  const rows = text.split("\n").map(r => r.split(","));

  let total = 0;
  let labels = [];
  let values = [];

  const monthly = {};

  for (let i = 1; i < rows.length; i++) {
    const amount = parseFloat(rows[i][4]);
    const date = new Date(rows[i][5]);

    if (!isNaN(amount)) total += amount;

    if (!isNaN(date)) {
      const key = `${date.getFullYear()}-${date.getMonth()+1}`;
      monthly[key] = (monthly[key] || 0) + amount;
    }
  }

  labels = Object.keys(monthly);
  values = Object.values(monthly);

  document.getElementById("stats").innerHTML = `
    <p>Total Spending: $${total.toFixed(2)}</p>
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