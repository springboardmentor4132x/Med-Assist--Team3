import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import StratifiedKFold
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import LinearSVC
from sklearn.tree import DecisionTreeClassifier

warnings.filterwarnings("ignore")

APP_DIR = Path(__file__).resolve().parents[1]  # backend/app
DATA = APP_DIR / "data" / "kaggle" / "Training.csv"
print("Reading:", DATA)

df = pd.read_csv(DATA)
df = df.loc[:, ~df.columns.str.contains("^Unnamed")]
target = "prognosis" if "prognosis" in df.columns else df.columns[-1]

print("Target column:", target)
print("Rows before removing duplicates:", len(df))
df = df.drop_duplicates().reset_index(drop=True)
print("Rows after removing duplicates :", len(df))
print("Number of diseases:", df[target].nunique())

X = df.drop(columns=[target]).values
y = df[target].astype(str).values

min_count = pd.Series(y).value_counts().min()
n_splits = int(min(5, min_count))
print("Smallest class size:", min_count, "| CV folds used:", n_splits)
if n_splits < 2:
    raise SystemExit("Some disease has only 1 unique row, so cross-validation is not possible.")

models = {
    "Random Forest": lambda: RandomForestClassifier(n_estimators=100, random_state=42),
    "Decision Tree": lambda: DecisionTreeClassifier(random_state=42),
    "Naive Bayes": lambda: MultinomialNB(alpha=0.5),
    "SVM (calibrated LinearSVC)": lambda: CalibratedClassifierCV(
        LinearSVC(dual=False, random_state=42), cv=min(3, n_splits)),
}

cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
rows = []
for name, make in models.items():
    acc, pre, rec, f1, top3 = [], [], [], [], []
    for tr, te in cv.split(X, y):
        m = make()
        m.fit(X[tr], y[tr])
        pred = m.predict(X[te])
        acc.append(accuracy_score(y[te], pred))
        pre.append(precision_score(y[te], pred, average="weighted", zero_division=0))
        rec.append(recall_score(y[te], pred, average="weighted", zero_division=0))
        f1.append(f1_score(y[te], pred, average="weighted", zero_division=0))
        proba = m.predict_proba(X[te])
        top = np.argsort(proba, axis=1)[:, ::-1][:, :3]
        top3.append(np.mean([y[te][i] in m.classes_[top[i]] for i in range(len(te))]))
    rows.append({
        "Model": name,
        "Accuracy": round(np.mean(acc) * 100, 2),
        "Precision": round(np.mean(pre) * 100, 2),
        "Recall": round(np.mean(rec) * 100, 2),
        "F1": round(np.mean(f1) * 100, 2),
        "Top-3 acc": round(np.mean(top3) * 100, 2),
    })

print()
print(pd.DataFrame(rows).to_string(index=False))
