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

let selectedIndex = -1;
let filteredProjects = [...projects];

// Refactor all plotting into one function
function renderPieChart(projectsGiven) {
  // re-calculate rolled data
  let newRolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year,
  );

  // re-calculate data
  let newData = newRolledData.map(([year, count]) => {
    return { value: count, label: year };
  });

  // re-calculate slice generator, arc data
  let newSliceGenerator = d3.pie().value((d) => d.value);
  let newArcData = newSliceGenerator(newData);

  // clear up paths and legends
  let newSVG = d3.select('svg');
  newSVG.selectAll('path').remove();

  let legend = d3.select(".legend");
  legend.selectAll('*').remove();

  // arc generator and color scale
  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  let colors = d3.scaleOrdinal(d3.schemePaired);

  // update paths
  newArcData.forEach((arc, idx) => {
    newSVG.append("path")
      .attr("d", arcGenerator(arc))
      .attr("fill", colors(idx))
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .classed("selected", selectedIndex === idx) 
      .on('click', () => {
        selectedIndex = selectedIndex === idx ? -1 : idx;
        if (selectedIndex === -1) {
          renderProjects(filteredProjects, projectsContainer, 'h2');
        } else {
          let selectedYear = newData[selectedIndex].label;
          let filtered = projectsGiven.filter(p => p.year === selectedYear);
          renderProjects(filtered, projectsContainer, 'h2');
        }

        renderPieChart(projectsGiven);
        
      });
  });

  // update legends
  newData.forEach((d, idx) => {
    legend
      .append('li')
      .attr('class', selectedIndex === idx ? 'legend-item selected' : 'legend-item')
      .attr('style', `--color:${colors(idx)}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => {
        selectedIndex = selectedIndex === idx ? -1 : idx;

        // Filter projects and re-render
        if (selectedIndex === -1) {
          renderProjects(filteredProjects, projectsContainer, 'h2');
        } else {
          let selectedYear = newData[selectedIndex].label;
          let filtered = projectsGiven.filter(p => p.year === selectedYear);
          renderProjects(filtered, projectsContainer, 'h2');
        }

        renderPieChart(projectsGiven);
      });
  });
}

// Call this function on page load
renderPieChart(projects);

let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
  let query = event.target.value.toLowerCase();
  selectedIndex = -1; // Reset selected index on search
  filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query);
  });

  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects);
});

