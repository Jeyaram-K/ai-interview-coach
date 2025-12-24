/* src/content/sidebar.js */

const Sidebar = {
  init() {
    // Load the HTML for the sidebar
    const url = chrome.runtime.getURL('src/content/sidebar.html');
    fetch(url)
      .then(response => response.text())
      .then(html => {
        document.body.insertAdjacentHTML('beforeend', html);
        this.attachListeners();
        this.makeWidgetDraggable();
        this.makeLauncherDraggable();
        this.loadPosition();
      });
  },

  // Save widget position to storage
  savePosition() {
    const widget = document.getElementById('sc-widget');
    const launcher = document.getElementById('sc-launcher');

    const position = {
      widget: {
        left: widget.style.left,
        top: widget.style.top,
        width: widget.style.width,
        height: widget.style.height
      },
      launcher: {
        left: launcher.style.left,
        top: launcher.style.top
      }
    };

    localStorage.setItem('sc-position', JSON.stringify(position));
  },

  // Load widget position from storage
  loadPosition() {
    const saved = localStorage.getItem('sc-position');
    if (!saved) return;

    try {
      const position = JSON.parse(saved);
      const widget = document.getElementById('sc-widget');
      const launcher = document.getElementById('sc-launcher');

      if (position.widget) {
        if (position.widget.left) widget.style.left = position.widget.left;
        if (position.widget.top) widget.style.top = position.widget.top;
        if (position.widget.width) widget.style.width = position.widget.width;
        if (position.widget.height) widget.style.height = position.widget.height;
        widget.style.right = 'auto';
        widget.style.bottom = 'auto';
      }

      if (position.launcher) {
        if (position.launcher.left) launcher.style.left = position.launcher.left;
        if (position.launcher.top) launcher.style.top = position.launcher.top;
        launcher.style.right = 'auto';
        launcher.style.bottom = 'auto';
      }
    } catch (e) {
      console.log('Failed to load position:', e);
    }
  },

  // Make the widget draggable by its header
  makeWidgetDraggable() {
    const widget = document.getElementById('sc-widget');
    const header = document.getElementById('sc-drag-handle');

    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    header.addEventListener('mousedown', (e) => {
      // Ignore if clicking on buttons
      if (e.target.tagName === 'BUTTON') return;

      isDragging = true;
      widget.classList.add('dragging');

      startX = e.clientX;
      startY = e.clientY;

      const rect = widget.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      // Keep within viewport bounds
      const maxLeft = window.innerWidth - widget.offsetWidth;
      const maxTop = window.innerHeight - widget.offsetHeight;

      newLeft = Math.max(0, Math.min(newLeft, maxLeft));
      newTop = Math.max(0, Math.min(newTop, maxTop));

      widget.style.left = `${newLeft}px`;
      widget.style.top = `${newTop}px`;
      widget.style.right = 'auto';
      widget.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        widget.classList.remove('dragging');
        this.savePosition();
      }
    });
  },

  // Make launcher button draggable
  makeLauncherDraggable() {
    const launcher = document.getElementById('sc-launcher');
    const widget = document.getElementById('sc-widget');

    let isDragging = false;
    let hasMoved = false;
    let startX, startY, initialLeft, initialTop;

    launcher.addEventListener('mousedown', (e) => {
      isDragging = true;
      hasMoved = false;

      startX = e.clientX;
      startY = e.clientY;

      const rect = launcher.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      launcher.style.cursor = 'grabbing';
      launcher.style.transition = 'none';

      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasMoved = true;
      }

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      // Keep within viewport
      const maxLeft = window.innerWidth - launcher.offsetWidth;
      const maxTop = window.innerHeight - launcher.offsetHeight;

      newLeft = Math.max(0, Math.min(newLeft, maxLeft));
      newTop = Math.max(0, Math.min(newTop, maxTop));

      launcher.style.left = `${newLeft}px`;
      launcher.style.top = `${newTop}px`;
      launcher.style.right = 'auto';
      launcher.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        launcher.style.cursor = 'pointer';
        launcher.style.transition = 'all 0.2s ease';

        if (hasMoved) {
          this.savePosition();
        }
      }
    });

    // Store hasMoved state for click handler
    launcher.addEventListener('click', (e) => {
      if (hasMoved) {
        hasMoved = false;
        e.stopPropagation();
        return;
      }
      this.toggleWidget();
    });
  },

  toggleWidget() {
    const widget = document.getElementById('sc-widget');
    const launcher = document.getElementById('sc-launcher');

    if (!widget.classList.contains('visible')) {
      // Position widget near launcher if no saved position
      if (!widget.style.left || widget.style.left === 'auto') {
        const rect = launcher.getBoundingClientRect();
        let leftPos = rect.left - 270;
        let topPos = rect.top - 430;

        // Keep on screen
        leftPos = Math.max(10, Math.min(leftPos, window.innerWidth - 330));
        topPos = Math.max(10, Math.min(topPos, window.innerHeight - 440));

        widget.style.left = `${leftPos}px`;
        widget.style.top = `${topPos}px`;
        widget.style.right = 'auto';
        widget.style.bottom = 'auto';
      }
    }

    widget.classList.toggle('visible');
  },

  attachListeners() {
    const widget = document.getElementById('sc-widget');
    const closeBtn = document.getElementById('sc-close');
    const minimizeBtn = document.getElementById('sc-minimize');
    const clearBtn = document.getElementById('sc-clear');
    const triggerBtn = document.getElementById('sc-trigger-btn');
    const historyDiv = document.getElementById('sc-history');

    // Close widget
    closeBtn.addEventListener('click', () => {
      widget.classList.remove('visible');
    });

    // Minimize widget
    minimizeBtn.addEventListener('click', () => {
      widget.classList.toggle('minimized');
      minimizeBtn.textContent = widget.classList.contains('minimized') ? '□' : '─';
    });

    // Clear history
    clearBtn.addEventListener('click', () => {
      historyDiv.innerHTML = `
        <div class="sc-placeholder">
          <div class="sc-placeholder-icon">🗑️</div>
          <div class="sc-placeholder-text">History cleared</div>
          <div class="sc-placeholder-hint">Ready for new conversation</div>
        </div>
      `;
    });

    // MAIN ACTION: Generate Answer
    triggerBtn.addEventListener('click', () => {
      const captions = window.captionGrabber ? window.captionGrabber.getRecentCaptions() : '';

      console.log("FINAL PROMPT SENT TO AI:\n", captions);

      if (!captions || captions.trim().length < 2) {
        this.addMessage("⚠️ Can't read captions yet. Wait for someone to speak.", "error");
        return;
      }

      triggerBtn.disabled = true;
      triggerBtn.innerHTML = '<span class="sc-spinner"></span><span>Thinking...</span>';

      chrome.runtime.sendMessage({
        action: "GENERATE_RESPONSE",
        payload: { recentCaptions: captions }
      }, (response) => {
        triggerBtn.disabled = false;
        triggerBtn.innerHTML = '<span class="btn-icon">⚡</span><span>Generate Answer</span>';

        if (chrome.runtime.lastError) {
          this.addMessage("Error: Please refresh the page.", "error");
          return;
        }

        if (response.error) {
          this.addMessage(response.error, "error");
        } else {
          // Add RAG indicator if knowledge base was used
          const prefix = response.usedRag ? '📚 ' : '';
          this.addMessage(prefix + response.text, response.usedRag ? "rag" : "normal");
        }
      });
    });

    // Update provider name display
    this.updateProviderDisplay();
  },

  async updateProviderDisplay() {
    try {
      const settings = await chrome.storage.local.get(['provider', 'model']);
      const providerName = document.getElementById('sc-provider-name');
      if (providerName && settings.provider) {
        const providers = {
          pollinations: 'Pollinations',
          openai: 'OpenAI',
          gemini: 'Gemini',
          openrouter: 'OpenRouter',
          groq: 'Groq'
        };
        providerName.textContent = providers[settings.provider] || 'Ready';
      }
    } catch (e) {
      console.log('Could not load provider:', e);
    }
  },

  addMessage(text, type = "normal") {
    const historyDiv = document.getElementById('sc-history');
    const placeholder = historyDiv.querySelector('.sc-placeholder');
    if (placeholder) placeholder.remove();

    const div = document.createElement('div');
    div.className = `sc-msg ${type}`;
    div.innerText = text;

    historyDiv.prepend(div);
  }
};

window.Sidebar = Sidebar;