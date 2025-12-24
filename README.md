# 🎯 Interview Coach - AI Assistant

Real-time AI-powered interview coaching for Google Meet with local RAG knowledge base.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green)
![Ollama](https://img.shields.io/badge/Ollama-nomic--embed--text-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-purple)

---

## ✨ Features

- 🎙️ **Live Caption Reading** - Reads Google Meet captions in real-time
- 🤖 **Multi-AI Provider** - OpenAI, Gemini, Groq, OpenRouter, or FREE Pollinations
- 📚 **RAG Knowledge Base** - Upload your resume, job descriptions, notes
- 📄 **File Upload** - Supports `.txt`, `.md`, `.pdf`, `.docx`, `.pptx`
- 🖱️ **Draggable Widget** - Float anywhere on screen
- 🔮 **Transparent UI** - See through to your interview

---

## 🚀 Quick Start

### 1. Install Extension
```bash
# Clone or download
cd ai-interview-coach

# Load in Chrome
1. Go to chrome://extensions
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the ai-interview-coach folder
```

### 2. Setup RAG Server (Optional)
```bash
# Install Ollama
ollama pull nomic-embed-text

# Setup PostgreSQL with pgvector
psql -u postgres -c "CREATE DATABASE salescoach_rag;"
psql -u postgres -d salescoach_rag -c "CREATE EXTENSION vector;"

# Start server
cd server
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Configure
1. Click the extension icon
2. Select AI provider (Pollinations is FREE)
3. Add API key if needed
4. Upload your resume/notes to Knowledge Base

---

## 📁 Project Structure

```
cheat-app/
├── manifest.json           # Chrome extension config
├── src/
│   ├── background/
│   │   └── background.js   # AI API calls, RAG integration
│   ├── content/
│   │   ├── sidebar.html    # Floating widget UI
│   │   ├── sidebar.css     # Transparent glass theme
│   │   ├── sidebar.js      # Draggable, widget logic
│   │   ├── meet-captions.js # Caption grabber
│   │   └── content-script.js
│   ├── popup/
│   │   ├── popup.html      # Settings UI
│   │   ├── popup.css       # Glass theme styles
│   │   └── popup.js        # Settings logic, file upload
│   └── utils/
│       ├── constants.js    # Provider configs, RAG settings
│       └── storage.js      # Chrome storage utils
├── server/                 # RAG Backend
│   ├── main.py             # FastAPI endpoints
│   ├── database.py         # PostgreSQL + pgvector
│   └── requirements.txt    # Python dependencies
└── assets/                 # Icons
```

---

## 🔧 AI Providers

| Provider | API Key | Cost | Models |
|----------|---------|------|--------|
| **Pollinations** | ❌ None | FREE | openai, mistral, llama |
| OpenAI | ✅ `sk-...` | Paid | gpt-4o-mini, gpt-4o |
| Gemini | ✅ `AI...` | Free tier | gemini-1.5-flash |
| Groq | ✅ `gsk_...` | Free tier | llama-3.1-8b |
| OpenRouter | ✅ `sk-or-...` | Pay-per-use | Multiple |

---

## 📚 RAG Knowledge Base

Upload documents to enhance AI responses with your personal knowledge:

### Supported Files
- `.txt` - Plain text
- `.md` - Markdown
- `.pdf` - PDF documents
- `.docx` - Word documents
- `.pptx` - PowerPoint presentations

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server status |
| `/documents` | POST | Add document |
| `/documents` | GET | List all |
| `/documents/{title}` | DELETE | Remove |
| `/search` | POST | Vector search |
| `/extract-file` | POST | Extract text from file |

---

## 🎨 UI Features

- **🖱️ Draggable** - Drag header to move widget
- **➖ Minimize** - Collapse to header only
- **📏 Resize** - Drag corner to resize
- **💾 Position Memory** - Remembers position on reload
- **🔮 Transparent** - See-through glass theme

---

## 💡 Interview Prompt

The AI is configured as an interview candidate:
- Uses RAG knowledge base FIRST
- Simple, natural English
- Short answers (2-3 sentences)
- Honest, no buzzwords
- Practical and logical

---

## 🛠️ Development

```bash
# Watch for changes
# Extension auto-reloads on change

# Server with hot reload
cd server
uvicorn main:app --reload --port 8000
```

---

## 📝 License

MIT License - Use freely for your interviews!

---

**Made with ❤️ for job seekers**