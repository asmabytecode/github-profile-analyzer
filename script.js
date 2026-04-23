let chartInstance;
let starsChartInstance;
let activityChartInstance;

let allRepos = [];
let visibleCount = 5;

let debounceTimeout;

const CACHE_TTL = 10 * 60 * 1000;

document.getElementById("username").addEventListener("input", () => {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(getStats, 500);
});

document.getElementById("searchBtn").addEventListener("click", getStats);

function getCache(username) {
  const cached = localStorage.getItem(username);
  if (!cached) return null;

  try {
    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      localStorage.removeItem(username);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function setCache(username, data) {
  localStorage.setItem(
    username,
    JSON.stringify({
      data,
      timestamp: Date.now(),
    }),
  );
}

async function fetchWithRetry(url, retries = 2) {
  try {
    const resp = await fetch(url);

    await checkRateLimit(resp);

    if (!resp.ok) throw new Error("API error");

    return await resp.json();
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 500));
      return fetchWithRetry(url, retries - 1);
    }
    throw err;
  }
}

async function fetchAllRepos(username) {
  let page = 1;
  let all = [];
  let hasMore = true;

  while (hasMore) {
    const data = await fetchWithRetry(
      `https://api.github.com/users/${username}/repos?per_page=100&page=${page}`,
    );

    all = [...all, ...data];

    if (data.length < 100) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return all;
}

async function checkRateLimit(resp) {
  if (resp.status === 403) {
    const data = await resp.json();
    if (data.message.includes("rate limit")) {
      throw new Error("GitHub API ліміт перевищено");
    }
  }
}

function showError(msg) {
  const el = document.getElementById("error");
  el.innerText = msg;
  el.style.display = "block";
}

function clearError() {
  document.getElementById("error").style.display = "none";
}

function showSkeleton() {
  document.getElementById("loader").classList.add("skeleton");
}

function hideSkeleton() {
  document.getElementById("loader").classList.remove("skeleton");
}

async function getStats() {
  const username = document.getElementById("username").value.trim();
  const loader = document.getElementById("loader");
  const card = document.getElementById("profile-card");

  if (!username) return;

  loader.style.display = "block";
  card.style.display = "none";
  clearError();

  try {
    const cached = getCache(username);

    let user, repos;

    if (cached) {
      ({ user, repos } = cached);
    } else {
      user = await fetchWithRetry(
        `https://api.github.com/users/${username}`,
      );

      repos = await fetchAllRepos(username);

      setCache(username, { user, repos });
    }

    displayUser(user);

    if (!repos.length) {
      document.getElementById("repos").innerHTML =
        "<p>Немає репозиторіїв</p>";
      return;
    }

    const langData = processRepos(repos);

    const insightsData = generateInsights(repos);
    displayInsights(insightsData);

    await processAdvancedStats(username, repos);

    renderChart(langData);
    renderStarsChart(repos);

    allRepos = repos.sort((a, b) => b.stargazers_count - a.stargazers_count);
    visibleCount = 5;

    displayRepos();
    displayTopRepo(allRepos);
    setupLoadMore();

    card.style.display = "block";
  } catch (err) {
    showError(err.message || "Щось пішло не так");
  } finally {
    loader.style.display = "none";
  }
}

function setupCopyButton() {
  const btn = document.getElementById("copyBtn");

  btn.onclick = () => {
    const username = document.getElementById("name").innerText;
    if (!username) return;

    navigator.clipboard.writeText(username);

    btn.innerText = "✅ Скопійовано";

    setTimeout(() => {
      btn.innerText = "📋 Скопіювати нік";
    }, 1500);
  };
}

setupCopyButton();

function displayUser(user) {
  document.getElementById("avatar").src = user.avatar_url;
  document.getElementById("name").innerText = user.name || user.login;
  document.getElementById("bio").innerText = user.bio || "Без опису";
  document.getElementById("repo-count").innerText = user.public_repos;
  document.getElementById("followers").innerText = user.followers;
  document.getElementById("profile-link").href = user.html_url;

  const created = new Date(user.created_at).toLocaleDateString();

  document.getElementById("extra").innerText =
    `📅 ${created} | 🏢 ${user.company || "-"} | 📍 ${user.location || "-"}`;
}

function processRepos(repos) {
  let totalStars = 0;
  let languages = {};

  repos.forEach((repo) => {
    totalStars += repo.stargazers_count;

    const lang = repo.language || "Unknown"; // fallback

    languages[lang] = (languages[lang] || 0) + 1;
  });

  document.getElementById("star-count").innerText = totalStars;
  document.getElementById("avg-stars").innerText = repos.length
    ? (totalStars / repos.length).toFixed(1)
    : 0;

  let topLang = "-";
  let percent = 0;

  if (Object.keys(languages).length) {
    const sorted = Object.entries(languages).sort((a, b) => b[1] - a[1]);
    topLang = sorted[0][0];
    percent = ((sorted[0][1] / repos.length) * 100).toFixed(0);
  }

  document.getElementById("top-lang").innerText =
    topLang !== "-" ? `${topLang} (${percent}%)` : "-";

  return languages;
}

function generateInsights(repos) {
  let langUsage = {};
  let langStars = {};

  repos.forEach((r) => {
    if (!r.language) return;

    langUsage[r.language] = (langUsage[r.language] || 0) + 1;
    langStars[r.language] =
      (langStars[r.language] || 0) + r.stargazers_count;
  });

  const mostUsed = Object.entries(langUsage).sort((a, b) => b[1] - a[1])[0];
  const mostStarred = Object.entries(langStars).sort(
    (a, b) => b[1] - a[1],
  )[0];

  const underrated = repos
    .filter((r) => r.forks_count > 5 && r.stargazers_count < r.forks_count)
    .sort((a, b) => b.forks_count - a.forks_count)
    .slice(0, 3);

  let insights = [];

  if (mostUsed) {
    insights.push(`Найчастіша мова: ${mostUsed[0]} (${mostUsed[1]} репо)`);
  }

  if (mostStarred) {
    insights.push(
      `Найуспішніша мова: ${mostStarred[0]} (${mostStarred[1]} ⭐)`,
    );
  }

  if (underrated.length) {
    insights.push("⚠️ Недооцінені репозиторії:");
  }

  return { insights, underrated };
}

function displayInsights(data) {
  const list = document.getElementById("insights-list");

  let html = data.insights.map((i) => `<li>${i}</li>`).join("");

  html += data.underrated
    .map(
      (r) => `
      <li>
        🔹 <a href="${r.html_url}" target="_blank">${r.name}</a>
        (⭐ ${r.stargazers_count} | 🍴 ${r.forks_count})
      </li>
    `,
    )
    .join("");

  list.innerHTML = html;
}

async function processAdvancedStats(username, repos) {
  let forkCount = 0;
  let originalCount = 0;
  let totalIssues = 0;
  let yearly = {};

  repos.forEach((r) => {
    if (r.fork) forkCount++;
    else originalCount++;

    totalIssues += r.open_issues_count;

    const year = new Date(r.created_at).getFullYear();
    yearly[year] = (yearly[year] || 0) + 1;
  });

  document.getElementById("fork-ratio").innerText =
    `${originalCount} / ${forkCount}`;

  document.getElementById("open-issues").innerText = totalIssues;

  renderActivityChart(yearly);

  try {
    const events = await fetchWithRetry(
      `https://api.github.com/users/${username}/events`,
    );

    if (events.length) {
      const last = new Date(events[0].created_at);
      document.getElementById("last-activity").innerText =
        last.toLocaleDateString();
    }
  } catch {}
}

function renderActivityChart(data) {
  const ctx = document.getElementById("activityChart").getContext("2d");

  if (activityChartInstance) activityChartInstance.destroy();

  const years = Object.keys(data).sort();

  activityChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: years,
      datasets: [
        {
          label: "Repos per year",
          data: years.map((y) => data[y]),
        },
      ],
    },
  });
}

function renderChart(langData) {
  const canvas = document.getElementById("langChart");

  if (!Object.keys(langData).length) {
    canvas.style.display = "none";
    return;
  }

  canvas.style.display = "block";

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: Object.keys(langData),
      datasets: [{ data: Object.values(langData) }],
    },
  });
}

function renderStarsChart(repos) {
  const ctx = document.getElementById("starsChart").getContext("2d");

  const sorted = [...repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5);

  if (starsChartInstance) starsChartInstance.destroy();

  starsChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map((r) => r.name),
      datasets: [
        {
          label: "Stars",
          data: sorted.map((r) => r.stargazers_count),
        },
      ],
    },
  });
}

function displayRepos() {
  const container = document.getElementById("repos");

  const visible = allRepos.slice(0, visibleCount);

  container.innerHTML = visible
    .map(
      (r) => `
      <div class="repo-item">
        <a href="${r.html_url}" target="_blank">${r.name}</a>
        <div>⭐ ${r.stargazers_count} | 🍴 ${r.forks_count}</div>
      </div>`,
    )
    .join("");

  updateLoadMoreButton();
}

function setupLoadMore() {
  const btn = document.getElementById("loadMoreBtn");
  btn.onclick = () => {
    visibleCount += 5;
    displayRepos();
  };
  updateLoadMoreButton();
}

function updateLoadMoreButton() {
  document.getElementById("loadMoreBtn").style.display =
    visibleCount >= allRepos.length ? "none" : "block";
}

function displayTopRepo(repos) {
  if (!repos.length) return;

  const top = repos.reduce((a, b) =>
    b.stargazers_count > a.stargazers_count ? b : a,
  );

  document.getElementById("top-repo").innerHTML = `
    <a href="${top.html_url}" target="_blank">${top.name}</a>
    <p>${top.description || "Без опису"}</p>
  `;
}