from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

MODEL_NAME = "Qwen/Qwen2.5-0.5B-Instruct"

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    dtype=torch.float32,
    device_map="cpu"
)

def generate_response(prompt: str):
    # Build chat messages
    messages = [
        {"role": "system", "content": "You are a helpful and concise assistant."},
        {"role": "user", "content": prompt}
    ]

    # Convert messages to training format
    input_text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )

    # Tokenize
    inputs = tokenizer(input_text, return_tensors="pt").to(model.device)

    # Number of tokens in the prompt (important!)
    prompt_length = inputs["input_ids"].shape[1]

    # Generate
    outputs = model.generate(
        **inputs,
        max_new_tokens=300,
        do_sample=False,
        eos_token_id=tokenizer.eos_token_id
    )

    # Slice ONLY tokens generated *after* the prompt
    generated_tokens = outputs[0][prompt_length:]

    # Decode only the assistant's answer
    return tokenizer.decode(generated_tokens, skip_special_tokens=True).strip()

