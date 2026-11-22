# Module 3 – Disease Prediction

## Overview

The Disease Prediction Module is a component of **MedAssist AI – Medical Symptom Analysis and Disease Prediction System**.

It uses machine learning algorithms to analyze user-provided symptoms and predict possible disease categories. The module also aims to generate prediction scores, display multiple possible diseases and provide confidence indicators.

## Objectives

- Predict possible diseases based on user symptoms.
- Generate model-based probability scores where supported.
- Display multiple disease predictions.
- Provide prediction confidence indicators.
- Integrate the selected machine learning model with the FastAPI backend.

## Dataset

**Dataset:** [Disease Prediction Using Machine Learning – Kaggle](https://www.kaggle.com/datasets/kaushil268/disease-prediction-using-machine-learning)

Dataset characteristics after preprocessing:

| Property         | Details |
| ---------------- | ------: |
| Records          |     304 |
| Symptom features |     132 |
| Disease classes  |      41 |
| Training samples |     243 |
| Testing samples  |      61 |
| Train-test split |   80:20 |

## Technology Stack

- **Language:** Python
- **Data Processing:** Pandas, NumPy
- **Machine Learning:** Scikit-learn, XGBoost
- **Model Serialization:** Joblib
- **Backend Integration:** FastAPI

## Module Workflow

1. Dataset exploration and preprocessing.
2. Feature and target separation.
3. Training and testing dataset preparation.
4. Machine learning model development.
5. Model evaluation and comparison.
6. Selection of the most suitable model.
7. Disease prediction and score generation.
8. FastAPI integration with user symptom input.

## Machine Learning Models

The following classification algorithms are being developed and evaluated:

- Decision Tree
- Random Forest
- Support Vector Machine (SVM)
- XGBoost

Models will be compared using common evaluation metrics to identify the most suitable model.

## Evaluation Metrics

- Accuracy
- Precision
- Recall
- F1-score
- Confusion Matrix

Both macro and weighted evaluation metrics are considered for model comparison.

## Project Structure

```text
module-3/
│
├── dataset/
│   ├── original/
│   └── processed/
│
├── preprocessing/
│
├── models/
│
├── evaluation/
│
├── documentation/
│
└── README.md
```

## Integration

The module receives processed symptom information from Module 2.

The symptoms are converted into the feature format expected by the selected trained model. The model generates possible disease predictions and corresponding scores.

The prediction results are then passed to Module 4 – Risk Assessment.

**Workflow:**

Module 2 → Module 3 (Disease Prediction) → Module 4 (Risk Assessment)

## Expected Deliverables

- Cleaned and processed dataset.
- Trained and evaluated classification models.
- Model comparison and documentation.
- Disease classification and multiple predictions.
- Prediction score and confidence generation.
- Saved trained model.
- FastAPI integration.
- End-to-end testing.

## Disclaimer

MedAssist AI is designed as a preliminary healthcare decision-support application. Model predictions and scores are not confirmed medical diagnoses and should not replace professional medical advice.
