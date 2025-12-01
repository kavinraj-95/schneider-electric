
import sys
import os


project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.utils import generate_unit_tests

if __name__ == "__main__":
    scenarios = '- Test Scenario for a_simple_fn Function:\n\n  Given the function a_simple_fn that returns "Hello World"\n  \n  Expected Output: \n    The return value of the function a_simple_fn\n  \n  Input:\n    A valid input to test the function\n    \n  Precondition: The function is defined and ready to use.\n    \n- Test Scenario for fn_of_fn Function:\n\n  Given the function fn_of_fn that calls a_simple_fn\n  Expected Output: \n    "Hello World" printed by the function fn_of_fn\n  \n  Input:\n    A valid input to test the function\n    \n  Precondition: The functions are defined and ready to use.\n    \n- Test Scenario for nested_fn Function:\n\n  Given the nested function definition in nested_fn\n  Expected Output: \n    The innermost return value of None or a reference to fn2\n  \n  Input:\n    A valid input to test the function\n    \n  Precondition: The functions are defined and ready to use.\n  \n  Test Case Boundary Value:\n    The innermost return value should be None when no arguments are passed.\n    \n  Test Case Edge Condition:\n    The nested function should return a reference to fn2 without executing it.'

    print(generate_unit_tests.gen_tests(scenarios)['tests'])