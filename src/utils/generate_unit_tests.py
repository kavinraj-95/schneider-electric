from langchain.chat_models import init_chat_model
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import BaseMessage, HumanMessage
from langsmith import traceable
from dotenv import load_dotenv
from typing import TypedDict, Annotated, Dict
import os, json


def gen_tests(scenarios: str) -> Dict[str, str]:
    load_dotenv()

    os.environ["LANGCHAIN_PROJECT"] = "Schneider-Electric Project"

    llm = init_chat_model(
        model = "ollama:llama3.2",
        streaming = True,
        max_tokens = 512
    )

    class UnitTestState(TypedDict):
        input: str
        tests: dict

    @traceable(name = "generate_response", tags = ['unittest', 'generate_unit_tests'])
    def generate_unit_tests(state: UnitTestState)-> dict:
        prompt = f"""
Generate unit tests (using pytest) for the given scenarios with the following constraints
FORMAT (STRICT):
```python
code...
```
Rules:
- Use pytest
- Output only the final python file .
- No text outside the python file.
- No explanations or commentary.
- Only code inside ```python ```.

Scenarios: {state['input']}
"""
        return {'tests': llm.invoke([HumanMessage(content = prompt)]).content}

        
    graph = StateGraph(UnitTestState)

    graph.add_node("gen_tests", generate_unit_tests)

    graph.add_edge(START, "gen_tests")
    graph.add_edge('gen_tests', END)

    scenario_generator = graph.compile()

    result = scenario_generator.invoke({'input': scenarios})

    return result

if __name__ == "__main__":
    result = gen_tests({'input': """Positive Scenario: Test Scenario:

**Test Case 1: Existing Function in File**

* File Path: `existing_function.py`
* Expected Output: 
  ```json
[
    {
        "func_name": "my_function",
        "func_source": "def my_function():\n\t# code\n"
    }
]
```

* Steps:
    1. Create a file named `existing_function.py` with the following content:

    ```python
def my_function():
    # code
```
    2. Call the function `get_functions` with the file path as argument.

**Test Case 2: Multiple Functions in File**

* File Path: `multiple_functions.py`
* Expected Output:
  ```json
[
    {
        "func_name": "my_first_function",
        "func_source": "def my_first_function():\n\t# code\n"
    },
    {
        "func_name": "my_second_function",
        "func_source": "def my_second_function():\n\t# code\n"
    }
]
```

* Steps:
    1. Create a file named `multiple_functions.py` with the following content:

    ```python
def my_first_function():
    # code

def my_second_function():
    # code
```
    2. Call the function `get_functions` with the file path as argument.

**Test Case 3: Empty File**

* File Path: `empty_file.py`
* Expected Output:
  ```
[] 
```

* Steps:
    1. Create a file named `empty_file.py`.
    2. Call the function `get_functions` with the file path as argument.

**Test Case 4: Non-Existing File**

* File Path: `non_existing_file.txt`
* Expected Output:
  ```
[]
```

* Steps:
    1. Create a non-existing file named `non_existing_file.txt`.
    2. Call the function `get_functions` with the file path as argument.

**Test Case 5: Syntax Error**

* File Path: `syntax_error.py`
* Expected Output:
  ```
[
    {
        "func_name": "my_function",
        "func_source": "def my_function():\n\t# code\nSyntaxError: invalid syntax"
    }
]
```

* Steps:
    1. Create a file named `syntax_error.py` with the following content:

    ```python
def my_function():
    # code
    SyntaxError: invalid syntax
``` 
"""})

    print(result['tests'])