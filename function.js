let records = JSON.parse(localStorage.getItem("records")) || [];
let currentPage = 1;
const rowsPerPage = 5;
let undoStack = [];
let sortKey = null;
let sortAsc = true;
let editingId = null;

const form = document.getElementById("recordForm");
const nameInput = document.getElementById("name");
const numberInput = document.getElementById("number");
const tableBody = document.getElementById("recordBody");
const searchInput = document.getElementById("searchInput");
const filterName = document.getElementById("filterName");
const filterNumber = document.getElementById("filterNumber");
const toast = document.getElementById("toast");
const pageInfo = document.getElementById("pageInfo");
const countDisplay = document.getElementById("countDisplay");

function saveToLocal() {
  localStorage.setItem("records", JSON.stringify(records));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function renderTable() {
  let filtered = [...records];
  const search = searchInput.value.toLowerCase();

  if (search) {
    filtered = filtered.filter(rec =>
      (filterName.checked && rec.name.toLowerCase().includes(search)) ||
      (filterNumber.checked && rec.number.includes(search))
    );
  }

  if (sortKey) {
    filtered.sort((a, b) => {
      if (a[sortKey] < b[sortKey]) return sortAsc ? -1 : 1;
      if (a[sortKey] > b[sortKey]) return sortAsc ? 1 : -1;
      return 0;
    });
  }

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  currentPage = Math.min(currentPage, totalPages || 1);
  const start = (currentPage - 1) * rowsPerPage;
  const paginated = filtered.slice(start, start + rowsPerPage);

  tableBody.innerHTML = "";
  paginated.forEach((record) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${record.name}</td>
      <td>${record.number}</td>
      <td>${record.dateAdded}</td>
      <td>
        <button onclick="startEdit(${record.id})">Edit</button>
        <button onclick="deleteRecord(${record.id})">Delete</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  document.getElementById("prevPage").disabled = currentPage === 1;
  document.getElementById("nextPage").disabled = currentPage === totalPages;
  pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
  countDisplay.textContent = `Total Records: ${filtered.length}`;

  saveToLocal();
}

function startEdit(id) {
  const record = records.find(r => r.id === id);
  if (!record) return;
  editingId = id;
  nameInput.value = record.name;
  numberInput.value = record.number;
}

function deleteRecord(id) {
  const index = records.findIndex(r => r.id === id);
  if (index !== -1) {
    undoStack.push(records[index]);
    records.splice(index, 1);
    showToast("Record deleted. Undo?");
    renderTable();
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const number = numberInput.value.trim();
  if (!name || !number) return;

  if (editingId) {
    const record = records.find(r => r.id === editingId);
    if (record) {
      record.name = name;
      record.number = number;
      showToast("Record updated.");
    }
    editingId = null;
  } else {
    records.push({
      id: Date.now(),
      name,
      number,
      dateAdded: new Date().toLocaleString()
    });
    showToast("Record added.");
  }

  nameInput.value = "";
  numberInput.value = "";
  renderTable();
});

document.getElementById("prevPage").onclick = () => {
  if (currentPage > 1) currentPage--;
  renderTable();
};

document.getElementById("nextPage").onclick = () => {
  currentPage++;
  renderTable();
};

document.querySelectorAll(".sortable").forEach((th) => {
  th.onclick = () => {
    const key = th.dataset.key;
    sortKey = key;
    sortAsc = sortKey === key ? !sortAsc : true;
    renderTable();
  };
});

searchInput.addEventListener("input", renderTable);
filterName.addEventListener("change", renderTable);
filterNumber.addEventListener("change", renderTable);

document.getElementById("darkModeToggle").onclick = () => {
  document.body.classList.toggle("dark-mode");
};

document.getElementById("exportCSV").onclick = () => {
  const rows = ["Name,Number,Date Added"];
  records.forEach(r => rows.push(`${r.name},${r.number},${r.dateAdded}`));
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "records.csv";
  a.click();
};

document.getElementById("exportJSON").onclick = () => {
  const blob = new Blob([JSON.stringify(records)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "records.json";
  a.click();
};

document.getElementById("importFile").onchange = function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const content = event.target.result;
    if (file.name.endsWith(".json")) {
      try {
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
          records = data.map(r => ({ ...r, id: r.id || Date.now() + Math.random() }));
          showToast("Imported JSON.");
          renderTable();
        }
      } catch {
        alert("Invalid JSON format.");
      }
    } else if (file.name.endsWith(".csv")) {
      const lines = content.split("\n").slice(1);
      lines.forEach(line => {
        const [name, number, dateAdded] = line.split(",");
        if (name && number) {
          records.push({ id: Date.now() + Math.random(), name, number, dateAdded: dateAdded || new Date().toLocaleString() });
        }
      });
      showToast("Imported CSV.");
      renderTable();
    }
  };
  reader.readAsText(file);
};

document.getElementById("resetApp").onclick = () => {
  if (confirm("Are you sure you want to delete all records?")) {
    records = [];
    undoStack = [];
    renderTable();
    showToast("All records deleted.");
  }
};

document.getElementById("confirmYes").onclick = () => {
  if (undoStack.length > 0) {
    records.push(undoStack.pop());
    renderTable();
    showToast("Undo successful.");
  }
};

document.getElementById("confirmNo").onclick = () => {
  undoStack = [];
  showToast("Undo cancelled.");
};

renderTable();

