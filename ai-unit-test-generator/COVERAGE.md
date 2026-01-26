# Code Coverage Guide

This document explains how to use and understand the code coverage features in the AI Unit Test Generator extension.

## Overview

The extension includes comprehensive code coverage tracking for both TypeScript (extension code) and Python (backend code). Coverage is displayed in the VS Code status bar and can be viewed in detail via a webview report.

## Running Coverage

### Via VS Code Commands

1. Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "Run Code Coverage"
3. Select the command and wait for coverage to complete
4. View the coverage percentage in the status bar

### Via Sidebar

1. Open the AI Unit Testing sidebar
2. Click the "Run Coverage" button
3. Coverage results will appear in the status bar

### Via Command Line

#### TypeScript Coverage Only
```bash
cd ai-unit-test-generator
npm run test:coverage
```

#### Python Coverage Only
```bash
cd ai-unit-test-generator/python
uv run pytest --cov=. --cov-report=term --cov-report=html
```

#### Combined Coverage
```bash
cd ai-unit-test-generator
npm run coverage
```

## Understanding Coverage Reports

### Status Bar Indicator

The status bar shows overall coverage with color coding:
- **Green**: ≥80% coverage (Excellent)
- **Yellow**: 60-79% coverage (Good)
- **Red**: <60% coverage (Needs Improvement)

Click the status bar item to view the detailed coverage report.

### Detailed Coverage Report

The detailed report shows:
- **Overall Coverage**: Combined TypeScript + Python coverage
- **TypeScript Coverage**: Extension code coverage
- **Python Coverage**: Backend code coverage

Each section displays:
- Total lines/statements
- Covered lines/statements
- Uncovered lines/statements
- Percentage coverage with progress bar

### Coverage Files

#### TypeScript
- **Report Location**: `ai-unit-test-generator/coverage/`
- **HTML Report**: `coverage/lcov-report/index.html`
- **JSON Report**: `coverage/coverage-summary.json`

#### Python
- **Report Location**: `ai-unit-test-generator/python/`
- **HTML Report**: `htmlcov/index.html`
- **JSON Report**: `coverage.json`

## CI/CD Integration

### GitHub Actions

Add this workflow to `.github/workflows/coverage.yml`:

```yaml
name: Code Coverage

on:
  push:
    branches: [ main, dev ]
  pull_request:
    branches: [ main, dev ]

jobs:
  coverage:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'

    - name: Setup Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.10'

    - name: Install Node dependencies
      run: |
        cd ai-unit-test-generator
        npm install

    - name: Install Python dependencies
      run: |
        cd ai-unit-test-generator/python
        pip install -r requirements.txt

    - name: Run TypeScript tests with coverage
      run: |
        cd ai-unit-test-generator
        npm run test:coverage

    - name: Run Python tests with coverage
      run: |
        cd ai-unit-test-generator/python
        pytest --cov=. --cov-report=xml --cov-report=term

    - name: Upload TypeScript coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        files: ./ai-unit-test-generator/coverage/lcov.info
        flags: typescript
        name: typescript-coverage

    - name: Upload Python coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        files: ./ai-unit-test-generator/python/coverage.xml
        flags: python
        name: python-coverage
```

## Coverage Thresholds

The project enforces minimum coverage thresholds:

### TypeScript (Jest)
- Branches: 50%
- Functions: 50%
- Lines: 50%
- Statements: 50%

### Python (pytest-cov)
Configure in `.coveragerc`:
```ini
[report]
fail_under = 50
```

## Writing Tests

### TypeScript Tests

Tests are located in `src/__tests__/` and use Jest:

```typescript
// src/__tests__/services/MyService.test.ts
import { MyService } from '../../services/MyService';

describe('MyService', () => {
    it('should do something', () => {
        const service = new MyService();
        expect(service.doSomething()).toBe(true);
    });
});
```

Run tests:
```bash
npm test
```

### Python Tests

Tests are located in `python/tests/` and use pytest:

```python
# python/tests/test_my_module.py
import pytest
from my_module import my_function

def test_my_function():
    assert my_function(1, 2) == 3
```

Run tests:
```bash
cd python
uv run pytest
```

## Viewing HTML Reports

### TypeScript
```bash
open ai-unit-test-generator/coverage/lcov-report/index.html
```

### Python
```bash
open ai-unit-test-generator/python/htmlcov/index.html
```

## Troubleshooting

### Coverage Not Running

1. **Check Node.js installation**: `node --version`
2. **Check npm dependencies**: `npm install`
3. **Check Python installation**: `python3 --version`
4. **Check uv installation**: `uv --version`

### Coverage Files Not Generated

1. **Ensure tests pass**: Run tests without coverage first
2. **Check file permissions**: Ensure write access to coverage directories
3. **Check disk space**: Coverage reports require disk space

### Low Coverage Warnings

If coverage is below threshold:
1. Add tests for uncovered code
2. Review coverage reports to identify gaps
3. Consider excluding non-testable code (config files, types, etc.)

## Best Practices

1. **Run coverage regularly**: Before commits and PRs
2. **Aim for 80%+ coverage**: Especially for critical business logic
3. **Write meaningful tests**: Coverage metrics should reflect actual test quality
4. **Exclude generated code**: Don't test auto-generated or third-party code
5. **Review uncovered lines**: Understand why code isn't covered
6. **Update tests with code changes**: Keep tests in sync with implementation

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [pytest Documentation](https://docs.pytest.org/)
- [pytest-cov Documentation](https://pytest-cov.readthedocs.io/)
- [VS Code Testing API](https://code.visualstudio.com/api/working-with-extensions/testing-api)
