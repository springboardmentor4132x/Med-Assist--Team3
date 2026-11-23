"""Standard Disease-Symptom Dataset for Module 3: Disease Prediction.

Based on the Kaggle 'Disease Prediction Using Symptoms' and 'Disease Symptoms & Patient Profile'
datasets, mapped to MedAssist AI's standardized 130+ clinical symptoms catalog.
"""

from typing import TypedDict


class DiseaseProfile(TypedDict):
    name: str
    category: str
    icd10: str
    description: str
    urgency_level: str  # low, moderate, high, emergency
    primary_symptoms: list[str]
    secondary_symptoms: list[str]


DISEASE_PROFILES: dict[str, DiseaseProfile] = {
    "Diabetes": {
        "name": "Diabetes Mellitus",
        "category": "Endocrine",
        "icd10": "E11",
        "description": "A metabolic disease causing high blood sugar due to inadequate insulin production or insulin resistance.",
        "urgency_level": "moderate",
        "primary_symptoms": ["polyuria", "polydipsia", "fatigue", "unexplained_weight_loss", "increased_appetite"],
        "secondary_symptoms": ["blurred_vision", "slow_healing", "itching", "lethargy", "numbness_tingling"],
    },
    "Hypertension": {
        "name": "Essential Hypertension",
        "category": "Cardiovascular",
        "icd10": "I10",
        "description": "Persistently elevated systemic arterial blood pressure requiring clinical monitoring.",
        "urgency_level": "moderate",
        "primary_symptoms": ["headache", "dizziness", "chest_pain", "palpitations"],
        "secondary_symptoms": ["blurred_vision", "fatigue", "nervousness", "insomnia"],
    },
    "Bronchial Asthma": {
        "name": "Bronchial Asthma",
        "category": "Respiratory",
        "icd10": "J45",
        "description": "Chronic inflammatory disease of the airways characterized by episodes of reversible airflow obstruction.",
        "urgency_level": "high",
        "primary_symptoms": ["wheezing", "breathlessness", "cough", "chest_tightness"],
        "secondary_symptoms": ["fatigue", "restlessness", "difficulty_sleeping", "tachypnea"],
    },
    "Pneumonia": {
        "name": "Community-Acquired Pneumonia",
        "category": "Respiratory",
        "icd10": "J18",
        "description": "Infection that inflames air sacs in one or both lungs, which may fill with fluid or purulent material.",
        "urgency_level": "high",
        "primary_symptoms": ["high_fever", "cough_with_sputum", "breathlessness", "chest_pain", "chills"],
        "secondary_symptoms": ["sweating", "fatigue", "loss_of_appetite", "malaise", "rapid_breathing"],
    },
    "Malaria": {
        "name": "Malaria",
        "category": "Infectious",
        "icd10": "B54",
        "description": "Life-threatening mosquito-borne infectious disease caused by Plasmodium parasites.",
        "urgency_level": "high",
        "primary_symptoms": ["high_fever", "chills", "sweating", "headache", "nausea"],
        "secondary_symptoms": ["vomiting", "muscle_pain", "diarrhea", "fatigue", "anemia"],
    },
    "Dengue": {
        "name": "Dengue Fever",
        "category": "Infectious",
        "icd10": "A90",
        "description": "Mosquito-borne viral infection causing severe flu-like illness and characteristic retro-orbital headache.",
        "urgency_level": "high",
        "primary_symptoms": ["high_fever", "joint_pain", "muscle_pain", "headache", "skin_rash"],
        "secondary_symptoms": ["nausea", "vomiting", "chills", "fatigue", "retro_orbital_pain", "loss_of_appetite"],
    },
    "Typhoid": {
        "name": "Typhoid Fever",
        "category": "Infectious",
        "icd10": "A01",
        "description": "Bacterial infection caused by Salmonella typhi characterized by sustained stepwise fever and abdominal pain.",
        "urgency_level": "high",
        "primary_symptoms": ["high_fever", "abdominal_pain", "headache", "fatigue", "diarrhea"],
        "secondary_symptoms": ["chills", "vomiting", "constipation", "loss_of_appetite", "rose_spots"],
    },
    "Tuberculosis": {
        "name": "Pulmonary Tuberculosis",
        "category": "Infectious",
        "icd10": "A15",
        "description": "Potentially serious infectious disease mainly affecting the lungs caused by Mycobacterium tuberculosis.",
        "urgency_level": "high",
        "primary_symptoms": ["chronic_cough", "blood_in_sputum", "night_sweats", "unexplained_weight_loss", "low_grade_fever"],
        "secondary_symptoms": ["fatigue", "loss_of_appetite", "chest_pain", "malaise"],
    },
    "Common Cold": {
        "name": "Upper Respiratory Tract Infection (Common Cold)",
        "category": "Respiratory",
        "icd10": "J00",
        "description": "Viral infectious disease of the upper respiratory tract primarily affecting the nose, throat, and sinuses.",
        "urgency_level": "low",
        "primary_symptoms": ["runny_nose", "sneezing", "sore_throat", "cough", "nasal_congestion"],
        "secondary_symptoms": ["mild_fever", "headache", "fatigue", "malaise", "watery_eyes"],
    },
    "GERD": {
        "name": "Gastroesophageal Reflux Disease (GERD)",
        "category": "Gastrointestinal",
        "icd10": "K21",
        "description": "Chronic digestive disease where stomach acid or bile irritates the mucosal food pipe lining.",
        "urgency_level": "low",
        "primary_symptoms": ["acidity", "heartburn", "acid_reflux", "regurgitation", "chest_discomfort"],
        "secondary_symptoms": ["difficulty_swallowing", "bloating", "belching", "cough", "throat_irritation"],
    },
    "Peptic Ulcer": {
        "name": "Peptic Ulcer Disease",
        "category": "Gastrointestinal",
        "icd10": "K27",
        "description": "Sores that develop on the lining of the stomach, lower esophagus, or small intestine.",
        "urgency_level": "moderate",
        "primary_symptoms": ["stomach_pain", "burning_sensation", "indigestion", "nausea", "loss_of_appetite"],
        "secondary_symptoms": ["vomiting", "bloating", "dark_stools", "weight_loss", "fatigue"],
    },
    "Gastroenteritis": {
        "name": "Acute Gastroenteritis",
        "category": "Gastrointestinal",
        "icd10": "A09",
        "description": "Inflammation of the gastrointestinal tract commonly known as stomach flu or food poisoning.",
        "urgency_level": "moderate",
        "primary_symptoms": ["diarrhea", "vomiting", "nausea", "abdominal_cramps", "dehydration"],
        "secondary_symptoms": ["mild_fever", "chills", "fatigue", "headache", "loss_of_appetite"],
    },
    "Migraine": {
        "name": "Migraine Headache Disorder",
        "category": "Neurological",
        "icd10": "G43",
        "description": "Neurological condition causing intense throbbing headache typically on one side of the head with sensory sensitivity.",
        "urgency_level": "moderate",
        "primary_symptoms": ["throbbing_headache", "photophobia", "phonophobia", "nausea", "visual_aura"],
        "secondary_symptoms": ["vomiting", "dizziness", "irritability", "blurred_vision", "neck_stiffness"],
    },
    "Heart Attack": {
        "name": "Acute Myocardial Infarction",
        "category": "Cardiovascular",
        "icd10": "I21",
        "description": "Medical emergency where blood flow to a part of the heart muscle is abruptly restricted.",
        "urgency_level": "emergency",
        "primary_symptoms": ["chest_pain", "radiating_arm_pain", "breathlessness", "cold_sweats", "chest_pressure"],
        "secondary_symptoms": ["dizziness", "nausea", "palpitations", "anxiety", "jaw_pain"],
    },
    "Jaundice": {
        "name": "Hepatic Jaundice",
        "category": "Hepatic",
        "icd10": "R17",
        "description": "Yellowish pigmentation of the skin and whites of the eyes caused by hyperbilirubinemia.",
        "urgency_level": "high",
        "primary_symptoms": ["yellowing_of_eyes", "yellowing_of_skin", "dark_urine", "pale_stools", "fatigue"],
        "secondary_symptoms": ["abdominal_pain", "itching", "loss_of_appetite", "nausea", "mild_fever"],
    },
    "Hepatitis": {
        "name": "Acute Viral Hepatitis",
        "category": "Hepatic",
        "icd10": "B19",
        "description": "Inflammatory liver condition typically resulting from viral infection or toxic substance exposure.",
        "urgency_level": "high",
        "primary_symptoms": ["yellowing_of_eyes", "dark_urine", "fatigue", "loss_of_appetite", "abdominal_pain"],
        "secondary_symptoms": ["nausea", "vomiting", "mild_fever", "joint_pain", "itching"],
    },
    "Urinary Tract Infection": {
        "name": "Urinary Tract Infection (UTI)",
        "category": "Renal / Urological",
        "icd10": "N39.0",
        "description": "Infection in any part of the urinary system, commonly the bladder and urethra.",
        "urgency_level": "moderate",
        "primary_symptoms": ["burning_urination", "frequent_urination", "pelvic_pain", "cloudy_urine", "urinary_urgency"],
        "secondary_symptoms": ["mild_fever", "fatigue", "strong_urine_odor", "lower_back_pain"],
    },
    "Arthritis": {
        "name": "Rheumatoid / Osteoarthritis",
        "category": "Musculoskeletal",
        "icd10": "M19",
        "description": "Inflammation or degeneration of one or more joints causing stiffness and pain.",
        "urgency_level": "moderate",
        "primary_symptoms": ["joint_pain", "joint_stiffness", "swelling_joints", "limited_joint_movement"],
        "secondary_symptoms": ["fatigue", "muscle_weakness", "warmth_around_joints", "morning_stiffness"],
    },
    "Allergy": {
        "name": "Allergic Rhinitis & Atopy",
        "category": "Immunological",
        "icd10": "T78.4",
        "description": "Immune system hypersensitivity response to environmental allergens.",
        "urgency_level": "low",
        "primary_symptoms": ["sneezing", "skin_rash", "itching", "runny_nose", "watery_eyes"],
        "secondary_symptoms": ["nasal_congestion", "cough", "facial_swelling", "hives"],
    },
    "COVID-19": {
        "name": "Coronavirus Disease (COVID-19)",
        "category": "Respiratory / Infectious",
        "icd10": "U07.1",
        "description": "Contagious respiratory and systemic disease caused by the SARS-CoV-2 coronavirus.",
        "urgency_level": "high",
        "primary_symptoms": ["fever", "cough", "breathlessness", "loss_of_smell", "loss_of_taste"],
        "secondary_symptoms": ["fatigue", "sore_throat", "headache", "body_aches", "nasal_congestion"],
    },
    "Hypothyroidism": {
        "name": "Hypothyroidism",
        "category": "Endocrine",
        "icd10": "E03.9",
        "description": "Underactive thyroid gland where the body does not produce enough vital thyroid hormones.",
        "urgency_level": "moderate",
        "primary_symptoms": ["unexplained_weight_gain", "cold_intolerance", "fatigue", "constipation", "dry_skin"],
        "secondary_symptoms": ["muscle_weakness", "puffy_face", "depression", "brittle_hair", "bradycardia"],
    },
    "Hyperthyroidism": {
        "name": "Hyperthyroidism (Thyrotoxicosis)",
        "category": "Endocrine",
        "icd10": "E05.9",
        "description": "Overactive thyroid gland producing excessive quantities of free thyroid hormones.",
        "urgency_level": "moderate",
        "primary_symptoms": ["unexplained_weight_loss", "tachycardia", "heat_intolerance", "nervousness", "palpitations"],
        "secondary_symptoms": ["tremors", "sweating", "increased_appetite", "insomnia", "frequent_bowel_movements"],
    },
}

# Master list of all unique symptoms involved across the disease models
ALL_DISEASE_SYMPTOMS: list[str] = sorted(
    list(
        set(
            symptom
            for profile in DISEASE_PROFILES.values()
            for symptom in profile["primary_symptoms"] + profile["secondary_symptoms"]
        )
    )
)
