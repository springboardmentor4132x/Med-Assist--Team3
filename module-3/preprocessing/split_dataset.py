
import pandas as pd
import json

from pathlib import Path
from sklearn.model_selection import train_test_split


# ----------------------------------
# 1. Define file paths
# ----------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

INPUT_FILE = (
    BASE_DIR / "dataset" / "processed" / "cleaned_dataset.csv"
)

OUTPUT_DIR = BASE_DIR / "dataset" / "processed"


# ----------------------------------
# 2. Load cleaned dataset
# ----------------------------------

def load_dataset():

    df = pd.read_csv(INPUT_FILE)

    print("Cleaned dataset loaded successfully!")
    print("Dataset shape:", df.shape)

    return df


# ----------------------------------
# 3. Separate features and target
# ----------------------------------

def separate_features_target(df):

    X = df.drop(columns=["prognosis"])
    y = df["prognosis"]

    print("\nNumber of symptom features:", X.shape[1])
    print("Number of disease classes:", y.nunique())

    return X, y


# ----------------------------------
# 4. Generate train/test split
# ----------------------------------

def create_split(X, y):

    # Every disease must have at least 2 records
    class_counts = y.value_counts()

    if class_counts.min() < 2:
        raise ValueError(
            "Some disease classes have fewer than 2 records. "
            "Stratified splitting is not possible."
        )

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y
    )

    print("\nTrain-test split completed!")

    return X_train, X_test, y_train, y_test


# ----------------------------------
# 5. Validate split
# ----------------------------------

def validate_split(X_train, X_test, y_train, y_test, y):

    print("\n------ SPLIT VALIDATION ------")

    print("Training records:", len(X_train))
    print("Testing records:", len(X_test))

    print("\nTraining distribution:")
    print(y_train.value_counts().sort_index())

    print("\nTesting distribution:")
    print(y_test.value_counts().sort_index())

    # Check for all disease classes
    assert set(y_train.unique()) == set(y.unique())
    assert set(y_test.unique()) == set(y.unique())

    # Check feature consistency
    assert list(X_train.columns) == list(X_test.columns)

    # Check for overlapping original row indices
    assert set(X_train.index).isdisjoint(set(X_test.index))

    print("\nAll validation checks passed!")


# ----------------------------------
# 6. Save split datasets
# ----------------------------------

def save_split(X_train, X_test, y_train, y_test):

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    X_train.to_csv(
        OUTPUT_DIR / "X_train.csv",
        index=False
    )

    X_test.to_csv(
        OUTPUT_DIR / "X_test.csv",
        index=False
    )

    y_train.to_frame().to_csv(
        OUTPUT_DIR / "y_train.csv",
        index=False
    )

    y_test.to_frame().to_csv(
        OUTPUT_DIR / "y_test.csv",
        index=False
    )

    # Save split configuration and feature order
    manifest = {
        "test_size": 0.20,
        "random_state": 42,
        "stratified": True,
        "target_column": "prognosis",
        "number_of_features": X_train.shape[1],
        "feature_names": list(X_train.columns),
        "number_of_disease_classes": int(y_train.nunique())
    }

    with open(OUTPUT_DIR / "split_manifest.json", "w") as file:
        json.dump(manifest, file, indent=4)

    print("\nAll split files saved successfully!")


# ----------------------------------
# 7. Main execution
# ----------------------------------

if __name__ == "__main__":

    df = load_dataset()

    X, y = separate_features_target(df)

    X_train, X_test, y_train, y_test = create_split(X, y)

    validate_split(X_train, X_test, y_train, y_test, y)

    save_split(X_train, X_test, y_train, y_test)

    print("\nShared dataset preparation completed!")
