"""
Unit test generator for Python functions.
Creates pytest-compatible test code without LLM dependencies.
"""

import ast
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path

# Import language-specific generators
try:
    from language_test_generators import get_test_generator
    HAS_LANGUAGE_GENERATORS = True
except ImportError:
    HAS_LANGUAGE_GENERATORS = False


class TestCodeGenerator:
    """Generates pytest test code for a function based on scenarios."""
    
    def __init__(
        self, 
        function_info: Dict[str, Any], 
        scenarios: List[Dict[str, str]],
        source_file_path: Optional[str] = None,
        custom_values: Optional[Dict[str, Any]] = None,
        language: Optional[str] = None
    ):
        self.func_name = function_info.get("func_name", "unknown")
        self.qualified_name = function_info.get("qualified_name", self.func_name)
        self.class_name = function_info.get("class_name")
        self.is_async = function_info.get("is_async", False)
        self.func_source = function_info.get("func_source", "")
        self.scenarios = scenarios
        self.source_file_path = source_file_path
        self.custom_values = custom_values or {}
        self.language = language or "python"
        
        self.params = self._extract_parameters()
        self.return_type = self._infer_return_type()
    
    def _extract_parameters(self) -> List[Dict[str, Optional[str]]]:
        """Extract function parameters from source code."""
        try:
            tree = ast.parse(self.func_source)
            func_node = tree.body[0]
            
            params = []
            for arg in func_node.args.args:
                if arg.arg == "self" or arg.arg == "cls":
                    continue
                
                param_info = {
                    "name": arg.arg,
                    "annotation": ast.unparse(arg.annotation) if arg.annotation else None
                }
                params.append(param_info)
            
            return params
        except:
            return []
    
    def _infer_return_type(self) -> Optional[str]:
        """Infer return type from function signature."""
        try:
            tree = ast.parse(self.func_source)
            func_node = tree.body[0]
            
            if func_node.returns:
                return ast.unparse(func_node.returns)
            
            return None
        except:
            return None
    
    def _generate_test_data(self, param_name: str, param_type: Optional[str], scenario_name: str) -> str:
        """Generate appropriate test data based on parameter type and scenario."""
        # Check if user provided custom value for this parameter
        if param_name in self.custom_values:
            value = self.custom_values[param_name]
            if isinstance(value, str):
                return f'"{value}"'
            return str(value)
        
        scenario_lower = scenario_name.lower()
        
        # Check for specific edge cases in scenario name
        if "zero" in scenario_lower:
            return "0"
        if "negative" in scenario_lower:
            return "-1"
        if "empty_string" in scenario_lower or "empty" in scenario_lower:
            if param_type and "str" in param_type.lower():
                return '""'
            return "[]"
        if "none" in scenario_lower:
            return "None"
        
        # Default values based on type annotation
        if not param_type:
            return "None"
        
        param_type_lower = param_type.lower()
        
        if "int" in param_type_lower:
            return "42"
        elif "float" in param_type_lower:
            return "3.14"
        elif "str" in param_type_lower:
            return '"test_string"'
        elif "bool" in param_type_lower:
            return "True"
        elif "list" in param_type_lower:
            return "[1, 2, 3]"
        elif "dict" in param_type_lower:
            return '{"key": "value"}'
        elif "tuple" in param_type_lower:
            return "(1, 2, 3)"
        else:
            return "None"
    
    def _generate_assertion(self, scenario: Dict[str, str]) -> str:
        """Generate appropriate assertion based on scenario type."""
        test_type = scenario.get("test_type", "functional")
        scenario_name = scenario.get("scenario_name", "")
        
        # Check if user provided expected result
        if "expected_result" in self.custom_values:
            expected = self.custom_values["expected_result"]
            if isinstance(expected, str):
                return f'assert result == "{expected}"'
            return f"assert result == {expected}"
        
        if test_type == "exception" or "exception" in scenario.get("category", ""):
            # Exception testing
            exception_type = "ValueError"
            if "type" in scenario_name:
                exception_type = "TypeError"
            elif "value" in scenario_name:
                exception_type = "ValueError"
            elif "zero" in scenario_name and "division" in scenario_name.lower():
                exception_type = "ZeroDivisionError"
            
            return f"pytest.raises({exception_type})"
        
        elif test_type == "return_type":
            # Type validation
            if self.return_type:
                type_map = {
                    "int": "int",
                    "float": "float",
                    "str": "str",
                    "bool": "bool",
                    "list": "list",
                    "dict": "dict",
                    "tuple": "tuple"
                }
                
                for key, value in type_map.items():
                    if key in self.return_type.lower():
                        return f"assert isinstance(result, {value})"
            
            return "assert result is not None"
        
        elif "none" in scenario_name:
            # None handling
            return "assert result is None"
        
        elif "empty" in scenario_name:
            # Empty collection handling
            return "assert result == [] or result == '' or result == {}"
        
        else:
            # Default assertion
            return "assert result is not None"
    
    def _generate_test_function(self, scenario: Dict[str, str]) -> str:
        """Generate a complete test function for a scenario."""
        test_name = scenario.get("scenario_name", "test_function")
        description = scenario.get("description", "Test function")
        test_type = scenario.get("test_type", "functional")
        
        # Generate test data for parameters
        test_args = []
        for param in self.params:
            test_value = self._generate_test_data(
                param["name"], 
                param.get("annotation"), 
                test_name
            )
            test_args.append(test_value)
        
        # Use language-specific generator if available
        if HAS_LANGUAGE_GENERATORS and self.language != "python":
            generator = get_test_generator(self.language)
            is_exception = test_type == "exception" or "exception" in scenario.get("category", "")
            
            return generator.generate_test_function(
                self.func_name,
                scenario,
                self.params,
                test_args,
                is_exception
            )
        
        # Default: Python test generation
        async_keyword = "async " if self.is_async else ""
        lines = []
        
        lines.append(f"{async_keyword}def {test_name}():")
        lines.append(f'    """')
        lines.append(f"    {description}")
        lines.append(f'    """')
        
        args_str = ", ".join(test_args)
        
        # Handle exception tests
        if test_type == "exception" or "exception" in scenario.get("category", ""):
            assertion = self._generate_assertion(scenario)
            
            lines.append(f"    with {assertion}:")
            
            if self.class_name:
                lines.append(f"        obj = {self.class_name}()")
                if self.is_async:
                    lines.append(f"        await obj.{self.func_name}({args_str})")
                else:
                    lines.append(f"        obj.{self.func_name}({args_str})")
            else:
                if self.is_async:
                    lines.append(f"        await {self.func_name}({args_str})")
                else:
                    lines.append(f"        {self.func_name}({args_str})")
        else:
            # Regular function call
            if self.class_name:
                lines.append(f"    obj = {self.class_name}()")
                if self.is_async:
                    lines.append(f"    result = await obj.{self.func_name}({args_str})")
                else:
                    lines.append(f"    result = obj.{self.func_name}({args_str})")
            else:
                if self.is_async:
                    lines.append(f"    result = await {self.func_name}({args_str})")
                else:
                    lines.append(f"    result = {self.func_name}({args_str})")
            
            # Add assertion
            assertion = self._generate_assertion(scenario)
            lines.append(f"    {assertion}")
        
        return "\n".join(lines)
    
    def _generate_import_statement(self) -> str:
        """Generate correct import statement from source file path."""
        if not self.source_file_path:
            # Fallback to TODO comment
            if self.class_name:
                return f"# TODO: Import {self.class_name}"
            else:
                return f"# TODO: Import {self.func_name}"
        
        # Use language-specific import generation
        from language_detector import generate_import_statement, get_module_name
        
        module_name = get_module_name(self.source_file_path)
        
        return generate_import_statement(
            module_name,
            self.func_name,
            self.language,
            self.class_name
        )
    
    def generate_test_file(self) -> str:
        """Generate complete test file content."""
        from language_detector import get_test_framework_import
        
        lines = []
        
        # Use language-specific generator if available
        if HAS_LANGUAGE_GENERATORS and self.language != "python":
            generator = get_test_generator(self.language)
            
            # Header comment (universal)
            if self.language in ["cpp", "java", "go"]:
                lines.append(f"// Unit tests for {self.qualified_name}")
                lines.append(f"// Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                lines.append("")
            else:
                lines.append('"""')
                lines.append(f"Unit tests for {self.qualified_name}")
                lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                lines.append('"""')
                lines.append("")
            
            # Language-specific imports
            from language_detector import get_module_name
            module_name = get_module_name(self.source_file_path) if self.source_file_path else "module"
            
            header = generator.generate_file_header(self.func_name, module_name)
            lines.append(header)
            lines.append("")
            
            # Generate test functions
            for scenario in self.scenarios:
                test_func = self._generate_test_function(scenario)
                lines.append(test_func)
                lines.append("")
            
            # Close brackets for languages that need it
            if self.language in ["javascript", "typescript"]:
                lines.append("});")
            elif self.language == "java":
                lines.append("}")
            
            return "\n".join(lines)
        
        # Default: Python test generation
        lines.append('"""')
        lines.append(f"Unit tests for {self.qualified_name}")
        lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"Language: {self.language}")
        lines.append('"""')
        lines.append("")
        
        # Imports - use language-specific test framework
        framework_import = get_test_framework_import(self.language)
        lines.append(framework_import)
        
        if self.is_async and self.language == "python":
            lines.append("import asyncio")
        
        lines.append("")
        
        # AUTO-GENERATED IMPORT
        import_statement = self._generate_import_statement()
        lines.append(import_statement)
        lines.append("")
        lines.append("")
        
        # Generate test functions
        for scenario in self.scenarios:
            test_func = self._generate_test_function(scenario)
            lines.append(test_func)
            lines.append("")
            lines.append("")
        
        # Add main block for async tests (Python only)
        if self.is_async and self.language == "python":
            lines.append('if __name__ == "__main__":')
            lines.append("    pytest.main([__file__])")
        
        return "\n".join(lines)


def generate_tests_for_functions(
    functions: List[Dict[str, Any]], 
    scenarios: Dict[str, List[Dict[str, str]]],
    source_file_path: Optional[str] = None,
    custom_values: Optional[Dict[str, Dict[str, Any]]] = None,
    language: Optional[str] = None
) -> Dict[str, str]:
    """
    Generate test files for multiple functions.
    
    Args:
        functions: List of function info dictionaries
        scenarios: Dictionary mapping qualified names to scenarios
        source_file_path: Path to the source file being tested
        custom_values: Dictionary mapping function names to custom test values
        language: Programming language (defaults to 'python')
    
    Returns:
        Dictionary mapping qualified function names to test file content
    """
    test_files = {}
    custom_values = custom_values or {}
    language = language or "python"
    
    for func_info in functions:
        qualified_name = func_info.get("qualified_name", func_info.get("func_name"))
        func_scenarios = scenarios.get(qualified_name, [])
        
        if not func_scenarios:
            continue
        
        # Get custom values for this specific function
        func_custom_values = custom_values.get(qualified_name, {})
        
        generator = TestCodeGenerator(
            func_info, 
            func_scenarios,
            source_file_path=source_file_path,
            custom_values=func_custom_values,
            language=language
        )
        test_content = generator.generate_test_file()
        
        test_files[qualified_name] = test_content
    
    return test_files


def save_test_file(qualified_name: str, test_content: str, output_dir: str = ".") -> str:
    """
    Save generated test content to a file.
    
    Args:
        qualified_name: Qualified function name
        test_content: Generated test file content
        output_dir: Directory to save the file
    
    Returns:
        Path to saved file
    """
    import os
    
    # Create test filename
    clean_name = qualified_name.replace(".", "_")
    filename = f"test_{clean_name}.py"
    filepath = os.path.join(output_dir, filename)
    
    # Write file
    with open(filepath, "w") as f:
        f.write(test_content)
    
    return filepath


if __name__ == "__main__":
    # Example usage with custom values
    sample_function = {
        "func_name": "add_numbers",
        "qualified_name": "add_numbers",
        "class_name": None,
        "is_async": False,
        "func_source": """def add_numbers(a: int, b: int) -> int:
    if a < 0 or b < 0:
        raise ValueError("Negative numbers not allowed")
    return a + b"""
    }
    
    sample_scenarios = [
        {
            "scenario_name": "test_normal_execution",
            "description": "Test add_numbers with valid inputs",
            "category": "happy_path",
            "test_type": "functional"
        },
        {
            "scenario_name": "test_negative_values",
            "description": "Test add_numbers raises error for negative values",
            "category": "exception",
            "test_type": "error_handling"
        }
    ]
    
    # With custom values
    custom_values = {
        "a": 5,
        "b": 3,
        "expected_result": 8
    }
    
    generator = TestCodeGenerator(
        sample_function, 
        sample_scenarios,
        source_file_path="calculator.py",
        custom_values=custom_values
    )
    test_code = generator.generate_test_file()
    
    print("Generated test code:")
    print("=" * 80)
    print(test_code)