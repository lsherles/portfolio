import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

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
  renderCommitInfo(data, commits);
  renderScatterPlot(data, commits);

  
  console.log(commits);
  console.log(commits[0].lines);

 
  function processCommits(data) {
    return d3
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
  }
  
  function renderCommitInfo(data, commits) {
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');
  
    // Total lines of code
    dl.append('dt').html('Total lines of code');
    dl.append('dd').text(data.length);
  
    // Total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);
  
    // Number of distinct files
    const numFiles = d3.groups(data, d => d.file).length;
    dl.append('dt').text('Number of files');
    dl.append('dd').text(numFiles);
  
    // Maximum file length (in lines)
    const fileLengths = d3.rollups(
      data,
      v => d3.max(v, d => d.line),
      d => d.file
    );
    const maxFileLength = d3.max(fileLengths, d => d[1]);
    dl.append('dt').text('Maximum file length (in lines)');
    dl.append('dd').text(maxFileLength);
  
    // Average file length
    const avgFileLength = d3.mean(fileLengths, d => d[1]);
    dl.append('dt').text('Average file length');
    dl.append('dd').text(avgFileLength.toFixed(1));
  
    // Time of day with most work
    const workByPeriod = d3.rollups(
      data,
      v => v.length,
      d => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' }) // morning, afternoon, etc.
    );
    const mostWorkPeriod = d3.greatest(workByPeriod, d => d[1])?.[0];
    dl.append('dt').text('Most active time of day');
    dl.append('dd').text(mostWorkPeriod);
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
      .call(xAxis);
  
    svg
      .append('g')
      .attr('transform', `translate(${usableArea.left}, 0)`)
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
      .data(sortedCommits)
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
  
