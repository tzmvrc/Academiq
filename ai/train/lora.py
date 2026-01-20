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


MODEL_NAME = "Qwen/Qwen2.5-0.5B-Instruct"

DATASET_PATH = "../datasets/post_validation.json"
OUTPUT_DIR = "../lora/qwen_lora_finetuned"

MAX_LENGTH = 1024


tokenizer = AutoTokenizer.from_pretrained(
    MODEL_NAME,
    trust_remote_code=True
)

model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    torch_dtype=torch.float16,
    device_map="auto",
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
    remove_columns=dataset["train"].column_names
)


training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,
    num_train_epochs=3,
    learning_rate=2e-4,
    fp16=True,
    logging_steps=10,
    save_steps=500,
    save_total_limit=2,
    evaluation_strategy="no",
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
