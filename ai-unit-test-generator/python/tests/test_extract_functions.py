"""Tests for extract_functions.py"""
import json
import sys
import tempfile
from pathlib import Path

# Add parent directory to path to import the module
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from unittest.mock import patch, mock_open
from extract_functions import get_functions


def test_extract_functions_basic():
    """Test basic function extraction"""
    sample_code = """def hello_world():
    print("Hello, World!")

def add(a, b):
    return a + b
"""

    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(sample_code)
        temp_file = f.name

    try:
        functions = get_functions(temp_file)
        assert len(functions) == 2
        assert functions[0]['funcName'] == 'hello_world'
        assert functions[1]['funcName'] == 'add'
        assert all('funcSource' in func for func in functions)
        assert all('lineStart' in func for func in functions)
        assert all('lineEnd' in func for func in functions)
    finally:
        Path(temp_file).unlink()


def test_extract_functions_with_class():
    """Test function extraction with classes"""
    sample_code = """class MyClass:
    def method1(self):
        pass

    def method2(self):
        pass

def standalone_function():
    pass
"""

    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(sample_code)
        temp_file = f.name

    try:
        functions = get_functions(temp_file)
        assert len(functions) == 3
        assert functions[0]['qualifiedName'] == 'MyClass.method1'
        assert functions[1]['qualifiedName'] == 'MyClass.method2'
        assert functions[2]['qualifiedName'] == 'standalone_function'
        assert functions[0]['className'] == 'MyClass'
        assert functions[2]['className'] is None
    finally:
        Path(temp_file).unlink()


def test_extract_functions_with_decorators():
    """Test function extraction with decorators"""
    sample_code = """@decorator
def decorated_function():
    pass

def normal_function():
    pass
"""

    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(sample_code)
        temp_file = f.name

    try:
        functions = get_functions(temp_file)
        assert len(functions) == 2
        assert functions[0]['funcName'] == 'decorated_function'
        assert functions[1]['funcName'] == 'normal_function'
    finally:
        Path(temp_file).unlink()


def test_extract_async_functions():
    """Test extraction of async functions"""
    sample_code = """async def async_function():
    await something()

def sync_function():
    pass
"""

    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(sample_code)
        temp_file = f.name

    try:
        functions = get_functions(temp_file)
        assert len(functions) == 2
        assert functions[0]['isAsync'] is True
        assert functions[1]['isAsync'] is False
    finally:
        Path(temp_file).unlink()


def test_extract_functions_with_docstrings():
    """Test function extraction preserves docstrings"""
    sample_code = '''def documented_function():
    """This is a docstring"""
    pass
'''

    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(sample_code)
        temp_file = f.name

    try:
        functions = get_functions(temp_file)
        assert len(functions) == 1
        assert 'documented_function' in functions[0]['funcSource']
    finally:
        Path(temp_file).unlink()


def test_extract_functions_empty_file():
    """Test extraction from empty file"""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write("")
        temp_file = f.name

    try:
        functions = get_functions(temp_file)
        assert len(functions) == 0
    finally:
        Path(temp_file).unlink()


def test_extract_functions_file_not_found():
    """Test extraction from non-existent file"""
    functions = get_functions('/non/existent/file.py')
    assert len(functions) == 0


def test_extract_functions_syntax_error():
    """Test extraction from file with syntax error"""
    sample_code = """def broken_function():
    this is not valid python!
"""

    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(sample_code)
        temp_file = f.name

    try:
        functions = get_functions(temp_file)
        assert len(functions) == 0
    finally:
        Path(temp_file).unlink()


def test_extract_functions_with_args():
    """Test function extraction with various argument types"""
    sample_code = """def func_with_args(a, b, c=10, *args, **kwargs):
    return a + b + c
"""

    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(sample_code)
        temp_file = f.name

    try:
        functions = get_functions(temp_file)
        assert len(functions) == 1
        assert functions[0]['funcName'] == 'func_with_args'
    finally:
        Path(temp_file).unlink()


@pytest.mark.parametrize("code,expected_count", [
    ("def f1(): pass\ndef f2(): pass", 2),
    ("def f1(): pass", 1),
    ("", 0),
    ("x = 5\ny = 10", 0),
])
def test_extract_functions_parametrized(code, expected_count):
    """Parametrized test for function extraction"""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(code)
        temp_file = f.name

    try:
        functions = get_functions(temp_file)
        assert len(functions) == expected_count
    finally:
        Path(temp_file).unlink()
