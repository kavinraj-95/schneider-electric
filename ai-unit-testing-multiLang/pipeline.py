"""
Universal pipeline for AI-powered unit test generation.
Supports multiple programming languages.
"""

import os
import sys
import json
from typing import Optional, Dict, Any
from pathlib import Path

# Fix Windows console encoding
if sys.platform == 'win32':
    try:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'ignore')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'ignore')
    except:
        pass

from language_detector import (
    detect_language, 
    is_supported_language, 
    get_supported_languages,
    get_module_name,
    get_test_file_name
)
from universal_extractor import get_functions_from_any_file
from generate_scenarios import generate_scenarios_for_functions
from generate_unit_tests import generate_tests_for_functions, save_test_file
from coverage_analyzer import analyze_coverage, CoverageAnalyzer


def safe_print(text: str):
    """Print text safely, handling Windows encoding issues."""
    try:
        print(text)
    except UnicodeEncodeError:
        safe_text = text.encode('ascii', 'ignore').decode('ascii')
        print(safe_text)


class UniversalTestGenerationPipeline:
    """Universal pipeline for generating unit tests in any supported language."""
    
    def __init__(
        self, 
        source_file: str, 
        output_dir: str = "tests",
        custom_values: Optional[Dict[str, Dict[str, Any]]] = None,
        generate_coverage: bool = True
    ):
        """
        Initialize the pipeline.
        
        Args:
            source_file: Path to source file (any supported language)
            output_dir: Directory to save generated test files
            custom_values: Optional custom test values per function
            generate_coverage: Whether to generate coverage report
        """
        self.source_file = source_file
        self.output_dir = output_dir
        self.custom_values = custom_values or {}
        self.generate_coverage = generate_coverage
        self.language = None
        self.language_config = None
        self.functions = []
        self.scenarios = {}
        self.test_files = {}
        self.coverage_report = None
    
    def validate_source_file(self) -> bool:
        """Validate source file and detect language."""
        if not os.path.exists(self.source_file):
            safe_print(f"[ERROR] File not found: {self.source_file}")
            return False
        
        # Detect language
        self.language, self.language_config = detect_language(self.source_file)
        
        if not self.language:
            supported = ', '.join(get_supported_languages())
            safe_print(f"[ERROR] Unsupported file type: {self.source_file}")
            safe_print(f"[INFO] Supported languages: {supported}")
            return False
        
        safe_print(f"[DETECTED] Language: {self.language_config.name}")
        safe_print(f"[FRAMEWORK] Test framework: {self.language_config.test_framework}")
        
        return True
    
    def extract_functions(self) -> bool:
        """Extract functions from the source file."""
        try:
            safe_print(f"\n[EXTRACT] Extracting functions from {os.path.basename(self.source_file)}...")
            self.functions = get_functions_from_any_file(self.source_file)
            
            if not self.functions:
                safe_print("[WARNING] No functions found in source file")
                return False
            
            safe_print(f"[SUCCESS] Found {len(self.functions)} function(s):")
            for func in self.functions:
                qualified_name = func.get("qualified_name", func.get("func_name"))
                params = func.get("parameters", [])
                param_str = f"({', '.join(params)})" if params else "()"
                safe_print(f"   - {qualified_name}{param_str}")
            
            return True
        except Exception as e:
            safe_print(f"[ERROR] Error extracting functions: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def generate_scenarios(self) -> bool:
        """Generate test scenarios for extracted functions."""
        try:
            safe_print(f"\n[SCENARIOS] Generating test scenarios...")
            self.scenarios = generate_scenarios_for_functions(self.functions)
            
            total_scenarios = sum(len(s) for s in self.scenarios.values())
            safe_print(f"[SUCCESS] Generated {total_scenarios} scenario(s)")
            
            for func_name, scenarios in self.scenarios.items():
                safe_print(f"   - {func_name}: {len(scenarios)} scenarios")
            
            return True
        except Exception as e:
            safe_print(f"[ERROR] Error generating scenarios: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def generate_tests(self) -> bool:
        """Generate test code from scenarios."""
        try:
            safe_print(f"\n[GENERATE] Generating {self.language_config.name} test code...")
            
            # Pass source file path, language, and custom values
            self.test_files = generate_tests_for_functions(
                self.functions, 
                self.scenarios,
                source_file_path=self.source_file,
                custom_values=self.custom_values,
                language=self.language
            )
            
            safe_print(f"[SUCCESS] Generated {len(self.test_files)} test file(s)")
            
            return True
        except Exception as e:
            safe_print(f"[ERROR] Error generating tests: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def analyze_coverage(self) -> bool:
        """Analyze code coverage of generated tests."""
        if not self.generate_coverage:
            return True
        
        try:
            safe_print(f"\n[COVERAGE] Analyzing code coverage...")
            
            self.coverage_report = analyze_coverage(
                self.source_file,
                self.functions,
                self.scenarios,
                self.language
            )
            
            summary = self.coverage_report['summary']
            safe_print(f"[SUCCESS] Coverage analysis complete!")
            safe_print(f"   Average Coverage: {summary['average_coverage']}%")
            safe_print(f"   Branch Coverage: {summary['branch_coverage']}%")
            safe_print(f"   Total Elements: {summary['covered_elements']}/{summary['total_testable_elements']}")
            
            return True
        except Exception as e:
            safe_print(f"[WARNING] Coverage analysis failed: {e}")
            # Don't fail the entire pipeline
            return True
    
    def save_coverage_report(self) -> bool:
        """Save coverage report to HTML file."""
        if not self.coverage_report:
            return True
        
        try:
            coverage_html = os.path.join(self.output_dir, "coverage_report.html")
            
            analyzer = CoverageAnalyzer("", self.language)
            analyzer.export_coverage_html(self.coverage_report, coverage_html)
            
            safe_print(f"\n[COVERAGE] Coverage report saved: {coverage_html}")
            
            # Print recommendations
            if self.coverage_report.get('recommendations'):
                safe_print(f"\n[RECOMMENDATIONS]")
                for rec in self.coverage_report['recommendations'][:5]:  # Show top 5
                    safe_print(f"   {rec}")
            
            return True
        except Exception as e:
            safe_print(f"[WARNING] Could not save coverage report: {e}")
            return True
    
    def save_tests(self) -> bool:
        """Save generated tests to files."""
        try:
            os.makedirs(self.output_dir, exist_ok=True)
            
            safe_print(f"\n[SAVE] Saving test files to {self.output_dir}/...")
            
            saved_files = []
            for qualified_name, test_content in self.test_files.items():
                # Use language-specific naming convention
                test_filename = get_test_file_name(self.source_file, self.language)
                
                # If multiple functions, include function name
                if len(self.test_files) > 1:
                    base = Path(test_filename).stem
                    ext = Path(test_filename).suffix
                    clean_name = qualified_name.replace(".", "_")
                    test_filename = f"{base}_{clean_name}{ext}"
                
                filepath = os.path.join(self.output_dir, test_filename)
                
                with open(filepath, "w", encoding='utf-8') as f:
                    f.write(test_content)
                
                saved_files.append(filepath)
                safe_print(f"   [OK] {filepath}")
            
            safe_print(f"\n[SUCCESS] Successfully generated {len(saved_files)} test file(s)!")
            safe_print(f"[INFO] Run tests with: {self.language_config.test_framework}")
            
            return True
        except Exception as e:
            safe_print(f"[ERROR] Error saving tests: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def run(self) -> bool:
        """
        Run the complete pipeline.
        
        Returns:
            True if successful, False otherwise
        """
        safe_print("=" * 80)
        safe_print("Universal Test Generator Pipeline")
        safe_print("=" * 80)
        
        if not self.validate_source_file():
            return False
        
        if not self.extract_functions():
            return False
        
        if not self.generate_scenarios():
            return False
        
        if not self.generate_tests():
            return False
        
        if not self.save_tests():
            return False
        
        safe_print("\n" + "=" * 80)
        safe_print("Pipeline completed successfully!")
        safe_print("=" * 80)
        
        return True


def main():
    """CLI entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Generate unit tests for any supported programming language",
        epilog=f"Supported languages: {', '.join(get_supported_languages())}"
    )
    parser.add_argument(
        "source_file",
        help="Path to source file (Python, JavaScript, TypeScript, Java, C#, Go, Ruby, PHP, Rust, C++)"
    )
    parser.add_argument(
        "-o", "--output",
        default="tests",
        help="Output directory for test files (default: tests)"
    )
    parser.add_argument(
        "--custom-values",
        help="JSON string or file path with custom test values"
    )
    parser.add_argument(
        "--no-coverage",
        action="store_true",
        help="Skip coverage analysis"
    )
    parser.add_argument(
        "--list-languages",
        action="store_true",
        help="List all supported languages and exit"
    )
    
    args = parser.parse_args()
    
    # List languages if requested
    if args.list_languages:
        safe_print("Supported Languages:")
        safe_print("=" * 40)
        for lang in get_supported_languages():
            safe_print(f"  - {lang}")
        return
    
    # Validate file exists
    if not os.path.exists(args.source_file):
        safe_print(f"[ERROR] File not found: {args.source_file}")
        sys.exit(1)
    
    # Check if language is supported
    if not is_supported_language(args.source_file):
        supported = ', '.join(get_supported_languages())
        safe_print(f"[ERROR] Unsupported file type")
        safe_print(f"[INFO] Supported languages: {supported}")
        safe_print(f"[TIP] Use --list-languages to see details")
        sys.exit(1)
    
    # Parse custom values
    custom_values = None
    if args.custom_values:
        try:
            if os.path.isfile(args.custom_values):
                with open(args.custom_values, 'r') as f:
                    custom_values = json.load(f)
            else:
                custom_values = json.loads(args.custom_values)
            
            safe_print(f"[INFO] Loaded custom values for {len(custom_values)} function(s)")
        except json.JSONDecodeError as e:
            safe_print(f"[WARNING] Invalid JSON for custom values: {e}")
        except Exception as e:
            safe_print(f"[WARNING] Could not load custom values: {e}")
    
    # Run pipeline
    pipeline = UniversalTestGenerationPipeline(
        args.source_file, 
        args.output,
        custom_values=custom_values,
        generate_coverage=not args.no_coverage
    )
    success = pipeline.run()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()