# app/models/qwen.py

from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import torch
import os
import json
import warnings
warnings.filterwarnings("ignore", message="The following generation flags are not valid")

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
    messages = [
        {"role": "system", "content": "You are a helpful AI assistant that validates academic forum posts."},
        {"role": "user", "content": prompt}
    ]
    input_text = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(input_text, return_tensors="pt").to(model.device)
    prompt_length = inputs["input_ids"].shape[1]

    outputs = model.generate(
        **inputs,
        max_new_tokens=max_new_tokens,
        do_sample=False,
        eos_token_id=tokenizer.eos_token_id,
        pad_token_id=tokenizer.eos_token_id,
    )

    generated_tokens = outputs[0][prompt_length:]
    response = tokenizer.decode(generated_tokens, skip_special_tokens=True).strip()

    # Optional: truncate after finding a complete JSON object to avoid trailing text
    # Find first '}' and cut
    brace_count = 0
    for i, ch in enumerate(response):
        if ch == '{':
            brace_count += 1
        elif ch == '}':
            brace_count -= 1
            if brace_count == 0:
                response = response[:i+1]
                break

    return response
# -------------------------
# Optional: quick test
# -------------------------
if __name__ == "__main__":
    test_prompt = "Validate this post: 'Binary search is an efficient algorithm used to find an element in a sorted array.'"
    result = generate_response(test_prompt)
    print("\n=== TEST OUTPUT ===")
    print(result)
