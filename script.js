// =====================================
// LINKEDIN LEAD MISSION CONTROL
// =====================================

const intro = document.getElementById("intro");
const dashboard = document.getElementById("dashboard");
const crate = document.getElementById("crate");
const openButton = document.getElementById("openDashboard");
const smoke = document.getElementById("smoke");

let dashboardOpened = false;
let leads = [];

// =====================================
// 1. OPEN DASHBOARD ANIMATION
// =====================================

function openDashboard() {
  if (dashboardOpened) return;

  dashboardOpened = true;

  smoke.classList.add("active");

  crate.style.transform = "translateX(-50%) scale(1.25)";
  crate.style.filter = "brightness(1.5)";

  setTimeout(() => {
    intro.classList.add("leaving");
  }, 500);

  setTimeout(() => {
    intro.classList.add("hidden");
    dashboard.classList.remove("hidden");
    document.body.style.overflow = "auto";
  }, 1300);
}

openButton.addEventListener("click", openDashboard);
crate.addEventListener("click", openDashboard);

crate.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openDashboard();
  }
});

// =====================================
// 2. DASHBOARD NAVIGATION
// =====================================

const navLinks = document.querySelectorAll(".nav-link");
const tabs = document.querySelectorAll(".tab-content");
const pageTitle = document.getElementById("pageTitle");

navLinks.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedTab = button.dataset.tab;

    navLinks.forEach((link) => {
      link.classList.remove("active");
    });

    button.classList.add("active");

    tabs.forEach((tab) => {
      tab.classList.add("hidden");
    });

    document.getElementById(selectedTab).classList.remove("hidden");

    const titles = {
      overview: "Overview",
      leads: "Leadership Leads",
      analytics: "Analytics",
      settings: "Settings"
    };

    pageTitle.textContent = titles[selectedTab];
  });
});

// =====================================
// 3. CSV PARSER
// =====================================

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") i++;

      row.push(cell);

      if (row.some(value => value.trim() !== "")) {
        rows.push(row);
      }

      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);

  if (row.some(value => value.trim() !== "")) {
    rows.push(row);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map(header =>
    header.replace(/^\uFEFF/, "").trim().toLowerCase()
  );

  return rows.slice(1).map(values => {
    const record = {};

    headers.forEach((header, index) => {
      record[header] = (values[index] || "").trim();
    });

    return record;
  });
}

// =====================================
// 4. GET DATA FROM GOOGLE SHEETS
// =====================================

function getField(record, possibleNames) {
  for (const name of possibleNames) {
    const value = record[name];

    if (value) return value;
  }

  return "";
}

function cleanLead(record) {
  return {
    name: getField(record, ["name", "full_name", "fullname"]),
    designation: getField(record, [
      "designation",
      "role",
      "title",
      "job_title"
    ]),
    company: getField(record, [
      "company",
      "organization",
      "company_name"
    ]),
    linkedin_url: getField(record, [
      "linkedin_url",
      "linkedin",
      "profile_url"
    ])
  };
}

async function connectCSV(url) {
  const message = document.getElementById("connectionMessage");
  const saveButton = document.getElementById("saveUrl");

  try {
    message.textContent = "Connecting to Google Sheets...";
    saveButton.disabled = true;
    saveButton.textContent = "Connecting...";

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Unable to access CSV file.");
    }

    const csvText = await response.text();

    const records = parseCSV(csvText);

    if (!records.length) {
      throw new Error("CSV file is empty or its format is incorrect.");
    }

    leads = records
      .map(cleanLead)
      .filter(lead => lead.name || lead.linkedin_url);

    localStorage.setItem("linkedinCSVUrl", url);

    displayLeads();
    updateDashboard();

    message.textContent =
      "Successfully connected! " + leads.length + " records loaded.";

    message.style.color = "#45dda0";

  } catch (error) {
    message.textContent =
      "Connection failed: " + error.message +
      " Check your published CSV URL and internet connection.";

    message.style.color = "#ff8585";

  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Connect CSV";
  }
}

// =====================================
// 5. DISPLAY LEADS IN TABLE
// =====================================

function displayLeads() {
  const leadRows = document.getElementById("leadRows");

  leadRows.innerHTML = "";

  if (leads.length === 0) {
    leadRows.innerHTML = `
      <tr>
        <td colspan="4" class="empty">
          No leads found.
        </td>
      </tr>
    `;
    return;
  }

  leads.forEach(lead => {
    const tr = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = lead.name || "Unknown";

    const roleCell = document.createElement("td");
    roleCell.textContent = lead.designation || "N/A";

    const companyCell = document.createElement("td");
    companyCell.textContent = lead.company || "N/A";

    const linkCell = document.createElement("td");

    if (lead.linkedin_url) {
      const link = document.createElement("a");

      link.href = lead.linkedin_url;
      link.textContent = "View Profile";
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      linkCell.appendChild(link);
    } else {
      linkCell.textContent = "N/A";
    }

    tr.append(nameCell, roleCell, companyCell, linkCell);
    leadRows.appendChild(tr);
  });
}

// =====================================
// 6. UPDATE DASHBOARD STATISTICS
// =====================================

function updateDashboard() {
  const uniqueURLs = new Set(
    leads
      .map(lead => lead.linkedin_url.toLowerCase().trim())
      .filter(Boolean)
  );

  const total = leads.length;
  const unique = uniqueURLs.size;

  document.getElementById("uniqueLeads").textContent = unique;

  document.getElementById("analyticsTotal").textContent = total;

  document.getElementById("analyticsUnique").textContent = unique;

  const percentage = Math.min((unique / 500) * 100, 100);

  document.getElementById("progressValue").textContent =
    Math.round(percentage) + "%";

  document.querySelector(".progress-ring").style.background =
    `conic-gradient(
      #38d9e6 ${percentage * 3.6}deg,
      #25354e ${percentage * 3.6}deg
    )`;

  updateChart();
}

// =====================================
// 7. ANALYTICS CHART
// =====================================

function updateChart() {
  const chart = document.getElementById("roleChart");

  const roles = {
    CEO: 0,
    Founder: 0,
    "Co-Founder": 0,
    Chairman: 0,
    "Co-Chairman": 0
  };

  leads.forEach(lead => {
    const designation = lead.designation.toLowerCase();

    if (designation.includes("co-chairman")) {
      roles["Co-Chairman"]++;
    } else if (designation.includes("co-founder")) {
      roles["Co-Founder"]++;
    } else if (designation.includes("chairman")) {
      roles["Chairman"]++;
    } else if (designation.includes("founder")) {
      roles["Founder"]++;
    } else if (designation.includes("ceo") ||
               designation.includes("chief executive")) {
      roles["CEO"]++;
    }
  });

  const maxValue = Math.max(...Object.values(roles), 1);

  chart.innerHTML = "";

  Object.entries(roles).forEach(([role, count]) => {
    const percentage = (count / maxValue) * 100;

    const item = document.createElement("div");
    item.className = "bar-item";

    const label = document.createElement("span");
    label.textContent = role;

    const track = document.createElement("div");
    track.className = "bar-track";

    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = percentage + "%";

    track.appendChild(fill);

    const number = document.createElement("b");
    number.textContent = count;

    item.append(label, track, number);
    chart.appendChild(item);
  });
}

// =====================================
// 8. SAVE CSV URL
// =====================================

document.getElementById("saveUrl").addEventListener("click", () => {
  const url = document.getElementById("csvUrl").value.trim();

  if (!url) {
    alert("Please enter your Google Sheets CSV URL.");
    return;
  }

  try {
    const parsedURL = new URL(url);

    if (parsedURL.protocol !== "https:") {
      alert("Please use a secure HTTPS URL.");
      return;
    }

    connectCSV(url);

  } catch {
    alert("Please enter a valid URL.");
  }
});

// =====================================
// 9. CLEAR CONNECTION
// =====================================

document.getElementById("clearUrl").addEventListener("click", () => {
  localStorage.removeItem("linkedinCSVUrl");

  document.getElementById("csvUrl").value = "";

  document.getElementById("connectionMessage").textContent =
    "CSV connection cleared.";

  document.getElementById("connectionMessage").style.color =
    "#91a0b9";

  leads = [];

  displayLeads();
  updateDashboard();
});

// =====================================
// 10. LOAD PREVIOUS CONNECTION
// =====================================

window.addEventListener("DOMContentLoaded", () => {
  const savedUrl = localStorage.getItem("linkedinCSVUrl");

  if (savedUrl) {
    document.getElementById("csvUrl").value = savedUrl;
    connectCSV(savedUrl);
  }
});
