
import json
from pathlib import Path

import joblib
import pandas as pd

from sklearn.tree import DecisionTreeClassifier
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

MODEL_PATH = MODEL_DIR / "decision_tree_model.joblib"


# --------------------------------------------------
# 2. LOAD THE SHARED TRAIN-TEST DATA
# --------------------------------------------------

def load_data():
    X_train = pd.read_csv(DATA_DIR / "X_train.csv")
    X_test = pd.read_csv(DATA_DIR / "X_test.csv")

    y_train = pd.read_csv(DATA_DIR / "y_train.csv")["prognosis"]
    y_test = pd.read_csv(DATA_DIR / "y_test.csv")["prognosis"]

    print("Shared dataset loaded successfully!")
    print("Training features:", X_train.shape)
    print("Testing features:", X_test.shape)

    # Ensure training and testing features have identical columns
    if list(X_train.columns) != list(X_test.columns):
        raise ValueError(
            "Training and testing feature columns do not match."
        )

    if len(X_train) != len(y_train) or len(X_test) != len(y_test):
        raise ValueError("Feature and target row counts do not match.")

    return X_train, X_test, y_train, y_test


# --------------------------------------------------
# 3. TRAIN THE DECISION TREE MODEL
# --------------------------------------------------

def train_model(X_train, y_train):
    model = DecisionTreeClassifier(
        criterion="gini",
        random_state=42
    )

    model.fit(X_train, y_train)

    print("\nDecision Tree model trained successfully!")
    print("Number of features:", model.n_features_in_)
    print("Number of disease classes:", len(model.classes_))

    return model


# --------------------------------------------------
# 4. EVALUATE THE MODEL
# --------------------------------------------------

def evaluate_model(model, X_test, y_test):
    y_pred = model.predict(X_test)

    metrics = {
        "model": "Decision Tree",
        "accuracy": accuracy_score(y_test, y_pred),
        "precision_macro": precision_score(
            y_test, y_pred, average="macro", zero_division=0
        ),
        "recall_macro": recall_score(
            y_test, y_pred, average="macro", zero_division=0
        ),
        "f1_macro": f1_score(
            y_test, y_pred, average="macro", zero_division=0
        ),
        "precision_weighted": precision_score(
            y_test, y_pred, average="weighted", zero_division=0
        ),
        "recall_weighted": recall_score(
            y_test, y_pred, average="weighted", zero_division=0
        ),
        "f1_weighted": f1_score(
            y_test, y_pred, average="weighted", zero_division=0
        )
    }

    print("\n========== DECISION TREE RESULTS ==========")

    for metric, value in metrics.items():
        if isinstance(value, float):
            print(f"{metric}: {value:.4f}")
        else:
            print(f"{metric}: {value}")

    print("\n========== CLASSIFICATION REPORT ==========")
    print(
        classification_report(
            y_test,
            y_pred,
            zero_division=0
        )
    )

    # Create a confusion matrix using all model classes
    cm = confusion_matrix(
        y_test,
        y_pred,
        labels=model.classes_
    )

    return metrics, y_pred, cm


# --------------------------------------------------
# 5. SAVE MODEL AND EVALUATION RESULTS
# --------------------------------------------------

def save_results(model, metrics, y_test, y_pred, cm):
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    EVALUATION_DIR.mkdir(parents=True, exist_ok=True)

    # Save trained model
    joblib.dump(model, MODEL_PATH)

    # Save model feature names and class labels
    metadata = {
        "model_name": "Decision Tree",
        "feature_names": list(model.feature_names_in_),
        "disease_classes": model.classes_.tolist(),
        "random_state": 42,
        "criterion": "gini"
    }

    with open(
        MODEL_DIR / "decision_tree_metadata.json", "w"
    ) as file:
        json.dump(metadata, file, indent=4)

    # Save overall evaluation metrics
    with open(
        EVALUATION_DIR / "decision_tree_metrics.json", "w"
    ) as file:
        json.dump(metrics, file, indent=4)

    # Save detailed classification report
    report = classification_report(
        y_test,
        y_pred,
        output_dict=True,
        zero_division=0
    )

    with open(
        EVALUATION_DIR / "decision_tree_classification_report.json", "w"
    ) as file:
        json.dump(report, file, indent=4)

    # Save confusion matrix as CSV
    cm_df = pd.DataFrame(
        cm,
        index=model.classes_,
        columns=model.classes_
    )

    cm_df.to_csv(
        EVALUATION_DIR / "decision_tree_confusion_matrix.csv"
    )

    print("\nModel and evaluation files saved successfully!")
    print("Model:", MODEL_PATH)
    print("Evaluation directory:", EVALUATION_DIR)


# --------------------------------------------------
# 6. MAIN EXECUTION
# --------------------------------------------------

if __name__ == "__main__":

    X_train, X_test, y_train, y_test = load_data()

    decision_tree = train_model(X_train, y_train)

    metrics, y_pred, cm = evaluate_model(
        decision_tree,
        X_test,
        y_test
    )

    save_results(
        decision_tree,
        metrics,
        y_test,
        y_pred,
        cm
    )

    print("\nDecision Tree pipeline completed!")
