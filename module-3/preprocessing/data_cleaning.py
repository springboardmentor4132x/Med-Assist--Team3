
import pandas as pd
import numpy as np
from pathlib import Path

# ----------------------------------
# 1. Define file paths
# ----------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

INPUT_FILE = BASE_DIR / "dataset" / "original" / "Training.csv"

OUTPUT_FILE = BASE_DIR / "dataset" / "processed" / "cleaned_dataset.csv"


# ----------------------------------
# 2. Load dataset
# ----------------------------------

def load_dataset():

    df = pd.read_csv(INPUT_FILE)

    print("Dataset loaded successfully!")
    print("Original Shape:", df.shape)

    return df


# ----------------------------------
# 3. Clean dataset
# ----------------------------------

def clean_dataset(df):

    df = df.copy()

    # Remove completely empty columns
    df = df.dropna(axis=1, how="all")

    # Clean column names
    df.columns = df.columns.str.strip()

    # Clean disease labels
    df["prognosis"] = (
        df["prognosis"].astype(str).str.strip()
    )

    # Remove exact duplicate records
    before = len(df)

    df = df.drop_duplicates()

    duplicates_removed = before - len(df)

    # Reset index
    df = df.reset_index(drop=True)

    print("\nData cleaning completed!")
    print("Duplicates removed:", duplicates_removed)
    print("Cleaned Shape:", df.shape)

    return df


# ----------------------------------
# 4. Validate dataset
# ----------------------------------

def validate_dataset(df):

    print("\n------ DATA VALIDATION ------")

    # Check missing values
    missing = df.isnull().sum().sum()

    print("Total missing values:", missing)

    if missing > 0:
        raise ValueError(
            "Missing values found. Investigate before proceeding."
        )

    # Separate features and target
    X = df.drop(columns=["prognosis"])
    y = df["prognosis"]

    # Validate binary symptom values
    unique_values = set(np.unique(X.to_numpy()))

    print("Unique symptom values:", unique_values)

    if not unique_values.issubset({0, 1}):
        raise ValueError(
            "Unexpected values found in symptom features."
        )

    # Check disease classes
    print("Number of symptom features:", X.shape[1])
    print("Number of disease classes:", y.nunique())

    # Check duplicates
    print("Remaining duplicates:", df.duplicated().sum())

    print("\nDataset validation successful!")


# ----------------------------------
# 5. Save cleaned dataset
# ----------------------------------

def save_dataset(df):

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    df.to_csv(OUTPUT_FILE, index=False)

    print("\nCleaned dataset saved at:")
    print(OUTPUT_FILE)


# ----------------------------------
# 6. Main execution
# ----------------------------------

if __name__ == "__main__":

    df = load_dataset()

    df_clean = clean_dataset(df)

    validate_dataset(df_clean)

    save_dataset(df_clean)
