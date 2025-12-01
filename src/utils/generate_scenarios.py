from langchain.chat_models import init_chat_model
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import BaseMessage, HumanMessage
from langsmith import traceable
from dotenv import load_dotenv
from typing import TypedDict, Annotated, Dict
import os


class ScenarioState(TypedDict):
    input: str
    positive: str
    negative: str


def gen_scenarions(code: str) -> ScenarioState:
    load_dotenv()

    os.environ["LANGCHAIN_PROJECT"] = "Schneider-Electric Project"

    llm = init_chat_model(
        model = "ollama:llama3.2",
        streaming = True,
        max_tokens = 512
    )

    @traceable(name = "positve_scenarios", tags = ['positive', 'scenarios',  'generate_positive_scenarios'])
    def generate_positive_scenario(state: ScenarioState)-> dict:
        prompt = f"""
        Generate a detailed POSITIVE test scenario for: {state['input']}

        Rules:
        - Generate only the scenario, dont code it.
        - No introductions, explanations, or closing remarks.
        """
        return {'positive': llm.invoke([HumanMessage(content = prompt)]).content}

    @traceable(name = "negative_scenarios", tags = ['negative', 'scenarios', 'generate_negative_scenarios'])
    def generate_negative_scenario(state: ScenarioState)-> dict:
        prompt = f"""
        Generate a detailed NEGATIVE test scenario for: {state['input']}

        Rules:
        - Generate only the scenario, don't code it.
        - No introductions, explanations, or closing remarks.
        """
        return {'negative': llm.invoke([HumanMessage(content = prompt)]).content}
        
    graph = StateGraph(ScenarioState)

    graph.add_node("positive", generate_positive_scenario)
    graph.add_node("negative", generate_negative_scenario)

    graph.add_edge(START, "positive")
    graph.add_edge(START, "negative")

    graph.add_edge('positive', END)
    graph.add_edge('negative', END)

    scenario_generator = graph.compile()

    result = scenario_generator.invoke({'input': code})

    return result

if __name__ == "__main__":
    print(gen_scenarions("""def get_functions(file_path: str) -> List[Dict[str, str]]:
        with open(file_path, "r") as f:
            source = f.read()

        parse_tree = ast.parse(source)

        functions = []

        for node in parse_tree.body:
            if isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)):
                func_src = ast.get_source_segment(source, node)
                functions.append({"func_name": node.name, "func_source": func_src})
            
        return functions"""))