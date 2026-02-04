# Migration Guide: Ollama to OpenAI

This guide helps existing Ollama users migrate to OpenAI or continue using Ollama with the updated extension.

## Overview

The latest version of AI Unit Test Generator adds support for OpenAI API while maintaining backward compatibility with Ollama. **OpenAI is now the recommended default provider** due to better code understanding and test quality.

## What's New

✨ **New Features:**
- OpenAI GPT-4o integration (default)
- Test preview before generation
- Cost tracking and budget alerts
- Setup wizard for easy configuration
- Better error messages with actionable solutions
- Comprehensive help documentation

🔄 **Backward Compatible:**
- Ollama still fully supported
- No breaking changes to existing workflow
- Easy to switch between providers

## Migration Options

### Option 1: Switch to OpenAI (Recommended)

**Benefits:**
- Better code understanding with GPT-4o
- Higher quality test scenarios
- Cost tracking and transparency
- No local setup required

**Steps:**

1. Open the Setup Wizard:
   - Command Palette (Cmd/Ctrl+Shift+P)
   - Search "AI Unit Testing: Setup Wizard"

2. Select "OpenAI" as provider

3. Get an API key:
   - Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - Create a new API key

4. Enter your API key in the wizard

5. Let the wizard install dependencies and test the connection

**Cost Considerations:**
- GPT-4o: ~$0.01-0.05 per function tested
- Estimated ~$0.10 for 10 functions
- Track costs in VS Code status bar
- Set monthly budgets in settings

### Option 2: Keep Using Ollama

**Benefits:**
- No API costs
- Privacy (local processing)
- No internet required
- Full control over model selection

**Steps:**

1. Open VS Code Settings
   - Search: `aiUnitTesting.llmProvider`
   - Select "ollama"

2. Ensure Ollama is running:
   ```bash
   ollama serve
   ```

3. Configure endpoint (if not localhost:11434):
   - Setting: `aiUnitTesting.ollamaEndpoint`

4. Everything else works the same as before!

### Option 3: Hybrid Setup

Use different providers for different projects:

```json
// Project 1 - High quality tests (OpenAI)
{
  "aiUnitTesting.llmProvider": "openai",
  "aiUnitTesting.openaiModel": "gpt-4o"
}

// Project 2 - Cost-sensitive (Ollama)
{
  "aiUnitTesting.llmProvider": "ollama",
  "aiUnitTesting.ollamaEndpoint": "http://localhost:11434"
}
```

## Configuration Migration

### Before (Ollama-only)
```json
{
  "aiUnitTesting.ollamaEndpoint": "http://localhost:11434",
  "aiUnitTesting.ollamaModel": "llama3.2"
}
```

### After (Multi-provider)
```json
{
  // Choose provider
  "aiUnitTesting.llmProvider": "openai",

  // OpenAI settings
  "aiUnitTesting.openaiApiKey": "sk-...",
  "aiUnitTesting.openaiModel": "gpt-4o",

  // Ollama settings (still available)
  "aiUnitTesting.ollamaEndpoint": "http://localhost:11434",
  "aiUnitTesting.ollamaModel": "llama3.2"
}
```

## Environment Variables

### For OpenAI
```bash
export OPENAI_API_KEY=sk-your-key-here
export OPENAI_MODEL=gpt-4o
export AI_PROVIDER=openai
```

### For Ollama
```bash
export OLLAMA_ENDPOINT=http://localhost:11434
export OLLAMA_MODEL=llama3.2
export AI_PROVIDER=ollama
```

## Performance Comparison

| Aspect | Ollama | OpenAI (GPT-4o) |
|--------|--------|-----------------|
| Test Quality | Good | Excellent |
| Speed | Medium | Fast |
| Cost | Free | ~$0.01-0.05/function |
| Setup | Medium | Easy (Setup Wizard) |
| Privacy | Excellent | Good |
| Code Understanding | Good | Excellent |

## Troubleshooting Migration

### "Provider not recognized"
- Make sure you've updated to the latest version
- Run the Setup Wizard to reconfigure

### "Both providers trying to run"
- Clear old configuration: `aiUnitTesting.llmProvider`
- Run Setup Wizard to set provider explicitly

### "Ollama still trying to connect when OpenAI is selected"
- Check extension settings for leftover Ollama configs
- Restart VS Code
- Run validation: Command Palette → "AI Unit Testing" → diagnostics

### "API key not working"
- Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Verify key is valid
- Check for extra spaces or quotes
- Generate a new key if needed

### "Cost is higher than expected"
- Monitor usage in [platform.openai.com](https://platform.openai.com)
- Consider using GPT-3.5-turbo for less critical tests
- Set a monthly budget in settings for alerts

## Rollback to Ollama

If you want to go back to Ollama:

1. Open Settings
2. Search: `aiUnitTesting.llmProvider`
3. Select "ollama"
4. Ensure Ollama is running: `ollama serve`

That's it! Everything will work exactly as before.

## Cost Analysis

**Example: 50 functions per month**

| Provider | Cost | Notes |
|----------|------|-------|
| Ollama | $0 | Free, but needs setup |
| GPT-4o | ~$2.50 | Best quality |
| GPT-3.5-turbo | ~$0.25 | Budget option |

**Recommendation:**
- Use GPT-4o for important tests (critical functionality)
- Use GPT-3.5-turbo for basic tests (simple functions)
- Use Ollama for very large-scale testing

## FAQ

**Q: Will my existing tests still work?**
A: Yes! Existing tests are unaffected. You can continue using Ollama or migrate to OpenAI.

**Q: Can I switch providers in the middle?**
A: Yes! Change the `aiUnitTesting.llmProvider` setting and restart VS Code.

**Q: What if I don't have an OpenAI account?**
A: You can keep using Ollama (free, local). Or create an OpenAI account and get free trial credits.

**Q: How much do I spend per test?**
A: Typically $0.01-0.05 per function. Use the Setup Wizard's cost calculator.

**Q: Can I use both providers simultaneously?**
A: Not simultaneously, but you can switch between them by changing settings.

**Q: Is my API key secure?**
A: API keys are stored in VS Code's secure storage. Never commit them to Git.

## Support

Need help migrating?

- 📖 Open Help: Command Palette → "AI Unit Testing: Show Help"
- 🆘 GitHub Issues: Report problems
- 💬 GitHub Discussions: Ask questions

## Next Steps

After migration:

1. **Review Setup**: Run the Setup Wizard once to verify configuration
2. **Test Quality**: Generate tests on a sample function and review quality
3. **Set Budget**: If using OpenAI, set a monthly budget in settings
4. **Optimize**: Choose model based on your needs (GPT-4o for quality, GPT-3.5 for cost)
