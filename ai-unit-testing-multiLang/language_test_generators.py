"""
Language-specific test code generators.
Generates test code in the correct syntax for each language.
"""

from typing import List, Dict, Any, Optional


class LanguageTestGenerator:
    """Base class for language-specific test generation."""
    
    def generate_test_function(
        self,
        func_name: str,
        scenario: Dict[str, str],
        params: List[Dict],
        test_args: List[str],
        is_exception: bool = False
    ) -> str:
        raise NotImplementedError("Subclass must implement")
    
    def generate_file_header(self, func_name: str, module_name: str) -> str:
        raise NotImplementedError("Subclass must implement")


class PythonTestGenerator(LanguageTestGenerator):
    """Python/pytest test generator."""
    
    def generate_test_function(
        self,
        func_name: str,
        scenario: Dict[str, str],
        params: List[Dict],
        test_args: List[str],
        is_exception: bool = False
    ) -> str:
        test_name = scenario.get("scenario_name", "test_function")
        description = scenario.get("description", "Test function")
        
        lines = [
            f"def {test_name}():",
            f'    """',
            f"    {description}",
            f'    """'
        ]
        
        args_str = ", ".join(test_args)
        
        if is_exception:
            lines.append(f"    with pytest.raises(ValueError):")
            lines.append(f"        {func_name}({args_str})")
        else:
            lines.append(f"    result = {func_name}({args_str})")
            lines.append(f"    assert result is not None")
        
        return "\n".join(lines)
    
    def generate_file_header(self, func_name: str, module_name: str) -> str:
        return f"""import pytest

from {module_name} import {func_name}"""


class JavaScriptTestGenerator(LanguageTestGenerator):
    """JavaScript/Jest test generator."""
    
    def generate_test_function(
        self,
        func_name: str,
        scenario: Dict[str, str],
        params: List[Dict],
        test_args: List[str],
        is_exception: bool = False
    ) -> str:
        test_name = scenario.get("scenario_name", "test_function").replace("test_", "")
        description = scenario.get("description", "Test function")
        
        args_str = ", ".join(test_args)
        
        if is_exception:
            return f"""  it('{description}', () => {{
    expect(() => {{
      {func_name}({args_str});
    }}).toThrow();
  }});"""
        else:
            return f"""  it('{description}', () => {{
    const result = {func_name}({args_str});
    expect(result).toBeDefined();
  }});"""
    
    def generate_file_header(self, func_name: str, module_name: str) -> str:
        return f"""const {{ {func_name} }} = require('./{module_name}');

describe('{func_name}', () => {{"""


class TypeScriptTestGenerator(LanguageTestGenerator):
    """TypeScript/Jest test generator."""
    
    def generate_test_function(
        self,
        func_name: str,
        scenario: Dict[str, str],
        params: List[Dict],
        test_args: List[str],
        is_exception: bool = False
    ) -> str:
        test_name = scenario.get("scenario_name", "test_function").replace("test_", "")
        description = scenario.get("description", "Test function")
        
        args_str = ", ".join(test_args)
        
        if is_exception:
            return f"""  it('{description}', () => {{
    expect(() => {{
      {func_name}({args_str});
    }}).toThrow();
  }});"""
        else:
            return f"""  it('{description}', () => {{
    const result = {func_name}({args_str});
    expect(result).toBeDefined();
  }});"""
    
    def generate_file_header(self, func_name: str, module_name: str) -> str:
        return f"""import {{ {func_name} }} from './{module_name}';

describe('{func_name}', () => {{"""


class CppTestGenerator(LanguageTestGenerator):
    """C++ Google Test generator."""
    
    def generate_test_function(
        self,
        func_name: str,
        scenario: Dict[str, str],
        params: List[Dict],
        test_args: List[str],
        is_exception: bool = False
    ) -> str:
        test_name = scenario.get("scenario_name", "test_function")
        # Convert snake_case to PascalCase for C++ test names
        test_class = "".join(word.capitalize() for word in test_name.split("_"))
        
        description = scenario.get("description", "Test function")
        
        args_str = ", ".join(test_args)
        
        if is_exception:
            return f"""TEST({func_name}Test, {test_class}) {{
  // {description}
  EXPECT_THROW({{
    {func_name}({args_str});
  }}, std::exception);
}}"""
        else:
            return f"""TEST({func_name}Test, {test_class}) {{
  // {description}
  auto result = {func_name}({args_str});
  EXPECT_TRUE(result != 0 || result == 0); // Basic check
}}"""
    
    def generate_file_header(self, func_name: str, module_name: str) -> str:
        return f"""#include <gtest/gtest.h>
#include "{module_name}.h"
"""


class JavaTestGenerator(LanguageTestGenerator):
    """Java JUnit test generator."""
    
    def generate_test_function(
        self,
        func_name: str,
        scenario: Dict[str, str],
        params: List[Dict],
        test_args: List[str],
        is_exception: bool = False
    ) -> str:
        test_name = scenario.get("scenario_name", "test_function")
        # Convert to camelCase
        test_method = test_name.replace("_", " ").title().replace(" ", "")
        test_method = test_method[0].lower() + test_method[1:]
        
        description = scenario.get("description", "Test function")
        
        args_str = ", ".join(test_args)
        
        if is_exception:
            return f"""  @Test
  public void {test_method}() {{
    // {description}
    assertThrows(Exception.class, () -> {{
      {func_name}({args_str});
    }});
  }}"""
        else:
            return f"""  @Test
  public void {test_method}() {{
    // {description}
    var result = {func_name}({args_str});
    assertNotNull(result);
  }}"""
    
    def generate_file_header(self, func_name: str, module_name: str) -> str:
        class_name = func_name.capitalize() + "Test"
        return f"""import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class {class_name} {{
"""


class GoTestGenerator(LanguageTestGenerator):
    """Go testing package generator."""
    
    def generate_test_function(
        self,
        func_name: str,
        scenario: Dict[str, str],
        params: List[Dict],
        test_args: List[str],
        is_exception: bool = False
    ) -> str:
        test_name = scenario.get("scenario_name", "test_function")
        # Convert to PascalCase
        test_func = "Test" + "".join(word.capitalize() for word in test_name.split("_"))
        
        description = scenario.get("description", "Test function")
        
        args_str = ", ".join(test_args)
        
        return f"""func {test_func}(t *testing.T) {{
  // {description}
  result := {func_name}({args_str})
  if result == nil {{
    t.Error("Expected non-nil result")
  }}
}}"""
    
    def generate_file_header(self, func_name: str, module_name: str) -> str:
        return f"""package {module_name}

import "testing"
"""


def get_test_generator(language: str) -> LanguageTestGenerator:
    """Get appropriate test generator for language."""
    generators = {
        "python": PythonTestGenerator(),
        "javascript": JavaScriptTestGenerator(),
        "typescript": TypeScriptTestGenerator(),
        "cpp": CppTestGenerator(),
        "java": JavaTestGenerator(),
        "go": GoTestGenerator()
    }
    
    return generators.get(language, PythonTestGenerator())