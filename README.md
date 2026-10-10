# FLOWFIT — AI Fashion Fit Intelligence

> **Know the fit before you wear it.**

FLOWFIT is an AI-powered fashion fit intelligence system that predicts clothing fit using body measurements, garment information, and historical fashion-fit data.

The project uses the **Rent the Runway clothing fit dataset** and combines machine learning, FastAPI, and a premium web interface to provide personalized fit analysis and size guidance.

---

## ✨ Features

- 🤖 **AI-Powered Fit Prediction**
  Predicts whether a garment is likely to be `Small`, `Fit`, or `Large`.

- 📊 **Fit Confidence**
  Provides the model's prediction confidence and class probabilities.

- 📏 **Personalized Fit Analysis**
  Uses age, height, weight, body type, bust size, garment category, size, rating, and rental purpose.

- 👗 **Size Guidance**
  Provides a recommended size based on the predicted fit.

- ⚠️ **Fit Risk Indicator**
  Converts the fit prediction and confidence into a simple fit-risk level.

- 📈 **Dataset Intelligence**
  Displays dataset statistics, fit distribution, and category distribution.

- 🧠 **Model Lab**
  Displays trained model information and evaluation metrics.

- 🎨 **Premium Fashion UI**
  Luxury editorial-inspired interface with responsive design, animations, and modal-based interactions.

---

## 🧠 Machine Learning

FLOWFIT compares three classification algorithms:

| Model | Accuracy | Weighted F1 |
|---|---:|---:|
| Logistic Regression | 43.99% | 43.68% |
| Random Forest | **46.04%** | **45.86%** |
| Gradient Boosting | 44.62% | 44.21% |

### Best Model

**Random Forest**

The current model achieved:

- Accuracy: **46.04%**
- Precision: **45.81%**
- Recall: **46.04%**
- Weighted F1 Score: **45.86%**

> These are the current baseline results on the cleaned dataset. The project is designed to be improved through feature engineering, richer review-text/NLP features, and further model experimentation.

---

## 📊 Dataset

FLOWFIT uses the **Rent the Runway Clothing Fit Dataset**.

The cleaned dataset currently contains **3,158 records**.

### Target Classes

| Class | Records |
|---|---:|
| Small | 1,147 |
| Fit | 1,062 |
| Large | 949 |

### Input Features

- Age
- Height
- Weight
- Body Type
- Bust Size
- Category
- Garment Size
- Rating
- Rented For

---

## 🏗️ Project Architecture

```text
FLOWFIT/
│
├── data/
│   ├── raw/
│   │   └── renttherunway_final_data.json
│   └── clean/
│       └── flowfit_clean.csv
│
├── models/
│   ├── fit_model.pkl
│   └── model_metadata.json
│
├── backend/
│   ├── main.py
│   ├── preprocessing.py
│   ├── predictor.py
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── images/
│
├── scripts/
│   ├── download_dataset.py
│   ├── clean_dataset.py
│   └── train_model.py
│
├── api/
│   └── index.py
│
├── .gitignore
└── README.md
```

---

## ⚙️ Technology Stack

### Backend

- Python
- FastAPI
- Uvicorn
- Pandas
- NumPy
- Scikit-learn
- Joblib
- Pydantic

### Frontend

- HTML5
- CSS3
- JavaScript
- Responsive UI
- CSS animations

### Machine Learning

- Logistic Regression
- Random Forest
- Gradient Boosting
- One-Hot Encoding
- Standard Scaling
- Median / Most-Frequent Imputation

### Deployment

- Vercel-compatible FastAPI API entry point

---

## 🔄 How FLOWFIT Works

```text
User Measurements
       │
       ▼
Frontend Fit Form
       │
       ▼
FastAPI Backend
       │
       ▼
Input Preprocessing
       │
       ▼
Trained ML Pipeline
       │
       ▼
Fit Prediction
       │
       ├── Small
       ├── Fit
       └── Large
       │
       ▼
Confidence + Probability
       │
       ▼
Fit Risk + Size Guidance
       │
       ▼
Personalized Result
```

---

## 🚀 Running Locally

### 1. Clone the repository

```bash
git clone https://github.com/Mahak15-tech/FLOWFIT-AI-Fashion-Fit-Intelligence.git
cd FLOWFIT-AI-Fashion-Fit-Intelligence
```

### 2. Install dependencies

```bash
pip install -r backend/requirements.txt
```

### 3. Start the FastAPI backend

```bash
uvicorn backend.main:app --reload --port 8000
```

The API will be available at:

```text
http://127.0.0.1:8000
```

### 4. Start the frontend

Open another terminal:

```bash
cd frontend
python -m http.server 5500
```

Then open:

```text
http://127.0.0.1:5500
```

---

## 👗 Virtual Try-On & Review Loop

Open `frontend/tryon.html` (link in the nav). Enter your measurements, upload a photo of yourself and of the garment, and fill in the garment's size chart. FLOWFIT labels each size **Too tight / Fitted / Relaxed / Oversize** and renders the chosen size on you with Gemini.

- **Verdict:** garment-vs-body "ease" per measurement (fabric stretch lowers the tight threshold), nudged by the trained fit model.
- **Try-on image:** set `GEMINI_API_KEY` in `.env` (see `.env.example`). Without it the verdicts still work, only the image is skipped.
- **Reviews:** after wearing, users report *too small / fit well / too big*. When at least `FLOWFIT_MIN_REVIEWS` (20) pending reviews exist and **20%** of them disagree with FLOWFIT's verdict, the model retrains itself on the base dataset plus all reviews. The new model is kept only if hold-out accuracy does not drop by more than 3 points; the previous model is saved in `models/versions/`.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/tryon/analyze` | POST | Verdict for every size in the chart |
| `/api/tryon/generate` | POST | Verdict + Gemini try-on image for one size |
| `/api/reviews` | POST | Submit a post-purchase review |
| `/api/reviews/status` | GET | Disagreement rate, model version, retrain history |

> Retraining writes to `models/` and `data/feedback/`, so it works locally but not on Vercel's read-only filesystem.

---

## 🔌 API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/` | GET | API information |
| `/api/health` | GET | Health check |
| `/api/predict-fit` | POST | Predict clothing fit |
| `/api/recommend-size` | POST | Generate size guidance |
| `/api/fit-analysis` | POST | Complete fit analysis |
| `/api/analytics` | GET | Dataset and model analytics |

---

## 🎯 Example Prediction

FLOWFIT accepts information such as:

```json
{
  "age": 24,
  "height": 165,
  "weight": 58,
  "body_type": "hourglass",
  "bust_size": "34b",
  "category": "dress",
  "size": 8,
  "rating": 5,
  "rented_for": "wedding"
}
```

The system returns:

```json
{
  "fit": "fit",
  "confidence": 62.4,
  "fit_risk": "Low",
  "current_size": 8,
  "recommended_size": 8
}
```

---

## ⚠️ Current Limitations

- FLOWFIT currently predicts clothing **fit**, rather than directly predicting clothing **returns**.
- The size recommendation is currently a heuristic based on the predicted fit.
- The current baseline model has moderate predictive performance, so the system should be treated as an experimental fashion-fit intelligence system rather than a production sizing authority.

---

## 🔮 Future Improvements

- Review-text NLP features
- Sentiment and fit-description extraction
- SHAP-based explainability
- LIME explanations
- Advanced ensemble models
- Hyperparameter optimization
- Garment-specific sizing intelligence
- Personalized user profiles
- Historical purchase/rental learning
- Return-probability prediction
- Clothing brand size normalization
- Continuous model retraining
- Production monitoring

---

## 👩‍💻 Author

**Mahak Sunil Kamble**
B.E. Computer Science & Engineering — Data Science

Interested in:

- Data Science
- Artificial Intelligence
- Machine Learning
- Data Analytics
- AI-powered applications

---

## 📄 License

This project is intended for educational, research, and portfolio purposes.