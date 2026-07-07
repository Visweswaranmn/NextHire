// =============================
// ESCAPE UNTRUSTED TEXT BEFORE INSERTING INTO innerHTML
// =============================
function escapeHtml(value) {
  if (value === undefined || value === null) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


// =============================
// TOAST FEEDBACK (replaces blocking alert() popups)
// =============================
let toastTimer;

function showToast(message, type = "success") {
  let existingToast = document.querySelector(".toast");
  if (existingToast) existingToast.remove();

  let toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}


// =============================
// NAVBAR: hamburger menu, active link, auth state
// =============================
function initNavbar() {
  let header = document.querySelector("header");
  let hamburger = document.getElementById("hamburgerBtn");
  let nav = document.getElementById("navMenu");
  let overlay = document.getElementById("navOverlay");

  function closeNav() {
    if (nav) nav.classList.remove("open");
    if (hamburger) hamburger.classList.remove("open");
    if (overlay) overlay.classList.remove("show");
  }

  if (hamburger && nav) {
    hamburger.addEventListener("click", () => {
      let isOpen = nav.classList.toggle("open");
      hamburger.classList.toggle("open", isOpen);
      if (overlay) overlay.classList.toggle("show", isOpen);
    });
  }

  if (overlay) {
    overlay.addEventListener("click", closeNav);
  }

  if (nav) {
    nav.querySelectorAll("a").forEach(link => link.addEventListener("click", closeNav));
  }

  if (header) {
    window.addEventListener("scroll", () => {
      header.classList.toggle("scrolled", window.scrollY > 10);
    });
  }

  // highlight the nav link matching the current page
  let currentPage = location.pathname.split("/").pop() || "index.html";

  document.querySelectorAll(".nav a").forEach(link => {
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("active");
    }
  });

  // show "Welcome, <name> / Logout" instead of Login/Register when a user is signed in
  let user = JSON.parse(localStorage.getItem("user"));
  let userSection = document.getElementById("userSection");
  let authLinks = document.querySelectorAll(".auth-link");

  if (user) {
    authLinks.forEach(link => link.style.display = "none");

    if (userSection) {
      userSection.innerHTML = `
        <span>Welcome, ${user.name}</span>
        <button class="btn btn-sm btn-secondary" onclick="logout()">Logout</button>
      `;
    }
  } else if (userSection) {
    userSection.innerHTML = "";
  }
}

function logout() {
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", initNavbar);


// =============================
// PASSWORD TOGGLE
// =============================
function togglePassword() {
  let passwordInput = document.getElementById("password");
  if (!passwordInput) return;

  let eyeToggle = passwordInput.parentElement.querySelector(".eye");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    if (eyeToggle) eyeToggle.classList.add("active");
  } else {
    passwordInput.type = "password";
    if (eyeToggle) eyeToggle.classList.remove("active");
  }
}


// =============================
// APPLY MESSAGE
// =============================
function applyJob() {
  showToast("Application submitted successfully!");
}


// =============================
// SEARCH JOBS
// =============================
function searchJobs() {
  let searchInput = document.getElementById("jobSearch");
  if (!searchInput) return;

  let searchTerm = searchInput.value.toLowerCase();
  let jobCards = document.getElementsByClassName("job-card");

  for (let i = 0; i < jobCards.length; i++) {
    let cardText = jobCards[i].innerText.toLowerCase();
    jobCards[i].style.display = cardText.includes(searchTerm) ? "flex" : "none";
  }
}


// =============================
// GLOBAL STATE (jobs listing)
// =============================
let allJobs = [];
let currentJobsView = [];
let jobsPerPage = 20;
let currentPage = 1;
let currentCategory = "all";
let currentExperience = "all";


// =============================
// LOAD LIVE JOBS
// =============================
async function loadJobs() {
  let container = document.getElementById("jobsContainer");
  if (!container) return;

  container.innerHTML = `<div class="spinner"></div>`;

  allJobs = [];

  // load jobs posted through this app (MongoDB) first, so they still show
  // even if the external jobs API below is unreachable
  try {
    let postedJobsResponse = await fetch(`${API_BASE_URL}/jobs`);
    let postedJobs = await postedJobsResponse.json();

    postedJobs.forEach(job => {
      allJobs.push({
        title: job.title,
        company_name: job.company,
        candidate_required_location: job.location,
        salary: job.salary,
        url: "#"
      });
    });
  } catch (error) {
    console.error("Failed to load posted jobs:", error);
  }

  // load remote jobs from the Remotive API
  try {
    for (let page = 1; page <= 5; page++) {
      let remoteJobsResponse = await fetch(`https://remotive.com/api/remote-jobs?limit=50&page=${page}`);
      let remoteJobsPage = await remoteJobsResponse.json();

      allJobs = allJobs.concat(remoteJobsPage.jobs);
    }
  } catch (error) {
    console.error("Failed to load remote jobs:", error);

    // only show a hard failure state if we truly have nothing to display
    if (allJobs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-illustration"><span class="strap"></span></div>
          <h3>Couldn't load jobs right now</h3>
          <p>Please check your connection and try again.</p>
          <button class="btn btn-primary" onclick="loadJobs()">Retry</button>
        </div>
      `;
      return;
    }
  }

  // apply the category chosen on the homepage, if any
  let savedCategory = localStorage.getItem("selectedCategory");

  if (savedCategory) {
    currentCategory = savedCategory;
    localStorage.removeItem("selectedCategory");
  }

  displayJobs();
}


// =============================
// DISPLAY JOBS
// =============================
function displayJobs() {
  let container = document.getElementById("jobsContainer");
  if (!container) return;

  let filteredJobs = allJobs.filter(job => {
    let searchableText = (job.title + job.category + job.company_name).toLowerCase();

    // category filter
    if (currentCategory === "software") {
      if (!(searchableText.includes("developer") || searchableText.includes("engineer") || searchableText.includes("software"))) return false;
    }

    if (currentCategory === "marketing") {
      if (!(searchableText.includes("marketing") || searchableText.includes("seo") || searchableText.includes("sales"))) return false;
    }

    if (currentCategory === "finance") {
      if (!(searchableText.includes("finance") || searchableText.includes("account") || searchableText.includes("analyst") || searchableText.includes("bank"))) return false;
    }

    // experience filter
    if (currentExperience === "fresher") {
      return searchableText.includes("intern") || searchableText.includes("junior") || searchableText.includes("entry");
    }

    if (currentExperience === "junior") {
      return searchableText.includes("1") || searchableText.includes("2") || searchableText.includes("3") || searchableText.includes("junior");
    }

    if (currentExperience === "senior") {
      return searchableText.includes("senior") || searchableText.includes("lead") || searchableText.includes("manager") || searchableText.includes("5") || searchableText.includes("7");
    }

    return true;
  });

  let categoryHeading = document.getElementById("currentCategory");
  if (categoryHeading) {
    categoryHeading.innerText = currentCategory === "all" ? "All Jobs" : currentCategory.toUpperCase() + " Jobs";
  }

  // pagination slice
  let startIndex = (currentPage - 1) * jobsPerPage;
  let endIndex = startIndex + jobsPerPage;
  let jobsToShow = filteredJobs.slice(startIndex, endIndex);

  currentJobsView = jobsToShow;

  container.innerHTML = "";

  if (jobsToShow.length === 0) {
    if (currentCategory !== "all" || currentExperience !== "all") {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-illustration"><span class="strap"></span></div>
          <h3>No jobs found</h3>
          <p>Try a different category or experience level.</p>
          <button class="btn btn-primary" onclick="filterCategory('all')">Show All Jobs</button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-illustration"><span class="strap"></span></div>
          <h3>No jobs available</h3>
          <p>Please check back soon.</p>
        </div>
      `;
    }
    return;
  }

  jobsToShow.forEach((job, index) => {
    container.innerHTML += `
      <div class="job-card reveal">
        <h3>${escapeHtml(job.title)}</h3>
        <p>🏢 ${escapeHtml(job.company_name)}</p>
        <p>📍 ${escapeHtml(job.candidate_required_location || "Remote")}</p>
        ${job.salary ? `<span class="salary-tag">${escapeHtml(job.salary)}</span>` : ""}
        <div class="job-actions">
          <button class="btn btn-secondary btn-sm" onclick="openJobModal(currentJobsView[${index}])">Details</button>
          <button class="btn btn-primary btn-sm" onclick="window.open('${job.url}')">Apply</button>
          <button class="btn btn-secondary btn-sm" onclick="saveJob(currentJobsView[${index}].title,currentJobsView[${index}].company_name,currentJobsView[${index}].candidate_required_location)">⭐ Save</button>
        </div>
      </div>
    `;
  });
}


// =============================
// JOB DETAILS MODAL
// =============================
function openJobModal(job) {
  if (!job) return;

  let modal = document.getElementById("jobModal");
  if (!modal) return;

  document.getElementById("modalTitle").innerText = job.title;
  document.getElementById("modalCompany").innerText = "🏢 " + job.company_name;
  document.getElementById("modalLocation").innerText = "📍 " + (job.candidate_required_location || "Remote");

  let dateEl = document.getElementById("modalDate");
  if (dateEl) {
    dateEl.innerText = job.publication_date ? new Date(job.publication_date).toLocaleDateString() : "";
  }

  let applyLink = document.getElementById("modalApply");
  if (applyLink) {
    applyLink.href = job.url && job.url !== "#" ? job.url : "javascript:void(0)";
  }

  modal.classList.add("show");
}

function closeModal() {
  let modal = document.getElementById("jobModal");
  if (modal) modal.classList.remove("show");
}

document.addEventListener("click", (event) => {
  if (event.target.classList && event.target.classList.contains("modal")) {
    closeModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});


// =============================
// CATEGORY FILTER BUTTONS
// =============================
function filterCategory(category) {
  currentCategory = category;
  currentPage = 1;

  displayJobs();

  document.querySelectorAll(".category-filter .pill").forEach(button => {
    button.classList.toggle("active", button.dataset.category === category);
  });
}


// =============================
// LOAD MORE
// =============================
function loadMoreJobs() {
  jobsPerPage += 10;
  currentPage = 1;
  displayJobs();

  document.querySelectorAll(".pagination button[data-page]").forEach(button => {
    button.classList.toggle("active", Number(button.dataset.page) === 1);
  });
}


// =============================
// PAGINATION
// =============================
function changePage(page) {
  currentPage = page;
  displayJobs();

  document.querySelectorAll(".pagination button[data-page]").forEach(button => {
    button.classList.toggle("active", Number(button.dataset.page) === page);
  });
}


// =============================
// SAVE JOB
// =============================
function saveJob(title, company, location) {
  let savedJobs = JSON.parse(localStorage.getItem("savedJobs")) || [];
  savedJobs.push({ title, company, location });
  localStorage.setItem("savedJobs", JSON.stringify(savedJobs));

  showToast("Job saved successfully!");

  // also persist to MongoDB so saved jobs aren't lost if localStorage is cleared
  let user = JSON.parse(localStorage.getItem("user"));

  fetch(`${API_BASE_URL}/save-job`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title,
      company,
      location,
      userEmail: user ? user.email : ""
    })
  }).catch(error => console.error("Failed to sync saved job to server:", error));
}


// =============================
// CATEGORY NAVIGATION (HOMEPAGE)
// =============================
function goCategory(category) {
  localStorage.setItem("selectedCategory", category);
  window.location.href = "jobs.html";
}


// =============================
// EXPERIENCE FILTER
// =============================
function filterExperience() {
  currentExperience = document.getElementById("experienceLevel").value;
  displayJobs();
}


// =============================
// START APP
// =============================
document.addEventListener("DOMContentLoaded", loadJobs);


// =============================
// ADMIN: ADD JOB
// =============================
async function addJob() {
  let titleEl = document.getElementById("jobTitle");
  let companyEl = document.getElementById("jobCompany");
  let locationEl = document.getElementById("jobLocation");
  let salaryEl = document.getElementById("jobSalary");
  let msgEl = document.getElementById("adminMsg");

  let title = titleEl.value.trim();
  let company = companyEl.value.trim();
  let location = locationEl.value.trim();
  let salary = salaryEl ? salaryEl.value.trim() : "";

  if (!title || !company || !location) {
    if (msgEl) {
      msgEl.textContent = "Please fill in all required fields.";
      msgEl.className = "form-msg error";
    }
    return;
  }

  let currentUser = JSON.parse(localStorage.getItem("user"));

  try {
    let response = await fetch(`${API_BASE_URL}/admin/post-job`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ title, company, location, salary, email: currentUser ? currentUser.email : "" })
    });

    let data = await response.json();

    if (!response.ok) {
      if (msgEl) {
        msgEl.textContent = data.message;
        msgEl.className = "form-msg error";
      }
      return;
    }

    if (msgEl) {
      msgEl.textContent = data.message;
      msgEl.className = "form-msg success";
    }

    titleEl.value = "";
    companyEl.value = "";
    locationEl.value = "";
    if (salaryEl) salaryEl.value = "";

  } catch (error) {
    console.error(error);

    if (msgEl) {
      msgEl.textContent = "Failed to add job. Please try again.";
      msgEl.className = "form-msg error";
    }
  }
}
