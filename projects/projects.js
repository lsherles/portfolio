import { fetchJSON, renderProjects } from '../global.js';
let projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');

// Update project title with count
const titleElement = document.querySelector('.projects-title');
if (titleElement) {
  titleElement.textContent = `${projects.length} Projects`;
}

renderProjects(projects, projectsContainer, 'h2');

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// Data for pie chart
let rolledData = d3.rollups(
  projects,
  (v) => v.length,
  (d) => d.year,
);
let data = rolledData.map(([year, count]) => {
  return { value: count, label: year };
});
// Create arc generator
let arcGenerator = d3.arc()
  .innerRadius(0)
  .outerRadius(50);

// Use d3.pie() to generate slice angle data
let sliceGenerator = d3.pie().value((d) => d.value);
let arcData = sliceGenerator(data);

// Select the SVG and append a group centered on the origin
const svg = d3.select("#projects-pie-plot")
let colors = d3.scaleOrdinal(d3.schemeTableau10);

// Generate and append paths
arcData.forEach((arc, idx) => {
  svg.append("path")
    .attr("d", arcGenerator(arc))
    .attr("fill", colors(idx))
    .attr("stroke", "white")
    .attr("stroke-width", 2);
});
let legend = d3.select('.legend');
data.forEach((d, idx) => {
  legend
    .append('li')
    .attr('style', `--color:${colors(idx)}`) // set the style attribute while passing in parameters
    .attr('class', 'legend-item')
    .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`); // set the inner html of <li>
});


// Adding a search
let query = '';
let searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('change', (event) => {
  // update query value
  query = event.target.value;
  // filter projects
  let filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });
  // render filtered projects
  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects);
});





