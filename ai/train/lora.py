import json
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

import os

BASE_DIR = os.path.dirname(__file__)

MODEL_NAME = "Qwen/Qwen2.5-0.5B-Instruct"

DATASET_PATH = os.path.join(BASE_DIR, "../datasets/post_validation.jsonl")
OUTPUT_DIR = os.path.join(BASE_DIR, "../lora/qwen_lora_finetuned")

MAX_LENGTH = 512


tokenizer = AutoTokenizer.from_pretrained(
    MODEL_NAME,
    trust_remote_code=True
)

model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
   dtype=torch.float32,
    device_map="cpu",
    trust_remote_code=True
)


lora_config = LoraConfig(
    r=8,
    lora_alpha=32,
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM,
    target_modules=[
        "q_proj",
        "k_proj",
        "v_proj",
        "o_proj",
        "gate_proj",
        "up_proj",
        "down_proj"
    ]
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()


dataset = load_dataset("json", data_files=DATASET_PATH)
dataset["train"] = dataset["train"].select(range(10))
print("Training samples:", len(dataset["train"]))



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


dataset = dataset.map(format_prompt)
dataset = dataset.map(
    tokenize,
    remove_columns=["instruction", "input", "output", "text"]
)


training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=1,
    num_train_epochs=1,
    learning_rate=2e-4,
    fp16=False,
    logging_steps=10,
    save_steps=500,
    save_total_limit=1,
    report_to="none"
)


trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset["train"],
    data_collator=DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False
    )
)


trainer.train()

model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
