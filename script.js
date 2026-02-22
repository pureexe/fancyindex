document.addEventListener('DOMContentLoaded', () => {

    // Configure Marked to use Highlight.js
    marked.use({
        renderer: {
            code(token) {
                const lang = token.lang || '';
                const text = token.text || '';
                
                const validLanguage = hljs.getLanguage(lang) ? lang : 'plaintext';
                const highlighted = hljs.highlight(text, { language: validLanguage }).value;
                
                return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
            }
        }
    });

    // --- 1. Aggressive Nginx Artifact Cleanup ---
    const breadcrumbContainer = document.getElementById('breadcrumb-container');
    const listTable = document.getElementById('list');

    if (breadcrumbContainer && listTable) {
        let node = breadcrumbContainer.nextSibling;
        while (node && node !== listTable) {
            let next = node.nextSibling;
            node.remove();
            node = next;
        }
    }

    // --- 2. Build Dynamic Breadcrumbs ---
    const pathArray = window.location.pathname.split('/').filter(p => p !== "");
    const breadcrumbList = document.getElementById('breadcrumb-list');

    let homeLi = document.createElement('li');
    homeLi.innerHTML = `<a href="/">home</a>`;
    breadcrumbList.appendChild(homeLi);

    let currentPath = "/";
    pathArray.forEach((segment, index) => {
        currentPath += segment + "/";
        let li = document.createElement('li');
        if (index === pathArray.length - 1) {
            li.className = "is-active";
            li.innerHTML = `<a href="#" aria-current="page">${decodeURIComponent(segment)}</a>`;
        } else {
            li.innerHTML = `<a href="${currentPath}">${decodeURIComponent(segment)}</a>`;
        }
        breadcrumbList.appendChild(li);
    });

    // --- 3. Manage Table Rows & Find README ---
    // Variables to store the exact filename if we find them in the list
    let exactReadmeMd = null;
    let exactReadmeTxt = null;

    if (listTable) {
        const tableRows = listTable.querySelectorAll('tbody tr');
        let visibleFilesCount = 0;
        
        tableRows.forEach(row => {
            const linkElement = row.querySelector('.link a');
            if (linkElement) {
                const text = linkElement.innerText.trim();
                const href = linkElement.getAttribute('href');
                
                if (text === 'Parent directory/') {
                    row.remove(); 
                } else {
                    visibleFilesCount++;
                    let iconHtml = '';
                    
                    if (href.endsWith('/')) {
                        iconHtml = `<span class="icon is-small mr-2 has-text-grey-light"><i class="fas fa-folder"></i></span>`;
                    } else {
                        iconHtml = `<span class="icon is-small mr-2 has-text-grey-light"><i class="fas fa-file-lines"></i></span>`;
                        
                        // Case-insensitive check for README files
                        const lowerCaseName = text.toLowerCase();
                        if (lowerCaseName === 'readme.md') {
                            exactReadmeMd = text; // Save exact original casing
                        } else if (lowerCaseName === 'readme.txt') {
                            exactReadmeTxt = text; // Save exact original casing
                        }
                    }
                    
                    linkElement.innerHTML = iconHtml + linkElement.innerHTML;
                }
            }
        });

        if (visibleFilesCount === 0) {
            const tbody = listTable.querySelector('tbody');
            tbody.innerHTML = `<tr><td colspan="3" class="has-text-centered has-text-grey py-6">No files in current directory</td></tr>`;
        }
    }

    // --- 4. Fetch and Render Mirrors Logic ---
    async function loadMirrors() {
        try {
            const response = await fetch('/.fancyindex/mirror.json');
            if (response.ok) {
                const data = await response.json();
                const container = document.getElementById('mirror-buttons-container');
                
                if (data.mirrors && data.mirrors.length > 0) {
                    let label = document.createElement('span');
                    label.className = "button is-static is-small is-hidden-mobile";
                    label.innerText = "Mirror:";
                    container.appendChild(label);

                    data.mirrors.forEach(mirror => {
                        let btn = document.createElement('a'); 
                        
                        let baseUrl = mirror.url.endsWith('/') ? mirror.url.slice(0, -1) : mirror.url;
                        btn.href = baseUrl + window.location.pathname;
                        
                        let isActive = (mirror.name.toLowerCase() === data.current_mirror.toLowerCase());
                        btn.className = `button is-small mirror-btn ${isActive ? 'is-link is-selected' : ''}`;
                        btn.innerText = mirror.name;
                        
                        container.appendChild(btn);
                    });
                }
            }
        } catch (error) {
            console.error("Could not load mirror configuration:", error);
        }
    }

    // --- 5. Fetch and Render README Logic ---
    async function loadReadme(mdFilename, txtFilename) {
        // If no readme was found in the table, don't even try to fetch anything
        if (!mdFilename && !txtFilename) return; 

        const container = document.getElementById('readme-container');
        const contentDiv = document.getElementById('readme-content');
        const headerDiv = document.getElementById('readme-header');
        const titleText = document.getElementById('readme-title-text');

        try {
            // Check for markdown file first
            if (mdFilename) {
                let response = await fetch(mdFilename);
                if (response.ok) {
                    let text = await response.text();
                    contentDiv.innerHTML = marked.parse(text);
                    headerDiv.style.display = 'none'; 
                    container.style.display = 'block';
                    return; // Stop here if MD loaded
                }
            }
            
            // Check for text file next
            if (txtFilename) {
                let response = await fetch(txtFilename);
                if (response.ok) {
                    let text = await response.text();
                    contentDiv.innerHTML = `<pre class="raw-text">${text}</pre>`;
                    titleText.innerText = txtFilename; // Use exact actual filename in the UI
                    headerDiv.style.display = 'block'; 
                    container.style.display = 'block';
                }
            }
        } catch (error) {
            console.error("No README found or error loading it:", error);
        }
    }

    loadMirrors();
    
    // Trigger the load using the exact filenames found in the directory scan
    loadReadme(exactReadmeMd, exactReadmeTxt);
});