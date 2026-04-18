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
   DARK MODE
========================= */

document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Auto</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
`
);

let select = document.querySelector("select");

// load saved theme
if ("colorScheme" in localStorage) {
  document.documentElement.classList.add(localStorage.colorScheme);
  select.value = localStorage.colorScheme;
}

// change theme
select.addEventListener("input", (event) => {
  let value = event.target.value;

  document.documentElement.classList.remove("light", "dark");

  if (value === "dark") {
    document.documentElement.classList.add("dark");
  } else if (value === "light") {
    document.documentElement.classList.add("light");
  }

  localStorage.colorScheme = value;
});