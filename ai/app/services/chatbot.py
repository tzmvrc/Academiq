import sys
import os

# Add project root to sys.path to fix imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.qwen import generate_response

if __name__ == "__main__":
    print("AI Chat Interface - Type 'quit', 'exit', or 'q' to end")
    print("=" * 60)
    
    while True:
        # Get user input from console
        prompt = input("\nYou: ").strip()
        
        # Check for exit commands
        if prompt.lower() in ['quit', 'exit', 'q']:
            print("Goodbye!")
            break
        
        # Handle empty input
        if not prompt:
            continue
        
        print("AI is thinking...")
        response = generate_response(prompt)
        print(f"\nAI: {response}")