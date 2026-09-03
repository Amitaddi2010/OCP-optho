# OCP-Optho: Ocular Cicatricial Pemphigoid Detection & Eye Anatomy Instance Segmentation

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.14%2Bcu130-red.svg)](https://pytorch.org/)
[![Ultralytics YOLO11](https://img.shields.io/badge/YOLO-v11s--seg-purple.svg)](https://docs.ultralytics.com/)

A clinical and research deep-learning system for high-resolution instance segmentation, pathology triage, and anatomical landmarking in slit-lamp ophthalmic photography of **Ocular Cicatricial Pemphigoid (OCP)** / Mucous Membrane Pemphigoid (MMP).

---

## 1. Overview & Clinical Objectives

Ocular Cicatricial Pemphigoid is a progressive autoimmune cicatrizing conjunctivitis that leads to severe vision loss through recurrent mucosal ulceration, limbal stem cell deficiency (LSCD), conjunctival fibrosis, and corneal perforation. Early identification of micro-pathology (such as obstructed meibomian orifices and trichiasis) alongside macro-structural deformities (symblepharon, forniceal shortening) is essential for timely immunomodulatory therapy.

This repository provides:
1. **Multi-Class Instance Segmentation Pipeline**: Detects and delineates 23 discrete anatomical and pathological classes.
2. **Cryptographically Audited Evaluation**: Transparent, verifiable evaluation framework ensuring zero synthetic metrics or simulated data paths (`pipeline/audit_results.py`).
3. **Clinical Web Application**: A full-stack diagnostic interface featuring a FastAPI backend and a React/Vite frontend with dynamic opacity layers and automated emergency triage alerts.

---

## 2. Target Classes (23 Categories)

### Pathology Classes (13 Categories)
- `Obstructed meibomian glands` (Class 1)
- `OCP Rounding of lid margins` (Class 2)
- `OCP Sub-conjunctival fibrosis` (Class 3)
- `OCP vascularised cornea` (Class 4)
- `OCP LSCD` (Limbal Stem Cell Deficiency) (Class 5)
- `OCP Symblephron` (Class 6)
- `caruncle fibrosis` (Class 7)
- `OCP Forniceal shortening` (Class 8)
- `OCP Ankyloblephron` (Class 9)
- `OCP trichiasis` (Class 10)
- `OCP corneal epithelial defect` (Class 11) — *Critical Alert*
- `Perforated cornea` (Class 12) — *Emergency Alert*
- `Discharge` (Class 13)

### Anatomy Classes (10 Categories)
- `bulbar conjunctiva` (Class 14)
- `limbus` (Class 15)
- `Upper eyelid` (Class 16)
- `Cornea` (Class 17)
- `Right eye` (Class 18 - OD laterality tag)
- `lower eyelid` (Class 19)
- `caruncle` (Class 20)
- `Left eye` (Class 21 - OS laterality tag)
- `palpebral conjunctiva` (Class 22)
- `forniceal conjunctiva` (Class 23)

---

## 3. Empirical Benchmark & Resolution Ablation

Evaluated on the held-out test split ($N = 95$ standardized slit-lamp images, $1,089$ annotations):

| Metric | v1 Baseline (640px) | Controlled Retrain (1280px) | Cascade (Real) | Cascade (Oracle Ceiling) |
|:---|:---:|:---:|:---:|:---:|
| **Mask $\text{mAP}_{50}$ (21-class)** | 38.73% | **40.09%** | 38.68% | 38.71% |
| **Mask $\text{mAP}_{75}$ (21-class)** | 17.65% | **17.88%** | 17.66% | 17.66% |
| **Box $\text{mAP}_{50}$** | 53.33% | **54.82%** | 53.34% | 53.49% |
| **Box $\text{mAP}_{75}$** | **36.15%** | 25.59% | 36.14% | 36.14% |
| **Pathology Box $\text{AR}_{100}$** | 30.87% | **32.72%** | 30.85% | 31.14% |
| **Class 1 Box $\text{AP}_{50}$** | 22.63% | **26.48%** | 22.95% | 26.46% |
| **Class 1 Mask $\text{AP}_{50}$** | 18.30% | **20.31%** | 17.34% | 17.85% |
| **Anatomy Mask $\text{mAP}_{50}$** | **64.60%** | 62.57% | **64.60%** | **64.60%** |

*Note: For detailed per-class breakdowns, n-counts on rare emergency classes, and the macro/micro resolution trade-off, see [reports/manuscript_results_section.md](reports/manuscript_results_section.md).*

---

## 4. Repository Structure

```text
OCP_Detection/
├── .gitignore
├── README.md
├── app/
│   ├── backend/               # FastAPI asynchronous prediction service
│   │   ├── main.py
│   │   └── services/          # Segmentation and clinical triage engine
│   └── frontend/              # Modern React + Vite clinical viewer
│       ├── package.json
│       └── src/
├── models/                    # Exported model weights
│   ├── best_yolo26_seg.pt
│   └── ocp_yolo26_seg_controlled_1280.pt
├── outputs/                   # Verifiable benchmark summaries & figures
│   ├── evaluation_summary.json
│   ├── evaluation_summary_v1.json
│   ├── evaluation_summary_controlled_1280.json
│   └── evaluation_summary_cascade_real.json
├── pipeline/                  # Audited training, evaluation, & cascade code
│   ├── train_and_eval.py
│   ├── eval_cascade.py
│   ├── eval_sahi.py
│   └── audit_results.py
└── reports/                   # Publication reports and figures
    ├── manuscript_results_section.md
    └── figures/
```

---

## 5. Quickstart

### 1. Environment Setup
```bash
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
```

### 2. Verify Pipeline Integrity
Run the standing automated integrity audit to verify that evaluation files are uncorrupted:
```bash
python pipeline/audit_results.py outputs/evaluation_summary.json
```

### 3. Run Web Application Locally
**Start Backend:**
```bash
cd app/backend
uvicorn main:app --host 127.0.0.1 --port 8080 --reload
```

**Start Frontend:**
```bash
cd app/frontend
npm install
npm run dev
```
Open `http://localhost:3000` to interact with the clinical segmentation and triage viewer.
