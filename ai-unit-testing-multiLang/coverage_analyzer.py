"""
Code coverage analysis for generated tests.
Analyzes test scenarios against source code to estimate coverage.
"""

import ast
import re
from typing import Dict, List, Set, Optional, Tuple
from pathlib import Path


class CoverageAnalyzer:
    """Analyzes code coverage for generated test scenarios."""
    
    def __init__(self, source_code: str, language: str = "python"):
        self.source_code = source_code
        self.language = language
        self.total_lines = len([l for l in source_code.split('\n') if l.strip()])
    
    def analyze_function_coverage(
        self, 
        function_info: Dict, 
        scenarios: List[Dict]
    ) -> Dict[str, any]:
        """
        Analyze coverage for a single function.
        
        Args:
            function_info: Function metadata
            scenarios: Generated test scenarios
        
        Returns:
            Coverage analysis dictionary
        """
        func_source = function_info.get("func_source", "")
        func_name = function_info.get("func_name", "unknown")
        
        # Extract testable elements
        elements = self._extract_testable_elements(func_source)
        
        # Map scenarios to coverage
        covered_elements = self._map_scenarios_to_coverage(scenarios, elements)
        
        # Calculate metrics
        total_elements = len(elements['all'])
        covered_count = len(covered_elements)
        coverage_percent = (covered_count / total_elements * 100) if total_elements > 0 else 0
        
        return {
            "function": func_name,
            "total_testable_elements": total_elements,
            "covered_elements": covered_count,
            "coverage_percentage": round(coverage_percent, 2),
            "uncovered_elements": list(elements['all'] - covered_elements),
            "covered_branches": self._count_covered_branches(scenarios, elements),
            "total_branches": elements['branches'],
            "covered_paths": self._estimate_path_coverage(scenarios, elements),
            "details": {
                "has_error_handling": elements['exceptions'] > 0,
                "error_handling_tested": any(s.get('category') == 'exception' for s in scenarios),
                "has_loops": elements['loops'] > 0,
                "loops_tested": any('loop' in s.get('test_type', '') for s in scenarios),
                "has_conditionals": elements['branches'] > 0,
                "conditionals_tested": any('branch' in s.get('test_type', '') for s in scenarios)
            }
        }
    
    def _extract_testable_elements(self, func_source: str) -> Dict[str, any]:
        """Extract testable elements from function source."""
        elements = {
            'all': set(),
            'branches': 0,
            'loops': 0,
            'exceptions': 0,
            'returns': 0,
            'assertions': 0
        }
        
        if not func_source:
            return elements
        
        try:
            if self.language == "python":
                tree = ast.parse(func_source)
                
                for node in ast.walk(tree):
                    # Branches (if statements)
                    if isinstance(node, ast.If):
                        elements['branches'] += 1
                        elements['all'].add(f"if_statement_{elements['branches']}")
                    
                    # Loops
                    elif isinstance(node, (ast.For, ast.While)):
                        elements['loops'] += 1
                        elements['all'].add(f"loop_{elements['loops']}")
                    
                    # Exception handling
                    elif isinstance(node, ast.Raise):
                        elements['exceptions'] += 1
                        elements['all'].add(f"exception_{elements['exceptions']}")
                    
                    elif isinstance(node, ast.Try):
                        elements['all'].add(f"try_block_{len(elements['all'])}")
                    
                    # Return statements
                    elif isinstance(node, ast.Return):
                        elements['returns'] += 1
                        elements['all'].add(f"return_{elements['returns']}")
            else:
                # Regex-based for other languages
                if_count = len(re.findall(r'\bif\s*\(', func_source))
                for_count = len(re.findall(r'\b(for|while)\s*\(', func_source))
                throw_count = len(re.findall(r'\b(throw|raise)\b', func_source))
                return_count = len(re.findall(r'\breturn\b', func_source))
                
                elements['branches'] = if_count
                elements['loops'] = for_count
                elements['exceptions'] = throw_count
                elements['returns'] = return_count
                
                for i in range(if_count):
                    elements['all'].add(f"if_statement_{i+1}")
                for i in range(for_count):
                    elements['all'].add(f"loop_{i+1}")
                for i in range(throw_count):
                    elements['all'].add(f"exception_{i+1}")
                for i in range(return_count):
                    elements['all'].add(f"return_{i+1}")
        
        except Exception as e:
            # Fallback to basic counting
            pass
        
        return elements
    
    def _map_scenarios_to_coverage(
        self, 
        scenarios: List[Dict], 
        elements: Dict
    ) -> Set[str]:
        """Map test scenarios to code elements they cover."""
        covered = set()
        
        for scenario in scenarios:
            category = scenario.get('category', '')
            test_type = scenario.get('test_type', '')
            scenario_name = scenario.get('scenario_name', '')
            
            # Exception scenarios cover exception elements
            if category == 'exception' or 'exception' in test_type:
                for elem in elements['all']:
                    if 'exception' in elem:
                        covered.add(elem)
            
            # Branch scenarios cover conditionals
            if 'branch' in test_type or 'conditional' in test_type:
                for elem in elements['all']:
                    if 'if_statement' in elem:
                        covered.add(elem)
            
            # Loop scenarios cover loops
            if 'loop' in test_type or 'iteration' in test_type:
                for elem in elements['all']:
                    if 'loop' in elem:
                        covered.add(elem)
            
            # Happy path and edge cases cover returns
            if category in ['happy_path', 'edge_case', 'validation']:
                for elem in elements['all']:
                    if 'return' in elem:
                        covered.add(elem)
            
            # All scenarios cover at least basic execution
            if 'normal' in scenario_name or 'happy' in category:
                covered.add('basic_execution')
        
        return covered
    
    def _count_covered_branches(self, scenarios: List[Dict], elements: Dict) -> int:
        """Count how many branches are covered by scenarios."""
        branch_scenarios = [
            s for s in scenarios 
            if 'branch' in s.get('test_type', '') or 
               'conditional' in s.get('description', '').lower() or
               s.get('category') == 'logic'
        ]
        
        # Estimate: each branch scenario covers one branch
        # Plus exception scenarios cover error branches
        exception_scenarios = [s for s in scenarios if s.get('category') == 'exception']
        
        covered_branches = len(branch_scenarios) + len(exception_scenarios)
        
        return min(covered_branches, elements['branches'])
    
    def _estimate_path_coverage(self, scenarios: List[Dict], elements: Dict) -> int:
        """Estimate number of execution paths covered."""
        # Simple heuristic: count distinct scenario categories
        categories = set(s.get('category', 'other') for s in scenarios)
        
        # Each category represents roughly one path
        return len(categories)
    
    def generate_coverage_report(
        self, 
        functions: List[Dict], 
        all_scenarios: Dict[str, List[Dict]]
    ) -> Dict[str, any]:
        """
        Generate overall coverage report.
        
        Args:
            functions: List of all functions
            all_scenarios: Dictionary of scenarios per function
        
        Returns:
            Complete coverage report
        """
        function_coverage = []
        total_coverage = 0
        
        for func_info in functions:
            qualified_name = func_info.get("qualified_name", func_info.get("func_name"))
            scenarios = all_scenarios.get(qualified_name, [])
            
            coverage = self.analyze_function_coverage(func_info, scenarios)
            function_coverage.append(coverage)
            total_coverage += coverage['coverage_percentage']
        
        avg_coverage = (total_coverage / len(functions)) if functions else 0
        
        # Calculate overall metrics
        total_elements = sum(f['total_testable_elements'] for f in function_coverage)
        covered_elements = sum(f['covered_elements'] for f in function_coverage)
        total_branches = sum(f['total_branches'] for f in function_coverage)
        covered_branches = sum(f['covered_branches'] for f in function_coverage)
        
        return {
            "summary": {
                "average_coverage": round(avg_coverage, 2),
                "total_functions": len(functions),
                "total_testable_elements": total_elements,
                "covered_elements": covered_elements,
                "total_branches": total_branches,
                "covered_branches": covered_branches,
                "branch_coverage": round((covered_branches / total_branches * 100) if total_branches > 0 else 0, 2)
            },
            "functions": function_coverage,
            "recommendations": self._generate_recommendations(function_coverage)
        }
    
    def _generate_recommendations(self, function_coverage: List[Dict]) -> List[str]:
        """Generate recommendations to improve coverage."""
        recommendations = []
        
        for func in function_coverage:
            if func['coverage_percentage'] < 70:
                recommendations.append(
                    f"{func['function']}: Low coverage ({func['coverage_percentage']}%). "
                    f"Add tests for: {', '.join(func['uncovered_elements'][:3])}"
                )
            
            if not func['details']['error_handling_tested'] and func['details']['has_error_handling']:
                recommendations.append(
                    f"{func['function']}: Error handling not tested. Add exception test cases."
                )
            
            if not func['details']['loops_tested'] and func['details']['has_loops']:
                recommendations.append(
                    f"{func['function']}: Loop behavior not tested. Add iteration test cases."
                )
            
            if func['total_branches'] > func['covered_branches']:
                uncovered = func['total_branches'] - func['covered_branches']
                recommendations.append(
                    f"🔀 {func['function']}: {uncovered} branch(es) not covered. Add conditional test cases."
                )
        
        if not recommendations:
            recommendations.append("All major code paths are tested.")
        
        return recommendations
    
    def export_coverage_html(self, report: Dict, output_path: str):
        """Export coverage report as HTML."""
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Test Coverage Report</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        h1 {{ color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }}
        h2 {{ color: #666; margin-top: 30px; }}
        .summary {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }}
        .metric {{ background: #f9f9f9; padding: 20px; border-radius: 4px; text-align: center; border-left: 4px solid #4CAF50; }}
        .metric-value {{ font-size: 36px; font-weight: bold; color: #4CAF50; }}
        .metric-label {{ color: #666; margin-top: 5px; }}
        .function {{ background: #fafafa; padding: 15px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #2196F3; }}
        .function-name {{ font-weight: bold; font-size: 18px; color: #333; }}
        .coverage-bar {{ background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden; margin: 10px 0; }}
        .coverage-fill {{ background: linear-gradient(90deg, #4CAF50, #8BC34A); height: 100%; transition: width 0.3s; }}
        .low {{ background: linear-gradient(90deg, #f44336, #ff9800) !important; }}
        .medium {{ background: linear-gradient(90deg, #ff9800, #ffc107) !important; }}
        .recommendations {{ background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 15px; margin: 20px 0; }}
        .recommendation {{ margin: 10px 0; padding: 8px; background: white; border-radius: 4px; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
        th {{ background: #4CAF50; color: white; }}
        tr:hover {{ background: #f5f5f5; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Test Coverage Report</h1>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value">{report['summary']['average_coverage']}%</div>
                <div class="metric-label">Average Coverage</div>
            </div>
            <div class="metric">
                <div class="metric-value">{report['summary']['total_functions']}</div>
                <div class="metric-label">Functions Tested</div>
            </div>
            <div class="metric">
                <div class="metric-value">{report['summary']['covered_elements']}/{report['summary']['total_testable_elements']}</div>
                <div class="metric-label">Elements Covered</div>
            </div>
            <div class="metric">
                <div class="metric-value">{report['summary']['branch_coverage']}%</div>
                <div class="metric-label">Branch Coverage</div>
            </div>
        </div>
        
        <h2>Function Coverage Details</h2>
        <table>
            <thead>
                <tr>
                    <th>Function</th>
                    <th>Coverage</th>
                    <th>Elements</th>
                    <th>Branches</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
"""
        
        for func in report['functions']:
            coverage_class = 'low' if func['coverage_percentage'] < 70 else 'medium' if func['coverage_percentage'] < 90 else ''
            status = 'Good' if func['coverage_percentage'] >= 80 else 'Needs Work'
            
            html += f"""
                <tr>
                    <td><strong>{func['function']}</strong></td>
                    <td>
                        <div class="coverage-bar">
                            <div class="coverage-fill {coverage_class}" style="width: {func['coverage_percentage']}%"></div>
                        </div>
                        {func['coverage_percentage']}%
                    </td>
                    <td>{func['covered_elements']}/{func['total_testable_elements']}</td>
                    <td>{func['covered_branches']}/{func['total_branches']}</td>
                    <td>{status}</td>
                </tr>
"""
        
        html += """
            </tbody>
        </table>
        
        <h2>Recommendations</h2>
        <div class="recommendations">
"""
        
        for rec in report['recommendations']:
            html += f'<div class="recommendation">{rec}</div>\n'
        
        html += """
        </div>
    </div>
</body>
</html>
"""
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)


def analyze_coverage(
    source_file: str,
    functions: List[Dict],
    scenarios: Dict[str, List[Dict]],
    language: str = "python"
) -> Dict[str, any]:
    """
    Analyze code coverage for generated tests.
    
    Args:
        source_file: Path to source file
        functions: List of extracted functions
        scenarios: Generated scenarios per function
        language: Programming language
    
    Returns:
        Coverage report dictionary
    """
    with open(source_file, 'r', encoding='utf-8') as f:
        source_code = f.read()
    
    analyzer = CoverageAnalyzer(source_code, language)
    report = analyzer.generate_coverage_report(functions, scenarios)
    
    return report


if __name__ == "__main__":
    # Example usage
    sample_functions = [
        {
            "func_name": "add_numbers",
            "qualified_name": "add_numbers",
            "func_source": """def add_numbers(a: int, b: int) -> int:
    if a < 0 or b < 0:
        raise ValueError("Negative numbers not allowed")
    return a + b"""
        }
    ]
    
    sample_scenarios = {
        "add_numbers": [
            {"category": "happy_path", "test_type": "functional"},
            {"category": "exception", "test_type": "error_handling"},
            {"category": "edge_case", "test_type": "boundary"}
        ]
    }
    
    analyzer = CoverageAnalyzer("def add_numbers(a, b):\n    if a < 0:\n        raise ValueError()\n    return a + b", "python")
    report = analyzer.generate_coverage_report(sample_functions, sample_scenarios)
    
    print("Coverage Report:")
    print(f"Average Coverage: {report['summary']['average_coverage']}%")
    print(f"Branch Coverage: {report['summary']['branch_coverage']}%")
    print("\nRecommendations:")
    for rec in report['recommendations']:
        print(f"  {rec}")