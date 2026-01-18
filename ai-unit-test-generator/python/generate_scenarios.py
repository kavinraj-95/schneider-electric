#!/usr/bin/env python3
"""
LangGraph-based scenario generation with JSON I/O for VS Code extension.
"""

import json
import sys
import os
from typing import TypedDict, Dict, Any, List

from langchain.chat_models import init_chat_model
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import HumanMessage
from langsmith import traceable
from dotenv import load_dotenv


class ScenarioState(TypedDict):
    input: str
    positive: str
    negative: str


def create_scenario_generator():
    """Create and return the scenario generation graph."""
    load_dotenv()

    os.environ.setdefault("LANGCHAIN_PROJECT", "Schneider-Electric Project")

    llm = init_chat_model(
        model="ollama:llama3.2",
        streaming=True,
        max_tokens=512
    )

    @traceable(name="positive_scenarios", tags=['positive', 'scenarios', 'generate_positive_scenarios'])
    def generate_positive_scenario(state: ScenarioState) -> dict:
        prompt = f"""
        Generate a detailed POSITIVE test scenario for: {state['input']}

        Rules:
        - Generate only the scenario, don't code it.
        - No introductions, explanations, or closing remarks.
        """
        return {'positive': llm.invoke([HumanMessage(content=prompt)]).content}

    @traceable(name="negative_scenarios", tags=['negative', 'scenarios', 'generate_negative_scenarios'])
    def generate_negative_scenario(state: ScenarioState) -> dict:
        prompt = f"""
        Generate a detailed NEGATIVE test scenario for: {state['input']}

        Rules:
        - Generate only the scenario, don't code it.
        - No introductions, explanations, or closing remarks.
        """
        return {'negative': llm.invoke([HumanMessage(content=prompt)]).content}

    graph = StateGraph(ScenarioState)
    graph.add_node("positive", generate_positive_scenario)
    graph.add_node("negative", generate_negative_scenario)
    graph.add_edge(START, "positive")
    graph.add_edge(START, "negative")
    graph.add_edge('positive', END)
    graph.add_edge('negative', END)

    return graph.compile()


def gen_scenarios(code: str) -> ScenarioState:
    """Generate positive and negative scenarios for given code."""
    generator = create_scenario_generator()
    result = generator.invoke({'input': code})
    return result


def main():
    """Main entry point for JSON I/O mode."""
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {e}"}))
        sys.exit(1)

    functions = input_data.get("functions", [])
    if not functions:
        print(json.dumps({"error": "No functions provided"}))
        sys.exit(1)

    scenarios: Dict[str, Dict[str, str]] = {}

    for func in functions:
        qualified_name = func.get("qualifiedName", func.get("funcName", "unknown"))
        func_source = func.get("funcSource", "")

        if not func_source:
            continue

        try:
            result = gen_scenarios(func_source)
            scenarios[qualified_name] = {
                "positive": result.get("positive", ""),
                "negative": result.get("negative", ""),
                "funcSource": func_source,
                "filePath": func.get("filePath", "")
            }

            progress = {
                "type": "progress",
                "function": qualified_name,
                "status": "complete"
            }
            print(json.dumps(progress), file=sys.stderr, flush=True)

        except Exception as e:
            scenarios[qualified_name] = {
                "positive": "",
                "negative": "",
                "error": str(e),
                "funcSource": func_source,
                "filePath": func.get("filePath", "")
            }

    print(json.dumps(scenarios))


if __name__ == "__main__":
    main()
