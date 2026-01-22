# app/models/qwen.py

from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import torch
import os
import json

# -------------------------
# Model paths
# -------------------------
MODEL_NAME = "Qwen/Qwen2.5-0.5B-Instruct"
ADAPTER_PATH = os.path.join(
    os.path.dirname(__file__),
    "../../lora/qwen_lora_finetuned"
)

# -------------------------
# Load tokenizer
# -------------------------
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)

# -------------------------
# Load base model
# -------------------------
base_model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    dtype=torch.float32,  # CPU safe
    device_map="cpu",
    trust_remote_code=True
)

# -------------------------
# Attach LoRA adapter
# -------------------------
model = PeftModel.from_pretrained(base_model, ADAPTER_PATH)
model.eval()

print("✅ Qwen + LoRA adapter loaded")

# -------------------------
# Function to generate response
# -------------------------
def generate_response(prompt: str, max_new_tokens: int = 300):
    """
    Generate response from fine-tuned Qwen with LoRA adapter.

    Args:
        prompt (str): User input / forum post to validate
        max_new_tokens (int): max tokens to generate

    Returns:
        str: Generated response
    """

    # Build chat messages
    messages = [
        {"role": "system", "content": "You are a helpful AI assistant that validates academic forum posts."},
        {"role": "user", "content": prompt}
    ]

    # Convert messages to model input using Qwen's chat template
    input_text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )

    # Tokenize
    inputs = tokenizer(input_text, return_tensors="pt").to(model.device)

    # Keep track of prompt length to slice generated tokens
    prompt_length = inputs["input_ids"].shape[1]

    # Generate output
    outputs = model.generate(
        **inputs,
        max_new_tokens=max_new_tokens,
        do_sample=False,
        eos_token_id=tokenizer.eos_token_id
    )

    # Only take the newly generated tokens
    generated_tokens = outputs[0][prompt_length:]

    # Decode to string
    response = tokenizer.decode(generated_tokens, skip_special_tokens=True).strip()

    return response

# -------------------------
# Optional: quick test
# -------------------------
if __name__ == "__main__":
    test_prompt = "Validate this post: 'Binary search is an efficient algorithm used to find an element in a sorted array.'"
    result = generate_response(test_prompt)
    print("\n=== TEST OUTPUT ===")
    print(result)
