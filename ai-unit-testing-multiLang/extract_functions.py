import ast
from typing import List, Dict, Optional

class FunctionExtractor(ast.NodeVisitor):
    def __init__(self, source: str):
        self.source = source
        self.functions: List[Dict[str, str]] = []
        self.class_stack: List[str] = []

    def visit_ClassDef(self, node: ast.ClassDef):
        self.class_stack.append(node.name)
        self.generic_visit(node)
        self.class_stack.pop()

    def visit_FunctionDef(self, node: ast.FunctionDef):
        self._add_function(node)
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
        self._add_function(node)
        self.generic_visit(node)

    def _add_function(self, node):
        class_name: Optional[str] = self.class_stack[-1] if self.class_stack else None
        qualified_name = f"{class_name}.{node.name}" if class_name else node.name

        self.functions.append({
            "func_name": node.name,
            "qualified_name": qualified_name,
            "class_name": class_name,
            "is_async": isinstance(node, ast.AsyncFunctionDef),
            "func_source": ast.get_source_segment(self.source, node),
        })

def get_functions_from_file(file_path: str) -> List[Dict[str, str]]:
    with open(file_path, "r") as f:
        source = f.read()

    tree = ast.parse(source)
    extractor = FunctionExtractor(source)
    extractor.visit(tree)
    return extractor.functions
