import sys
import os


project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.utils import generate_scenarios

if __name__ == "__main__":
    extracted_functions = """Function: a_simple_fn
    def a_simple_fn():
        return "Hello World"

    Function: fn_of_fn
    def fn_of_fn():
        print(a_simple_fn())

    Function: nested_fn
    def nested_fn():
        def fn1():
            def fn2():
                return None
            
            return fn2
        return fn1
    """

    print(generate_scenarios.gen_scenarions(extracted_functions))