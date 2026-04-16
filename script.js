let chartInstance;

document.getElementById("searchBtn").addEventListener("click", getStats);

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
    if (!userResp.ok) {
      throw new Error("Користувача не знайдено");
    }

    const reposResp = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100`,
    );

    const user = await userResp.json();
    const repos = await reposResp.json();

    displayUser(user);
    const langData = processRepos(repos);
    renderChart(langData);

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
