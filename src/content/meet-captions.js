/* src/content/meet-captions.js */

class CaptionGrabber {
  constructor() {
    this.buffer = [];
    this.isListening = false;
    this.observer = null;
    this.captionNode = null;
  }

  init() {
    console.log("Sales Coach: Initializing Smart Caption Grabber...");
    this.findCaptionContainer();
  }

  findCaptionContainer() {
    // List of common Google Meet caption containers
    const selectors = [
      '.a4cQT',             // Standard container
      '.iOzk7',             // Common variation
      '.VbkSUe',            // Another variation
      'div[jscontroller="yEJAe"]', 
      'div[jsname="dsSSge"]', 
      '.ws-use-lines'       // New UI update
    ];

    const checkInterval = setInterval(() => {
      let foundNode = null;

      // 1. Selector Search
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) {
          foundNode = el;
          console.log(`Sales Coach: Found captions via selector: ${selector}`);
          break;
        }
      }

      // 2. Position Search (Fallback if selectors fail)
      if (!foundNode) {
        const allDivs = document.querySelectorAll('div');
        for (const div of allDivs) {
          // Check if element has text and is in the caption area (bottom center)
          if (div.innerText && div.innerText.length > 0) {
            const rect = div.getBoundingClientRect();
            if (rect.bottom > window.innerHeight - 300 && rect.width > 300) {
              if (div.getAttribute('jsname') || div.className.includes('caption')) {
                foundNode = div;
                console.log("Sales Coach: Found captions via position scan.");
                break;
              }
            }
          }
        }
      }

      if (foundNode) {
        clearInterval(checkInterval);
        this.captionNode = foundNode;
        this.startObserving(foundNode);
      }
    }, 2000); // Check every 2 seconds
  }

  startObserving(targetNode) {
    console.log("Sales Coach: Locked onto captions. Listening...");
    this.isListening = true;

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            this.processText(node.innerText || node.textContent);
          });
        } else if (mutation.type === 'characterData') {
           this.processText(mutation.target.textContent);
        }
      });
    });

    this.observer.observe(targetNode, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  processText(rawText) {
    if (!rawText) return;
    const text = rawText.trim();
    if (text.length < 2) return; // Ignore single characters

    // SMART DEDUPLICATION LOGIC
    if (this.buffer.length > 0) {
      const lastEntry = this.buffer[this.buffer.length - 1];
      const lastText = lastEntry.text;

      // Case A: The new text is an update of the last text (e.g. "Hello" -> "Hello World")
      // We REPLACE the last entry instead of adding a new one.
      if (text.startsWith(lastText) || text.includes(lastText)) {
        lastEntry.text = text;
        lastEntry.time = Date.now();
        return;
      }
      
      // Case B: The old text contains the new text (rare correction), ignore it.
      if (lastText.includes(text)) {
        return; 
      }

      // Case C: Exact Duplicate
      if (lastText === text) return;
    }

    // Case D: It's a brand new sentence. Push it.
    console.log("Captured New Sentence:", text); 
    this.buffer.push({
      text: text,
      time: Date.now()
    });

    // Keep buffer clean (last 25 items only)
    if (this.buffer.length > 25) this.buffer.shift();
  }

  getRecentCaptions() {
    // Return text from last 90 seconds
    const now = Date.now();
    const activeLines = this.buffer.filter(item => now - item.time < 90000);
    
    // Join with newlines
    return activeLines.map(item => item.text).join("\n");
  }
}

window.captionGrabber = new CaptionGrabber();