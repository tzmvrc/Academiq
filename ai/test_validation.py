import json
import os
import sys
from pathlib import Path
from datetime import datetime

# Add the ai directory to the path so we can import app modules
sys.path.insert(0, os.path.dirname(__file__))

from app.services.qwen_validation_service import validate_post
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)
import pandas as pd
from tqdm import tqdm

# ----------------------------
# Dataset & Config
# ----------------------------
BASE_DIR = os.path.dirname(__file__)
TEST_DATASET_PATH = os.path.join(BASE_DIR, "datasets/post_validation_test.jsonl")

# Where results will be saved
OUT_DIR = os.path.join(BASE_DIR, "eval_results")


# ----------------------------
# Load Test Dataset
# ----------------------------
def load_test_data(filepath):
    """Load test data from JSONL file"""
    test_cases = []
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                test_cases.append(json.loads(line))
    return test_cases


# ----------------------------
# Run Tests
# ----------------------------
def run_tests():
    """Run validation tests and calculate metrics"""

    print("=" * 80)
    print("LOADING TEST DATA")
    print("=" * 80)

    if not os.path.exists(TEST_DATASET_PATH):
        raise FileNotFoundError(f"Test dataset not found: {TEST_DATASET_PATH}")

    test_cases = load_test_data(TEST_DATASET_PATH)
    print(f"✓ Loaded {len(test_cases)} test cases\n")

    # Store results
    predictions = []
    ground_truth = []
    detailed_results = []

    print("=" * 80)
    print("RUNNING VALIDATION TESTS")
    print("=" * 80)

    # Progress bar
    for idx, test_case in enumerate(
        tqdm(test_cases, desc="Validating", unit="case"), start=1
    ):
        input_data = test_case["input"]
        expected_output = test_case["output"]

        subject = input_data.get("subject", "")
        title = input_data.get("title", "")
        content = input_data.get("content", "")
        tags = input_data.get("tags", [])
        expected_verdict = expected_output.get("verdict", "unknown")

        try:
            result = validate_post(subject, title, content, tags)
            predicted_verdict = result.get("verdict", "error")

            predictions.append(predicted_verdict)
            ground_truth.append(expected_verdict)

            is_correct = predicted_verdict == expected_verdict

            detailed_results.append(
                {
                    "test_num": idx,
                    "title": title[:50] + "..." if len(title) > 50 else title,
                    "expected": expected_verdict,
                    "predicted": predicted_verdict,
                    "correct": is_correct,
                    "reason": result.get("reason", ""),
                    "is_academic": result.get("is_academic", None),
                    "is_consistent": result.get("is_consistent", None),
                }
            )

        except Exception as e:
            predictions.append("error")
            ground_truth.append(expected_verdict)

            detailed_results.append(
                {
                    "test_num": idx,
                    "title": title[:50] + "..." if len(title) > 50 else title,
                    "expected": expected_verdict,
                    "predicted": "error",
                    "correct": False,
                    "reason": str(e),
                    "is_academic": None,
                    "is_consistent": None,
                }
            )

    # ----------------------------
    # Calculate Metrics
    # ----------------------------
    print("\n" + "=" * 80)
    print("PERFORMANCE METRICS")
    print("=" * 80)

    valid_idx = [i for i, p in enumerate(predictions) if p != "error"]
    if not valid_idx:
        print("ERROR: No valid predictions to calculate metrics.")
        return

    y_true = [ground_truth[i] for i in valid_idx]
    y_pred = [predictions[i] for i in valid_idx]

    # Detect labels automatically (instead of hard-coding approved/rejected)
    labels = sorted(set(y_true) | set(y_pred))

    accuracy = accuracy_score(y_true, y_pred)
    precision = precision_score(y_true, y_pred, average="weighted", zero_division=0)
    recall = recall_score(y_true, y_pred, average="weighted", zero_division=0)
    f1 = f1_score(y_true, y_pred, average="weighted", zero_division=0)

    print(f"Labels:    {labels}")
    print(f"Accuracy:  {accuracy:.4f} ({accuracy*100:.2f}%)")
    print(f"Precision: {precision:.4f} (weighted)")
    print(f"Recall:    {recall:.4f} (weighted)")
    print(f"F1 Score:  {f1:.4f} (weighted)")

    # Full per-class report (best for thesis)
    print("\n" + "=" * 80)
    print("CLASSIFICATION REPORT")
    print("=" * 80)
    report_text = classification_report(y_true, y_pred, labels=labels, zero_division=0)
    print(report_text)

    # Confusion matrix
    print("\n" + "=" * 80)
    print("CONFUSION MATRIX")
    print("=" * 80)

    cm = confusion_matrix(y_true, y_pred, labels=labels)
    cm_df = pd.DataFrame(
        cm,
        index=[f"Actual {c}" for c in labels],
        columns=[f"Pred {c}" for c in labels],
    )
    print(cm_df)

    # Summary stats
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)

    total_tests = len(test_cases)
    valid_tests = len(valid_idx)
    error_tests = total_tests - valid_tests
    correct_tests = sum(1 for i in valid_idx if y_pred[valid_idx.index(i)] == y_true[valid_idx.index(i)])  # safe but a bit awkward

    # simpler correct calc:
    correct_tests = sum(1 for a, b in zip(y_true, y_pred) if a == b)

    print(f"Total Tests: {total_tests}")
    print(f"Valid Tests: {valid_tests}")
    print(f"Error Tests: {error_tests}")
    print(f"Correct:     {correct_tests}/{valid_tests}")

    # ----------------------------
    # Save Results to Files
    # ----------------------------
    os.makedirs(OUT_DIR, exist_ok=True)

    # timestamped run folder (optional but nice)
    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = os.path.join(OUT_DIR, run_id)
    os.makedirs(run_dir, exist_ok=True)

    # Save detailed results
    df = pd.DataFrame(detailed_results)
    df.to_csv(os.path.join(run_dir, "detailed_results.csv"), index=False)
    with open(os.path.join(run_dir, "detailed_results.json"), "w", encoding="utf-8") as f:
        json.dump(detailed_results, f, ensure_ascii=False, indent=2)

    # Save metrics
    metrics = {
        "labels": labels,
        "accuracy": accuracy,
        "precision_weighted": precision,
        "recall_weighted": recall,
        "f1_weighted": f1,
        "total_tests": total_tests,
        "valid_tests": valid_tests,
        "error_tests": error_tests,
        "correct_tests": correct_tests,
    }
    with open(os.path.join(run_dir, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump(metrics, f, ensure_ascii=False, indent=2)

    # Save confusion matrix
    cm_df.to_csv(os.path.join(run_dir, "confusion_matrix.csv"))

    # Save classification report
    with open(os.path.join(run_dir, "classification_report.txt"), "w", encoding="utf-8") as f:
        f.write(report_text)

    print("\n" + "=" * 80)
    print("RESULT FILES SAVED")
    print("=" * 80)
    print(f"Run folder: {run_dir}")
    print("Files created:")
    print("- detailed_results.csv")
    print("- detailed_results.json")
    print("- metrics.json")
    print("- confusion_matrix.csv")
    print("- classification_report.txt")

    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)


# ----------------------------
# Main
# ----------------------------
if __name__ == "__main__":
    run_tests()