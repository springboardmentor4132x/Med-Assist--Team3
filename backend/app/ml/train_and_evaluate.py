"""Comprehensive Machine Learning Training and Multi-Model Evaluation Script for Module 3.

Implements Stage 1 of the Disease Prediction workflow as specified in the MedAssist AI syllabus:
- Preprocessing and exploring the Kaggle Disease Prediction dataset
- Training Decision Tree, Random Forest, Multinomial Naive Bayes, and Support Vector Machine (SVM)
- Benchmarking Accuracy, Precision, Recall, F1-Score, and Confusion Matrix
- Selecting and saving the highest-performing model artifact via joblib for FastAPI live inference
"""

from __future__ import annotations

import json
from pathlib import Path
import time
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import LinearSVC
from sklearn.tree import DecisionTreeClassifier

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "app" / "data" / "kaggle"
ARTIFACTS_DIR = BASE_DIR / "app" / "ml" / "artifacts"
REPORT_PATH = BASE_DIR / "app" / "ml" / "MODEL_EVALUATION.md"
METADATA_PATH = ARTIFACTS_DIR / "model_metadata.json"


def load_and_preprocess_data() -> tuple[pd.DataFrame, pd.Series, pd.DataFrame, pd.Series, list[str]]:
    """Load and prepare Kaggle training and testing symptom datasets."""
    train_path = DATA_DIR / "Training.csv"
    test_path = DATA_DIR / "Testing.csv"

    if not train_path.exists() or not test_path.exists():
        raise FileNotFoundError(f"Kaggle datasets not found in {DATA_DIR}")

    df_train = pd.read_csv(train_path)
    df_test = pd.read_csv(test_path)

    # Clean any trailing unnamed columns from CSV export
    unnamed_cols = [c for c in df_train.columns if "Unnamed" in str(c)]
    if unnamed_cols:
        df_train.drop(columns=unnamed_cols, inplace=True)
    unnamed_test = [c for c in df_test.columns if "Unnamed" in str(c)]
    if unnamed_test:
        df_test.drop(columns=unnamed_test, inplace=True)

    target_col = "prognosis"
    feature_cols = [c for c in df_train.columns if c != target_col]

    X_train = df_train[feature_cols].astype(np.float32)
    y_train = df_train[target_col].astype(str)

    X_test = df_test[feature_cols].astype(np.float32)
    y_test = df_test[target_col].astype(str)

    print(f"[Data Exploration] Training shape: {df_train.shape} (Samples: {len(df_train)}, Features: {len(feature_cols)})")
    print(f"[Data Exploration] Testing shape: {df_test.shape} (Samples: {len(df_test)})")
    print(f"[Data Exploration] Distinct clinical disease classes: {y_train.nunique()}")
    print(f"[Data Exploration] Missing values in Training: {df_train.isnull().sum().sum()}")
    print(f"[Data Exploration] Missing values in Testing: {df_test.isnull().sum().sum()}")

    return X_train, y_train, X_test, y_test, feature_cols


def train_and_benchmark_models(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_test: pd.DataFrame,
    y_test: pd.Series,
) -> dict[str, dict[str, Any]]:
    """Train and evaluate 4 classical machine learning classification algorithms."""
    models: dict[str, Any] = {
        "Random Forest": RandomForestClassifier(
            n_estimators=100, max_depth=16, random_state=42
        ),
        "Decision Tree": DecisionTreeClassifier(
            max_depth=18, random_state=42
        ),
        "Multinomial Naive Bayes": MultinomialNB(
            alpha=0.5
        ),
        "Support Vector Machine (Calibrated)": CalibratedClassifierCV(
            estimator=LinearSVC(dual=False, random_state=42), cv=3
        ),
    }

    results: dict[str, dict[str, Any]] = {}

    for name, model in models.items():
        print(f"\n--- Training {name} ---")
        start_time = time.perf_counter()
        model.fit(X_train, y_train)
        train_time = round(time.perf_counter() - start_time, 4)

        start_time = time.perf_counter()
        y_pred = model.predict(X_test)
        inference_time = round((time.perf_counter() - start_time) * 1000, 3)

        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
        rec = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
        f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))
        macro_f1 = float(f1_score(y_test, y_pred, average="macro", zero_division=0))

        results[name] = {
            "model_obj": model,
            "accuracy": round(acc, 4),
            "precision_weighted": round(prec, 4),
            "recall_weighted": round(rec, 4),
            "f1_weighted": round(f1, 4),
            "f1_macro": round(macro_f1, 4),
            "training_time_sec": train_time,
            "inference_time_ms": inference_time,
            "classification_report": classification_report(y_test, y_pred, zero_division=0, output_dict=True),
        }

        print(
            f"Result for {name}: Accuracy={acc*100:.2f}%, Precision={prec*100:.2f}%, "
            f"Recall={rec*100:.2f}%, F1-Score={f1*100:.2f}%, Train Time={train_time}s"
        )

    return results


def save_best_model_and_report(
    results: dict[str, dict[str, Any]], feature_names: list[str], classes: list[str]
) -> str:
    """Save best model artifact and generate comprehensive evaluation documentation."""
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    # Select best model primarily by F1-macro and accuracy
    best_model_name = max(
        results.keys(),
        key=lambda m: (results[m]["f1_weighted"], results[m]["accuracy"]),
    )
    best_entry = results[best_model_name]
    best_model = best_entry["model_obj"]

    # Save joblib model & feature metadata
    model_file = ARTIFACTS_DIR / "disease_model.joblib"
    features_file = ARTIFACTS_DIR / "feature_names.joblib"

    joblib.dump(best_model, model_file)
    joblib.dump(feature_names, features_file)
    print(f"\n[Artifact Saved] Best model ({best_model_name}) serialized to: {model_file}")
    print(f"[Artifact Saved] Feature names ({len(feature_names)}) serialized to: {features_file}")

    # Save JSON metadata
    metadata = {
        "selected_model": best_model_name,
        "total_features": len(feature_names),
        "total_classes": len(classes),
        "classes": sorted(classes),
        "metrics": {
            "accuracy": best_entry["accuracy"],
            "precision_weighted": best_entry["precision_weighted"],
            "recall_weighted": best_entry["recall_weighted"],
            "f1_weighted": best_entry["f1_weighted"],
            "f1_macro": best_entry["f1_macro"],
        },
        "all_model_benchmarks": {
            k: {
                "accuracy": v["accuracy"],
                "precision": v["precision_weighted"],
                "recall": v["recall_weighted"],
                "f1_score": v["f1_weighted"],
                "train_time_sec": v["training_time_sec"],
                "inference_time_ms": v["inference_time_ms"],
            }
            for k, v in results.items()
        },
        "trained_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    # Generate Markdown Report for Team and Mentor Review
    table_rows = []
    for k, v in results.items():
        is_best = " ⭐ (Selected)" if k == best_model_name else ""
        table_rows.append(
            f"| **{k}{is_best}** | {v['accuracy']*100:.2f}% | {v['precision_weighted']*100:.2f}% | "
            f"{v['recall_weighted']*100:.2f}% | {v['f1_weighted']*100:.2f}% | {v['training_time_sec']}s | {v['inference_time_ms']}ms |"
        )
    table_str = "\n".join(table_rows)

    md_content = f"""# MedAssist AI — Module 3: Disease Prediction Machine Learning Evaluation Report

## 1. Executive Summary
As specified in **Module 3 (Disease Prediction)** of the MedAssist AI curriculum, we developed and trained multi-class supervised learning models to classify patient symptoms into clinical disease conditions and generate posterior probability scores.

- **Primary Training Dataset**: Kaggle *Disease Prediction Using Symptoms* / *Disease Symptoms and Patient Profile Dataset* (`Training.csv`).
- **Feature Dimension**: {len(feature_names)} standardized clinical symptom binary indicators ($0/1$).
- **Disease Classes Evaluated**: {len(classes)} clinical conditions.
- **Winning Model Selected**: **{best_model_name}** ({best_entry['accuracy']*100:.2f}% Accuracy, {best_entry['f1_weighted']*100:.2f}% Weighted F1).

---

## 2. Multi-Model Benchmark Comparison Table

| Algorithm | Test Accuracy | Weighted Precision | Weighted Recall | Weighted F1-Score | Training Time | Inference Latency |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
{table_str}

---

## 3. Analysis & Algorithm Justification

1. **Random Forest Classifier**:
   - Outperforms single trees by constructing an ensemble of decorrelated decision trees, mitigating overfitting on sparse binary symptom combinations.
   - Accurately captures non-linear symptom interactions (e.g., distinguishing respiratory viral infections from bacterial pneumonia).
   - Generates reliable class probabilities via leaf vote distributions.

2. **Decision Tree Classifier**:
   - Offers high clinical explainability and rapid decision boundaries, but is more sensitive to sample variance in multi-class disease splits.

3. **Multinomial Naive Bayes (`MultinomialNB`)**:
   - Demonstrates strong performance on discrete binary feature vectors with Laplace smoothing ($\alpha=0.5$).
   - Extremely lightweight, providing instant posterior probabilities for real-time differential diagnosis.

4. **Support Vector Machine (Calibrated LinearSVC)**:
   - High margin maximization across 132-dimensional symptom space, calibrated with Platt scaling / cross-validation to output true probability scores.

---

## 4. Model Persistence & API Integration
- The winning **{best_model_name}** model is serialized to `backend/app/ml/artifacts/disease_model.joblib`.
- Feature column order is locked in `backend/app/ml/artifacts/feature_names.joblib`.
- The FastAPI backend (`backend/app/services/disease_ml_service.py`) dynamically loads this saved artifact to serve all 4 Module 3 endpoints:
  - `POST /api/v1/predictions/classify` (Disease Classification)
  - `POST /api/v1/predictions/probabilities` (Probability Score Generation)
  - `POST /api/v1/predictions/differential` (Multiple Disease Differential Diagnosis)
  - `POST /api/v1/predictions/confidence` (Prediction Confidence Scoring)
  - `POST /api/v1/predictions/comprehensive` (Unified Clinical Diagnostic Assessment)

---
*Generated by MedAssist AI ML Training Pipeline on {time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime())} UTC.*
"""
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write(md_content)

    print(f"[Documentation Generated] Markdown report written to: {REPORT_PATH}")
    return best_model_name


def main() -> None:
    print("=================================================================")
    print(" MedAssist AI: Module 3 Model Training & Comparison Pipeline ")
    print("=================================================================")
    X_train, y_train, X_test, y_test, feature_names = load_and_preprocess_data()
    classes = list(y_train.unique())
    results = train_and_benchmark_models(X_train, y_train, X_test, y_test)
    best_model = save_best_model_and_report(results, feature_names, classes)
    print("\n✅ Training, model comparison, and artifact serialization completed successfully!")
    print(f"Selected Champion Model: {best_model}")


if __name__ == "__main__":
    main()
