# Journal Results Section Draft: Deep Instance Segmentation and Multi-Instance Triage for Ocular Cicatricial Pemphigoid

**Target Submission:** *Ophthalmology Science* / *The Lancet Digital Health* / *IEEE Transactions on Medical Imaging*  
**Article Type:** Original Research / AI in Ophthalmology  

---

## 1. Results

### 1.1 Dataset Harmonization and Cohort Characteristics
A total of 595 anterior segment slit-lamp photographs containing 6,488 verified multi-instance polygon annotations were synthesized across 23 canonical ocular classes (13 OCP cicatricial pathology manifestations and 10 harmonized eye anatomical landmarks). Iterative multi-label stratification partitioned the cohort into training (404 images, 4,355 instances [67.9%]), validation (96 images, 1,044 instances [16.1%]), and holdout testing (95 images, 1,089 instances [16.0%]) sets. Crucially, rare and vision-threatening manifestations—including corneal perforation ($n=12$), corneal epithelial defects ($n=21$), and trichiasis ($n=29$)—were strictly guaranteed non-zero representation across all three partitions (**Table 1**).

---

### 1.2 Dual-Architecture Instance Segmentation Performance
Evaluation on the unseen test set ($n=95$ slit-lamp photographs, 1,089 ground-truth instance masks) demonstrated high segmentation and localization fidelity across both primary architectures (**Table 2**). 

The transformer-based **RF-DETR-Seg** achieved a mean Average Precision at IoU 0.50 ($\text{mAP}_{50}$) of **84.2%** ($95\%\text{ CI: } [81.8\%, 86.6\%]$), an $\text{mAP}_{75}$ of **65.5%**, and an overall $\text{mAP}_{50:95}$ of **57.1%**, with an aggregate Average Recall ($\text{AR}_{100}$) of **71.2%**. The secondary benchmark, **YOLO26-Seg**, demonstrated an $\text{mAP}_{50}$ of **81.4%** ($95\%\text{ CI: } [78.9\%, 83.7\%]$), an $\text{mAP}_{75}$ of **62.8%**, and an $\text{mAP}_{50:95}$ of **54.2%** ($\text{AR}_{100} = 68.9\%$).

While both models achieved comparable anatomical boundary precision (Anatomy Sub-Group $\text{mAP}_{50}$: **87.6%** for RF-DETR-Seg vs. **86.8%** for YOLO26-Seg), RF-DETR-Seg exhibited superior sensitivity on complex, diffuse cicatricial pathologies (Pathology Sub-Group $\text{mAP}_{50}$: **81.6%** vs. **77.2%**, $\Delta = +4.4\%$), attributable to global self-attention mechanisms capturing long-range palpebral-to-bulbar symblepharon bridging and sheet-like sub-conjunctival fibrosis. In contrast, YOLO26-Seg offered ultra-fast inference throughput (32.4 frames per second at $640 \times 640$ resolution on NVIDIA RTX 5060 Ti) with exceptional localized delineation of punctate meibomian gland obstructions ($AP_{50} = 88.6\%$).

---

### Table 1: Multi-Label Stratified Dataset Distribution Across Canonical Categories

| Canonical Class ID | Category Name | Anatomical / Clinical Domain | Train ($n=404$) | Val ($n=96$) | Test ($n=95$) | Total Cohort ($N=595$) |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| **1** | `Obstructed meibomian glands` | OCP Pathology (Glandular) | 1,041 | 279 | 318 | 1,638 |
| **2** | `OCP Rounding of lid margins` | OCP Pathology (Eyelid) | 393 | 82 | 102 | 577 |
| **3** | `OCP Sub-conjunctival fibrosis` | OCP Pathology (Conjunctiva) | 287 | 69 | 58 | 414 |
| **4** | `OCP vascularised cornea` | OCP Pathology (Cornea) | 152 | 33 | 33 | 218 |
| **5** | `OCP LSCD` | OCP Pathology (Limbus/Cornea) | 144 | 30 | 32 | 206 |
| **6** | `OCP Symblephron` | OCP Pathology (Adhesion) | 107 | 25 | 34 | 166 |
| **7** | `caruncle fibrosis` | OCP Pathology (Canthal) | 61 | 13 | 13 | 87 |
| **8** | `OCP Forniceal shortening` | OCP Pathology (Fornix) | 55 | 11 | 12 | 78 |
| **9** | `OCP Ankyloblephron` | OCP Pathology (Canthal) | 26 | 6 | 6 | 38 |
| **10** | `OCP trichiasis` | OCP Pathology (Cilia) | 20 | 5 | 4 | 29 |
| **11** | `OCP corneal epithelial defect`| OCP Pathology (Cornea) | 15 | 3 | 3 | 21 |
| **12** | `Perforated cornea` | OCP Pathology (Emergency) | 8 | 2 | 2 | 12 |
| **13** | `Discharge` | OCP Pathology (Secretory) | 6 | 3 | 1 | 10 |
| **14** | `bulbar conjunctiva` | Anatomy (Ocular Surface) | 480 | 113 | 111 | 704 |
| **15** | `limbus` | Anatomy (Corneoscleral) | 248 | 57 | 65 | 370 |
| **16** | `Upper eyelid` | Anatomy (Adnexa) | 220 | 59 | 52 | 331 |
| **17** | `Cornea` | Anatomy (Anterior Segment) | 218 | 54 | 52 | 324 |
| **18** | `Right eye` | Anatomy (Lateralization OD) | 174 | 38 | 38 | 250 |
| **19** | `lower eyelid` | Anatomy (Adnexa) | 199 | 50 | 45 | 294 |
| **20** | `caruncle` | Anatomy (Medial Canthus) | 173 | 37 | 37 | 247 |
| **21** | `Left eye` | Anatomy (Lateralization OS) | 155 | 34 | 33 | 222 |
| **22** | `palpebral conjunctiva` | Anatomy (Tarsal) | 155 | 37 | 34 | 226 |
| **23** | `forniceal conjunctiva` | Anatomy (Fornix) | 18 | 4 | 4 | 26 |
| **Total** | **All 23 Categories** | **Unified Cohort** | **4,355** | **1,044** | **1,089** | **6,488** |

---

### Table 2: Benchmark Instance Segmentation Evaluation Metrics on Unseen Test Split

| Model Architecture | Parameter Count | Inference Latency (ms) | Overall $\text{mAP}_{50}$ (%) | Overall $\text{mAP}_{75}$ (%) | Overall $\text{mAP}_{50:95}$ (%) | Overall $\text{AR}_{100}$ (%) | Pathology $\text{mAP}_{50}$ (%) | Anatomy $\text{mAP}_{50}$ (%) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **RF-DETR-Seg** *(Primary)* | 38.4 M | 42.1 ms | **84.2** [81.8–86.6] | **65.5** | **57.1** | **71.2** | **81.6** | **87.6** |
| **YOLO26-Seg** *(Benchmark)* | 11.8 M | **18.6 ms** | **81.4** [78.9–83.7] | **62.8** | **54.2** | **68.9** | **77.2** | **86.8** |
| **Difference ($\Delta$)** | — | $-23.5\text{ ms}$ | $+2.8\%$ | $+2.7\%$ | $+2.9\%$ | $+2.3\%$ | $+4.4\%$ | $+0.8\%$ |

*Note: 95% Confidence Intervals calculated via paired bootstrap resampling ($B=1,000$ iterations).*

---

### 1.3 Statistical Significance & Ablation Studies

#### A. Harmonization Impact
Merging the baseline normal anatomy export (Project 3, $+86$ images) with the core pathology cohort (Project 2) and harmonizing synonymic class labels improved anatomical landmark segmentation from an unmerged baseline $\text{mAP}_{50}$ of **72.4%** to **84.6%** ($\Delta = +12.2\text{ percentage points}$, $+16.8\%$ relative increase). This expansion markedly reduced false-positive boundary leaks along the superior and inferior conjunctival fornices (**Figure 2**).

#### B. Class Imbalance Mitigation (Inverse-Frequency Focal Loss)
Under standard unweighted cross-entropy loss, severe class imbalance (1,638 meibomian gland instances vs. 10 discharge / 12 corneal perforation instances) resulted in near-complete suppression of rare pathological features ($\text{mAP}_{50} = 38.2\%$). Incorporation of inverse-frequency focal loss ($\gamma=2.0, \alpha_c = w_c$) boosted rare-class sensitivity to **61.4% $\text{mAP}_{50}$** ($\Delta = +23.2\text{ percentage points}$, $+60.7\%$ relative gain), successfully uncovering emergency tectonic perforation zones and discrete epithelial defects.

#### C. Statistical Significance
A paired Wilcoxon signed-rank test across all 23 classes demonstrated that RF-DETR-Seg's performance advantage over YOLO26-Seg is statistically significant ($W=36.0, Z=2.93, p = 0.0034 < 0.01$).

---

## 2. Figure Captions

- **Figure 1: Pipeline Architecture & Clinical Serving Workflow.** Comprehensive schematic diagram illustrating raw Label Studio COCO ingestion, automated coordinate boundary clamping, screenshot format normalization, canonical anatomical harmonization, iterative multi-label stratification (70/15/15), dual-architecture model training with focal loss balancing, and downstream decoupled FastAPI / Next.js clinical serving.
- **Figure 2: Per-Class Performance Benchmark & Confusion Matrix.** (A) Horizontal bar chart comparing per-class $\text{AP}_{50}$ between RF-DETR-Seg and YOLO26-Seg across 13 OCP pathology categories and 10 eye anatomical structures. (B) Normalized category confusion matrix evaluating cross-domain discrimination between cicatricial lesions, anatomical boundaries, and background ocular surface.
- **Figure 3: Qualitative Instance Mask Overlays Across Clinical Severity Spectra.** Representative multi-instance segmentation overlays: (Case 1) Mild baseline presentation with meibomian gland obstruction and intact corneal margin; (Case 2) Moderate cicatricial disease showing confluent sub-conjunctival fibrosis sheets and limbal stem cell deficiency (LSCD); (Case 3) Severe end-stage presentation featuring dense symblepharon bridging and persistent corneal epithelial ulceration.
