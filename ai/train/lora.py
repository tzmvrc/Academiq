import json
import os
import torch
from datasets import load_dataset
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model, TaskType
from tqdm import tqdm

# ----------------------------
# Directories & Config
# ----------------------------
BASE_DIR = os.path.dirname(__file__)
MODEL_NAME = "Qwen/Qwen2.5-0.5B-Instruct"
DATASET_PATH = os.path.join(BASE_DIR, "../datasets/post_validation.jsonl")
OUTPUT_DIR = os.path.join(BASE_DIR, "../lora/qwen_lora_finetuned")
MAX_LENGTH = 512

# ----------------------------
# Device Detection
# ----------------------------
device = "cuda" if torch.cuda.is_available() else "cpu"
print("Using device:", device)

# ----------------------------
# Load Tokenizer & Model
# ----------------------------
tokenizer = AutoTokenizer.from_pretrained(
    MODEL_NAME,
    trust_remote_code=True
)

model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    torch_dtype=torch.float32,
    device_map={"": device} if device == "cuda" else "cpu",
    trust_remote_code=True
)

# ----------------------------
# LoRA Configuration
# ----------------------------
lora_config = LoraConfig(
    r=8,
    lora_alpha=32,
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM,
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj"
    ]
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# ----------------------------
# Load Dataset
# ----------------------------
dataset = load_dataset("json", data_files=DATASET_PATH)

# For testing: uncomment to train on only first 10 samples
# dataset["train"] = dataset["train"].select(range(10))

print("Training samples:", len(dataset["train"]))

# ----------------------------
# Prepare Dataset
# ----------------------------
def format_prompt(example):
    instruction = example["instruction"]
    input_data = example["input"]
    output_data = example["output"]

    prompt = f"""<|system|>
You are a helpful AI assistant.
<|user|>
{instruction}

Input:
{json.dumps(input_data, indent=2)}

<|assistant|>
{json.dumps(output_data, indent=2)}
"""
    return {"text": prompt}

def tokenize(example):
    tokens = tokenizer(
        example["text"],
        truncation=True,
        padding="max_length",
        max_length=MAX_LENGTH
    )
    tokens["labels"] = tokens["input_ids"].copy()
    return tokens

# Format & tokenize with progress bar
print("Formatting dataset...")
dataset = dataset.map(format_prompt, desc="Formatting")
dataset = dataset.map(
    tokenize,
    remove_columns=["instruction", "input", "output", "text"],
    desc="Tokenizing"
)

# ----------------------------
# Training Arguments
# ----------------------------
training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=1,
    num_train_epochs=1,
    learning_rate=2e-4,
    fp16=True if device == "cuda" else False,
    logging_steps=10,
    save_steps=500,
    save_total_limit=1,
    report_to="none"
)

# ----------------------------
# Custom Trainer with Progress Print
# ----------------------------
class ProgressTrainer(Trainer):
    def training_step(self, model, inputs, *args, **kwargs):
        """
        Accepts any extra arguments passed by Trainer, such as num_items_in_batch
        """
        loss = super().training_step(model, inputs, *args, **kwargs)
        print(f"Step {self.state.global_step} - Loss: {loss.item():.4f}")
        return loss

trainer = ProgressTrainer(
    model=model,
    args=training_args,
    train_dataset=dataset["train"],
    data_collator=DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False
    )
)

# ----------------------------
# Train
# ----------------------------
trainer.train()

# ----------------------------
# Save Model & Tokenizer
# ----------------------------
model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

print("Training complete! Model saved to:", OUTPUT_DIR)
