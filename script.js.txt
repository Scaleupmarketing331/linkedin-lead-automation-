document.addEventListener("DOMContentLoaded", function () {

  const intro = document.getElementById("intro");
  const dashboard = document.getElementById("dashboard");
  const crate = document.getElementById("crate");
  const openButton = document.getElementById("openDashboard");
  const smoke = document.getElementById("smoke");

  let opened = false;
  let leads = [];

  // OPEN DASHBOARD

  function openDashboard() {
    if (opened) return;
    opened = true;

    smoke.classList.add("active");
    crate.classList.add("opened");

    setTimeout(() => {
      intro.classList.add("leaving");
    }, 450);

    setTimeout(() => {
      intro.classList.add("hidden");
      dashboard.classList.remove("hidden");
    }, 1300);
  }

  openButton.addEventListener("click", openDashboard);
  crate.addEventListener("click", openDashboard);

  crate.addEventListener("keydown", function (event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDashboard();
    }
  });

  // NAVIGATION

  const navLinks = document.querySelectorAll(".nav-link");
  const tabs = document.querySelectorAll(".tab-content");
  const pageTitle = document.getElementById("pageTitle");

  navLinks.forEach(button => {
    button.addEventListener("click", function () {
      const tabName = this.dataset.tab;

      navLinks.forEach(link => link.classList.remove("active"));
      this.classList.add("active");

      tabs.forEach(tab => tab.classList.add("hidden"));

      document.getElementById(tabName).classList.remove("hidden");

      const titles = {
        overview: "Overview",
        leads: "Leadership Leads",
        analytics: "Analytics",
        settings: "Settings"
      };

      pageTitle.textContent = titles[tabName];
    });
  });

  // CSV PARSER

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let value = "";
    let quotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"' && quotes && next === '"') {
        value += '"';
        i++;
      } else if (char === '"') {
        quotes = !quotes;
      } else if (char === "," && !quotes) {
        row.push(value);
        value = "";
      } else if ((char === "\n" || char === "\r") && !quotes) {
        if (char === "\r" && next === "\n") i++;
        row.push(value);
        if (row.some(v => v.trim())) rows.push(row);
        row = [];
        value = "";
      } else {
        value += char;
      }
    }

    row.push(value);
    if (row.some(v => v.trim())) rows.push(row);

    if (rows.length < 2) return [];

    const headers = rows[0].map(h =>
      h.replace(/^\uFEFF/, "").trim().toLowerCase()
    );

    return rows.slice(1).map(values => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = (values[index] || "").trim();
      });
      return item;
    });
  }

  function field(record, names) {
    for (const name of names) {
      if (record[name]) return record[name];
    }
    return "";
  }

  // LOAD CSV

  async function connectCSV(url) {
    const message = document.getElementById("connectionMessage");
    const saveButton = document.getElementById("saveUrl");

    try {
      message.textContent = "Connecting...";
      saveButton.disabled = true;

      const response = await fetch(url);

      if (!response.ok) throw new Error("CSV could not be loaded.");

      const csv = await response.text();
      const records = parseCSV(csv);

      leads = records.map(record => ({
        name: field(record, ["name", "full_name"]),
        designation: field(record, ["designation", "role", "title"]),
        company: field(record, ["company", "company_name", "organization"]),
        linkedin_url: field(record, ["linkedin_url", "linkedin", "profile_url"])
      })).filter(lead => lead.name || lead.linkedin_url);

      if (!leads.length) throw new Error("No valid lead records found.");

      localStorage.setItem("linkedinCSVUrl", url);

      showLeads();
      updateDashboard();

      message.textContent = "Connected! " + leads.length + " records loaded.";
      message.style.color = "#45dda0";

    } catch (error) {
      message.textContent = "Error: " + error.message +
        " Check the CSV link and sheet permissions.";
      message.style.color = "#ff8585";

    } finally {
      saveButton.disabled = false;
    }
  }

  // SHOW LEADS

  function showLeads() {
    const tbody = document.getElementById("leadRows");
    tbody.innerHTML = "";

    if (!leads.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty">No leads found.</td></tr>';
      return;
    }

    leads.forEach(lead => {
      const tr = document.createElement("tr");

      const name = document.createElement("td");
      name.textContent = lead.name || "Unknown";

      const role = document.createElement("td");
      role.textContent = lead.designation || "N/A";

      const company = document.createElement("td");
      company.textContent = lead.company || "N/A";

      const linkCell = document.createElement("td");

      if (lead.linkedin_url) {
        try {
          const parsed = new URL(lead.linkedin_url);

          if (parsed.protocol === "https:" &&
              parsed.hostname.endsWith("linkedin.com")) {
            const link = document.createElement("a");
            link.href = parsed.href;
            link.textContent = "View Profile";
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            linkCell.appendChild(link);
          } else {
            linkCell.textContent = "Invalid URL";
          }
        } catch {
          linkCell.textContent = "Invalid URL";
        }
      } else {
        linkCell.textContent = "N/A";
      }

      tr.append(name, role, company, linkCell);
      tbody.appendChild(tr);
    });
  }

  // UPDATE COUNTS AND PROGRESS

  function updateDashboard() {
    const unique = new Set(
      leads.map(lead => lead.linkedin_url.toLowerCase().trim()).filter(Boolean)
    ).size;

    document.getElementById("uniqueLeads").textContent = unique;
    document.getElementById("analyticsTotal").textContent = leads.length;
    document.getElementById("analyticsUnique").textContent = unique;

    const percentage = Math.min(unique / 500 * 100, 100);

    document.getElementById("progressValue").textContent =
      Math.round(percentage) + "%";

    document.getElementById("progressRing").style.background =
      `conic-gradient(#38d9e6 ${percentage * 3.6}deg, #25354e ${percentage * 3.6}deg)`;

    updateChart();
  }

  // ANALYTICS

  function updateChart() {
    const chart = document.getElementById("roleChart");
    const roles = {
      "CEO": 0,
      "Founder": 0,
      "Co-Founder": 0,
      "Chairman": 0,
      "Co-Chairman": 0
    };

    leads.forEach(lead => {
      const role = lead.designation.toLowerCase();

      if (role.includes("co-chairman")) roles["Co-Chairman"]++;
      else if (role.includes("co-founder")) roles["Co-Founder"]++;
      else if (role.includes("chairman")) roles["Chairman"]++;
      else if (role.includes("founder")) roles["Founder"]++;
      else if (role.includes("ceo") || role.includes("chief executive")) roles["CEO"]++;
    });

    const max = Math.max(1, ...Object.values(roles));
    chart.innerHTML = "";

    Object.entries(roles).forEach(([name, count]) => {
      const item = document.createElement("div");
      item.className = "bar-item";

      const label = document.createElement("span");
      label.textContent = name;

      const track = document.createElement("div");
      track.className = "bar-track";

      const fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.width = (count / max * 100) + "%";

      const number = document.createElement("b");
      number.textContent = count;

      track.appendChild(fill);
      item.append(label, track, number);
      chart.appendChild(item);
    });
  }

  // CONNECT BUTTON

  document.getElementById("saveUrl").addEventListener("click", function () {
    const url = document.getElementById("csvUrl").value.trim();

    if (!url) {
      alert("Please enter your Google Sheets CSV URL.");
      return;
    }

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") throw new Error();
      connectCSV(url);
    } catch {
      alert("Please enter a valid HTTPS URL.");
    }
  });

  // CLEAR BUTTON

  document.getElementById("clearUrl").addEventListener("click", function () {
    localStorage.removeItem("linkedinCSVUrl");
    document.getElementById("csvUrl").value = "";
    document.getElementById("connectionMessage").textContent = "Connection cleared.";
    document.getElementById("connectionMessage").style.color = "#91a0b9";

    leads = [];
    showLeads();
    updateDashboard();
  });

  // RESTORE SAVED URL

  const savedUrl = localStorage.getItem("linkedinCSVUrl");

  if (savedUrl) {
    document.getElementById("csvUrl").value = savedUrl;
    connectCSV(savedUrl);
  }

});
