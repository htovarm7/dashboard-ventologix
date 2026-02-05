"""LangGraph agent with GPT-4 integration.

This agent uses OpenAI's GPT-4 model to process user queries with an introduction phase.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Dict

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph
from langgraph.runtime import Runtime
from typing_extensions import TypedDict

# Load environment variables
load_dotenv()


class Context(TypedDict):
    """Context parameters for the agent.

    Set these when creating assistants OR when invoking the graph.
    See: https://langchain-ai.github.io/langgraph/cloud/how-tos/configuration_cloud/
    """

    model_name: str
    temperature: float


@dataclass
class State:
    """Input state for the agent.

    Defines the initial structure of incoming data.
    See: https://langchain-ai.github.io/langgraph/concepts/low_level/#state
    """

    user_input: str = ""
   

    def __post_init__(self):
        if self.messages is None:
            self.messages = []


async def introduction(state: State, runtime: Runtime[Context]) -> Dict[str, Any]:
    """Introduce the agent and its capabilities.

    This node provides a welcoming introduction and explains what the agent can do.
    """
    # Get context configuration or use defaults
    context = runtime.context or {}
    model_name = context.get("model_name", "gpt-4")
    temperature = context.get("temperature", 0.7)

    # Initialize GPT-4 model
    llm = ChatOpenAI(
        model=model_name,
        temperature=temperature,
        openai_api_key=os.getenv("OPENAI_API_KEY"),
    )

    intro_prompt = """You are a helpful AI assistant powered by GPT-4.
    Please introduce yourself briefly and explain how you can help users.
    Keep it concise (2-3 sentences) and friendly."""

    intro_message = await llm.ainvoke(intro_prompt)
    introduction_text = intro_message.content

    return {
        "introduction": introduction_text,
        "messages": [{"role": "assistant", "content": introduction_text}],
    }


async def call_model(state: State, runtime: Runtime[Context]) -> Dict[str, Any]:
    """Process user input with GPT-4 and return a response.

    Uses the configured GPT-4 model to generate responses based on user input.
    """
    # Get context configuration or use defaults
    context = runtime.context or {}
    model_name = context.get("model_name", "gpt-4")
    temperature = context.get("temperature", 0.7)

    # Initialize GPT-4 model
    llm = ChatOpenAI(
        model=model_name,
        temperature=temperature,
        openai_api_key=os.getenv("OPENAI_API_KEY"),
    )

    # Build conversation history
    messages = state.messages.copy() if state.messages else []

    # Add user input if provided
    if state.user_input:
        messages.append({"role": "user", "content": state.user_input})

    # Generate response
    if messages:
        response_message = await llm.ainvoke(
            [{"role": msg["role"], "content": msg["content"]} for msg in messages]
        )
        response_text = response_message.content

        # Update messages with assistant response
        messages.append({"role": "assistant", "content": response_text})

        return {"response": response_text, "messages": messages}
    else:
        return {
            "response": "No input provided.",
            "messages": [{"role": "assistant", "content": "No input provided."}],
        }


# Define the graph
graph = (
    StateGraph(State, context_schema=Context)
    .add_node("introduction", introduction)
    .add_node("call_model", call_model)
    .add_edge("__start__", "introduction")
    .add_edge("introduction", "call_model")
    .compile(name="GPT-4 Agent with Introduction")
)
