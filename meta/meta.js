import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
      ...row,
      line: Number(row.line), // or just +row.line
      depth: Number(row.depth),
      length: Number(row.length),
      date: new Date(row.date + 'T00:00' + row.timezone),
      datetime: new Date(row.datetime),
      
    }));
  
    return data;
  }

  let xScale, yScale;
  let data = await loadData();
  let commits = processCommits(data);
  let filteredCommits = commits;
  let commitProgress = 100;
  let timeScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime),
  ])
  .range([0, 100]);
  let commitMaxTime = timeScale.invert(commitProgress);


  renderCommitInfo(data, commits);
  renderScatterPlot(data, commits);

  
  console.log(commits);
  console.log(commits[0].lines);

 
function processCommits(data) {
  const grouped = d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;
      let ret = {
        id: commit,
        url: 'https://github.com/vis-society/lab-7/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        writable: false,
        enumerable: false,
        configurable: false,
      });

      return ret;
    });

  // ✅ Sort by datetime ascending
  return grouped.sort((a, b) => d3.ascending(a.datetime, b.datetime));
}

  
function renderCommitInfo(data, commits) {
  const container = d3.select('#stats').append('dl').attr('class', 'stats');

  function appendStat(label, id, value) {
    const stat = container.append('div').attr('class', 'stat');
    stat.append('dt').text(label);
    stat.append('dd').attr('id', id).text(value);
  }
  appendStat('Commits', 'commits', commits.length);
  appendStat('Total LOC', 'total-loc', data.length);


  const numFiles = d3.groups(data, d => d.file).length;
  appendStat('Files', 'files-count', numFiles);

  const fileLengths = d3.rollups(
    data,
    v => d3.max(v, d => d.line),
    d => d.file
  );
  const maxFileLength = d3.max(fileLengths, d => d[1]);
  appendStat('Maximum Depth', 'max-depth', maxFileLength);

  const avgFileLength = d3.mean(fileLengths, d => d[1]);
  appendStat('Average LOC', 'avg-loc', avgFileLength.toFixed(1));
}



function updateCommitInfo(data, commits) {
  d3.select('#commits').text(commits.length);
  d3.select('#total-loc').text(data.length);

  const numFiles = d3.groups(data, d => d.file).length;
  d3.select('#files-count').text(numFiles);

  const fileLengths = d3.rollups(
    data,
    v => d3.max(v, d => d.line),
    d => d.file
  );
  const maxFileLength = d3.max(fileLengths, d => d[1]);
  d3.select('#max-depth').text(maxFileLength);

  const avgFileLength = d3.mean(fileLengths, d => d[1]);
  d3.select('#avg-loc').text(avgFileLength.toFixed(1));
}

  

  function renderScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 40 };
  
    const usableArea = {
      top: margin.top,
      right: width - margin.right,
      bottom: height - margin.bottom,
      left: margin.left,
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom,
    };
  
    // Create SVG
    const svg = d3
      .select('#chart')
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('overflow', 'visible');
  
    // Scales
    xScale = d3
      .scaleTime()
      .domain(d3.extent(commits, d => d.datetime))
      .range([usableArea.left, usableArea.right])
      .nice();
  
    yScale = d3
      .scaleLinear()
      .domain([0, 24])
      .range([usableArea.bottom, usableArea.top]);
  
    // Add gridlines BEFORE the axes
    const gridlines = svg
      .append('g')
      .attr('class', 'gridlines')
      .attr('transform', `translate(${usableArea.left}, 0)`);
  
    gridlines.call(
      d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width)
    );
  
    // Axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
      .axisLeft(yScale)
      .tickFormat(d => String(d % 24).padStart(2, '0') + ':00');
  
    svg
      .append('g')
      .attr('transform', `translate(0, ${usableArea.bottom})`)
      .attr('class', 'x-axis') // new line to mark the g tag
      .call(xAxis);
  
    svg
      .append('g')
      .attr('transform', `translate(${usableArea.left}, 0)`)
      .attr('class', 'y-axis') // new line to mark the g tag
      .call(yAxis);
  
    const colorScale = d3.scaleLinear()
      .domain([0, 6, 12, 18, 24]) // you can adjust for smoother gradient
      .range(['#001f3f', '#0074D9', '#FF851B', '#FF4136', '#001f3f']) // blue → orange → red → blue
      .interpolate(d3.interpolateLab);

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]); // adjust these values based on your experimentation
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);


    // Draw dots
    svg
      .append('g')
      .attr('class', 'dots')
      .selectAll('circle')
      .data(sortedCommits, (d) => d.id)
      .join('circle')
      .attr('cx', d => xScale(d.datetime))
      .attr('cy', d => yScale(d.hourFrac))
      .attr('r', d => rScale(d.totalLines)) // size based on lines
      .attr('fill', d => colorScale(d.hourFrac)) // assuming you already have this scale
      .attr('opacity', 0.8) 
      .on('mouseenter', (event, commit) => {
        d3.select(event.currentTarget).style('fill-opacity', 1); // highlight
        renderTooltipContent(commit);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
      })
      .on('mousemove', updateTooltipPosition)
      .on('mouseleave', () => {
        updateTooltipVisibility(false);
    });
    createBrushSelector(svg);
}

function updateScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart').select('svg');

  xScale = xScale.domain(d3.extent(commits, (d) => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const xAxis = d3.axisBottom(xScale);

  // CHANGE: we should clear out the existing xAxis and then create a new one.
  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(xAxis);

  const dots = svg.select('g.dots');
  
  const colorScale = d3.scaleLinear()
    .domain([0, 6, 12, 18, 24]) // you can adjust for smoother gradient
    .range(['#001f3f', '#0074D9', '#FF851B', '#FF4136', '#001f3f']) // blue → orange → red → blue
    .interpolate(d3.interpolateLab);
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', d => colorScale(d.hourFrac)) // assuming you already have this scale
    .style('fill-opacity', 0.7) // Add transparency for overlapping dots
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}



  function renderTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
  
    if (Object.keys(commit).length === 0) return;
  
    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
      dateStyle: 'full',
    });
  }
  
  function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
  }

  function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
  }
  
  function createBrushSelector(svg) {
    const brush = d3.brush()
      .on('start brush end', brushed);
  
    svg.call(brush);
    svg.selectAll('.dots, .overlay ~ *').raise();
  }
  

  function brushed(event) {
    const selection = event.selection;
    d3.selectAll('circle').classed('selected', (d) =>
      isCommitSelected(selection, d),
    );
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
  }
  
  function isCommitSelected(selection, commit) {
    if (!selection) return false;
  
    const [[x0, y0], [x1, y1]] = selection;
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);
  
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
  }

  function renderSelectionCount(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
  
    const countElement = document.querySelector('#selection-count');
    countElement.textContent = `${
      selectedCommits.length || 'No'
    } commits selected`;
  
    return selectedCommits;
  }

  function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
    const container = document.getElementById('language-breakdown');
  
    if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
    }
    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
    const lines = requiredCommits.flatMap((d) => d.lines);
  
    // Use d3.rollup to count lines per language
    const breakdown = d3.rollup(
      lines,
      (v) => v.length,
      (d) => d.type,
    );
  
    // Update DOM with breakdown
    container.innerHTML = '';
  
    for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format('.1~%')(proportion);
  
      container.innerHTML += `
              <dt>${language}</dt>
              <dd>${count} lines (${formatted})</dd>
          `;
    }
  }
  
const commitSlider = document.getElementById('commit-slider');
const commitTimeDisplay = document.getElementById('commit-time-display');


function updateFileDisplay(filteredCommits) {
  // Flatten lines of filtered commits
  let lines = filteredCommits.flatMap(d => d.lines);

  // Group by file name
  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    })
    .sort((a, b) => b.lines.length - a.lines.length);

  // Select and bind data
  let filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, d => d.name)
    .join(
      enter => enter.append('div').call(div => {
        div.append('dt');
        div.append('dd');
      }),
      update => update,
      exit => exit.remove()
    );

  // Update filename and line count
  filesContainer.select('dt')
    .html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);
  
  let colors = d3.scaleOrdinal(d3.schemeTableau10);
  
    // Draw one .loc div per line
  filesContainer.select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc')
    .attr('style', (d) => `--color: ${colors(d.type)}`);
}




function onStepEnter(response) {
  const stepData = response.element.__data__; // the commit object
  commitMaxTime = stepData.datetime;
  
  // Sync slider position with commit time
  commitProgress = timeScale(commitMaxTime);
  commitSlider.value = commitProgress;

  // Now trigger all updates as if the slider moved
  onTimeSliderChange();
}




function onTimeSliderChange() {
  // Get slider value
  commitProgress = +commitSlider.value;

  // Calculate max commit datetime using timeScale.invert
  commitMaxTime = timeScale.invert(commitProgress);

  // Update the time display
  commitTimeDisplay.textContent = commitMaxTime.toLocaleString();

  // Filter commits by datetime
  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);

  // Flatten lines from filtered commits
  const filteredLines = filteredCommits.flatMap(commit => commit.lines);

  // Update scatterplot
  updateScatterPlot(data, filteredCommits);

  // Update info summary with filtered lines and commits
  updateCommitInfo(filteredLines, filteredCommits);

  // Update file display
  updateFileDisplay(filteredCommits);
}


// Attach event listener
commitSlider.addEventListener('input', onTimeSliderChange);

// Call once to initialize display on page load
onTimeSliderChange();

d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
		On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
		I made <a href="${d.url}" target="_blank">${
      i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
    }</a>.
		I edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file,
      ).length
    } files.
		Then I looked over all I had made, and I saw that it was very good.
	`,
  );


const scroller = scrollama();
scroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
  })
  .onStepEnter(onStepEnter);

  

function onStepEnter2(response) {
  const stepData = response.element.__data__; // the commit
  commitMaxTime = stepData.datetime;

  // Sync slider value just for consistency (optional)
  commitProgress = timeScale(commitMaxTime);
  commitSlider.value = commitProgress;

  // Filter and update everything
  onTimeSliderChange();
}



  // Create the same steps in scrolly-2
d3.select('#scrolly-2 .scroll-text')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(d => `<strong>${d.date}</strong>: edited ${d.totalLines} lines`);

const scroller2 = scrollama();

scroller2
  .setup({
    container: '#scrolly-2',
    step: '#scrolly-2 .step',
  })
  .onStepEnter(onStepEnter2);  // Separate handler

  