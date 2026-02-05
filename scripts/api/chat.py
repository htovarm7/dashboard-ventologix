"""Chat endpoint for LangGraph RAG system."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import sys
import os

# Add parent directory to path to import langgraph module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from langgraph.agent import chat as langgraph_chat

chat_router = APIRouter(prefix="/chat", tags=["Chat RAG"])


class Message(BaseModel):
    """Message model for chat."""
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Request model for chat endpoint."""
    message: str
    history: Optional[List[Message]] = []


class ChatResponse(BaseModel):
    """Response model for chat endpoint."""
    response: str
    success: bool = True


@chat_router.post("/", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Chat with the RAG agent about clients, compressors, and sensor data.

    This endpoint uses LangGraph to process natural language queries and
    retrieve information from the database using specialized tools.

    Example queries:
    - "¿Cuántos clientes tenemos?"
    - "Muéstrame información del cliente X"
    - "¿Qué compresores tiene el cliente Y?"
    - "Dame los datos recientes del sensor RTU_123"
    """
    try:
        # Convert history to simple dict format
        history = [{"role": msg.role, "content": msg.content} for msg in request.history]

        # Call the LangGraph agent
        response = langgraph_chat(request.message, history=history)

        return ChatResponse(response=response, success=True)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing chat request: {str(e)}"
        )


@chat_router.get("/health")
async def health_check():
    """Check if the chat service is healthy."""
    try:
        # Basic check - try to import the agent
        from langgraph.agent import create_agent
        agent = create_agent()

        return {
            "status": "healthy",
            "service": "LangGraph RAG Chat",
            "message": "Chat service is operational"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
