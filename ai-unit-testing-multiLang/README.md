# Multi-Language AI Unit Test Generator

Universal unit test generator supporting 10+ programming languages with intelligent code coverage analysis.

## Features

- ✨ **Multi-Language Support**: Python, JavaScript, TypeScript, Java, C#, Go, Ruby, PHP, Rust, C++
- 🔧 **Auto-Generated Imports**: Language-specific import statements
- 🎨 **Custom Test Values**: User input via UI dialog
- 📊 **Code Coverage Analysis**: HTML reports with recommendations
- 🔍 **Language Detection**: Automatic from file extension
- ✅ **Proper Test Syntax**: pytest, Jest, GoogleTest, JUnit, etc.

## Project Structure
```
ai-unit-testing-multiLang/
├── coverage_analyzer.py           # Coverage analysis & HTML reports
├── extension.ts                   # VS Code extension UI
├── extract_functions.py           # Python AST function extraction
├── generate_scenarios.py          # Test scenario generation
├── generate_unit_tests.py         # Multi-language test generation
├── language_detector.py           # Language detection & config
├── language_test_generators.py   # Language-specific generators
├── pipeline.py                    # Universal orchestrator
├── universal_extractor.py         # Multi-language function extraction
├── package.json                   # Extension metadata
└── tsconfig.json                  # TypeScript config
```

## How to Use

1. Open VS Code
2. Install the extension
3. Open any supported source file
4. Click "Generate Unit Tests" in sidebar
5. Choose default or custom test values
6. Tests generated in `tests/` folder
7. View coverage report at `tests/coverage_report.html`

## Supported Languages

| Language | Test Framework | File Extension |
|----------|----------------|----------------|
| Python | pytest | `.py` |
| JavaScript | Jest | `.js` |
| TypeScript | Jest | `.ts` |
| Java | JUnit | `.java` |
| C# | NUnit | `.cs` |
| Go | testing | `.go` |
| Ruby | RSpec | `.rb` |
| PHP | PHPUnit | `.php` |
| Rust | cargo test | `.rs` |
| C++ | Google Test | `.cpp` |

## Installation
```bash
cd ai-unit-testing-multiLang
npm install
npm run compile
```

## Development
```bash
# Compile TypeScript
npm run compile

# Watch mode
npm run watch
```

## Testing

Tested on:
- ✅ Windows 11
- ✅ Python 3.11
- ✅ Node.js 18+
- ✅ VS Code 1.95+

## Authors

Team Schneider Electric - AI Unit Testing Initiative