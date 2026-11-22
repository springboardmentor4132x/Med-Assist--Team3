
import sys
from pathlib import Path

import joblib
import pandas as pd


# --------------------------------------------------
# 1. Define project paths
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[1]

MODEL_PATH = PROJECT_ROOT / "models" / "decision_tree_model.joblib"
X_TEST_PATH = PROJECT_ROOT / "dataset" / "processed" / "X_test.csv"
Y_TEST_PATH = PROJECT_ROOT / "dataset" / "processed" / "y_test.csv"


def main():

    print("\n========== DECISION TREE INFERENCE TEST ==========\n")

    # --------------------------------------------------
    # 2. Check required files
    # --------------------------------------------------

    for path in [MODEL_PATH, X_TEST_PATH, Y_TEST_PATH]:
        if not path.exists():
            raise FileNotFoundError(f"Required file not found: {path}")

    # --------------------------------------------------
    # 3. Load the saved model
    # --------------------------------------------------

    model = joblib.load(MODEL_PATH)

    print("Model loaded successfully.")

    # --------------------------------------------------
    # 4. Load test data
    # --------------------------------------------------

    X_test = pd.read_csv(X_TEST_PATH)
    y_test = pd.read_csv(Y_TEST_PATH).squeeze("columns")

    print(f"Test dataset shape: {X_test.shape}")

    # --------------------------------------------------
    # 5. Validate feature names and feature order
    # --------------------------------------------------

    if not hasattr(model, "feature_names_in_"):
        raise ValueError(
            "Model does not contain feature_names_in_. "
            "Cannot verify the original feature order."
        )

    expected_features = list(model.feature_names_in_)
    actual_features = list(X_test.columns)

    if actual_features != expected_features:
        raise ValueError(
            "Feature names or feature order do not match the trained model."
        )

    if X_test.shape[1] != 132:
        raise ValueError(
            f"Expected 132 symptom features, found {X_test.shape[1]}."
        )

    if len(X_test) != len(y_test):
        raise ValueError("X_test and y_test have different row counts.")

    print("Feature validation successful.")
    print(f"Number of symptom features: {len(expected_features)}")

    # --------------------------------------------------
    # 6. Select one existing test record
    # --------------------------------------------------

    sample_input = X_test.iloc[[0]]
    actual_disease = y_test.iloc[0]

    print("\nSample input selected from X_test.")
    print(f"Number of symptoms marked present: {int(sample_input.sum(axis=1).iloc[0])}")

    # --------------------------------------------------
    # 7. Generate prediction
    # --------------------------------------------------

    predicted_disease = model.predict(sample_input)[0]

    print("\n========== PREDICTION RESULT ==========")
    print(f"Predicted disease: {predicted_disease}")
    print(f"Actual test label: {actual_disease}")

    # --------------------------------------------------
    # 8. Generate top 3 model scores
    # --------------------------------------------------

    probabilities = model.predict_proba(sample_input)[0]
    disease_classes = model.classes_

    ranked_indices = probabilities.argsort()[::-1][:3]

    print("\n========== TOP 3 PREDICTIONS ==========")

    for rank, index in enumerate(ranked_indices, start=1):
        disease = disease_classes[index]
        score = probabilities[index] * 100

        print(f"{rank}. {disease}: {score:.2f}% model score")

    # --------------------------------------------------
    # 9. Final validation
    # --------------------------------------------------

    if predicted_disease == disease_classes[probabilities.argmax()]:
        print("\nPrediction and highest model score match.")
    else:
        raise ValueError("Prediction and probability output do not match.")

    print("\nInference test completed successfully.")

    print(
        "\nNOTE: These scores represent Decision Tree model output, "
        "not calibrated medical probabilities or diagnostic certainty."
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"\nERROR: {error}")
        sys.exit(1)
