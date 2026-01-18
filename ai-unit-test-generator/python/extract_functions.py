#!/usr/bin/env python3
"""
Enhanced AST-based function extraction with JSON I/O for VS Code extension.
"""

import ast
import json
import sys
from typing import List, Dict, Any, Optional


def get_functions(file_path: str) -> List[Dict[str, Any]]:
    """
    Extract all functions from a Python file with enhanced metadata.

    Returns:
        List of dicts with keys: funcName, qualifiedName, className, isAsync,
        funcSource, lineStart, lineEnd
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            source = f.read()
    except FileNotFoundError:
        return []
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        return []

    try:
        parse_tree = ast.parse(source)
    except SyntaxError as e:
        print(json.dumps({"error": f"Syntax error: {e}"}), file=sys.stderr)
        return []

    functions: List[Dict[str, Any]] = []

    def extract_from_node(
        node: ast.AST,
        class_name: Optional[str] = None
    ) -> None:
        if isinstance(node, ast.ClassDef):
            for child in node.body:
                extract_from_node(child, class_name=node.name)
        elif isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)):
            func_source = ast.get_source_segment(source, node)
            if func_source is None:
                return

            func_name = node.name
            qualified_name = f"{class_name}.{func_name}" if class_name else func_name
            is_async = isinstance(node, ast.AsyncFunctionDef)

            functions.append({
                "funcName": func_name,
                "qualifiedName": qualified_name,
                "className": class_name,
                "isAsync": is_async,
                "funcSource": func_source,
                "lineStart": node.lineno,
                "lineEnd": node.end_lineno or node.lineno,
                "filePath": file_path
            })

    for node in parse_tree.body:
        extract_from_node(node)

    return functions


def main():
    """Main entry point for JSON I/O mode."""
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        functions = get_functions(file_path)
        print(json.dumps(functions, indent=2))
        return

    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    file_paths = input_data.get("files", [])
    if not file_paths:
        print(json.dumps({"error": "No files provided"}))
        sys.exit(1)

    all_functions: List[Dict[str, Any]] = []
    for file_path in file_paths:
        functions = get_functions(file_path)
        all_functions.extend(functions)

    print(json.dumps(all_functions))


if __name__ == "__main__":
    main()
