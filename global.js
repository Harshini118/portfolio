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