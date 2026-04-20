let chartInstance;
let starsChartInstance;

let allRepos = [];
let visibleCount = 5;

document.body.classList.add("loading");

window.addEventListener("load", () => {
  const intro = document.getElementById("intro");

  setTimeout(() => {
    intro.style.opacity = "0";
    document.body.classList.remove("loading");
  }, 2000);

  setTimeout(() => {
    intro.style.display = "none";
  }, 3000);
});

document.getElementById("searchBtn").addEventListener("click", getStats);

document.getElementById("username").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    document.getElementById("searchBtn").click();
  }
});

async function getStats() {
  const username = document.getElementById("username").value.trim();
  const loader = document.getElementById("loader");
  const card = document.getElementById("profile-card");

  if (!username) {
    alert("Введіть ім'я користувача!");
    return;
  }

  loader.style.display = "block";
  card.style.display = "none";

  try {
    const userResp = await fetch(`https://api.github.com/users/${username}`);
    if (!userResp.ok) throw new Error("Користувача не знайдено");

    const reposResp = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100`,
    );

    const user = await userResp.json();
    const repos = await reposResp.json();

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
    alert(err.message);
  } finally {
    loader.style.display = "none";
  }
}

function displayUser(user) {
  document.getElementById("avatar").src = user.avatar_url;
  document.getElementById("name").innerText = user.name || user.login;
  document.getElementById("bio").innerText =
    user.bio || "Опис профілю відсутній";
  document.getElementById("repo-count").innerText = user.public_repos;
  document.getElementById("followers").innerText = user.followers;
  document.getElementById("profile-link").href = user.html_url;
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

  return languages;
}

function renderChart(langData) {
  const ctx = document.getElementById("langChart").getContext("2d");

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(langData),
      datasets: [
        {
          data: Object.values(langData),
          backgroundColor: [
            "#58a6ff",
            "#238636",
            "#f0883e",
            "#d29922",
            "#bc8cff",
            "#f85149",
          ],
          borderWidth: 0,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#c9d1d9",
          },
        },
      },
    },
  });
}

function renderStarsChart(repos) {
  const ctx = document.getElementById("starsChart").getContext("2d");

  const sorted = [...repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5);

  if (starsChartInstance) {
    starsChartInstance.destroy();
  }

  starsChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map((r) => r.name),
      datasets: [
        {
          label: "Stars",
          data: sorted.map((r) => r.stargazers_count),
          backgroundColor: "#58a6ff",
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { color: "#c9d1d9" },
        },
        y: {
          ticks: { color: "#c9d1d9" },
        },
      },
    },
  });
}

function displayRepos() {
  const container = document.getElementById("repos");

  const visibleRepos = allRepos.slice(0, visibleCount);

  container.innerHTML = visibleRepos
    .map(
      (repo) => `
      <div class="repo-item">
        <a href="${repo.html_url}" target="_blank">${repo.name}</a>
        <div class="repo-meta">
          ⭐ ${repo.stargazers_count} | 🍴 ${repo.forks_count}
        </div>
      </div>
    `,
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

  if (visibleCount >= allRepos.length) {
    btn.style.display = "none";
  } else {
    btn.style.display = "block";
  }
}

function displayTopRepo(repos) {
  if (!repos.length) return;

  const top = repos.reduce(
    (max, repo) => (repo.stargazers_count > max.stargazers_count ? repo : max),
    repos[0],
  );

  const container = document.getElementById("top-repo");

  container.innerHTML = `
    <a href="${top.html_url}" target="_blank">${top.name}</a>
    <p>${top.description || "Без опису"}</p>
    <div class="repo-meta">
      ⭐ ${top.stargazers_count} | 🍴 ${top.forks_count}
    </div>
  `;
}
