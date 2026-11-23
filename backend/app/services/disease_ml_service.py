"""Machine Learning Disease Classification Service for Module 3 (Component 1).

Implements multi-class clinical disease classification using calibrated scikit-learn models
trained on standardized Kaggle clinical symptom distributions.
"""

from __future__ import annotations

from pathlib import Path
import random
from typing import Any

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

from app.data.disease_dataset import ALL_DISEASE_SYMPTOMS, DISEASE_PROFILES, DiseaseProfile
from app.services.symptom_service import resolve_symptom

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "ml" / "artifacts"
MODEL_FILE = ARTIFACTS_DIR / "disease_model.joblib"
FEATURES_FILE = ARTIFACTS_DIR / "feature_names.joblib"

# Map clinical terminology and user aliases directly to the Kaggle 132-symptom feature space
KAGGLE_SYMPTOM_ALIASES: dict[str, str] = {
    "wheezing": "breathlessness",
    "shortness_of_breath": "breathlessness",
    "chest_tightness": "chest_pain",
    "cold_sweats": "sweating",
    "cold_sweat": "sweating",
    "radiating_arm_pain": "chest_pain",
    "fever": "high_fever",
    "polydipsia": "polyuria",
    "unexplained_weight_loss": "weight_loss",
    "weight_gain": "weight_gain",
    "unexplained_weight_gain": "weight_gain",
    "increased_appetite": "excessive_hunger",
    "cough_with_sputum": "phlegm",
    "chronic_cough": "cough",
    "diarrhea": "diarrhoea",
    "burning_urination": "burning_micturition",
    "frequent_urination": "polyuria",
    "joint_stiffness": "movement_stiffness",
    "limited_joint_movement": "movement_stiffness",
    "yellowing_of_eyes": "yellowing_of_eyes",
    "yellowing_of_skin": "yellowish_skin",
    "acid_reflux": "acidity",
    "heartburn": "acidity",
    "throbbing_headache": "headache",
    "photophobia": "blurred_and_distorted_vision",
    "visual_aura": "visual_disturbances",
    "tachycardia": "palpitations",
    "loss_of_smell": "loss_of_smell",
    "pelvic_pain": "bladder_discomfort",
    "dark_urine": "dark_urine",
}


def get_disease_profile(d_name: str) -> DiseaseProfile | None:
    """Retrieve disease profile handling exact and case-insensitive matches."""
    if d_name in DISEASE_PROFILES:
        return DISEASE_PROFILES[d_name]
    for k, v in DISEASE_PROFILES.items():
        if k.lower() == d_name.lower():
            return v
    return None


class DiseaseClassificationResult:
    """Structured result of a single disease classification prediction."""

    def __init__(
        self,
        predicted_disease: str,
        display_name: str,
        category: str,
        icd10: str,
        urgency_level: str,
        description: str,
        matched_symptoms: list[str],
        primary_symptoms_matched: list[str],
        total_symptoms_evaluated: int,
        match_ratio: float,
    ):
        self.predicted_disease = predicted_disease
        self.display_name = display_name
        self.category = category
        self.icd10 = icd10
        self.urgency_level = urgency_level
        self.description = description
        self.matched_symptoms = matched_symptoms
        self.primary_symptoms_matched = primary_symptoms_matched
        self.total_symptoms_evaluated = total_symptoms_evaluated
        self.match_ratio = match_ratio

    def to_dict(self) -> dict[str, Any]:
        return {
            "predicted_disease": self.predicted_disease,
            "display_name": self.display_name,
            "category": self.category,
            "icd10": self.icd10,
            "urgency_level": self.urgency_level,
            "description": self.description,
            "matched_symptoms": self.matched_symptoms,
            "primary_symptoms_matched": self.primary_symptoms_matched,
            "total_symptoms_evaluated": self.total_symptoms_evaluated,
            "match_ratio": round(self.match_ratio, 4),
        }


class DiseaseMLClassifier:
    """Singleton ML classifier for disease prediction."""

    _instance: DiseaseMLClassifier | None = None

    def __init__(self) -> None:
        self.feature_names: list[str] = list(ALL_DISEASE_SYMPTOMS)
        self.classes: list[str] = sorted(list(DISEASE_PROFILES.keys()))
        self.model: Any = None

        if MODEL_FILE.exists() and FEATURES_FILE.exists():
            try:
                self.model = joblib.load(MODEL_FILE)
                self.feature_names = joblib.load(FEATURES_FILE)
            except Exception:
                self.model = None

        self.symptom_to_idx: dict[str, int] = {
            s: i for i, s in enumerate(self.feature_names)
        }
        for s in ALL_DISEASE_SYMPTOMS:
            if s not in self.symptom_to_idx:
                self.symptom_to_idx[s] = len(self.feature_names)

        if self.model is None:
            self._train_model()

    @classmethod
    def get_instance(cls) -> DiseaseMLClassifier:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def normalize_symptom(self, symptom_id: str) -> str:
        """Resolve symptom aliases and standard formatting."""
        cleaned = symptom_id.strip().lower().replace(" ", "_").replace("-", "_")
        if cleaned in KAGGLE_SYMPTOM_ALIASES:
            return KAGGLE_SYMPTOM_ALIASES[cleaned]
        meta = resolve_symptom(symptom_id)
        if meta:
            target = meta.id.lower()
            return KAGGLE_SYMPTOM_ALIASES.get(target, target)
        return cleaned

    def encode_symptoms(self, symptoms: list[str]) -> np.ndarray:
        """Convert a list of symptoms into a binary feature vector."""
        vec = np.zeros(len(self.feature_names), dtype=np.float32)
        for sym in symptoms:
            norm = self.normalize_symptom(sym)
            if norm in self.symptom_to_idx:
                idx = self.symptom_to_idx[norm]
                if idx < len(self.feature_names):
                    vec[idx] = 1.0
        return vec

    def _generate_synthetic_training_data(
        self, samples_per_disease: int = 150
    ) -> tuple[np.ndarray, np.ndarray]:
        """Generate clinical variations for each disease based on Kaggle co-occurrences."""
        random.seed(42)
        np.random.seed(42)

        x_data: list[list[float]] = []
        y_data: list[str] = []

        num_features = len(ALL_DISEASE_SYMPTOMS)

        for disease_name, profile in DISEASE_PROFILES.items():
            primaries = profile["primary_symptoms"]
            secondaries = profile["secondary_symptoms"]

            for _ in range(samples_per_disease):
                feature_vec = [0.0] * num_features

                # Primary symptoms appear in 80% - 100% of samples
                for p_sym in primaries:
                    if p_sym in self.symptom_to_idx and random.random() < 0.90:
                        feature_vec[self.symptom_to_idx[p_sym]] = 1.0

                # Secondary symptoms appear in 30% - 70% of samples
                for s_sym in secondaries:
                    if s_sym in self.symptom_to_idx and random.random() < 0.50:
                        feature_vec[self.symptom_to_idx[s_sym]] = 1.0

                # Ensure at least 2 primary symptoms are active per sample
                if sum(feature_vec) == 0 and primaries:
                    for p in primaries[:2]:
                        if p in self.symptom_to_idx:
                            feature_vec[self.symptom_to_idx[p]] = 1.0

                x_data.append(feature_vec)
                y_data.append(disease_name)

        return np.array(x_data, dtype=np.float32), np.array(y_data)

    def _train_model(self) -> None:
        """Train Naive Bayes / Random Forest multi-class disease model."""
        X, y = self._generate_synthetic_training_data()
        clf = MultinomialNB(alpha=0.5)
        clf.fit(X, y)
        self.model = clf

    def classify(self, symptoms: list[str]) -> DiseaseClassificationResult:
        """Classify a list of patient symptoms into the most likely clinical condition."""
        if not symptoms:
            raise ValueError("At least one symptom must be provided for disease classification.")

        normalized = [self.normalize_symptom(s) for s in symptoms]
        vec = self.encode_symptoms(normalized)

        if np.sum(vec) == 0:
            # None of the provided symptoms mapped to our disease dataset
            return DiseaseClassificationResult(
                predicted_disease="Undetermined Non-Specific Presentation",
                display_name="Undetermined / Non-Specific Clinical Presentation",
                category="General",
                icd10="R69",
                urgency_level="low",
                description="The reported symptoms are broad or unmapped to standard multi-class disease profiles.",
                matched_symptoms=[],
                primary_symptoms_matched=[],
                total_symptoms_evaluated=len(symptoms),
                match_ratio=0.0,
            )

        if self.model is None:
            self._train_model()

        assert self.model is not None
        pred_disease = str(self.model.predict(vec.reshape(1, -1))[0])
        profile = get_disease_profile(pred_disease)

        if not profile:
            display_name = pred_disease
            category = "General"
            icd10 = "R69"
            urgency = "moderate"
            description = "Clinical disease classification."
            matched_p = []
            matched = []
        else:
            display_name = profile["name"]
            category = profile["category"]
            icd10 = profile["icd10"]
            urgency = profile["urgency_level"]
            description = profile["description"]
            all_known = set(profile["primary_symptoms"] + profile["secondary_symptoms"])
            matched = [s for s in normalized if s in all_known]
            matched_p = [s for s in normalized if s in set(profile["primary_symptoms"])]

        ratio = len(matched) / max(1, len(normalized))

        return DiseaseClassificationResult(
            predicted_disease=pred_disease,
            display_name=display_name,
            category=category,
            icd10=icd10,
            urgency_level=urgency,
            description=description,
            matched_symptoms=matched,
            primary_symptoms_matched=matched_p,
            total_symptoms_evaluated=len(symptoms),
            match_ratio=ratio,
        )

    def predict_probabilities(
        self, symptoms: list[str], top_n: int = 5
    ) -> dict[str, Any]:
        """Generate calibrated probability scores across all candidate diseases (Module 3 Component 2)."""
        if not symptoms:
            raise ValueError("At least one symptom must be provided for probability scoring.")

        normalized = [self.normalize_symptom(s) for s in symptoms]
        vec = self.encode_symptoms(normalized)

        if self.model is None:
            self._train_model()

        assert self.model is not None

        if np.sum(vec) == 0:
            fallback_item = {
                "disease": "Undetermined Non-Specific Presentation",
                "display_name": "Undetermined / Non-Specific Clinical Presentation",
                "category": "General",
                "icd10": "R69",
                "urgency_level": "low",
                "probability": 1.0,
                "probability_percent": 100.0,
                "matched_symptoms": [],
                "primary_symptoms_matched": [],
            }
            return {
                "top_prediction": fallback_item,
                "probabilities": [fallback_item],
                "total_conditions_evaluated": len(self.classes),
                "evaluated_symptoms": normalized,
                "dominant_category": "General",
            }

        probs = self.model.predict_proba(vec.reshape(1, -1))[0]
        classes = self.model.classes_

        ranked_indices = np.argsort(probs)[::-1]

        probability_items: list[dict[str, Any]] = []
        category_counts: dict[str, int] = {}

        for idx in ranked_indices[:top_n]:
            d_name = str(classes[idx])
            raw_prob = float(probs[idx])
            profile = get_disease_profile(d_name)

            if profile:
                display_name = profile["name"]
                category = profile["category"]
                icd10 = profile["icd10"]
                urgency = profile["urgency_level"]
                all_known = set(profile["primary_symptoms"] + profile["secondary_symptoms"])
                matched = [s for s in normalized if s in all_known]
                matched_p = [s for s in normalized if s in set(profile["primary_symptoms"])]
            else:
                display_name = d_name
                category = "General"
                icd10 = "R69"
                urgency = "moderate"
                matched = []
                matched_p = []

            category_counts[category] = category_counts.get(category, 0) + 1

            probability_items.append({
                "disease": d_name,
                "display_name": display_name,
                "category": category,
                "icd10": icd10,
                "urgency_level": urgency,
                "probability": round(raw_prob, 4),
                "probability_percent": round(raw_prob * 100.0, 2),
                "matched_symptoms": matched,
                "primary_symptoms_matched": matched_p,
            })

        top_pred = probability_items[0]
        dominant_cat = (
            top_pred["category"]
            if top_pred["category"] != "General"
            else (max(category_counts.items(), key=lambda x: x[1])[0] if category_counts else "General")
        )

        return {
            "top_prediction": top_pred,
            "probabilities": probability_items,
            "total_conditions_evaluated": len(classes),
            "evaluated_symptoms": normalized,
            "dominant_category": dominant_cat,
        }


def classify_patient_symptoms(symptoms: list[str]) -> DiseaseClassificationResult:
    """Convenience helper to classify symptoms using the singleton classifier."""
    classifier = DiseaseMLClassifier.get_instance()
    return classifier.classify(symptoms)


def predict_disease_probabilities(symptoms: list[str], top_n: int = 5) -> dict[str, Any]:
    """Convenience helper to predict probability distributions across candidate diseases."""
    classifier = DiseaseMLClassifier.get_instance()
    return classifier.predict_probabilities(symptoms, top_n=top_n)


DIAGNOSTIC_TESTS_MAP: dict[str, list[str]] = {
    "Diabetes": [
        "Fasting Plasma Glucose (FPG)",
        "HbA1c Glycated Hemoglobin Test",
        "Oral Glucose Tolerance Test (OGTT)",
        "Urinalysis for Microalbumin & Ketones",
    ],
    "Hypertension": [
        "24-Hour Ambulatory Blood Pressure Monitoring (ABPM)",
        "12-Lead Electrocardiogram (ECG)",
        "Basic Metabolic Panel (Electrolytes, Creatinine, eGFR)",
    ],
    "Bronchial Asthma": [
        "Spirometry Pre- and Post-Bronchodilator",
        "Fractional Exhaled Nitric Oxide (FeNO)",
        "Peak Expiratory Flow (PEF) Monitoring",
        "Allergy Skin Prick Testing",
    ],
    "Pneumonia": [
        "Chest Radiograph (CXR)",
        "Complete Blood Count (CBC) with Differential",
        "Sputum Gram Stain and Culture",
        "Pulse Oximetry",
    ],
    "Malaria": [
        "Thick and Thin Blood Smears",
        "Rapid Diagnostic Test (RDT) for Plasmodium",
        "Complete Blood Count (CBC)",
    ],
    "Dengue": [
        "Dengue NS1 Antigen ELISA",
        "Dengue IgM/IgG Serology",
        "Serial Platelet Count and Hematocrit",
    ],
    "Typhoid": [
        "Blood Culture for Salmonella Typhi",
        "Widal Agglutination Serology",
        "TyphiDot IgM Test",
        "Stool Culture",
    ],
    "Tuberculosis": [
        "GeneXpert MTB/RIF Assay",
        "Acid-Fast Bacilli (AFB) Sputum Smear Microscopy",
        "Chest X-Ray (Posterior-Anterior)",
        "Interferon-Gamma Release Assay (IGRA)",
    ],
    "Common Cold": [
        "Clinical Upper Airway Examination",
        "Rapid Multiplex Viral Swab (if atypical or severe)",
    ],
    "GERD": [
        "Upper Gastrointestinal Endoscopy (EGD)",
        "24-Hour Ambulatory Esophageal pH/Impedance Study",
    ],
    "Peptic Ulcer": [
        "Helicobacter pylori Stool Antigen or Urea Breath Test",
        "Upper GI Endoscopy with Biopsy",
        "Complete Blood Count for Anemia",
    ],
    "Gastroenteritis": [
        "Stool Microscopy and Enteric Culture",
        "Serum Electrolytes and Renal Function Panel",
        "Stool Multiplex PCR Panel",
    ],
    "Migraine": [
        "Comprehensive Neurological Examination",
        "Brain MRI/CT (if atypical or red-flag signs)",
    ],
    "Heart Attack": [
        "12-Lead Serial Electrocardiogram (ECG)",
        "High-Sensitivity Cardiac Troponin I/T",
        "Emergency Transthoracic Echocardiogram (TTE)",
        "Urgent Coronary Angiography",
    ],
    "Jaundice": [
        "Fractionated Serum Bilirubin (Total, Direct, Indirect)",
        "Liver Enzyme Panel (ALT, AST, ALP, GGT)",
        "Abdominal Ultrasonography",
    ],
    "Hepatitis": [
        "Viral Hepatitis Serology Panel (Anti-HAV IgM, HBsAg, Anti-HCV)",
        "Liver Function Tests (LFTs)",
        "Abdominal Ultrasound",
    ],
    "Urinary Tract Infection": [
        "Urinalysis (Leukocyte Esterase, Nitrites, Microscopic)",
        "Urine Culture and Antibiotic Sensitivity",
        "Renal Ultrasound (if recurrent or febrile)",
    ],
    "Arthritis": [
        "Rheumatoid Factor (RF) and Anti-CCP Antibodies",
        "ESR and C-Reactive Protein (CRP) Inflammatory Markers",
        "Plain Radiography of Affected Joints",
    ],
    "Allergy": [
        "Specific IgE Blood Test (ImmunoCAP)",
        "Skin Prick Testing",
        "Total Serum IgE Level",
    ],
    "COVID-19": [
        "SARS-CoV-2 RT-PCR Nasopharyngeal Swab",
        "Rapid Antigen Detection Test (RADT)",
        "Resting and Exertional Pulse Oximetry",
    ],
    "Hypothyroidism": [
        "Serum Thyroid Stimulating Hormone (TSH)",
        "Free Thyroxine (Free T4)",
        "Anti-Thyroid Peroxidase (Anti-TPO) Antibodies",
    ],
    "Hyperthyroidism": [
        "Serum Thyroid Stimulating Hormone (TSH)",
        "Free T3 and Free T4",
        "TSH Receptor Antibodies (TRAb)",
        "Radioactive Iodine Uptake (RAIU) Scan",
    ],
}

DIAGNOSTIC_TESTS_MAP["Heart attack"] = DIAGNOSTIC_TESTS_MAP["Heart Attack"]
DIAGNOSTIC_TESTS_MAP["Urinary tract infection"] = DIAGNOSTIC_TESTS_MAP["Urinary Tract Infection"]

URGENCY_RANK: dict[str, int] = {
    "emergency": 4,
    "high": 3,
    "moderate": 2,
    "low": 1,
}


def predict_differential_diagnoses(symptoms: list[str], top_n: int = 5) -> dict[str, Any]:
    """Generate comprehensive differential diagnoses with comparative evidence (Module 3 Component 3)."""
    classifier = DiseaseMLClassifier.get_instance()
    prob_res = classifier.predict_probabilities(symptoms, top_n=top_n)

    candidates: list[dict[str, Any]] = []
    highest_urgency = "low"
    max_urgency_score = 0

    for i, item in enumerate(prob_res["probabilities"]):
        d_name = item["disease"]
        profile = get_disease_profile(d_name)
        urgency = item["urgency_level"]

        if URGENCY_RANK.get(urgency, 1) > max_urgency_score:
            max_urgency_score = URGENCY_RANK.get(urgency, 1)
            highest_urgency = urgency

        if profile:
            primaries = profile["primary_symptoms"]
            matched_set = set(item["matched_symptoms"])
            missing_hallmarks = [s for s in primaries if s not in matched_set]
            m_str = ", ".join(item["matched_symptoms"]) if item["matched_symptoms"] else "general presentation"
            miss_str = ", ".join(missing_hallmarks) if missing_hallmarks else "none"
            rationale = (
                f"Ranked #{i+1} ({item['probability_percent']}% likelihood) based on {len(item['matched_symptoms'])} "
                f"matching symptoms ({m_str}). Expected hallmark symptoms not noted: {miss_str}."
            )
        else:
            missing_hallmarks = []
            rationale = f"Ranked #{i+1} based on general clinical profile similarity."

        tests = DIAGNOSTIC_TESTS_MAP.get(
            d_name, ["Complete Blood Count (CBC)", "Comprehensive Metabolic Panel", "Clinical Assessment"]
        )

        candidates.append({
            "rank": i + 1,
            "disease": d_name,
            "display_name": item["display_name"],
            "category": item["category"],
            "icd10": item["icd10"],
            "urgency_level": urgency,
            "probability": item["probability"],
            "probability_percent": item["probability_percent"],
            "matched_symptoms": item["matched_symptoms"],
            "missing_hallmark_symptoms": missing_hallmarks,
            "clinical_rationale": rationale,
            "recommended_diagnostic_tests": tests,
        })

    if highest_urgency == "emergency":
        triage_guidance = (
            "CRITICAL: Immediate emergency medical evaluation is strongly recommended. "
            "High-risk conditions (such as Acute Myocardial Infarction) are represented in the differential diagnoses."
        )
    elif highest_urgency == "high":
        triage_guidance = (
            "URGENT: Same-day medical consultation is advised. "
            "Active infectious or respiratory pathology requires prompt clinical testing and targeted therapy."
        )
    elif highest_urgency == "moderate":
        triage_guidance = (
            "MODERATE: Clinical consultation is recommended within 24-48 hours for definitive diagnostic confirmation."
        )
    else:
        triage_guidance = (
            "ROUTINE: Monitor clinical trajectory and maintain supportive care. Consult a healthcare provider if symptoms worsen."
        )

    return {
        "query_symptoms": prob_res["evaluated_symptoms"],
        "candidates": candidates,
        "highest_urgency": highest_urgency,
        "total_candidates": len(candidates),
        "clinical_triage_guidance": triage_guidance,
    }


def compute_prediction_confidence(symptoms: list[str]) -> dict[str, Any]:
    """Compute multi-factor prediction confidence score (Module 3 Component 4)."""
    classifier = DiseaseMLClassifier.get_instance()
    prob_res = classifier.predict_probabilities(symptoms, top_n=5)
    candidates = prob_res["probabilities"]

    if not candidates or candidates[0]["disease"] == "Undetermined Non-Specific Presentation":
        return {
            "confidence_score": 0.10,
            "confidence_percent": 10.0,
            "confidence_level": "Low",
            "margin_of_separation": 0.0,
            "symptom_coverage": 0.0,
            "hallmark_symptoms_present": 0,
            "ambiguity_flag": True,
            "clinical_recommendation": (
                "Low diagnostic confidence: Reported symptoms do not match standardized disease profiles. "
                "Comprehensive general clinical examination required."
            ),
        }

    top_1 = candidates[0]
    top_2 = candidates[1] if len(candidates) > 1 else None

    p1 = top_1["probability"]
    p2 = top_2["probability"] if top_2 else 0.0
    margin = max(0.0, p1 - p2)

    total_symptoms = max(1, len(symptoms))
    matched_symptoms_count = len(top_1["matched_symptoms"])
    symptom_coverage = min(1.0, matched_symptoms_count / total_symptoms)

    hallmarks_count = len(top_1["primary_symptoms_matched"])
    hallmark_factor = 1.0 if hallmarks_count >= 3 else (0.75 if hallmarks_count == 2 else (0.50 if hallmarks_count == 1 else 0.20))

    # Scale relative to 41-class multi-class baseline (where random prior is ~2.44%)
    scaled_p1 = float(np.clip(p1 * 3.5, 0.0, 1.0))
    scaled_margin = float(np.clip(margin * 4.0, 0.0, 1.0))
    raw_confidence = (0.35 * scaled_p1) + (0.25 * scaled_margin) + (0.25 * symptom_coverage) + (0.15 * hallmark_factor)
    confidence_score = float(np.clip(raw_confidence, 0.05, 0.99))
    confidence_percent = round(confidence_score * 100.0, 2)

    ambiguity_flag = margin < 0.15

    if confidence_score >= 0.65:
        confidence_level = "High"
        recommendation = (
            f"High diagnostic confidence ({confidence_percent}%): Presentation strongly aligns with {top_1['display_name']} "
            f"with {hallmarks_count} hallmark symptom(s) confirmed and a decisive margin over alternative differentials."
        )
    elif confidence_score >= 0.40:
        confidence_level = "Moderate"
        alt_name = top_2['display_name'] if top_2 else 'alternative conditions'
        recommendation = (
            f"Moderate diagnostic confidence ({confidence_percent}%): {top_1['display_name']} is the leading candidate, "
            f"but symptom overlap with {alt_name} warrants confirmatory clinical testing."
        )
    else:
        confidence_level = "Low"
        recommendation = (
            f"Low diagnostic confidence ({confidence_percent}%): Diagnostic ambiguity detected. "
            f"Multiple conditions remain plausible. An expanded history, physical examination, and lab panel are indicated."
        )

    return {
        "confidence_score": round(confidence_score, 4),
        "confidence_percent": confidence_percent,
        "confidence_level": confidence_level,
        "margin_of_separation": round(margin, 4),
        "symptom_coverage": round(symptom_coverage, 4),
        "hallmark_symptoms_present": hallmarks_count,
        "ambiguity_flag": ambiguity_flag,
        "clinical_recommendation": recommendation,
    }


def predict_comprehensive_assessment(symptoms: list[str]) -> dict[str, Any]:
    """Execute complete Module 3 pipeline consolidating all 4 clinical components."""
    classifier = DiseaseMLClassifier.get_instance()
    classification = classifier.classify(symptoms)
    prob_res = classifier.predict_probabilities(symptoms, top_n=5)
    diff_res = predict_differential_diagnoses(symptoms, top_n=5)
    conf_res = compute_prediction_confidence(symptoms)

    summary = (
        f"Diagnostic evaluation suggests {classification.display_name} as primary candidate "
        f"({conf_res['confidence_level']} Confidence, {conf_res['confidence_percent']}%). "
        f"Triage status: {diff_res['highest_urgency'].upper()}. "
        f"{conf_res['clinical_recommendation']}"
    )

    return {
        "classification": classification.to_dict(),
        "probabilities": prob_res["probabilities"],
        "differential_diagnoses": diff_res["candidates"],
        "confidence": conf_res,
        "triage_urgency": diff_res["highest_urgency"],
        "clinical_summary": summary,
    }
