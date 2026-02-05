"""Test script for LangGraph RAG system."""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_environment():
    """Check if all required environment variables are set."""
    print("🔍 Checking environment variables...")

    required_vars = {
        "OPENAI_API_KEY": "OpenAI API key for LLM",
        "DB_HOST": "Database host",
        "DB_USER": "Database user",
        "DB_PASSWORD": "Database password",
        "DB_DATABASE": "Database name"
    }

    missing = []
    for var, description in required_vars.items():
        value = os.getenv(var)
        if value:
            # Mask sensitive values
            if "KEY" in var or "PASSWORD" in var:
                display_value = value[:8] + "..." if len(value) > 8 else "***"
            else:
                display_value = value
            print(f"  ✓ {var}: {display_value}")
        else:
            print(f"  ✗ {var}: NOT SET ({description})")
            missing.append(var)

    if missing:
        print(f"\n❌ Missing required variables: {', '.join(missing)}")
        return False

    print("\n✅ All environment variables are set!\n")
    return True


def test_database_connection():
    """Test database connection."""
    print("🔍 Testing database connection...")

    try:
        import mysql.connector

        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_DATABASE")
        )

        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM clientes")
        count = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        print(f"✅ Database connection successful! Found {count} clients.\n")
        return True

    except Exception as e:
        print(f"❌ Database connection failed: {str(e)}\n")
        return False


def test_langgraph_agent():
    """Test the LangGraph agent."""
    print("🔍 Testing LangGraph agent...")

    try:
        from langgraph.agent import chat

        # Test query
        test_question = "¿Cuántos clientes tenemos en total?"
        print(f"  Question: {test_question}")

        response = chat(test_question)
        print(f"  Response: {response}\n")

        print("✅ LangGraph agent is working!\n")
        return True

    except Exception as e:
        print(f"❌ LangGraph agent failed: {str(e)}\n")
        import traceback
        traceback.print_exc()
        return False


def test_api_endpoint():
    """Test if FastAPI server is running with chat endpoint."""
    print("🔍 Testing FastAPI chat endpoint...")

    try:
        import requests

        api_url = os.getenv("NEXT_PUBLIC_API_URL", "http://127.0.0.1:8000")

        # Test health endpoint
        response = requests.get(f"{api_url}/chat/health", timeout=5)

        if response.status_code == 200:
            data = response.json()
            print(f"  Status: {data.get('status')}")
            print(f"  Service: {data.get('service')}")
            print("✅ Chat endpoint is healthy!\n")
            return True
        else:
            print(f"❌ Chat endpoint returned status {response.status_code}\n")
            return False

    except requests.exceptions.ConnectionError:
        print("⚠️  FastAPI server is not running.")
        print("   Start it with: uvicorn scripts.api_server:app --reload\n")
        return False
    except Exception as e:
        print(f"❌ API test failed: {str(e)}\n")
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("  VENTOLOGIX LANGGRAPH RAG - SYSTEM TEST")
    print("=" * 60)
    print()

    results = {
        "Environment": check_environment(),
        "Database": test_database_connection(),
        "LangGraph Agent": test_langgraph_agent(),
        "API Endpoint": test_api_endpoint(),
    }

    print("=" * 60)
    print("  TEST RESULTS SUMMARY")
    print("=" * 60)

    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name:<20} {status}")

    print()

    if all(results.values()):
        print("🎉 All tests passed! Your LangGraph RAG system is ready to use.")
        print("\nNext steps:")
        print("1. Make sure FastAPI is running: uvicorn scripts.api_server:app --reload")
        print("2. Test the chat endpoint: curl http://127.0.0.1:8000/chat/health")
        print("3. Integrate the chat component into your Next.js frontend")
        print("\nSee LANGGRAPH_INTEGRATION.md for frontend integration examples.")
    else:
        print("⚠️  Some tests failed. Please fix the issues above.")

        if not results["Environment"]:
            print("\n📝 To fix environment issues:")
            print("   1. Copy .env.example to .env if you haven't")
            print("   2. Add your OPENAI_API_KEY to .env")
            print("   3. Verify database credentials in .env")

        if not results["Database"]:
            print("\n📝 To fix database issues:")
            print("   1. Check that your database server is running")
            print("   2. Verify credentials in .env are correct")
            print("   3. Run: python scripts/test_db_connection.py")

        if not results["LangGraph Agent"]:
            print("\n📝 To fix LangGraph issues:")
            print("   1. Make sure OPENAI_API_KEY is set")
            print("   2. Check that all LangChain packages are installed")
            print("   3. Run: npm install")

        if not results["API Endpoint"]:
            print("\n📝 To fix API issues:")
            print("   1. Start the server: uvicorn scripts.api_server:app --reload")
            print("   2. Check that port 8000 is not in use")

    print()


if __name__ == "__main__":
    main()
