console.log("IT'S ALIVE!");

// helper
function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

/* =========================
   STEP 2: AUTO CURRENT PAGE
========================= */

let navLinks = $$("nav a");

let currentLink = navLinks.find(
  (a) =>
    a.host === location.host &&
    a.pathname === location.pathname
);

// safe add
currentLink?.classList.add("current");


/* =========================
   DARK MODE (FIXED)
========================= */

// add dropdown
document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="auto">Auto</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
`
);

let select = document.querySelector(".color-scheme select");

// load saved theme
if (localStorage.theme) {
  document.documentElement.className = localStorage.theme;
  select.value = localStorage.theme;
}

// change theme
select.addEventListener("input", (event) => {
  let value = event.target.value;

  if (value === "auto") {
    document.documentElement.className = "";
  } else {
    document.documentElement.className = value;
  }

  localStorage.theme = value;
});
export async function fetchJSON(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch JSON: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!containerElement) return;

  containerElement.innerHTML = '';

  for (let project of projects) {
    const article = document.createElement('article');

    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <img src="${project.image}" alt="${project.title}">
      <p>${project.description}</p>
      <p><strong>Year:</strong> ${project.year}</p>
    `;

    containerElement.appendChild(article);
  }
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}
