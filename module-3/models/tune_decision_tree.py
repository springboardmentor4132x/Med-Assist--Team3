
import json
from pathlib import Path

import joblib
import pandas as pd

from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import GridSearchCV, StratifiedKFold
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix
)


# --------------------------------------------------
# 1. DEFINE PROJECT PATHS
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BASE_DIR / "dataset" / "processed"
MODEL_DIR = BASE_DIR / "models"
EVALUATION_DIR = BASE_DIR / "evaluation"

MODEL_PATH = MODEL_DIR / "decision_tree_tuned_model.joblib"


# --------------------------------------------------
# 2. LOAD THE SHARED DATASET
# --------------------------------------------------

def load_data():
    X_train = pd.read_csv(DATA_DIR / "X_train.csv")
    X_test = pd.read_csv(DATA_DIR / "X_test.csv")

    y_train = pd.read_csv(DATA_DIR / "y_train.csv")["prognosis"]
    y_test = pd.read_csv(DATA_DIR / "y_test.csv")["prognosis"]

    if list(X_train.columns) != list(X_test.columns):
        raise ValueError("Training and testing features do not match.")

    if len(X_train) != len(y_train) or len(X_test) != len(y_test):
        raise ValueError("Feature and target row counts do not match.")

    print("Shared dataset loaded successfully!")
    print("Training shape:", X_train.shape)
    print("Testing shape:", X_test.shape)

    return X_train, X_test, y_train, y_test


# --------------------------------------------------
# 3. DEFINE HYPERPARAMETER SEARCH
# --------------------------------------------------

def tune_model(X_train, y_train):

    # Find the smallest number of training records
    # belonging to any one disease class.
    min_class_count = int(y_train.value_counts().min())

    if min_class_count < 2:
        raise ValueError(
            "At least 2 training records per disease class "
            "are required for stratified cross-validation."
        )

    # Use up to 5 folds, depending on the smallest class.
    n_splits = min(5, min_class_count)

    print(f"\nUsing {n_splits}-fold Stratified Cross-Validation")
    print("Smallest disease class count:", min_class_count)

    cv = StratifiedKFold(
        n_splits=n_splits,
        shuffle=True,
        random_state=42
    )

    # Decision Tree configurations to compare.
    param_grid = {
        "criterion": ["gini", "entropy"],
        "max_depth": [None, 5, 10, 15, 20],
        "min_samples_split": [2, 5, 10],
        "min_samples_leaf": [1, 2, 4]
    }

    decision_tree = DecisionTreeClassifier(random_state=42)

    grid_search = GridSearchCV(
        estimator=decision_tree,
        param_grid=param_grid,
        scoring="f1_macro",
        cv=cv,
        n_jobs=-1,
        verbose=1,
        refit=True
    )

    print("\nStarting hyperparameter tuning...")

    grid_search.fit(X_train, y_train)

    print("\nHyperparameter tuning completed!")

    print("\nBest Parameters:")
    print(grid_search.best_params_)

    print(
        "\nBest Cross-Validation Macro F1-score:",
        round(grid_search.best_score_, 4)
    )

    return grid_search


# --------------------------------------------------
# 4. EVALUATE THE BEST MODEL ON THE TEST SET
# --------------------------------------------------

def evaluate_model(best_model, X_test, y_test):

    y_pred = best_model.predict(X_test)

    metrics = {
        "model": "Tuned Decision Tree",
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision_macro": float(
            precision_score(y_test, y_pred, average="macro", zero_division=0)
        ),
        "recall_macro": float(
            recall_score(y_test, y_pred, average="macro", zero_division=0)
        ),
        "f1_macro": float(
            f1_score(y_test, y_pred, average="macro", zero_division=0)
        ),
        "precision_weighted": float(
            precision_score(y_test, y_pred, average="weighted", zero_division=0)
        ),
        "recall_weighted": float(
            recall_score(y_test, y_pred, average="weighted", zero_division=0)
        ),
        "f1_weighted": float(
            f1_score(y_test, y_pred, average="weighted", zero_division=0)
        )
    }

    print("\n========== TUNED DECISION TREE RESULTS ==========")

    for metric, value in metrics.items():
        if isinstance(value, float):
            print(f"{metric}: {value:.4f}")
        else:
            print(f"{metric}: {value}")

    print("\n========== CLASSIFICATION REPORT ==========")

    report = classification_report(
        y_test,
        y_pred,
        zero_division=0
    )

    print(report)

    cm = confusion_matrix(
        y_test,
        y_pred,
        labels=best_model.classes_
    )

    return metrics, report, y_pred, cm


# --------------------------------------------------
# 5. SAVE THE TUNED MODEL AND RESULTS
# --------------------------------------------------

def save_results(grid_search, metrics, report, y_test, y_pred, cm):

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    EVALUATION_DIR.mkdir(parents=True, exist_ok=True)

    best_model = grid_search.best_estimator_

    # Save the tuned model separately from the baseline.
    joblib.dump(best_model, MODEL_PATH)

    # Save model metadata and selected parameters.
    metadata = {
        "model_name": "Tuned Decision Tree",
        "best_parameters": grid_search.best_params_,
        "best_cross_validation_macro_f1": float(grid_search.best_score_),
        "feature_names": list(best_model.feature_names_in_),
        "disease_classes": best_model.classes_.tolist()
    }

    with open(
        MODEL_DIR / "decision_tree_tuned_metadata.json", "w"
    ) as file:
        json.dump(metadata, file, indent=4)

    # Save test metrics.
    metrics["best_cross_validation_macro_f1"] = float(
        grid_search.best_score_
    )

    with open(
        EVALUATION_DIR / "decision_tree_tuned_metrics.json", "w"
    ) as file:
        json.dump(metrics, file, indent=4)

    # Save detailed classification report.
    report_dict = classification_report(
        y_test,
        y_pred,
        output_dict=True,
        zero_division=0
    )

    with open(
        EVALUATION_DIR / "decision_tree_tuned_classification_report.json", "w"
    ) as file:
        json.dump(report_dict, file, indent=4)

    # Save confusion matrix.
    cm_df = pd.DataFrame(
        cm,
        index=best_model.classes_,
        columns=best_model.classes_
    )

    cm_df.to_csv(
        EVALUATION_DIR / "decision_tree_tuned_confusion_matrix.csv"
    )

    print("\nTuned model and evaluation files saved successfully!")
    print("Model:", MODEL_PATH)


# --------------------------------------------------
# 6. MAIN EXECUTION
# --------------------------------------------------

if __name__ == "__main__":

    X_train, X_test, y_train, y_test = load_data()

    grid_search = tune_model(X_train, y_train)

    best_model = grid_search.best_estimator_

    metrics, report, y_pred, cm = evaluate_model(
        best_model,
        X_test,
        y_test
    )

    save_results(
        grid_search,
        metrics,
        report,
        y_test,
        y_pred,
        cm
    )

    print("\nDecision Tree tuning pipeline completed!")
