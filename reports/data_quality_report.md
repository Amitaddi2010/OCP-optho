# Data Quality & Preprocessing Audit Report

**Dataset Title:** Unified Multi-Instance Anterior Segment Ocular Cicatricial Pemphigoid (OCP) Pathology & Anatomy Dataset  
**Date of Audit:** September 2, 2026  
**Pipeline Module:** `pipeline/clean_and_merge.py` & `pipeline/stratified_split.py`  
**Target Modalities:** Slit-Lamp Photography, Diffuse Illumination, Anterior Segment Imaging  

---

## 1. Executive Summary

This report documents the end-to-end data audit, integrity correction, label harmonization, image normalization, and iterative multi-label stratified partitioning performed on raw Label Studio COCO exports for the OCP Instance Segmentation pipeline.

| Metric | Project 2 (Pathology + Anatomy) | Project 3 (Baseline Anatomy) | Merged & Harmonized Dataset |
| :--- | :---: | :---: | :---: |
| **Raw Images in JSON** | 510 | 86 | 596 (1 dropped duplicate = **595**) |
| **Unique Physical Images** | 509 | 86 | **595** |
| **Total Annotations** | 5,857 | 631 | **6,488** |
| **Number of Classes** | 23 | 10 | **23 Canonical Classes** |
| **Corrupted Files** | 0 | 0 | **0 (100% verified)** |
| **Image Color Modes** | 506 RGB, 3 RGBA | 86 RGB | **595 RGB (100% normalized)** |

---

## 2. Data Integrity Discrepancies & Applied Corrections

### 2.1 JSON Entry Duplication Removal
- **Finding:** In Project 2's `result.json`, image file `b6f75bd2-OS_2024-05-22_11-34-24_001.jpg` was duplicated across two image object entries:
  - `id: 49` (0 annotations associated)
  - `id: 50` (annotated)
- **Correction Applied:** Explicitly discarded the empty `id: 49` image entry prior to dataset merging, preventing downstream reference dangling.

### 2.2 Bounding Box & Polygon Boundary Clamping
- **Finding:** Slight negative coordinates resulting from manual polygon annotations touching the image canvas perimeter were present in 38 annotations in Project 2 and 5 annotations in Project 3 (e.g. $x = -2.39\text{ px}$, $-10^{-14}\text{ px}$).
- **Correction Applied:** Clamped all bounding box tuples $[x, y, w, h]$ and polygon vertices $[x_1, y_1, x_2, y_2, \dots]$ to valid boundaries:
  $$x_{\text{clamped}} = \max(0, \min(W, x)), \quad y_{\text{clamped}} = \max(0, \min(H, y))$$
  Recomputed bounding box widths, heights, and areas following boundary clamping.

### 2.3 Screenshot Image Normalization & Resolution Audit
- **Finding:** Project 2 contained 3 non-standard PNG/RGBA screenshot images:
  - `1184bd53-Screenshot_2026-03-16_005621.png` ($1042 \times 882$, RGBA)
  - `344e7f75-Screenshot_2026-04-01_015219.png` ($828 \times 706$, RGBA)
  - `503f911e-Screenshot_2026-04-01_015048.png` ($1293 \times 692$, RGBA)
- **Correction Applied:** Converted all alpha channels and palette modes to 24-bit RGB JPEGs (`quality=95`), and cataloged resolution deviations for multi-scale training augmentations.

### 2.4 Anatomical Taxonomy Harmonization
- **Finding:** Project 3 contained alternative naming and casing conventions for anatomical structures compared to Project 2.
- **Correction Applied:** Mapped all classes into a canonical 23-class taxonomy:
  - `Lower lid` $\rightarrow$ `lower eyelid`
  - `Upper lid` $\rightarrow$ `Upper eyelid`
  - `Limbus` $\rightarrow$ `limbus`
  - `Palpebral conjunctiva` $\rightarrow$ `palpebral conjunctiva`
  - `Forniceal conjunctiva` $\rightarrow$ `forniceal conjunctiva`
  - Canonical casing alignment for `bulbar conjunctiva`, `caruncle`, `Cornea`, `Left eye`, `Right eye`.

---

## 3. Canonical 23-Class Inventory Post-Harmonization

| Canonical ID | Class Name | Clinical Group | Merged Annotation Count |
| :---: | :--- | :---: | :---: |
| **1** | `Obstructed meibomian glands` | OCP Pathology | 1,638 |
| **2** | `OCP Rounding of lid margins` | OCP Pathology | 577 |
| **3** | `OCP Sub-conjunctival fibrosis` | OCP Pathology | 414 |
| **4** | `OCP vascularised cornea` | OCP Pathology | 218 |
| **5** | `OCP LSCD` | OCP Pathology | 206 |
| **6** | `OCP Symblephron` | OCP Pathology | 166 |
| **7** | `caruncle fibrosis` | OCP Pathology | 87 |
| **8** | `OCP Forniceal shortening` | OCP Pathology | 78 |
| **9** | `OCP Ankyloblephron` | OCP Pathology | 38 |
| **10** | `OCP trichiasis` | OCP Pathology | 29 |
| **11** | `OCP corneal epithelial defect` | OCP Pathology | 21 |
| **12** | `Perforated cornea` | OCP Pathology (Critical) | 12 |
| **13** | `Discharge` | OCP Pathology | 10 |
| **14** | `bulbar conjunctiva` | Anatomy | 704 |
| **15** | `limbus` | Anatomy | 370 |
| **16** | `Upper eyelid` | Anatomy | 331 |
| **17** | `Cornea` | Anatomy | 324 |
| **18** | `Right eye` | Anatomy | 250 |
| **19** | `lower eyelid` | Anatomy | 294 |
| **20** | `caruncle` | Anatomy | 247 |
| **21** | `Left eye` | Anatomy | 222 |
| **22** | `palpebral conjunctiva` | Anatomy | 226 |
| **23** | `forniceal conjunctiva` | Anatomy | 26 |
| **Total** | **23 Classes** | | **6,488 Annotations** |

---

## 4. Multi-Label Stratification Audit

Using iterative greedy multi-label image partitioning, all 595 images were allocated into Train (67.9%), Validation (16.1%), and Test (16.0%) splits while guaranteeing non-zero representation for every rare class:

```
+------------------------------------+-------+-----+------+-------+
| Class Name                         | Train | Val | Test | Total |
+------------------------------------+-------+-----+------+-------+
| Obstructed meibomian glands        | 1041  | 279 | 318  | 1638  |
| OCP Rounding of lid margins        | 393   | 82  | 102  | 577   |
| OCP Sub-conjunctival fibrosis      | 287   | 69  | 58   | 414   |
| OCP vascularised cornea            | 152   | 33  | 33   | 218   |
| OCP LSCD                           | 144   | 30  | 32   | 206   |
| OCP Symblephron                    | 107   | 25  | 34   | 166   |
| caruncle fibrosis                  | 61    | 13  | 13   | 87    |
| OCP Forniceal shortening           | 55    | 11  | 12   | 78    |
| OCP Ankyloblephron                 | 26    | 6   | 6    | 38    |
| OCP trichiasis                     | 20    | 5   | 4    | 29    |
| OCP corneal epithelial defect      | 15    | 3   | 3    | 21    |
| Perforated cornea                  | 8     | 2   | 2    | 12    |
| Discharge                          | 6     | 3   | 1    | 10    |
| bulbar conjunctiva                 | 480   | 113 | 111  | 704   |
| limbus                             | 248   | 57  | 65   | 370   |
| Upper eyelid                       | 220   | 59  | 52   | 331   |
| Cornea                             | 218   | 54  | 52   | 324   |
| Right eye                          | 174   | 38  | 38   | 250   |
| lower eyelid                       | 199   | 50  | 45   | 294   |
| caruncle                           | 173   | 37  | 37   | 247   |
| Left eye                           | 155   | 34  | 33   | 222   |
| palpebral conjunctiva              | 155   | 37  | 34   | 226   |
| forniceal conjunctiva              | 18    | 4   | 4    | 26    |
+------------------------------------+-------+-----+------+-------+
| TOTAL IMAGES                       | 404   | 96  | 95   | 595   |
| TOTAL ANNOTATIONS                  | 4355  | 1044| 1089 | 6488  |
+------------------------------------+-------+-----+------+-------+
```

---

## 5. Quality Verification Sign-Off

- [x] All 595 image files load cleanly with PIL and OpenCV without truncation or corruption.
- [x] All bounding boxes satisfy $0 \le x_1 < x_2 \le W$ and $0 \le y_1 < y_2 \le H$.
- [x] Polygon segmentations contain $\ge 3$ coordinate pairs and close without self-intersection degeneracies.
- [x] COCO JSON schemas validated with `pycocotools`.
- [x] YOLO segmentation text files validated with Ultralytics dataset integrity checkers.
