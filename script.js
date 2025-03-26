const GITHUB_API_BASE = "https://api.github.com";
const HUGGINGFACE_API_BASE =
  "https://api-inference.huggingface.co/models/facebook/bart-large-cnn";
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour
const CACHE_KEY_PREFIX = "github_repos_";
const README_CACHE_PREFIX = "readme_";
const FAVORITES_KEY = "favorite_repos";
const DEFAULT_LANGUAGE = "javascript";
const POPULAR_LANGUAGES = [
  "javascript",
  "python",
  "java",
  "typescript",
  "go",
  "rust",
  "ruby",
  "php",
  "c++",
  "c#",
];

// state management
let currentTheme = localStorage.getItem("theme") || "light";
let favoriteRepos = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
document.documentElement.setAttribute("data-theme", currentTheme);

// dom elemts
const themeToggle = document.querySelector(".theme-toggle");
const searchButton = document.getElementById("search");
const languageInput = document.getElementById("language");
const sortSelect = document.getElementById("sort");
const goodFirstIssueCheckbox = document.getElementById("goodFirstIssue");
const resultsContainer = document.getElementById("results");
const loadingElement = document.getElementById("loading");
const errorElement = document.getElementById("error");
const modal = document.getElementById("readmeModal");
const modalContent = document.getElementById("modalContent");
const favoritesButton = document.getElementById("show-favorites");
const randomReposButton = document.getElementById("random-repos");

// toggle theme
themeToggle.addEventListener("click", () => {
  currentTheme = currentTheme === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", currentTheme);
  localStorage.setItem("theme", currentTheme);
  themeToggle.textContent = currentTheme === "light" ? "🌙" : "☀️";
});

// manage cache
const cache = {
  set: (key, data) => {
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(cacheData));
  },
  get: (key) => {
    const cached = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY_PREFIX + key);
      return null;
    }
    return data;
  },
  setReadme: (key, data) => {
    try {
      // clean up first
      cleanupCache();

      const cacheData = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(
        README_CACHE_PREFIX + key,
        JSON.stringify(cacheData)
      );
    } catch (error) {
      console.warn("Cache storage failed:", error);
      // continue without caching
    }
  },
  getReadme: (key) => {
    try {
      const cached = localStorage.getItem(README_CACHE_PREFIX + key);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(README_CACHE_PREFIX + key);
        return null;
      }
      return data;
    } catch (error) {
      console.warn("Cache retrieval failed:", error);
      return null;
    }
  },
};

// manage favorites
const favorites = {
  add: (repo) => {
    if (!favoriteRepos.some((r) => r.id === repo.id)) {
      favoriteRepos.push({
        id: repo.id,
        name: repo.name,
        owner: repo.owner.login,
        html_url: repo.html_url,
        description: repo.description,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        updated_at: repo.updated_at,
      });
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteRepos));
    }
  },
  remove: (repoId) => {
    favoriteRepos = favoriteRepos.filter((repo) => repo.id !== repoId);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteRepos));
  },
  isFavorite: (repoId) => {
    return favoriteRepos.some((repo) => repo.id === repoId);
  },
  getAll: () => {
    return favoriteRepos;
  },
};

// github api functions
async function searchRepositories(language, sort, goodFirstIssue) {
  const cacheKey = `${language}_${sort}_${goodFirstIssue}`;
  const cachedData = cache.get(cacheKey);
  if (cachedData) return cachedData;

  let query = `language:${language}`;
  if (goodFirstIssue) {
    query += ' label:"good first issue"';
  }

  const response = await fetch(
    `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(
      query
    )}&sort=${sort}&order=desc`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("GitHub API request failed");
  }

  const data = await response.json();
  cache.set(cacheKey, data);
  return data;
}

async function fetchRandomRepositories() {
  // get a random language from popular languages
  const randomLanguage =
    POPULAR_LANGUAGES[Math.floor(Math.random() * POPULAR_LANGUAGES.length)];
  return searchRepositories(randomLanguage, "stars", false);
}

async function fetchReadme(owner, repo) {
  const cacheKey = `${owner}_${repo}`;
  try {
    const cachedReadme = cache.getReadme(cacheKey);
    if (cachedReadme) return cachedReadme;

    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`,
      {
        headers: {
          Accept: "application/vnd.github.v3.raw",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch README");
    }

    const readmeContent = await response.text();
    const summary = await summarizeText(readmeContent);
    const result = { content: readmeContent, summary };

    // Try caching
    try {
      cache.setReadme(cacheKey, result);
    } catch (error) {
      console.warn("Failed to cache README:", error);
    }

    return result;
  } catch (error) {
    console.error("Error fetching README:", error);
    return null;
  }
}

async function fetchContributing(owner, repo) {
  try {
    // try root path first
    let response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/CONTRIBUTING.md`,
      {
        headers: {
          Accept: "application/vnd.github.v3.raw",
        },
      }
    );

    // if root path fails, try .github path
    if (!response.ok) {
      response = await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/.github/CONTRIBUTING.md`,
        {
          headers: {
            Accept: "application/vnd.github.v3.raw",
          },
        }
      );
    }

    if (!response.ok) {
      return null; // no contributing.md found
    }

    const contributingContent = await response.text();
    const summary = await summarizeText(contributingContent, true);
    return { content: contributingContent, summary };
  } catch (error) {
    console.error("Error fetching CONTRIBUTING.md:", error);
    return null;
  }
}

async function fetchRepoIssues(owner, repo) {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?state=open&per_page=5`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch issues");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching issues:", error);
    return [];
  }
}

async function summarizeText(text, isContributing = false) {
  // use the express server endpoint
  const endpoint = " http://localhost:3001/api/summarize";

  try {
    console.log("Sending summarize request to:", endpoint);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text.substring(0, 1024),
        isContributing,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Summarization failed:", errorData);
      throw new Error(errorData.error || "Summarization failed");
    }

    const data = await response.json();
    console.log("Received summarize response:", data);
    return data[0].summary_text;
  } catch (error) {
    console.error("Error summarizing text:", error);
    return "Failed to generate summary";
  }
}

// utils function to render markdown as HTML
function renderMarkdown(markdownText) {
  if (!markdownText) return "";

  try {
    // Render markdown using marked library
    return marked.parse(markdownText);
  } catch (error) {
    console.error("Error rendering markdown:", error);
    return `<p>${markdownText}</p>`;
  }
}

// UI Functions
function createRepoCard(repo) {
  const isFavorite = favorites.isFavorite(repo.id);
  const favoriteIcon = isFavorite ? "★" : "☆";
  const favoriteClass = isFavorite ? "favorite-active" : "";

  return `
        <div class="repo-card">
            <div class="repo-header">
                <h2><a href="${
                  repo.html_url
                }" target="_blank" rel="noopener noreferrer">${
    repo.name
  }</a></h2>
                <button class="favorite-btn ${favoriteClass}" data-repo-id="${
    repo.id
  }" onclick="toggleFavorite(event, ${JSON.stringify(repo).replace(
    /"/g,
    "&quot;"
  )})">
                    ${favoriteIcon}
                </button>
            </div>
            <p>${repo.description || "No description available"}</p>
            <div class="repo-stats">
                <span>⭐ ${repo.stargazers_count}</span>
                <span>🔱 ${repo.forks_count}</span>
                <span>📅 ${new Date(
                  repo.updated_at
                ).toLocaleDateString()}</span>
            </div>
            <div class="repo-actions">
                <button onclick="showReadme('${repo.owner.login}', '${
    repo.name
  }')" class="view-readme">
                    View README
                </button>
                <button onclick="showIssues('${repo.owner.login}', '${
    repo.name
  }')" class="view-issues">
                    View Issues
                </button>
            </div>
        </div>
    `;
}

function createFavoriteRepoCard(repo) {
  return `
        <div class="repo-card">
            <div class="repo-header">
                <h2><a href="${
                  repo.html_url
                }" target="_blank" rel="noopener noreferrer">${
    repo.name
  }</a></h2>
                <button class="favorite-btn favorite-active" data-repo-id="${
                  repo.id
                }" onclick="removeFavorite(event, ${repo.id})">
                    ★
                </button>
            </div>
            <p>${repo.description || "No description available"}</p>
            <div class="repo-stats">
                <span>⭐ ${repo.stargazers_count}</span>
                <span>🔱 ${repo.forks_count}</span>
                <span>📅 ${new Date(
                  repo.updated_at
                ).toLocaleDateString()}</span>
            </div>
            <div class="repo-actions">
                <button onclick="showReadme('${repo.owner}', '${
    repo.name
  }')" class="view-readme">
                    View README
                </button>
                <button onclick="showIssues('${repo.owner}', '${
    repo.name
  }')" class="view-issues">
                    View Issues
                </button>
            </div>
        </div>
    `;
}

function formatIssuesList(issues) {
  if (issues.length === 0) {
    return "<p>No open issues found.</p>";
  }

  let issuesList = '<ul class="issues-list">';
  issues.forEach((issue) => {
    issuesList += `
      <li class="issue-item">
        <a href="${issue.html_url}" target="_blank" rel="noopener noreferrer">
          <h4>${issue.title}</h4>
          <div class="issue-meta">
            <span>#${issue.number}</span>
            <span>Opened by: ${issue.user.login}</span>
            <span>Comments: ${issue.comments}</span>
          </div>
        </a>
      </li>
    `;
  });
  issuesList += "</ul>";
  return issuesList;
}

function showError(message) {
  errorElement.textContent = message;
  errorElement.style.display = "block";
  resultsContainer.innerHTML = "";
}

function hideError() {
  errorElement.style.display = "none";
}

// Function to close the modal
function closeModalFunction() {
  if (modal) {
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
  }
}

// Function to handle close button click events
function handleCloseButtonClick(event) {
  if (event.target.classList.contains("close-modal")) {
    closeModalFunction();
  }
}

// Function to toggle favorite status
function toggleFavorite(event, repo) {
  event.stopPropagation();
  const button = event.target.closest(".favorite-btn");
  const repoId = parseInt(button.dataset.repoId);

  if (favorites.isFavorite(repoId)) {
    favorites.remove(repoId);
    button.textContent = "☆";
    button.classList.remove("favorite-active");
  } else {
    favorites.add(repo);
    button.textContent = "★";
    button.classList.add("favorite-active");
  }
}

// Function to remove a favorite
function removeFavorite(event, repoId) {
  event.stopPropagation();
  favorites.remove(repoId);
  showFavorites(); // Refresh the favorites list
}

async function showReadme(owner, repo) {
  if (!modal || !modalContent) {
    console.error("Modal elements not found");
    return;
  }

  // Prevent body scrolling when modal is open
  document.body.classList.add("modal-open");

  modal.style.display = "block";
  modalContent.innerHTML =
    '<div class="summary-loading">Loading README...</div>';

  try {
    // Handle each promise separately for better error handling
    const readmeData = await fetchReadme(owner, repo);
    const contributingData = await fetchContributing(owner, repo);

    if (!readmeData) {
      modalContent.innerHTML = '<div class="error">Failed to load README</div>';
      return;
    }

    // Render the README content with marked
    const readmeHtml = renderMarkdown(readmeData.content);
    const readmeSummary = readmeData.summary
      ? renderMarkdown(readmeData.summary)
      : "Summary not available";

    // Prepare contributing HTML if available
    let contributingHtml = "";
    if (contributingData) {
      const contributingHtmlContent = renderMarkdown(contributingData.content);
      const contributingDataSummary = contributingData.summary
        ? renderMarkdown(contributingData.summary)
        : "Summary not available";

      contributingHtml = `
        <div class="contributing-section">
          <h2>How to Contribute</h2>
          <div class="content-group">
            <div class="section-summary">
              <h3>Summary</h3>
              <p id="contributing-summary">${contributingDataSummary}</p>
            </div>
            <details>
              <summary>View Full Contributing Guidelines</summary>
              <div class="content-scroll">
                <div class="markdown-content">${contributingHtmlContent}</div>
              </div>
            </details>
          </div>
        </div>
      `;
    }

    modalContent.innerHTML = `
            <span class="close-modal">&times;</span>
            <h2>${repo} README</h2>
            <div class="readme-section">
              <div class="content-group">
                <div class="section-summary">
                  <h3>Summary</h3>
                  <p id="readme-summary">${readmeSummary}</p>
                </div>
                <details>
                  <summary>View Full README</summary>
                  <div class="content-scroll">
                    <div class="markdown-content">${readmeHtml}</div>
                  </div>
                </details>
              </div>
            </div>
            ${contributingHtml}
        `;

    // Add event listener to the newly created close button
    const closeButtons = modalContent.querySelectorAll(".close-modal");
    closeButtons.forEach((button) => {
      button.addEventListener("click", closeModalFunction);
    });
  } catch (error) {
    console.error("Error in showReadme:", error);
    modalContent.innerHTML = '<div class="error">Failed to load README</div>';
  }
}

async function showIssues(owner, repo) {
  if (!modal || !modalContent) {
    console.error("Modal elements not found");
    return;
  }

  // Prevent body scrolling when modal is open
  document.body.classList.add("modal-open");

  modal.style.display = "block";
  modalContent.innerHTML =
    '<div class="summary-loading">Loading issues...</div>';

  try {
    const issues = await fetchRepoIssues(owner, repo);

    modalContent.innerHTML = `
            <span class="close-modal">&times;</span>
            <h2>${repo} Issues</h2>
            <div class="issues-container">
                ${formatIssuesList(issues)}
            </div>
        `;

    // Add event listener to the newly created close button
    const closeButtons = modalContent.querySelectorAll(".close-modal");
    closeButtons.forEach((button) => {
      button.addEventListener("click", closeModalFunction);
    });
  } catch (error) {
    modalContent.innerHTML = '<div class="error">Failed to load issues</div>';
  }
}

function showFavorites() {
  const favorites = favoriteRepos;

  if (favorites.length === 0) {
    resultsContainer.innerHTML =
      '<div class="no-favorites">No favorite repositories yet. Add some by clicking the ☆ icon!</div>';
    return;
  }

  resultsContainer.innerHTML = favorites.map(createFavoriteRepoCard).join("");
}

// Modal Event Listeners - Add the click event listener to the document
document.addEventListener("click", function (event) {
  // Check if clicked element is the modal background
  if (event.target === modal) {
    closeModalFunction();
  }

  // Check if clicked element is a close button
  if (event.target.classList.contains("close-modal")) {
    closeModalFunction();
  }
});

// Event Handlers
async function handleSearch() {
  const language = languageInput.value.trim();
  if (!language) {
    await loadRandomRepositories();
    return;
  }

  hideError();
  loadingElement.style.display = "block";
  resultsContainer.innerHTML = "";

  try {
    const data = await searchRepositories(
      language,
      sortSelect.value,
      goodFirstIssueCheckbox.checked
    );

    if (data.items.length === 0) {
      showError("No repositories found");
      return;
    }

    resultsContainer.innerHTML = data.items.map(createRepoCard).join("");
  } catch (error) {
    showError("Failed to fetch repositories. Please try again later.");
  } finally {
    loadingElement.style.display = "none";
  }
}

async function loadRandomRepositories() {
  hideError();
  loadingElement.style.display = "block";
  resultsContainer.innerHTML = "";

  try {
    const data = await fetchRandomRepositories();

    if (data.items.length === 0) {
      showError("No repositories found");
      return;
    }

    resultsContainer.innerHTML = data.items.map(createRepoCard).join("");
  } catch (error) {
    showError("Failed to fetch repositories. Please try again later.");
  } finally {
    loadingElement.style.display = "none";
  }
}

// Event Listeners
searchButton.addEventListener("click", handleSearch);
languageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleSearch();
});

// Add random repositories button listener
if (randomReposButton) {
  randomReposButton.addEventListener("click", loadRandomRepositories);
}

// Make functions available globally
window.toggleFavorite = toggleFavorite;
window.removeFavorite = removeFavorite;
window.showReadme = showReadme;
window.showIssues = showIssues;
window.showFavorites = showFavorites;

// Initialize theme toggle text
themeToggle.textContent = currentTheme === "light" ? "🌙" : "☀️";

// Initialize with random repositories on page load
document.addEventListener("DOMContentLoaded", loadRandomRepositories);

// Add favorite button event handler if it exists
if (favoritesButton) {
  favoritesButton.addEventListener("click", showFavorites);
}

// Added this to clean old cache entries
function cleanupCache() {
  try {
    // Clean readme cache
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(README_CACHE_PREFIX)) {
        const cached = localStorage.getItem(key);
        const { timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > CACHE_DURATION) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch (error) {
    console.error("Cache cleanup failed:", error);
  }
}
