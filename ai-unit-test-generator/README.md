# AI Unit Test Generator

🧪 Automatically generate test scenarios and pytest code using AI

**AI Unit Test Generator** is a VS Code extension that uses large language models (LLMs) to automatically analyze your Python code and generate comprehensive test scenarios and pytest test files.

## Features

- 🤖 **AI-Powered Test Generation**: Uses OpenAI GPT-4o (or Ollama) to understand your code and generate test scenarios
- 🎯 **Positive & Negative Test Cases**: Automatically generates both happy-path and error-handling test scenarios
- 👀 **Test Preview**: Review generated test scenarios before creating test files
- 💰 **Cost Tracking**: Monitor API usage and estimated costs (when using OpenAI)
- 🔧 **Easy Setup**: Interactive setup wizard for non-technical users
- 🛡️ **Error Handling**: Clear, actionable error messages with solutions
- 📚 **Comprehensive Help**: Built-in documentation and troubleshooting guide
- 🔄 **Multi-Provider**: Works with OpenAI (recommended) or Ollama (local)

## Quick Start

1. **Install the Extension**
   - Open VS Code
   - Go to Extensions (Cmd/Ctrl+Shift+X)
   - Search for "AI Unit Test Generator"
   - Click Install

2. **Run Setup Wizard**
   - Open Command Palette (Cmd/Ctrl+Shift+P)
   - Search for "AI Unit Testing: Setup Wizard"
   - Follow the steps to configure your LLM provider

3. **Generate Tests**
   - Select Python files in the Source Files view
   - Click "Extract Functions" to list available functions
   - Select functions to test
   - Click "Generate Tests"
   - Review the test scenarios
   - Click "Generate Tests" to create test files

## Configuration

### Using OpenAI (Recommended)

1. Get an API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Set environment variable:
   ```bash
   export OPENAI_API_KEY=sk-your-key-here
   ```
   Or configure in VS Code settings:
   ```json
   {
     "aiUnitTesting.llmProvider": "openai",
     "aiUnitTesting.openaiModel": "gpt-4o"
   }
   ```

### Using Ollama (Local)

1. Install [Ollama](https://ollama.ai/)
2. Pull a model: `ollama pull llama3.2`
3. Start Ollama: `ollama serve`
4. Configure in VS Code settings:
   ```json
   {
     "aiUnitTesting.llmProvider": "ollama",
     "aiUnitTesting.ollamaEndpoint": "http://localhost:11434"
   }
   ```

## Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aiUnitTesting.llmProvider` | string | `"openai"` | LLM provider: `"openai"` or `"ollama"` |
| `aiUnitTesting.openaiApiKey` | string | `""` | Your OpenAI API key |
| `aiUnitTesting.openaiModel` | string | `"gpt-4o"` | OpenAI model: `"gpt-4o"`, `"gpt-4-turbo"`, or `"gpt-3.5-turbo"` |
| `aiUnitTesting.ollamaEndpoint` | string | `"http://localhost:11434"` | Ollama server URL |
| `aiUnitTesting.testOutputDir` | string | `"tests"` | Directory for generated test files |
| `aiUnitTesting.pythonPath` | string | `"python3"` | Python interpreter path |

## Commands

| Command | Description |
|---------|-------------|
| `aiUnitTesting.showSetupWizard` | Open the interactive setup wizard |
| `aiUnitTesting.extractFunctions` | Extract functions from selected files |
| `aiUnitTesting.generateTests` | Generate tests for selected functions |
| `aiUnitTesting.showHelp` | Open help documentation |
| `aiUnitTesting.runCoverage` | Run code coverage analysis |

## Pricing & Cost Tracking

### OpenAI Pricing
- **GPT-4o**: $0.005 per 1K input tokens, $0.015 per 1K output tokens
- **GPT-4-turbo**: $0.01 per 1K input tokens, $0.03 per 1K output tokens
- **GPT-3.5-turbo**: $0.0005 per 1K input tokens, $0.0015 per 1K output tokens

### Typical Costs
- Generating tests for 1 function: ~$0.01-0.05
- Generating tests for 10 functions: ~$0.10-0.50

The extension tracks your API costs and shows:
- Estimated cost before generation
- Monthly spending
- Budget warnings

## Troubleshooting

### "Python not found"
- Ensure Python 3.10+ is installed
- Configure the Python path in settings: `aiUnitTesting.pythonPath`

### "Invalid API key"
- Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Generate a new API key
- Update your configuration

### "Ollama not available"
- Install [Ollama](https://ollama.ai/)
- Run `ollama serve` to start the server
- Ensure it's running at `http://localhost:11434`

### "Missing dependencies"
- Run the Setup Wizard to auto-install dependencies
- Or manually: `pip install langchain langchain-openai langchain-ollama langgraph langsmith python-dotenv tenacity`

### Low-quality tests
- Add docstrings to your functions
- Use type hints in your code
- Use a more capable model (GPT-4o vs GPT-3.5-turbo)

## Architecture

```
Python Files
    ↓
Extract Functions (AST parsing)
    ↓
Generate Scenarios (LLM: OpenAI/Ollama)
    ├── Positive Test Scenarios
    └── Negative Test Scenarios
    ↓
Preview Scenarios (User Review)
    ↓
Generate Tests (LLM: pytest code generation)
    ↓
Save Test Files
```

### Components

- **Frontend**: VS Code WebView UI with sidebar and preview panels
- **Backend**: Python scripts using LangChain and LangGraph
- **LLM Integration**: OpenAI API or local Ollama
- **Observability**: LangSmith for tracing and debugging

## System Requirements

- VS Code 1.85.0 or later
- Python 3.10 or later
- 1-2 GB free disk space
- Internet connection (for OpenAI) or local Ollama setup

## Development

### Setup
```bash
npm install
npm run compile
npm run test
```

### Building
```bash
npm run vscode:prepublish
```

### Python Backend
```bash
cd python
uv pip install -e .
uv run pytest
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT

## Support

- 📖 Open help documentation: Command Palette → "AI Unit Testing: Show Help"
- 🆘 Report issues: [GitHub Issues](https://github.com/schneider-electric/ai-unit-test-generator/issues)
- 💬 Ask questions: [GitHub Discussions](https://github.com/schneider-electric/ai-unit-test-generator/discussions)

## Acknowledgments

Built with:
- [LangChain](https://langchain.com/) - LLM framework
- [LangGraph](https://github.com/langchain-ai/langgraph) - Graph-based workflows
- [OpenAI](https://openai.com/) - GPT-4o
- [Ollama](https://ollama.ai/) - Local LLM support
