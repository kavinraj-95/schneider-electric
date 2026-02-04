#!/usr/bin/env python3
"""
pytest code generation with JSON I/O for VS Code extension.
Supports OpenAI (default) and Ollama as fallback provider.
"""

import json
import sys
import os
from typing import TypedDict, Dict, Any, List, Optional

from langchain.chat_models import init_chat_model
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import HumanMessage
from langsmith import traceable
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential

# Optional imports for different providers
try:
    from langchain_openai import ChatOpenAI
except ImportError:
    ChatOpenAI = None


class UnitTestState(TypedDict):
    input: str
    tests: str


def _create_llm(provider: str = 'openai') -> Any:
    """Create and return LLM instance based on provider."""
    api_key = os.getenv("OPENAI_API_KEY")

    if provider == 'openai':
        if ChatOpenAI is None:
            raise ImportError(
                "langchain-openai is not installed. "
                "Install it with: pip install langchain-openai>=0.1.0"
            )

        if not api_key:
            raise ValueError(
                "OPENAI_API_KEY environment variable is not set. "
                "Please configure your OpenAI API key."
            )

        return ChatOpenAI(
            model=os.getenv("OPENAI_MODEL", "gpt-4o"),
            api_key=api_key,
            temperature=0.7,
            max_tokens=2048,
            streaming=True
        )
    elif provider == 'ollama':
        return init_chat_model(
            model="ollama:llama3.2",
            streaming=True,
            max_tokens=2048
        )
    else:
        raise ValueError(f"Unknown provider: {provider}")


def create_test_generator():
    """Create and return the unit test generation graph."""
    load_dotenv()

    os.environ.setdefault("LANGCHAIN_PROJECT", "Schneider-Electric Project")

    provider = os.getenv("AI_PROVIDER", "openai")

    try:
        llm = _create_llm(provider)
    except ValueError as e:
        # Fallback to Ollama if OpenAI fails
        if provider == 'openai':
            print(f"Warning: {e}. Falling back to Ollama.", file=sys.stderr)
            llm = _create_llm('ollama')
        else:
            raise

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    @traceable(name="generate_unit_tests", tags=['unittest', 'generate_unit_tests'])
    def generate_unit_tests(state: UnitTestState) -> dict:
        prompt = f"""
Generate unit tests (using pytest) for the given scenarios with the following constraints.

FORMAT (STRICT):
```python
code...
```

Rules:
- Use pytest
- Output only the final python file.
- No text outside the python file.
- No explanations or commentary.
- Only code inside ```python ```.
- Include necessary imports.
- Use descriptive test function names.
- Add docstrings to test functions.

Scenarios: {state['input']}
"""
        return {'tests': llm.invoke([HumanMessage(content=prompt)]).content}

    graph = StateGraph(UnitTestState)
    graph.add_node("gen_tests", generate_unit_tests)
    graph.add_edge(START, "gen_tests")
    graph.add_edge('gen_tests', END)

    return graph.compile()


def gen_tests(scenarios: str) -> Dict[str, str]:
    """Generate pytest code for given scenarios."""
    generator = create_test_generator()
    result = generator.invoke({'input': scenarios})
    return result


def main():
    """Main entry point for JSON I/O mode."""
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    scenarios = input_data.get("scenarios", {})
    if not scenarios:
        print(json.dumps({"error": "No scenarios provided"}))
        sys.exit(1)

    tests: List[Dict[str, Any]] = []

    for func_name, scenario_data in scenarios.items():
        positive = scenario_data.get("positive", "")
        negative = scenario_data.get("negative", "")
        func_source = scenario_data.get("funcSource", "")
        file_path = scenario_data.get("filePath", "")

        if not positive and not negative:
            continue

        combined_scenarios = f"""
Function Source:
{func_source}

Positive Scenarios:
{positive}

Negative Scenarios:
{negative}
"""

        try:
            result = gen_tests(combined_scenarios)
            tests.append({
                "functionName": func_name,
                "testContent": result.get("tests", ""),
                "filePath": file_path
            })

            progress = {
                "type": "progress",
                "function": func_name,
                "status": "complete"
            }
            print(json.dumps(progress), file=sys.stderr, flush=True)

        except Exception as e:
            tests.append({
                "functionName": func_name,
                "testContent": "",
                "error": str(e),
                "filePath": file_path
            })

    print(json.dumps(tests))


if __name__ == "__main__":
    main()
