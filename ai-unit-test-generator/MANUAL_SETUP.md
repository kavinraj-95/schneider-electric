# Manual Setup Guide

If the Setup Wizard doesn't open automatically, follow these steps to configure the extension.

## Option 1: Using Command Palette (Easiest)

1. **Open Command Palette**
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)

2. **Search for Setup Wizard**
   - Type: `AI Unit Testing: Setup Wizard`
   - Select the option
   - The wizard will open with all configuration steps

3. **Follow the wizard steps** to select your provider and configure settings

---

## Option 2: Manual Configuration (If Wizard Doesn't Work)

### Step 1: Choose Your Provider

Open VS Code Settings:
- Mac: `Cmd+,`
- Windows/Linux: `Ctrl+,`

Search for: `aiUnitTesting.llmProvider`

Set to either:
- `openai` (recommended)
- `ollama`

### Step 2A: If Using OpenAI

1. **Get API Key**
   - Visit: https://platform.openai.com/api-keys
   - Create a new secret key
   - Copy the key (starts with `sk-`)

2. **Set API Key** (choose one method):

   **Method 1: Environment Variable (Recommended)**
   ```bash
   # Add to your shell profile (.bashrc, .zshrc, etc.)
   export OPENAI_API_KEY=sk-your-key-here

   # Then restart VS Code
   ```

   **Method 2: VS Code Settings**
   - Open Settings (Cmd/Ctrl+,)
   - Search: `aiUnitTesting.openaiApiKey`
   - Paste your API key

3. **Select Model** (Optional)
   - Open Settings
   - Search: `aiUnitTesting.openaiModel`
   - Choose:
     - `gpt-4o` (default, best quality)
     - `gpt-4-turbo` (good balance)
     - `gpt-3.5-turbo` (cheapest)

### Step 2B: If Using Ollama

1. **Install Ollama**
   - Download: https://ollama.ai/
   - Follow installation instructions

2. **Start Ollama**
   ```bash
   ollama serve
   ```

3. **Pull a Model**
   ```bash
   ollama pull llama3.2
   ```

4. **Configure Endpoint** (if not localhost)
   - Open Settings
   - Search: `aiUnitTesting.ollamaEndpoint`
   - Default is fine for local: `http://localhost:11434`

### Step 3: Install Python Dependencies

Open Terminal and run:

```bash
# For OpenAI users
pip install langchain langchain-openai langgraph langsmith python-dotenv tenacity

# For Ollama users
pip install langchain langchain-ollama langgraph langsmith python-dotenv tenacity

# For all (both providers)
pip install langchain langchain-openai langchain-ollama langgraph langsmith python-dotenv tenacity
```

Or use this shorthand:

```bash
# If using the venv in the project
cd python
pip install -e .
```

### Step 4: Configure Python Path (If Needed)

If Python is not found:

1. **Find Python Path**
   ```bash
   which python3
   # or
   where python
   ```

2. **Set in VS Code**
   - Open Settings
   - Search: `aiUnitTesting.pythonPath`
   - Enter the path (e.g., `/usr/bin/python3`)

---

## Step 5: Test Your Configuration

1. **Check Status Bar**
   - Look for `$(beaker) AI Tests` in bottom left
   - Should show when extension is active

2. **Open Command Palette**
   - Run: `AI Unit Testing: Show Help`
   - This tests that the extension is working

3. **Test LLM Connection**
   - Go to View → Explorer
   - Look for "AI Unit Testing" panel
   - It should show available options

---

## Troubleshooting

### Dashboard Not Opening

**What to do:**
1. Check the Output channel for errors
   - View → Output
   - Select "AI Unit Testing" from dropdown
   - Look for error messages

2. Try opening the Setup Wizard manually
   - Command Palette (`Cmd/Ctrl+Shift+P`)
   - Type: `Setup Wizard`

3. Check if extension is activated
   - Look for status bar at bottom (beaker icon ☕)
   - Should appear on the left side

### API Key Issues

**Error: "OPENAI_API_KEY not set"**
- Verify you set the environment variable correctly
- Restart VS Code after setting environment variable
- Or use VS Code settings instead

**Error: "Invalid API key"**
- Check for extra spaces or quotes in the key
- Visit https://platform.openai.com/api-keys and generate a new key
- Make sure the key starts with `sk-`

### Python Issues

**Error: "Python not found"**
- Ensure Python 3.10+ is installed
- Check Python path in settings
- Run: `python3 --version` to verify

**Error: "Dependencies missing"**
- Install manually:
  ```bash
  pip install langchain langchain-openai langgraph langsmith python-dotenv tenacity
  ```

### Ollama Issues

**Error: "Ollama not available"**
1. Is Ollama installed? https://ollama.ai/
2. Is it running? `ollama serve`
3. Check endpoint in settings (default: `http://localhost:11434`)

---

## Environment Variables

Create a `.env` file in your project root:

```bash
# LLM Provider (openai or ollama)
AI_PROVIDER=openai

# OpenAI Settings
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o

# Ollama Settings
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=llama3.2

# LangSmith (Optional, for observability)
LANGCHAIN_API_KEY=lsv2_...
LANGCHAIN_TRACING_V2=true
```

Then load it in your terminal before using the extension.

---

## Quick Reference

### OpenAI Setup (5 minutes)
1. Get API key from https://platform.openai.com/api-keys
2. Set environment variable: `export OPENAI_API_KEY=sk-...`
3. Install dependencies: `pip install langchain-openai`
4. Restart VS Code
5. Done! ✓

### Ollama Setup (10 minutes)
1. Install Ollama from https://ollama.ai/
2. Run: `ollama serve`
3. In another terminal: `ollama pull llama3.2`
4. Install dependencies: `pip install langchain-ollama`
5. VS Code automatically detects it
6. Done! ✓

---

## Getting Help

If you still have issues:

1. **Check the help documentation**
   - Command Palette → "AI Unit Testing: Show Help"

2. **View extension output**
   - View → Output
   - Select "AI Unit Testing"

3. **Check the README**
   - See `/README.md` in the extension folder

4. **Open an Issue**
   - GitHub: Report the exact error message you see

---

## Quick Fixes

| Error | Solution |
|-------|----------|
| Dashboard won't open | Run "Setup Wizard" from Command Palette |
| Can't find OpenAI option | Make sure you ran Setup Wizard |
| Python not found | Set `aiUnitTesting.pythonPath` in settings |
| Dependencies missing | Run `pip install -r requirements.txt` |
| API key invalid | Generate new key from platform.openai.com |
| Ollama not found | Start with `ollama serve` |

---

## Success Indicators

✓ Extension is working when you see:
- Beaker icon (☕) in status bar at bottom left
- "AI Unit Testing" section in Explorer panel
- No error messages in Output channel
- Setup Wizard can open from Command Palette

---

**Still having issues?** Check the Help documentation:
- Command Palette → "AI Unit Testing: Show Help"
