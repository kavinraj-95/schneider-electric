import os
from ..utils import extract_functions


def a_simple_fn():
    return "Hello World"


def fn_of_fn():
    print(a_simple_fn())

def nested_fn():
    def fn1():
        def fn2():
            return None
        
        return fn2
    return fn1
