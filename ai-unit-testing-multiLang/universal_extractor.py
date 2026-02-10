"""
Universal function extractor supporting multiple programming languages.
Falls back to regex-based extraction when AST parsing is unavailable.
"""

import re
import ast
from typing import List, Dict, Optional
from language_detector import detect_language


class UniversalFunctionExtractor:
    """Extract functions from source code in any supported language."""
    
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.language, self.config = detect_language(file_path)
        
        with open(file_path, 'r', encoding='utf-8') as f:
            self.source = f.read()
    
    def extract(self) -> List[Dict[str, str]]:
        """
        Extract functions based on detected language.
        
        Returns:
            List of function information dictionaries
        """
        if not self.language:
            raise ValueError(f"Unsupported file type: {self.file_path}")
        
        # Use language-specific extractor
        if self.language == "python":
            return self._extract_python()
        elif self.language in ["javascript", "typescript"]:
            return self._extract_javascript()
        elif self.language == "java":
            return self._extract_java()
        elif self.language == "csharp":
            return self._extract_csharp()
        elif self.language == "go":
            return self._extract_go()
        elif self.language == "ruby":
            return self._extract_ruby()
        elif self.language == "php":
            return self._extract_php()
        elif self.language == "rust":
            return self._extract_rust()
        elif self.language == "cpp":
            return self._extract_cpp()
        else:
            return self._extract_generic()
    
    def _extract_python(self) -> List[Dict[str, str]]:
        """Extract Python functions using AST."""
        from extract_functions import get_functions_from_file
        return get_functions_from_file(self.file_path)
    
    def _extract_javascript(self) -> List[Dict[str, str]]:
        """Extract JavaScript/TypeScript functions using regex."""
        functions = []
        
        # Pattern for function declarations
        patterns = [
            r'function\s+(\w+)\s*\(([^)]*)\)',  # function name()
            r'const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>',  # const name = () =>
            r'(\w+)\s*:\s*\(([^)]*)\)\s*=>',  # name: () =>
            r'async\s+function\s+(\w+)\s*\(([^)]*)\)',  # async function
        ]
        
        for pattern in patterns:
            for match in re.finditer(pattern, self.source):
                func_name = match.group(1)
                params = match.group(2)
                
                functions.append({
                    "func_name": func_name,
                    "qualified_name": func_name,
                    "class_name": None,
                    "is_async": "async" in self.source[max(0, match.start()-10):match.start()],
                    "func_source": self._extract_function_body(match.start()),
                    "parameters": [p.strip() for p in params.split(',') if p.strip()]
                })
        
        return functions
    
    def _extract_java(self) -> List[Dict[str, str]]:
        """Extract Java methods using regex."""
        functions = []
        
        # Pattern for Java methods
        pattern = r'(public|private|protected)?\s*(static)?\s*(\w+)\s+(\w+)\s*\(([^)]*)\)'
        
        for match in re.finditer(pattern, self.source):
            return_type = match.group(3)
            func_name = match.group(4)
            params = match.group(5)
            
            # Skip constructors and getters/setters if needed
            if func_name[0].isupper() and return_type == func_name:
                continue  # Constructor
            
            functions.append({
                "func_name": func_name,
                "qualified_name": func_name,
                "class_name": None,
                "is_async": False,
                "func_source": self._extract_function_body(match.start()),
                "parameters": [p.strip() for p in params.split(',') if p.strip()],
                "return_type": return_type
            })
        
        return functions
    
    def _extract_csharp(self) -> List[Dict[str, str]]:
        """Extract C# methods using regex."""
        functions = []
        
        # Pattern for C# methods
        pattern = r'(public|private|protected|internal)?\s*(static)?\s*(async)?\s*(\w+)\s+(\w+)\s*\(([^)]*)\)'
        
        for match in re.finditer(pattern, self.source):
            is_async = match.group(3) == "async"
            return_type = match.group(4)
            func_name = match.group(5)
            params = match.group(6)
            
            functions.append({
                "func_name": func_name,
                "qualified_name": func_name,
                "class_name": None,
                "is_async": is_async,
                "func_source": self._extract_function_body(match.start()),
                "parameters": [p.strip() for p in params.split(',') if p.strip()],
                "return_type": return_type
            })
        
        return functions
    
    def _extract_go(self) -> List[Dict[str, str]]:
        """Extract Go functions using regex."""
        functions = []
        
        # Pattern for Go functions
        pattern = r'func\s+(\w+)\s*\(([^)]*)\)\s*(\([^)]*\)|\w+)?'
        
        for match in re.finditer(pattern, self.source):
            func_name = match.group(1)
            params = match.group(2)
            return_type = match.group(3) if match.group(3) else ""
            
            functions.append({
                "func_name": func_name,
                "qualified_name": func_name,
                "class_name": None,
                "is_async": False,
                "func_source": self._extract_function_body(match.start()),
                "parameters": [p.strip() for p in params.split(',') if p.strip()],
                "return_type": return_type.strip()
            })
        
        return functions
    
    def _extract_ruby(self) -> List[Dict[str, str]]:
        """Extract Ruby methods using regex."""
        functions = []
        
        # Pattern for Ruby methods
        pattern = r'def\s+(\w+)(\([^)]*\))?'
        
        for match in re.finditer(pattern, self.source):
            func_name = match.group(1)
            params = match.group(2) if match.group(2) else "()"
            params = params.strip("()")
            
            functions.append({
                "func_name": func_name,
                "qualified_name": func_name,
                "class_name": None,
                "is_async": False,
                "func_source": self._extract_function_body(match.start()),
                "parameters": [p.strip() for p in params.split(',') if p.strip()]
            })
        
        return functions
    
    def _extract_php(self) -> List[Dict[str, str]]:
        """Extract PHP functions using regex."""
        functions = []
        
        # Pattern for PHP functions
        pattern = r'function\s+(\w+)\s*\(([^)]*)\)'
        
        for match in re.finditer(pattern, self.source):
            func_name = match.group(1)
            params = match.group(2)
            
            functions.append({
                "func_name": func_name,
                "qualified_name": func_name,
                "class_name": None,
                "is_async": False,
                "func_source": self._extract_function_body(match.start()),
                "parameters": [p.strip() for p in params.split(',') if p.strip()]
            })
        
        return functions
    
    def _extract_rust(self) -> List[Dict[str, str]]:
        """Extract Rust functions using regex."""
        functions = []
        
        # Pattern for Rust functions
        pattern = r'(pub\s+)?(async\s+)?fn\s+(\w+)\s*\(([^)]*)\)(\s*->\s*(\w+))?'
        
        for match in re.finditer(pattern, self.source):
            is_async = match.group(2) is not None
            func_name = match.group(3)
            params = match.group(4)
            return_type = match.group(6) if match.group(6) else ""
            
            functions.append({
                "func_name": func_name,
                "qualified_name": func_name,
                "class_name": None,
                "is_async": is_async,
                "func_source": self._extract_function_body(match.start()),
                "parameters": [p.strip() for p in params.split(',') if p.strip()],
                "return_type": return_type
            })
        
        return functions
    
    def _extract_cpp(self) -> List[Dict[str, str]]:
        """Extract C++ functions using regex."""
        functions = []
        
        # Pattern for C++ functions
        pattern = r'(\w+)\s+(\w+)\s*\(([^)]*)\)'
        
        for match in re.finditer(pattern, self.source):
            return_type = match.group(1)
            func_name = match.group(2)
            params = match.group(3)
            
            # Skip common C++ keywords
            if return_type in ['if', 'while', 'for', 'switch', 'class', 'struct']:
                continue
            
            functions.append({
                "func_name": func_name,
                "qualified_name": func_name,
                "class_name": None,
                "is_async": False,
                "func_source": self._extract_function_body(match.start()),
                "parameters": [p.strip() for p in params.split(',') if p.strip()],
                "return_type": return_type
            })
        
        return functions
    
    def _extract_generic(self) -> List[Dict[str, str]]:
        """Generic extraction fallback."""
        functions = []
        
        # Very basic pattern matching
        pattern = r'(function|def|func|fn|sub|proc)\s+(\w+)'
        
        for match in re.finditer(pattern, self.source):
            func_name = match.group(2)
            
            functions.append({
                "func_name": func_name,
                "qualified_name": func_name,
                "class_name": None,
                "is_async": False,
                "func_source": "// Source extraction not available",
                "parameters": []
            })
        
        return functions
    
    def _extract_function_body(self, start_pos: int, max_lines: int = 20) -> str:
        """
        Extract function body starting from position.
        Simplified version - extracts next N lines.
        """
        lines = self.source[start_pos:].split('\n')
        return '\n'.join(lines[:max_lines])


def get_functions_from_any_file(file_path: str) -> List[Dict[str, str]]:
    """
    Universal function to extract functions from any supported language.
    
    Args:
        file_path: Path to source file
    
    Returns:
        List of function information dictionaries
    """
    extractor = UniversalFunctionExtractor(file_path)
    return extractor.extract()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python universal_extractor.py <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    try:
        functions = get_functions_from_any_file(file_path)
        
        print(f"\nExtracted {len(functions)} function(s) from {file_path}:")
        print("=" * 60)
        
        for func in functions:
            print(f"\nFunction: {func['func_name']}")
            print(f"  Qualified: {func['qualified_name']}")
            if func.get('parameters'):
                print(f"  Parameters: {', '.join(func['parameters'])}")
            if func.get('return_type'):
                print(f"  Returns: {func['return_type']}")
            if func.get('is_async'):
                print(f"  Async: Yes")
    
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)