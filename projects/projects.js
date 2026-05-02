import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
const title = document.querySelector('.projects-title');

let query = '';
let selectedYear = null;

const searchInput = document.querySelector('.searchBar');
const colors = d3.scaleOrdinal(d3.schemeTableau10);
const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

function projectMatchesQuery(project, queryText) {
  const values = Object.values(project).join('\n').toLowerCase();
  return values.includes(queryText.toLowerCase());
}

function getSearchFilteredProjects() {
  return projects.filter((project) => projectMatchesQuery(project, query));
}

function getVisibleProjects(searchFilteredProjects) {
  if (!selectedYear) {
    return searchFilteredProjects;
  }

  return searchFilteredProjects.filter((project) => project.year === selectedYear);
}

function renderPieChart(projectsGiven) {
  const svg = d3.select('#projects-pie-plot');
  const legend = d3.select('.legend');

  svg.selectAll('path').remove();
  legend.selectAll('li').remove();

  const rolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );

  const data = rolledData.map(([year, count]) => {
    return { value: count, label: year };
  });

  const sliceGenerator = d3.pie().value((d) => d.value);
  const arcData = sliceGenerator(data);
  const arcs = arcData.map((d) => arcGenerator(d));

  arcs.forEach((arc, i) => {
    svg
      .append('path')
      .attr('d', arc)
      .attr('fill', colors(i))
      .attr('class', data[i].label === selectedYear ? 'selected' : '')
      .on('click', () => {
        selectedYear = selectedYear === data[i].label ? null : data[i].label;
        updateProjects();
      });
  });

  data.forEach((d, i) => {
    legend
      .append('li')
      .attr('style', `--color:${colors(i)}`)
      .attr('class', `legend-item${d.label === selectedYear ? ' selected' : ''}`)
      .on('click', () => {
        selectedYear = selectedYear === d.label ? null : d.label;
        updateProjects();
      })
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });
}

function updateProjects() {
  const searchFilteredProjects = getSearchFilteredProjects();
  const yearsInSearchResults = new Set(searchFilteredProjects.map((project) => project.year));

  if (selectedYear && !yearsInSearchResults.has(selectedYear)) {
    selectedYear = null;
  }

  const visibleProjects = getVisibleProjects(searchFilteredProjects);

  renderProjects(visibleProjects, projectsContainer, 'h2');
  renderPieChart(searchFilteredProjects);

  if (title) {
    title.textContent = `${visibleProjects.length} Projects`;
  }
}

searchInput.addEventListener('input', (event) => {
  query = event.target.value;
  updateProjects();
});

updateProjects();
