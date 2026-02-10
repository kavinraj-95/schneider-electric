"""
Language detection and configuration for multi-language test generation.
"""

import os
from typing import Dict, Optional, Tuple
from pathlib import Path


class LanguageConfig:
    """Configuration for a specific programming language."""
    
    def __init__(
        self,
        name: str,
        extensions: list,
        test_framework: str,
        test_file_prefix: str,
        import_style: str,
        comment_style: str
    ):
        self.name = name
        self.extensions = extensions
        self.test_framework = test_framework
        self.test_file_prefix = test_file_prefix
        self.import_style = import_style
        self.comment_style = comment_style


# Language configurations
LANGUAGE_CONFIGS = {
    "python": LanguageConfig(
        name="Python",
        extensions=[".py"],
        test_framework="pytest",
        test_file_prefix="test_",
        import_style="from {module} import {function}",
        comment_style='"""'
    ),
    "javascript": LanguageConfig(
        name="JavaScript",
        extensions=[".js", ".jsx"],
        test_framework="jest",
        test_file_prefix="",
        import_style="const {{ {function} }} = require('./{module}');",
        comment_style="//"
    ),
    "typescript": LanguageConfig(
        name="TypeScript",
        extensions=[".ts", ".tsx"],
        test_framework="jest",
        test_file_prefix="",
        import_style="import {{ {function} }} from './{module}';",
        comment_style="//"
    ),
    "java": LanguageConfig(
        name="Java",
        extensions=[".java"],
        test_framework="junit",
        test_file_prefix="",
        import_style="import {package}.{function};",
        comment_style="//"
    ),
    "csharp": LanguageConfig(
        name="C#",
        extensions=[".cs"],
        test_framework="nunit",
        test_file_prefix="",
        import_style="using {namespace};",
        comment_style="//"
    ),
    "go": LanguageConfig(
        name="Go",
        extensions=[".go"],
        test_framework="testing",
        test_file_prefix="",
        import_style='import "{module}"',
        comment_style="//"
    ),
    "ruby": LanguageConfig(
        name="Ruby",
        extensions=[".rb"],
        test_framework="rspec",
        test_file_prefix="",
        import_style="require_relative '{module}'",
        comment_style="#"
    ),
    "php": LanguageConfig(
        name="PHP",
        extensions=[".php"],
        test_framework="phpunit",
        test_file_prefix="",
        import_style="use {namespace}\\{function};",
        comment_style="//"
    ),
    "rust": LanguageConfig(
        name="Rust",
        extensions=[".rs"],
        test_framework="cargo test",
        test_file_prefix="",
        import_style="use {module}::{function};",
        comment_style="//"
    ),
    "cpp": LanguageConfig(
        name="C++",
        extensions=[".cpp", ".cc", ".cxx", ".hpp", ".h"],
        test_framework="googletest",
        test_file_prefix="",
        import_style='#include "{module}.h"',
        comment_style="//"
    )
}


def detect_language(file_path: str) -> Tuple[Optional[str], Optional[LanguageConfig]]:
    """
    Detect programming language from file extension.
    
    Args:
        file_path: Path to source file
    
    Returns:
        Tuple of (language_key, LanguageConfig) or (None, None) if unsupported
    """
    ext = Path(file_path).suffix.lower()
    
    for lang_key, config in LANGUAGE_CONFIGS.items():
        if ext in config.extensions:
            return lang_key, config
    
    return None, None


def get_module_name(file_path: str) -> str:
    """
    Extract module name from file path (without extension).
    Works for any language.
    
    Args:
        file_path: Path to source file
    
    Returns:
        Module name (filename without extension)
    """
    return Path(file_path).stem


def get_test_file_name(source_file: str, language: str) -> str:
    """
    Generate test file name based on language conventions.
    
    Args:
        source_file: Path to source file
        language: Language key
    
    Returns:
        Test file name
    """
    config = LANGUAGE_CONFIGS.get(language)
    if not config:
        return f"test_{Path(source_file).name}"
    
    module_name = get_module_name(source_file)
    ext = Path(source_file).suffix
    
    # Language-specific naming conventions
    if language == "python":
        return f"test_{module_name}.py"
    elif language in ["javascript", "typescript"]:
        return f"{module_name}.test{ext}"
    elif language == "java":
        return f"{module_name}Test.java"
    elif language == "csharp":
        return f"{module_name}Tests.cs"
    elif language == "go":
        return f"{module_name}_test.go"
    elif language == "ruby":
        return f"{module_name}_spec.rb"
    elif language == "php":
        return f"{module_name}Test.php"
    elif language == "rust":
        return f"{module_name}_test.rs"
    elif language == "cpp":
        return f"{module_name}_test.cpp"
    else:
        return f"test_{module_name}{ext}"


def generate_import_statement(
    module_name: str,
    function_name: str,
    language: str,
    class_name: Optional[str] = None
) -> str:
    """
    Generate import statement based on language.
    
    Args:
        module_name: Name of the module/file
        function_name: Name of the function
        language: Language key
        class_name: Optional class name
    
    Returns:
        Import statement string
    """
    config = LANGUAGE_CONFIGS.get(language)
    if not config:
        return f"// TODO: Import {function_name}"
    
    import_template = config.import_style
    
    # Handle class imports
    if class_name:
        if language == "python":
            return f"from {module_name} import {class_name}"
        elif language in ["javascript", "typescript"]:
            return f"import {{ {class_name} }} from './{module_name}';"
        elif language == "java":
            return f"import {module_name}.{class_name};"
        elif language == "csharp":
            return f"using {module_name};"
    
    # Replace placeholders
    import_stmt = import_template.replace("{module}", module_name)
    import_stmt = import_stmt.replace("{function}", function_name)
    import_stmt = import_stmt.replace("{package}", module_name)
    import_stmt = import_stmt.replace("{namespace}", module_name)
    
    return import_stmt


def get_test_framework_import(language: str) -> str:
    """
    Get test framework import statement.
    
    Args:
        language: Language key
    
    Returns:
        Import statement for test framework
    """
    framework_imports = {
        "python": "import pytest",
        "javascript": "const { describe, it, expect } = require('@jest/globals');",
        "typescript": "import { describe, it, expect } from '@jest/globals';",
        "java": "import org.junit.jupiter.api.Test;\nimport static org.junit.jupiter.api.Assertions.*;",
        "csharp": "using NUnit.Framework;",
        "go": "import \"testing\"",
        "ruby": "require 'rspec'",
        "php": "use PHPUnit\\Framework\\TestCase;",
        "rust": "// Tests use built-in testing framework",
        "cpp": "#include <gtest/gtest.h>"
    }
    
    return framework_imports.get(language, "// TODO: Import test framework")


def is_supported_language(file_path: str) -> bool:
    """
    Check if file is a supported language.
    
    Args:
        file_path: Path to source file
    
    Returns:
        True if supported, False otherwise
    """
    lang, _ = detect_language(file_path)
    return lang is not None


def get_supported_languages() -> list:
    """
    Get list of supported languages.
    
    Returns:
        List of language names
    """
    return [config.name for config in LANGUAGE_CONFIGS.values()]


if __name__ == "__main__":
    # Test detection
    test_files = [
        "calculator.py",
        "app.js",
        "component.tsx",
        "Main.java",
        "Program.cs",
        "main.go",
        "user.rb",
        "Controller.php",
        "lib.rs",
        "utils.cpp"
    ]
    
    print("Language Detection Test:")
    print("=" * 60)
    
    for file in test_files:
        lang, config = detect_language(file)
        if lang:
            module = get_module_name(file)
            test_file = get_test_file_name(file, lang)
            import_stmt = generate_import_statement(module, "someFunction", lang)
            
            print(f"\nFile: {file}")
            print(f"  Language: {config.name}")
            print(f"  Framework: {config.test_framework}")
            print(f"  Test file: {test_file}")
            print(f"  Import: {import_stmt}")
        else:
            print(f"\nFile: {file}")
            print(f"  Language: UNSUPPORTED")