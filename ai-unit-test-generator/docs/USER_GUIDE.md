# User Guide: AI Unit Test Generator

Welcome to AI Unit Test Generator! This guide walks you through using the extension step-by-step.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Setup & Configuration](#setup--configuration)
3. [Generating Tests](#generating-tests)
4. [Understanding Test Scenarios](#understanding-test-scenarios)
5. [Cost Management](#cost-management)
6. [Tips & Best Practices](#tips--best-practices)
7. [Troubleshooting](#troubleshooting)

## Getting Started

### Installation

1. Open VS Code
2. Click Extensions (Cmd/Ctrl+Shift+X)
3. Search for "AI Unit Test Generator"
4. Click Install
5. Reload VS Code if prompted

### First Run

When you first install the extension, the **Setup Wizard** will automatically appear. If it doesn't:

1. Open Command Palette (Cmd/Ctrl+Shift+P)
2. Type "Setup Wizard"
3. Select "AI Unit Testing: Setup Wizard"

The wizard will guide you through:
- Choosing your LLM provider (OpenAI or Ollama)
- Configuring your API credentials
- Checking your Python environment
- Testing the connection

## Setup & Configuration

### Option A: OpenAI (Recommended)

#### Step 1: Get an API Key
1. Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign up or log in
3. Click "Create new secret key"
4. Copy the key (you'll need it in the next step)

#### Step 2: Configure in Extension
1. Open the Setup Wizard
2. Choose "OpenAI"
3. Paste your API key
4. Select your model (GPT-4o recommended)
5. Let it verify the key

#### Step 3: Verify Configuration
After setup, you should see "✓ OpenAI Connected" in the status bar.

### Option B: Ollama (Local, Free)

#### Step 1: Install Ollama
1. Download from [ollama.ai](https://ollama.ai/)
2. Follow installation instructions
3. Start Ollama: `ollama serve`

#### Step 2: Pull a Model
```bash
ollama pull llama3.2
```

#### Step 3: Configure in Extension
1. Open the Setup Wizard
2. Choose "Ollama"
3. Verify endpoint: `http://localhost:11434`
4. Let it verify the connection

#### Step 4: Verify Configuration
After setup, you should see "✓ Ollama Connected" in the status bar.

## Generating Tests

### Step-by-Step Workflow

#### 1. Select Source Files

1. In the **Source Files** view (left sidebar)
2. Click files to select them (blue checkbox = selected)
3. Click "Refresh Files" to rescan your project

**Pro Tip:** Start with 1-2 small files to test the workflow

#### 2. Extract Functions

1. Click "Extract Functions" button
2. Wait for analysis (progress shown in status bar)
3. Functions will appear in the **Functions** view

**What happens:** The extension analyzes your Python files and identifies all function definitions.

#### 3. Select Functions to Test

1. In the **Functions** view, click functions to select them
2. Blue checkmarks = will be tested
3. Click "Clear Selection" to deselect all

**Pro Tip:** Select 1-3 functions first to see the quality

#### 4. Generate Tests

1. Click "Generate Tests" button
2. Status bar shows progress (e.g., "Extracting scenarios... 2/3")
3. A **Test Preview** panel appears

#### 5. Review Test Scenarios

In the preview panel, you'll see:
- **Positive Scenarios**: Happy-path tests
- **Negative Scenarios**: Error-handling tests
- **Estimated Cost**: How much this will cost (OpenAI only)

**Important:** Review these before generating actual test files!

#### 6. Approve and Generate

Click "Generate Tests" button in the preview panel.

Test files will be created in your `tests/` directory (or configured directory).

### Example Workflow

Let's generate tests for a simple function:

```python
# src/utils.py
def add(a: int, b: int) -> int:
    """Add two numbers."""
    return a + b
```

**Step 1:** Open the Source Files view, select `src/utils.py`

**Step 2:** Click "Extract Functions" → Finds `add` function

**Step 3:** Click to select the `add` function

**Step 4:** Click "Generate Tests"

**Preview shows:**
```
Positive Scenarios:
- Test with two positive numbers
- Test with zero
- Test with negative numbers

Negative Scenarios:
- Test with non-integer inputs
- Test with None values
```

**Step 5:** Click "Generate Tests"

**Result:** File created: `tests/test_utils.py`
```python
def test_add_positive_numbers():
    assert add(2, 3) == 5

def test_add_with_zero():
    assert add(5, 0) == 5

def test_add_negative_numbers():
    assert add(-2, -3) == -5

def test_add_with_invalid_input():
    with pytest.raises(TypeError):
        add("2", 3)
```

## Understanding Test Scenarios

### Positive Scenarios

Tests where the function works normally with valid inputs:

```python
def test_user_signup_with_valid_data():
    user = signup(email="test@example.com", password="secure123")
    assert user.email == "test@example.com"
```

**Good for testing:**
- Normal operation
- Edge cases that work
- Boundary conditions

### Negative Scenarios

Tests that verify error handling:

```python
def test_user_signup_with_invalid_email():
    with pytest.raises(ValueError):
        signup(email="invalid", password="secure123")
```

**Good for testing:**
- Error conditions
- Invalid inputs
- Exception handling

### Test Quality Depends On...

1. **Your Code Documentation**
   - Add docstrings to functions
   - Explain what each parameter does
   - Describe return values

   ```python
   def calculate_age(birth_year: int) -> int:
       """Calculate age from birth year.

       Args:
           birth_year: The person's birth year

       Returns:
           Age in years (current year - birth year)
       """
       return datetime.now().year - birth_year
   ```

2. **Type Hints**
   - Help the AI understand inputs and outputs

   ```python
   # Good: Clear types
   def process_data(data: List[str], count: int) -> Dict[str, int]:
       ...

   # Less helpful: No types
   def process_data(data, count):
       ...
   ```

3. **Function Complexity**
   - Simple functions: High-quality tests
   - Complex logic: You should review and adjust tests

## Cost Management

### Understanding Costs (OpenAI Only)

Costs are displayed in the status bar:
```
Estimated cost: $0.05 | This month: $2.34 / $10.00
```

### Cost Breakdown

**Typical costs per function:**
- Simple function: $0.01-0.02
- Complex function: $0.05-0.10

**Example monthly costs:**
- 10 functions: ~$0.25 with GPT-3.5, ~$2.50 with GPT-4o
- 50 functions: ~$1.25 with GPT-3.5, ~$12.50 with GPT-4o
- 100 functions: ~$2.50 with GPT-3.5, ~$25.00 with GPT-4o

### Before Generating

1. Check estimated cost in the preview panel
2. Confirm the number of functions
3. Click generate only if within budget

### Setting a Budget

```json
// VS Code Settings
{
  "aiUnitTesting.monthlyBudget": 10.00
}
```

You'll get warnings when approaching the limit.

### Choosing a Model

**GPT-4o** (Default)
- Best quality tests
- ~$0.05 per function
- Recommended for important code

**GPT-4-turbo**
- Good quality
- ~$0.025 per function
- Balance of quality and cost

**GPT-3.5-turbo**
- Basic quality
- ~$0.005 per function
- Budget option for simple functions

### Cost Tips

1. **Start small**: Test with 1-3 functions first
2. **Review quality**: Higher cost ≠ always better tests
3. **Use appropriate models**: Don't pay for GPT-4o if GPT-3.5 is enough
4. **Batch by type**: Group similar functions together
5. **Monitor usage**: Check [platform.openai.com](https://platform.openai.com) for actual usage

## Tips & Best Practices

### Writing Better Testable Code

1. **Add Docstrings**
   ```python
   def withdraw_money(account_id: str, amount: float) -> bool:
       """Withdraw money from account.

       Args:
           account_id: The account identifier
           amount: Amount to withdraw in dollars

       Returns:
           True if withdrawal successful, False otherwise

       Raises:
           ValueError: If amount is negative or exceeds balance
           AccountNotFound: If account_id doesn't exist
       """
   ```

2. **Use Type Hints**
   ```python
   from typing import List, Dict, Optional

   def process_users(users: List[Dict[str, str]]) -> Optional[List[str]]:
       ...
   ```

3. **Single Responsibility**
   - One function = one purpose
   - Easier to test
   - AI generates better tests

4. **Handle Errors Explicitly**
   ```python
   def parse_json(data: str) -> dict:
       try:
           return json.loads(data)
       except json.JSONDecodeError as e:
           raise ValueError(f"Invalid JSON: {e}")
   ```

### Batch Processing

Generate tests efficiently:

1. **Group by module**: Test one module at a time
2. **Start with public APIs**: Test exported functions first
3. **Progressive difficulty**: Test simple functions first, then complex ones
4. **Review and adjust**: Fix any generated tests before committing

### Reviewing Generated Tests

1. **Read the test code**: Understand what's being tested
2. **Check for issues**: Fix any incorrect assumptions
3. **Add missing cases**: The AI might miss edge cases you know about
4. **Improve documentation**: Better docstrings = better next time

## Troubleshooting

### Common Issues

#### "API key not configured"

1. Do you have an OpenAI account? Create one at [openai.com](https://openai.com)
2. Visit [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
3. Create a new API key
4. Set environment variable: `export OPENAI_API_KEY=sk-...`
5. Or configure in VS Code settings

#### "Python not found"

1. Is Python installed? Test: `python3 --version`
2. Not in PATH? Configure the full path in settings:
   ```json
   {
     "aiUnitTesting.pythonPath": "/usr/bin/python3"
   }
   ```
3. Still not working? Restart VS Code

#### "Ollama not available"

1. Is Ollama installed? Download from [ollama.ai](https://ollama.ai/)
2. Is it running? Start with: `ollama serve`
3. Wrong endpoint? Check in settings: `aiUnitTesting.ollamaEndpoint`

#### "Generated tests are low quality"

1. Add better docstrings to your functions
2. Use type hints
3. Try GPT-4o instead of GPT-3.5
4. Manually adjust and improve the tests
5. Try again with better documentation

#### "Rate limit exceeded"

You've hit the OpenAI rate limit. Solutions:

1. Wait a few minutes and try again
2. Use a lower model (GPT-3.5 vs GPT-4o)
3. Generate fewer functions at once
4. Check your OpenAI plan ([platform.openai.com/account/billing](https://platform.openai.com/account/billing))

### Getting Help

1. **Check Help**: Command Palette → "Show Help"
2. **GitHub Issues**: [Report bug or request feature](https://github.com/schneider-electric/ai-unit-test-generator/issues)
3. **GitHub Discussions**: [Ask questions](https://github.com/schneider-electric/ai-unit-test-generator/discussions)

## Next Steps

1. ✅ Complete Setup Wizard
2. ✅ Generate tests for 1-2 sample functions
3. ✅ Review the generated test scenarios
4. ✅ Adjust any tests as needed
5. ✅ Commit tests to your repository
6. ✅ Integrate with CI/CD pipeline

## Quick Reference

| Task | Command |
|------|---------|
| Setup | Open Command Palette → "Setup Wizard" |
| Help | Open Command Palette → "Show Help" |
| Extract Functions | Click button in Source Files view |
| Generate Tests | Click button after selecting functions |
| Change Provider | Edit `aiUnitTesting.llmProvider` in settings |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl+Shift+P | Open Command Palette |
| Click checkbox | Toggle file/function selection |
| Refresh icon | Rescan for changes |

Enjoy generating tests! 🎉
