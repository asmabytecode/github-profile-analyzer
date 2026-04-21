let chartInstance;
let starsChartInstance;

let allRepos = [];
let visibleCount = 5;

let debounceTimeout;

document.getElementById("username").addEventListener("input", () => {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(getStats, 500);
});

document.getElementById("searchBtn").addEventListener("click", getStats);

async function fetchAllRepos(username) {
  let page = 1;
  let all = [];
  let hasMore = true;

  while (hasMore) {
    const resp = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100&page=${page}`,
    );

    await checkRateLimit(resp);

    if (!resp.ok) throw new Error("Помилка завантаження репозиторіїв");

    const data = await resp.json();
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
  const el = document.getElementById("error");
  el.style.display = "none";
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
    const userResp = await fetch(`https://api.github.com/users/${username}`);
    await checkRateLimit(userResp);

    if (!userResp.ok) throw new Error("Користувача не знайдено");

    const user = await userResp.json();
    const repos = await fetchAllRepos(username);

    displayUser(user);
    const langData = processRepos(repos);

    renderChart(langData);
    renderStarsChart(repos);

    allRepos = repos.sort((a, b) => b.stargazers_count - a.stargazers_count);
    visibleCount = 5;

    displayRepos();
    displayTopRepo(allRepos);
    setupLoadMore();

    card.style.display = "block";
  } catch (err) {
    showError(err.message);
  } finally {
    loader.style.display = "none";
  }
}

function displayUser(user) {
  document.getElementById("avatar").src = user.avatar_url;
  document.getElementById("name").innerText = user.name || user.login;
  document.getElementById("bio").innerText = user.bio || "Без опису";
  document.getElementById("repo-count").innerText = `${user.public_repos}`;
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
    if (repo.language) {
      languages[repo.language] = (languages[repo.language] || 0) + 1;
    }
  });

  document.getElementById("star-count").innerText = totalStars;

  const avg = repos.length ? (totalStars / repos.length).toFixed(1) : 0;
  document.getElementById("avg-stars").innerText = avg;

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

function renderChart(langData) {
  const canvas = document.getElementById("langChart");

  if (!Object.keys(langData).length) {
    canvas.style.display = "none";
    return;
  }

  canvas.style.display = "block";

  const ctx = canvas.getContext("2d");

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(langData),
      datasets: [
        {
          data: Object.values(langData),
          backgroundColor: ["#58a6ff", "#238636", "#f0883e", "#d29922"],
        },
      ],
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

  if (!allRepos.length) {
    container.innerHTML = "<p>Немає репозиторіїв</p>";
    return;
  }

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
  const btn = document.getElementById("loadMoreBtn");
  btn.style.display = visibleCount >= allRepos.length ? "none" : "block";
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
