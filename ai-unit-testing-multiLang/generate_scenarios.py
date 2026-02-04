"""
Scenario generator for unit tests.
Uses rule-based logic to generate test scenarios without LLM dependencies.
"""

import ast
from typing import List, Dict, Any, Optional


class ScenarioGenerator:
    """Generates test scenarios based on function analysis."""
    
    def __init__(self, function_info: Dict[str, Any]):
        self.func_name = function_info.get("func_name", "unknown")
        self.qualified_name = function_info.get("qualified_name", self.func_name)
        self.class_name = function_info.get("class_name")
        self.is_async = function_info.get("is_async", False)
        self.func_source = function_info.get("func_source", "")
        
        self.params = self._extract_parameters()
        self.return_type = self._infer_return_type()
        self.has_conditionals = self._has_conditionals()
        self.has_loops = self._has_loops()
        self.raises_exceptions = self._check_exceptions()
    
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
        """Infer return type from function signature or code."""
        try:
            tree = ast.parse(self.func_source)
            func_node = tree.body[0]
            
            if func_node.returns:
                return ast.unparse(func_node.returns)
            
            # Check for return statements
            for node in ast.walk(func_node):
                if isinstance(node, ast.Return) and node.value:
                    if isinstance(node.value, ast.Constant):
                        return type(node.value.value).__name__
                    elif isinstance(node.value, ast.List):
                        return "list"
                    elif isinstance(node.value, ast.Dict):
                        return "dict"
                    elif isinstance(node.value, ast.Tuple):
                        return "tuple"
            
            return None
        except:
            return None
    
    def _has_conditionals(self) -> bool:
        """Check if function contains conditional statements."""
        try:
            tree = ast.parse(self.func_source)
            for node in ast.walk(tree):
                if isinstance(node, ast.If):
                    return True
            return False
        except:
            return False
    
    def _has_loops(self) -> bool:
        """Check if function contains loops."""
        try:
            tree = ast.parse(self.func_source)
            for node in ast.walk(tree):
                if isinstance(node, (ast.For, ast.While)):
                    return True
            return False
        except:
            return False
    
    def _check_exceptions(self) -> List[str]:
        """Check for raised exceptions in the function."""
        exceptions = []
        try:
            tree = ast.parse(self.func_source)
            for node in ast.walk(tree):
                if isinstance(node, ast.Raise) and node.exc:
                    if isinstance(node.exc, ast.Call):
                        exc_name = ast.unparse(node.exc.func)
                        exceptions.append(exc_name)
                    elif isinstance(node.exc, ast.Name):
                        exceptions.append(node.exc.id)
        except:
            pass
        
        return exceptions
    
    def generate(self) -> List[Dict[str, str]]:
        """Generate test scenarios for the function."""
        scenarios = []
        
        # Scenario 1: Happy path / Normal case
        scenarios.append({
            "scenario_name": "test_normal_execution",
            "description": f"Test {self.func_name} with valid inputs",
            "category": "happy_path",
            "test_type": "functional"
        })
        
        # Scenario 2: Edge cases based on parameters
        if self.params:
            for param in self.params:
                param_type = param.get("annotation", "").lower()
                
                if "int" in param_type or "float" in param_type:
                    scenarios.append({
                        "scenario_name": f"test_{param['name']}_zero",
                        "description": f"Test {self.func_name} with {param['name']} = 0",
                        "category": "edge_case",
                        "test_type": "boundary"
                    })
                    scenarios.append({
                        "scenario_name": f"test_{param['name']}_negative",
                        "description": f"Test {self.func_name} with negative {param['name']}",
                        "category": "edge_case",
                        "test_type": "boundary"
                    })
                
                elif "str" in param_type:
                    scenarios.append({
                        "scenario_name": f"test_{param['name']}_empty_string",
                        "description": f"Test {self.func_name} with empty {param['name']}",
                        "category": "edge_case",
                        "test_type": "boundary"
                    })
                
                elif "list" in param_type or "tuple" in param_type:
                    scenarios.append({
                        "scenario_name": f"test_{param['name']}_empty",
                        "description": f"Test {self.func_name} with empty {param['name']}",
                        "category": "edge_case",
                        "test_type": "boundary"
                    })
                
                # None/null checks
                scenarios.append({
                    "scenario_name": f"test_{param['name']}_none",
                    "description": f"Test {self.func_name} with None {param['name']}",
                    "category": "edge_case",
                    "test_type": "null_check"
                })
        
        # Scenario 3: Exception scenarios
        if self.raises_exceptions:
            for exc in self.raises_exceptions:
                scenarios.append({
                    "scenario_name": f"test_raises_{exc.lower().replace('error', '')}",
                    "description": f"Test {self.func_name} raises {exc}",
                    "category": "exception",
                    "test_type": "error_handling"
                })
        else:
            # Generic invalid input test
            scenarios.append({
                "scenario_name": "test_invalid_input",
                "description": f"Test {self.func_name} with invalid input types",
                "category": "exception",
                "test_type": "error_handling"
            })
        
        # Scenario 4: Return value validation
        if self.return_type:
            scenarios.append({
                "scenario_name": "test_return_type",
                "description": f"Test {self.func_name} returns correct type ({self.return_type})",
                "category": "validation",
                "test_type": "return_type"
            })
        
        # Scenario 5: Conditional branches
        if self.has_conditionals:
            scenarios.append({
                "scenario_name": "test_conditional_branches",
                "description": f"Test {self.func_name} conditional logic paths",
                "category": "logic",
                "test_type": "branch_coverage"
            })
        
        # Scenario 6: Loop behavior
        if self.has_loops:
            scenarios.append({
                "scenario_name": "test_loop_behavior",
                "description": f"Test {self.func_name} loop execution",
                "category": "logic",
                "test_type": "iteration"
            })
        
        return scenarios


def generate_scenarios_for_functions(functions: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, str]]]:
    """
    Generate test scenarios for a list of functions.
    
    Args:
        functions: List of function info dictionaries from extract_functions.py
    
    Returns:
        Dictionary mapping qualified function names to their scenarios
    """
    all_scenarios = {}
    
    for func_info in functions:
        qualified_name = func_info.get("qualified_name", func_info.get("func_name"))
        generator = ScenarioGenerator(func_info)
        scenarios = generator.generate()
        
        all_scenarios[qualified_name] = scenarios
    
    return all_scenarios


if __name__ == "__main__":
    # Example usage
    sample_function = {
        "func_name": "calculate_sum",
        "qualified_name": "calculate_sum",
        "class_name": None,
        "is_async": False,
        "func_source": """def calculate_sum(a: int, b: int) -> int:
    if a < 0 or b < 0:
        raise ValueError("Negative numbers not allowed")
    return a + b"""
    }
    
    generator = ScenarioGenerator(sample_function)
    scenarios = generator.generate()
    
    print(f"Generated {len(scenarios)} scenarios:")
    for scenario in scenarios:
        print(f"  - {scenario['scenario_name']}: {scenario['description']}")