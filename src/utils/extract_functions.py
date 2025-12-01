import ast, inspect, argparse
from typing import List, Dict

def get_functions(file_path: str) -> List[Dict[str, str]]:
    with open(file_path, "r") as f:
        source = f.read()

    parse_tree = ast.parse(source)

    functions = []

    for node in parse_tree.body:
        if isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)):
            func_src = ast.get_source_segment(source, node)
            functions.append({"func_name": node.name, "func_source": func_src})
        
    return functions


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("file_path", type = str)
    args = parser.parse_args()

    for func in get_functions(args.file_path):
        print(f"Function: {func['func_name']}\n{func['func_source']}\n")
