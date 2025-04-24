console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}
const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
? "/"                  // Local server
: "/portfolio/";         // GitHub Pages repo name

let pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'resume/', title: 'Resume' },
    { url: 'contact/', title: 'Contact' },
    { url: 'https://github.com/lsherles', title: 'GitHub' },
  ];

 

let nav = document.createElement('nav');
document.body.prepend(nav);


for (let p of pages) {
    let url = p.url;
    let title = p.title;
    url = !url.startsWith('http') ? BASE_PATH + url : url;
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    nav.append(a);
    a.classList.toggle(
        'current',
        a.host === location.host && a.pathname === location.pathname,
      );
    if (a.host !== location.host) {
      a.target = "_blank";
    }
  }

  document.body.insertAdjacentHTML(
    'afterbegin',
    `
    <label class="color-scheme">
      Theme:
      <select>
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>`
  ); 
  
let select = document.querySelector('.color-scheme select');

select.addEventListener('input', function (event) {
  let value = event.target.value;
  document.documentElement.style.setProperty('color-scheme', value);

  localStorage.colorScheme = value;
});

if ("colorScheme" in localStorage) {
    let saved = localStorage.colorScheme;
    document.documentElement.style.setProperty('color-scheme', saved);
    select.value = saved;
  }

  let form = document.querySelector('form');

  form?.addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent the default form submission
  
    let data = new FormData(form);
    let params = [];
  
    for (let [name, value] of data) {
      params.push(`${name}=${encodeURIComponent(value)}`);
    }
  
    let url = `${form.action}?${params.join('&')}`;
    location.href = url; // This opens the mail client
  });
  
  
  export async function fetchJSON(url) {
    try {
      // Fetch the JSON file from the given URL
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Error fetching or parsing JSON data:', error);
    }
  }
 


  export function renderProjects(projects, containerElement, headingLevel = 'h2') {
    // Validate container
    if (!containerElement || !(containerElement instanceof HTMLElement)) {
      console.error('Invalid container element provided.');
      return;
    }
  
    // Validate headingLevel
    const validHeadings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    if (!validHeadings.includes(headingLevel)) {
      console.warn(`Invalid heading level "${headingLevel}" passed. Defaulting to <h2>.`);
      headingLevel = 'h2';
    }
  
    // Clear existing content
    containerElement.innerHTML = '';
  
    // Loop through all projects
    projects.forEach(project => {
      // Create article element
      const article = document.createElement('article');
  
      // Use default placeholder values if missing
      const title = project.title || 'Untitled Project';
      const image = project.image || 'https://via.placeholder.com/300x200?text=No+Image';
      const description = project.description || 'No description provided.';
  
      // Set article HTML with dynamic heading level
      article.innerHTML = `
        <${headingLevel}>${title}</${headingLevel}>
        <img src="${image}" alt="${title}">
        <p>${description}</p>
      `;
  
      // Append to the container
      containerElement.appendChild(article);
    });
  }
  
  export async function fetchGitHubData(username) {
    return fetchJSON(`https://api.github.com/users/${username}`);
  }

  

