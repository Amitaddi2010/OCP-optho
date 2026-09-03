"""
train_and_eval.py — OCP Instance Segmentation Pipeline (v2.0.0)
================================================================
Honest single-model training and evaluation pipeline.
Every metric is computed from actual model inference. No simulated
results, no hardcoded constants, no placeholder metrics.

Version: 2.0.0
"""

import os
import sys
import json
import yaml
import hashlib
import datetime
import shutil
import numpy as np
import torch
import cv2
from PIL import Image
from collections import defaultdict, Counter
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from pycocotools.coco import COCO
from pycocotools.cocoeval import COCOeval
from pycocotools import mask as mask_util
from ultralytics import YOLO

SCRIPT_VERSION = "2.0.0"

# Paths
BASE_DIR = r"e:\Amit Data\OCP_Detection"
DATASET_DIR = os.path.join(BASE_DIR, "Dataset")
PROCESSED_DIR = os.path.join(DATASET_DIR, "processed")
SPLITS_DIR = os.path.join(PROCESSED_DIR, "splits")
YOLO_DIR = os.path.join(DATASET_DIR, "yolo_dataset")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
FIGURES_DIR = os.path.join(BASE_DIR, "reports", "figures")
TABLES_DIR = os.path.join(BASE_DIR, "reports", "tables")
MODELS_DIR = os.path.join(BASE_DIR, "models")

for p in [OUTPUTS_DIR, FIGURES_DIR, TABLES_DIR, MODELS_DIR]:
    os.makedirs(p, exist_ok=True)

# 23 Canonical Class Definitions
with open(os.path.join(PROCESSED_DIR, "merged_coco.json"), 'r', encoding='utf-8') as f:
    merged_coco = json.load(f)

CATEGORIES = merged_coco['categories']
CAT_ID_TO_NAME = {c['id']: c['name'] for c in CATEGORIES}
CAT_NAME_TO_ID = {c['name']: c['id'] for c in CATEGORIES}
PATHOLOGY_IDS = [c['id'] for c in CATEGORIES if c['supercategory'] == 'pathology']
ANATOMY_IDS = [c['id'] for c in CATEGORIES if c['supercategory'] == 'anatomy']


# ============================================================================
# UTILITIES
# ============================================================================

def sha256_file(filepath):
    """Compute SHA256 hash of a file for traceability."""
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()


def compute_class_weights():
    """Compute inverse-frequency class weights from training annotations."""
    with open(os.path.join(SPLITS_DIR, "train_coco.json"), 'r', encoding='utf-8') as f:
        train_coco = json.load(f)

    counts = Counter(ann['category_id'] for ann in train_coco['annotations'])
    total_samples = len(train_coco['annotations'])

    weights = {}
    for cid in range(1, 24):
        cnt = counts.get(cid, 1)
        weights[cid] = round(float((total_samples / (cnt * len(CATEGORIES))) ** 0.5), 4)

    print("\n--- Computed Inverse Frequency Class Weights ---")
    for cid, w in weights.items():
        cname = CAT_ID_TO_NAME[cid]
        cnt = counts.get(cid, 0)
        print(f"  Class {cid:2d} ({cname:35s}): count={cnt:4d} -> weight={w:.3f}")

    with open(os.path.join(OUTPUTS_DIR, "class_weights.json"), 'w') as f:
        json.dump(weights, f, indent=2)
    return weights


# ============================================================================
# TRAINING
# ============================================================================

def train_yolo_seg(
    epochs=50,
    imgsz=1280,
    batch=4,
    device=0,
    copy_paste=0.0,
    nms_iou=0.7,
    scale=0.2,
    run_name="ocp_yolo26_seg_controlled_1280"
):
    """
    Train YOLO26-Seg with isolated single-variable change:
    - imgsz: 1280 (vs 640 baseline)
    - batch: 4 (with nbs=64 default, effective batch size = 64 / 8 = 8 equivalent)
    - copy_paste: 0.0 (identical to v1)
    - scale: 0.2 (identical to v1)
    - NMS IoU: 0.70 (identical to v1)
    - optimizer: AdamW, lr0: 0.001, lrf: 0.01 (identical to v1)
    """
    print("=" * 80)
    print(f"TRAINING CONTROLLED YOLO26-SEG | imgsz={imgsz} | batch={batch} | copy_paste={copy_paste} | NMS IoU={nms_iou}")
    print("=" * 80)

    last_pt = os.path.join(OUTPUTS_DIR, "yolo_train", run_name, "weights", "last.pt")
    if os.path.exists(last_pt):
        print(f"Resuming controlled training from: {last_pt}")
        model = YOLO(last_pt)
        results = model.train(resume=True)
    else:
        model = YOLO("yolo11s-seg.pt")
        results = model.train(
            data=data_yaml_path,
            epochs=epochs,
            imgsz=imgsz,
            batch=batch,
            device=device,
            project=os.path.join(OUTPUTS_DIR, "yolo_train"),
            name=run_name,
            exist_ok=True,
            save=True,
            save_period=10,
            val=True,
            plots=True,
            box=7.5,
            cls=2.0,
            dfl=1.5,
            close_mosaic=10,
            optimizer="AdamW",
            lr0=0.001,
            lrf=0.01,
            augment=True,
            hsv_h=0.015,
            hsv_s=0.7,
            hsv_v=0.4,
            degrees=10.0,
            translate=0.1,
            scale=scale,
            fliplr=0.5,
            copy_paste=copy_paste,
            iou=nms_iou,
            workers=2,
            verbose=True,
        )

    # Save best model
    best_pt = os.path.join(OUTPUTS_DIR, "yolo_train", run_name, "weights", "best.pt")
    target_best_pt = os.path.join(MODELS_DIR, f"{run_name}.pt")
    if os.path.exists(best_pt):
        shutil.copy2(best_pt, target_best_pt)
        print(f"[SAVED] Best checkpoint copied to {target_best_pt}")
        print(f"\nSaved best YOLO-Seg v2 model to: {target_best_pt}")
        print(f"  Checkpoint SHA256: {sha256_file(target_best_pt)}")

    return model, results


# ============================================================================
# EVALUATION — SINGLE MODEL, NO SIMULATION
# ============================================================================

def run_yolo_inference(model, coco_gt, conf=0.001, iou=0.5):
    """
    Run YOLO inference on all test images and produce COCO-format detections.

    Uses conf=0.001 to capture all predictions — COCOeval handles
    precision-recall thresholding internally.
    """
    test_images = coco_gt.loadImgs(coco_gt.getImgIds())
    detections_bbox = []
    detections_segm = []

    print(f"\nRunning YOLO inference on {len(test_images)} test images (conf={conf}, iou={iou})...")

    for img_info in test_images:
        img_id = img_info['id']
        fn = img_info['file_name']
        img_path = os.path.join(PROCESSED_DIR, "images", fn)

        if not os.path.exists(img_path):
            print(f"  WARNING: Missing image {fn}, skipping")
            continue

        results = model(img_path, conf=conf, iou=iou, verbose=False)[0]

        if results.boxes is not None and len(results.boxes) > 0:
            boxes = results.boxes.xyxy.cpu().numpy()
            scores = results.boxes.conf.cpu().numpy()
            classes = results.boxes.cls.cpu().numpy().astype(int)
            masks = results.masks.xy if results.masks is not None else None

            for i in range(len(boxes)):
                x1, y1, x2, y2 = boxes[i]
                bw = float(x2 - x1)
                bh = float(y2 - y1)
                cat_id = int(classes[i]) + 1  # YOLO 0-indexed -> COCO 1-indexed
                conf_score = float(scores[i])

                det_bbox = {
                    "image_id": int(img_id),
                    "category_id": cat_id,
                    "bbox": [float(x1), float(y1), bw, bh],
                    "score": conf_score,
                }
                detections_bbox.append(det_bbox)

                # Segmentation detection (pycocotools loadRes requires RLE dict)
                img_h = img_info.get('height', results.orig_shape[0])
                img_w = img_info.get('width', results.orig_shape[1])

                rle_encoded = None
                if masks is not None and i < len(masks) and len(masks[i]) >= 3:
                    poly = masks[i].flatten().tolist()
                    if len(poly) >= 6:
                        try:
                            rle_list = mask_util.frPyObjects([poly], img_h, img_w)
                            if len(rle_list) > 0:
                                rle_encoded = rle_list[0]
                                if isinstance(rle_encoded['counts'], bytes):
                                    rle_encoded['counts'] = rle_encoded['counts'].decode('utf-8')
                        except Exception:
                            rle_encoded = None

                if rle_encoded is None:
                    # Fallback to bbox rectangle polygon
                    rx1, ry1 = max(0.0, float(x1)), max(0.0, float(y1))
                    rx2, ry2 = min(float(img_w), float(x2)), min(float(img_h), float(y2))
                    rect_poly = [rx1, ry1, rx2, ry1, rx2, ry2, rx1, ry2]
                    rle_list = mask_util.frPyObjects([rect_poly], img_h, img_w)
                    rle_encoded = rle_list[0]
                    if isinstance(rle_encoded['counts'], bytes):
                        rle_encoded['counts'] = rle_encoded['counts'].decode('utf-8')

                det_segm = {
                    "image_id": int(img_id),
                    "category_id": cat_id,
                    "segmentation": rle_encoded,
                    "score": conf_score,
                }
                detections_segm.append(det_segm)

    print(f"  Total detections: {len(detections_bbox)} bbox, {len(detections_segm)} segm")
    return detections_bbox, detections_segm


def run_cocoeval(coco_gt, detections, iou_type="bbox"):
    """
    Run pycocotools COCOeval and extract per-class metrics.
    Returns only computed values — no hardcoding.
    """
    if not detections:
        print(f"  WARNING: No detections for {iou_type} evaluation")
        return {
            "mAP50_95": 0.0, "mAP50": 0.0, "mAP75": 0.0,
            "AR100": 0.0, "per_class": {}
        }

    coco_dt = coco_gt.loadRes(detections)
    coco_eval = COCOeval(coco_gt, coco_dt, iou_type)

    cat_ids = coco_gt.getCatIds()
    if iou_type == "segm":
        # Structurally exclude 18 (Right eye) and 21 (Left eye) from segmentation evaluation:
        # Confirmed schema mismatch — they are full-frame OD/OS classification proxies, not anatomical masks.
        eval_cat_ids = [cid for cid in cat_ids if cid not in [18, 21]]
        coco_eval.params.catIds = eval_cat_ids
    else:
        eval_cat_ids = cat_ids

    coco_eval.evaluate()
    coco_eval.accumulate()
    coco_eval.summarize()

    # Extract per-class AP from the precision tensor
    prec = coco_eval.eval['precision']
    recall = coco_eval.eval['recall']

    per_class = {}
    for idx, cat_id in enumerate(eval_cat_ids):
        cname = CAT_ID_TO_NAME.get(cat_id, f"class_{cat_id}")

        ap50_vals = prec[0, :, idx, 0, 2]
        ap50 = float(np.mean(ap50_vals[ap50_vals > -1])) if np.any(ap50_vals > -1) else 0.0

        ap75_vals = prec[5, :, idx, 0, 2]
        ap75 = float(np.mean(ap75_vals[ap75_vals > -1])) if np.any(ap75_vals > -1) else 0.0

        ap_all_vals = prec[:, :, idx, 0, 2]
        ap_all = float(np.mean(ap_all_vals[ap_all_vals > -1])) if np.any(ap_all_vals > -1) else 0.0

        ar_vals = recall[:, idx, 0, 2]
        ar100 = float(np.mean(ar_vals[ar_vals > -1])) if np.any(ar_vals > -1) else 0.0

        per_class[cat_id] = {
            "name": cname,
            "AP50": round(ap50, 6),
            "AP75": round(ap75, 6),
            "AP50_95": round(ap_all, 6),
            "AR100": round(ar100, 6),
            "supercategory": "pathology" if cat_id in PATHOLOGY_IDS else "anatomy",
        }

    return {
        "mAP50_95": round(float(coco_eval.stats[0]), 6),
        "mAP50": round(float(coco_eval.stats[1]), 6),
        "mAP75": round(float(coco_eval.stats[2]), 6),
        "AR100": round(float(coco_eval.stats[8]), 6),
        "per_class": per_class,
    }


def compute_confusion_matrix(coco_gt, detections, iou_threshold=0.50):
    """
    Compute a real confusion matrix from actual predictions vs ground truth.

    For each image:
    1. Compute IoU between all predicted boxes and all GT boxes
    2. Greedily match predictions to GT at the given IoU threshold
    3. Record matched (pred_class, gt_class) pairs
    4. Unmatched predictions -> false positives (pred_class, background)
    5. Unmatched GT -> false negatives (background, gt_class)
    """
    cat_ids = sorted(coco_gt.getCatIds())
    num_classes = len(cat_ids)
    cat_id_to_idx = {cid: i for i, cid in enumerate(cat_ids)}
    bg_idx = num_classes

    matrix = np.zeros((num_classes + 1, num_classes + 1), dtype=np.int64)

    det_by_img = defaultdict(list)
    for det in detections:
        det_by_img[det['image_id']].append(det)

    img_ids = coco_gt.getImgIds()

    for img_id in img_ids:
        ann_ids = coco_gt.getAnnIds(imgIds=img_id)
        gt_anns = coco_gt.loadAnns(ann_ids)
        gt_boxes = np.array([a['bbox'] for a in gt_anns]) if gt_anns else np.empty((0, 4))
        gt_cats = [a['category_id'] for a in gt_anns]

        if len(gt_boxes) > 0:
            gt_xyxy = gt_boxes.copy()
            gt_xyxy[:, 2] = gt_boxes[:, 0] + gt_boxes[:, 2]
            gt_xyxy[:, 3] = gt_boxes[:, 1] + gt_boxes[:, 3]
        else:
            gt_xyxy = np.empty((0, 4))

        preds = det_by_img.get(img_id, [])
        if not preds:
            for gt_cat in gt_cats:
                gt_i = cat_id_to_idx.get(gt_cat)
                if gt_i is not None:
                    matrix[gt_i, bg_idx] += 1
            continue

        pred_boxes = np.array([d['bbox'] for d in preds])
        pred_scores = np.array([d['score'] for d in preds])
        pred_cats = [d['category_id'] for d in preds]

        pred_xyxy = pred_boxes.copy()
        pred_xyxy[:, 2] = pred_boxes[:, 0] + pred_boxes[:, 2]
        pred_xyxy[:, 3] = pred_boxes[:, 1] + pred_boxes[:, 3]

        sorted_indices = np.argsort(-pred_scores)
        gt_matched = [False] * len(gt_anns)
        pred_matched = [False] * len(preds)

        for pi in sorted_indices:
            best_iou = 0.0
            best_gi = -1
            px1, py1, px2, py2 = pred_xyxy[pi]

            for gi in range(len(gt_anns)):
                if gt_matched[gi]:
                    continue
                gx1, gy1, gx2, gy2 = gt_xyxy[gi]
                ix1, iy1 = max(px1, gx1), max(py1, gy1)
                ix2, iy2 = min(px2, gx2), min(py2, gy2)
                if ix2 <= ix1 or iy2 <= iy1:
                    continue
                inter = (ix2 - ix1) * (iy2 - iy1)
                union = (px2 - px1) * (py2 - py1) + (gx2 - gx1) * (gy2 - gy1) - inter
                iou = inter / union if union > 0 else 0.0
                if iou > best_iou:
                    best_iou = iou
                    best_gi = gi

            if best_iou >= iou_threshold and best_gi >= 0:
                gt_matched[best_gi] = True
                pred_matched[pi] = True
                gt_i = cat_id_to_idx.get(gt_cats[best_gi])
                pred_i = cat_id_to_idx.get(pred_cats[pi])
                if gt_i is not None and pred_i is not None:
                    matrix[gt_i, pred_i] += 1

        for pi in range(len(preds)):
            if not pred_matched[pi]:
                pred_i = cat_id_to_idx.get(pred_cats[pi])
                if pred_i is not None:
                    matrix[bg_idx, pred_i] += 1

        for gi in range(len(gt_anns)):
            if not gt_matched[gi]:
                gt_i = cat_id_to_idx.get(gt_cats[gi])
                if gt_i is not None:
                    matrix[gt_i, bg_idx] += 1

    labels = [CAT_ID_TO_NAME.get(cid, f"class_{cid}") for cid in cat_ids] + ["background"]
    return matrix, labels, iou_threshold


def log_class1_diagnostics(coco_gt, detections):
    """Detailed diagnostics for Class 1 (Obstructed meibomian glands)."""
    print("\n" + "=" * 80)
    print("CLASS 1 (Obstructed meibomian glands) DIAGNOSTICS")
    print("=" * 80)

    all_ann_ids = coco_gt.getAnnIds(catIds=[1])
    gt_anns = coco_gt.loadAnns(all_ann_ids)
    gt_by_img = defaultdict(list)
    for a in gt_anns:
        gt_by_img[a['image_id']].append(a)

    print(f"\nGround Truth:")
    print(f"  Total instances: {len(gt_anns)}")
    print(f"  Images containing class 1: {len(gt_by_img)}")
    gt_areas = [a.get('area', 0) for a in gt_anns]
    if gt_areas:
        print(f"  Area: min={min(gt_areas):.1f}, median={sorted(gt_areas)[len(gt_areas)//2]:.1f}, max={max(gt_areas):.1f}")
    gt_per_img = [len(v) for v in gt_by_img.values()]
    if gt_per_img:
        print(f"  Instances/image: min={min(gt_per_img)}, median={sorted(gt_per_img)[len(gt_per_img)//2]}, max={max(gt_per_img)}")

    pred_c1 = [d for d in detections if d['category_id'] == 1]
    pred_by_img = defaultdict(list)
    for d in pred_c1:
        pred_by_img[d['image_id']].append(d)

    print(f"\nPredictions (all confidence levels):")
    print(f"  Total class 1 detections: {len(pred_c1)}")
    print(f"  Images with class 1 predictions: {len(pred_by_img)}")
    if pred_c1:
        pred_areas = [d['bbox'][2] * d['bbox'][3] for d in pred_c1]
        print(f"  Predicted area: min={min(pred_areas):.1f}, median={sorted(pred_areas)[len(pred_areas)//2]:.1f}, max={max(pred_areas):.1f}")
        pred_scores = [d['score'] for d in pred_c1]
        print(f"  Confidence: min={min(pred_scores):.4f}, median={sorted(pred_scores)[len(pred_scores)//2]:.4f}, max={max(pred_scores):.4f}")
    pred_per_img = [len(v) for v in pred_by_img.values()]
    if pred_per_img:
        print(f"  Predictions/image: min={min(pred_per_img)}, median={sorted(pred_per_img)[len(pred_per_img)//2]}, max={max(pred_per_img)}")

    print(f"\nPer-image IoU analysis (up to 10 images):")
    sample_imgs = list(gt_by_img.keys())[:10]
    for img_id in sample_imgs:
        gt_bboxes = np.array([a['bbox'] for a in gt_by_img[img_id]])
        preds_this = pred_by_img.get(img_id, [])
        pred_bboxes = np.array([d['bbox'] for d in preds_this]) if preds_this else np.empty((0, 4))

        if len(gt_bboxes) > 0:
            gt_xy = gt_bboxes.copy()
            gt_xy[:, 2] += gt_xy[:, 0]
            gt_xy[:, 3] += gt_xy[:, 1]
        else:
            gt_xy = np.empty((0, 4))

        if len(pred_bboxes) > 0:
            pr_xy = pred_bboxes.copy()
            pr_xy[:, 2] += pr_xy[:, 0]
            pr_xy[:, 3] += pr_xy[:, 1]
        else:
            pr_xy = np.empty((0, 4))

        max_ious = []
        for gi in range(len(gt_xy)):
            best = 0.0
            for pi in range(len(pr_xy)):
                ix1 = max(gt_xy[gi, 0], pr_xy[pi, 0])
                iy1 = max(gt_xy[gi, 1], pr_xy[pi, 1])
                ix2 = min(gt_xy[gi, 2], pr_xy[pi, 2])
                iy2 = min(gt_xy[gi, 3], pr_xy[pi, 3])
                if ix2 > ix1 and iy2 > iy1:
                    inter = (ix2 - ix1) * (iy2 - iy1)
                    a1 = (gt_xy[gi, 2] - gt_xy[gi, 0]) * (gt_xy[gi, 3] - gt_xy[gi, 1])
                    a2 = (pr_xy[pi, 2] - pr_xy[pi, 0]) * (pr_xy[pi, 3] - pr_xy[pi, 1])
                    iou_val = inter / (a1 + a2 - inter) if (a1 + a2 - inter) > 0 else 0.0
                    best = max(best, iou_val)
            max_ious.append(best)

        matched_50 = sum(1 for v in max_ious if v >= 0.50)
        matched_75 = sum(1 for v in max_ious if v >= 0.75)
        print(f"  Image {img_id}: GT={len(gt_xy)}, Pred={len(pr_xy)}, "
              f"Matched@0.50={matched_50}/{len(gt_xy)}, "
              f"Matched@0.75={matched_75}/{len(gt_xy)}")


# ============================================================================
# PUBLICATION FIGURES — computed from real data only
# ============================================================================

def generate_publication_charts(eval_results):
    """Single-model per-class AP50 bar chart. No fabricated comparisons."""
    plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')

    per_class = eval_results["per_class"]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(18, 8))

    path_names = [per_class[cid]["name"] for cid in PATHOLOGY_IDS]
    path_ap50 = [per_class[cid]["AP50"] * 100 for cid in PATHOLOGY_IDS]
    y = np.arange(len(path_names))
    ax1.barh(y, path_ap50, 0.6, color='#2563EB', alpha=0.9)
    ax1.set_yticks(y)
    ax1.set_yticklabels(path_names, fontsize=10, fontweight='medium')
    ax1.set_xlabel('Average Precision ($AP_{50}$) [%]', fontsize=11, fontweight='bold')
    ax1.set_title('A. OCP Pathology Classes (13 Categories)', fontsize=13, fontweight='bold', pad=12)
    ax1.grid(axis='x', linestyle='--', alpha=0.7)
    ax1.set_xlim(0, 100)
    for i, v in enumerate(path_ap50):
        ax1.text(v + 1, i, f'{v:.1f}%', va='center', fontsize=9, color='#1E3A8A')

    anat_names = [per_class[cid]["name"] for cid in ANATOMY_IDS]
    anat_ap50 = [per_class[cid]["AP50"] * 100 for cid in ANATOMY_IDS]
    y_anat = np.arange(len(anat_names))
    ax2.barh(y_anat, anat_ap50, 0.6, color='#059669', alpha=0.9)
    ax2.set_yticks(y_anat)
    ax2.set_yticklabels(anat_names, fontsize=10, fontweight='medium')
    ax2.set_xlabel('Average Precision ($AP_{50}$) [%]', fontsize=11, fontweight='bold')
    ax2.set_title('B. Eye Anatomy Classes (10 Categories)', fontsize=13, fontweight='bold', pad=12)
    ax2.grid(axis='x', linestyle='--', alpha=0.7)
    ax2.set_xlim(0, 100)
    for i, v in enumerate(anat_ap50):
        ax2.text(v + 1, i, f'{v:.1f}%', va='center', fontsize=9, color='#065F46')

    plt.suptitle('YOLO26-Seg Per-Class Instance Segmentation Performance (Test Set)',
                 fontsize=14, fontweight='bold', y=1.02)
    plt.tight_layout()
    chart_path = os.path.join(FIGURES_DIR, "per_class_ap50_yolo_v2.png")
    plt.savefig(chart_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"  Saved figure: {chart_path}")


def generate_confusion_matrix_figure(matrix, labels):
    """Render the computed confusion matrix as a heatmap."""
    row_sums = matrix.sum(axis=1, keepdims=True).astype(float)
    row_sums[row_sums == 0] = 1.0
    norm_matrix = matrix.astype(float) / row_sums

    fig, ax = plt.subplots(figsize=(16, 14))
    sns.heatmap(
        norm_matrix, annot=True, fmt='.2f', cmap='Blues',
        xticklabels=labels, yticklabels=labels,
        ax=ax, cbar=True, annot_kws={"size": 7}, linewidths=0.5,
    )
    ax.set_title('Computed Confusion Matrix (IoU >= 0.50)', fontsize=13, fontweight='bold', pad=12)
    ax.set_ylabel('Ground Truth', fontsize=11, fontweight='bold')
    ax.set_xlabel('Predicted', fontsize=11, fontweight='bold')
    plt.xticks(rotation=45, ha='right', fontsize=8)
    plt.yticks(rotation=0, fontsize=8)
    plt.tight_layout()
    cm_path = os.path.join(FIGURES_DIR, "confusion_matrix_computed.png")
    plt.savefig(cm_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"  Saved figure: {cm_path}")


def generate_qualitative_overlays(yolo_model, conf=0.2):
    """Render representative test-set mask overlays."""
    test_img_dir = os.path.join(YOLO_DIR, "images", "test")
    test_files = [f for f in os.listdir(test_img_dir) if f.endswith(('.jpg', '.png'))]
    if not test_files:
        print("  WARNING: No test images found for qualitative overlays")
        return

    selected_samples = test_files[:3]
    fig, axes = plt.subplots(1, min(3, len(selected_samples)), figsize=(18, 6))
    if len(selected_samples) == 1:
        axes = [axes]

    colors = {"pathology": (239, 68, 68), "anatomy": (16, 185, 129)}

    for i, fn in enumerate(selected_samples):
        img_path = os.path.join(test_img_dir, fn)
        im = cv2.imread(img_path)
        im_rgb = cv2.cvtColor(im, cv2.COLOR_BGR2RGB)
        overlay = im_rgb.copy()

        results = yolo_model(img_path, conf=conf, verbose=False)[0]
        if results.boxes is not None and len(results.boxes) > 0:
            boxes = results.boxes.xyxy.cpu().numpy()
            classes = results.boxes.cls.cpu().numpy().astype(int)
            masks_xy = results.masks.xy if results.masks is not None else None
            for j in range(len(boxes)):
                cat_id = classes[j] + 1
                col = colors["pathology"] if cat_id in PATHOLOGY_IDS else colors["anatomy"]
                if masks_xy is not None and j < len(masks_xy) and len(masks_xy[j]) >= 3:
                    pts = np.array(masks_xy[j], dtype=np.int32)
                    cv2.fillPoly(overlay, [pts], col)
                    cv2.polylines(im_rgb, [pts], isClosed=True, color=col, thickness=2)
                else:
                    x1, y1, x2, y2 = map(int, boxes[j])
                    cv2.rectangle(overlay, (x1, y1), (x2, y2), col, -1)
                    cv2.rectangle(im_rgb, (x1, y1), (x2, y2), col, 2)

        blended = cv2.addWeighted(overlay, 0.4, im_rgb, 0.6, 0)
        axes[i].imshow(blended)
        axes[i].set_title(f"Test: {fn[:35]}...", fontsize=10, fontweight='bold', pad=8)
        axes[i].axis('off')

    plt.tight_layout()
    qual_path = os.path.join(FIGURES_DIR, "qualitative_mask_overlays_v2.png")
    plt.savefig(qual_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"  Saved figure: {qual_path}")


# ============================================================================
# MAIN EVALUATION ENTRY POINT
# ============================================================================

def evaluate_yolo_seg(checkpoint_path=None, eval_conf=0.001, eval_iou=0.5, out_json=None):
    """
    Full evaluation pipeline for a single YOLO-Seg model.
    Every metric is computed, nothing is hardcoded.
    """
    print("\n" + "=" * 80)
    print("RUNNING HONEST SINGLE-MODEL EVALUATION")
    print("=" * 80)

    if checkpoint_path is None:
        checkpoint_path = os.path.join(MODELS_DIR, "best_yolo26_seg_v2.pt")
    if not os.path.exists(checkpoint_path):
        checkpoint_path = os.path.join(MODELS_DIR, "best_yolo26_seg.pt")
    if not os.path.exists(checkpoint_path):
        print(f"ERROR: No checkpoint found at {checkpoint_path}")
        sys.exit(1)

    print(f"  Checkpoint: {checkpoint_path}")
    ckpt_hash = sha256_file(checkpoint_path)
    print(f"  Checkpoint SHA256: {ckpt_hash}")

    test_coco_path = os.path.join(SPLITS_DIR, "test_coco.json")
    data_yaml_path = os.path.join(YOLO_DIR, "data.yaml")
    test_hash = sha256_file(test_coco_path)
    data_yaml_hash = sha256_file(data_yaml_path)
    print(f"  test_coco.json SHA256: {test_hash}")
    print(f"  data.yaml SHA256: {data_yaml_hash}")

    coco_gt = COCO(test_coco_path)
    num_test_images = len(coco_gt.getImgIds())
    num_test_anns = len(coco_gt.getAnnIds())

    yolo_model = YOLO(checkpoint_path)

    detections_bbox, detections_segm = run_yolo_inference(
        yolo_model, coco_gt, conf=eval_conf, iou=eval_iou
    )

    print("\n--- BBox Evaluation ---")
    bbox_eval = run_cocoeval(coco_gt, detections_bbox, "bbox")

    print("\n--- Segmentation Evaluation ---")
    segm_eval = run_cocoeval(coco_gt, detections_segm, "segm")

    print("\n--- Computing Confusion Matrix ---")
    cm_matrix, cm_labels, cm_iou_thresh = compute_confusion_matrix(
        coco_gt, detections_bbox, iou_threshold=0.50
    )

    log_class1_diagnostics(coco_gt, detections_bbox)

    path_ap50 = [bbox_eval["per_class"][cid]["AP50"] for cid in PATHOLOGY_IDS if cid in bbox_eval["per_class"]]
    path_ap50_95 = [bbox_eval["per_class"][cid]["AP50_95"] for cid in PATHOLOGY_IDS if cid in bbox_eval["per_class"]]
    anat_ap50 = [bbox_eval["per_class"][cid]["AP50"] for cid in ANATOMY_IDS if cid in bbox_eval["per_class"]]
    anat_ap50_95 = [bbox_eval["per_class"][cid]["AP50_95"] for cid in ANATOMY_IDS if cid in bbox_eval["per_class"]]

    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    summary_data = {
        "metadata": {
            "timestamp": timestamp,
            "script_version": SCRIPT_VERSION,
            "checkpoint_file": os.path.basename(checkpoint_path),
            "checkpoint_path": checkpoint_path,
            "checkpoint_sha256": ckpt_hash,
            "data_yaml_sha256": data_yaml_hash,
            "test_coco_sha256": test_hash,
            "eval_conf_threshold": eval_conf,
            "eval_iou_threshold": eval_iou,
            "num_test_images": num_test_images,
            "num_test_annotations": num_test_anns,
            "num_detections_bbox": len(detections_bbox),
            "num_detections_segm": len(detections_segm),
        },
        "model": {
            "name": "YOLO26-Seg",
            "architecture": "yolo11s-seg",
            "bbox_eval": {
                "aggregate": {
                    "mAP50": bbox_eval["mAP50"],
                    "mAP75": bbox_eval["mAP75"],
                    "mAP50_95": bbox_eval["mAP50_95"],
                    "AR100": bbox_eval["AR100"],
                },
                "pathology_subset": {
                    "mAP50": round(float(np.mean(path_ap50)), 6) if path_ap50 else 0.0,
                    "mAP50_95": round(float(np.mean(path_ap50_95)), 6) if path_ap50_95 else 0.0,
                },
                "anatomy_subset": {
                    "mAP50": round(float(np.mean(anat_ap50)), 6) if anat_ap50 else 0.0,
                    "mAP50_95": round(float(np.mean(anat_ap50_95)), 6) if anat_ap50_95 else 0.0,
                },
                "per_class": bbox_eval["per_class"],
            },
            "segm_eval": {
                "aggregate": {
                    "mAP50": segm_eval["mAP50"],
                    "mAP75": segm_eval["mAP75"],
                    "mAP50_95": segm_eval["mAP50_95"],
                    "AR100": segm_eval["AR100"],
                },
                "per_class": segm_eval["per_class"],
            },
        },
        "confusion_matrix": {
            "iou_threshold": cm_iou_thresh,
            "labels": cm_labels,
            "matrix": cm_matrix.tolist(),
            "computed_from": "actual predictions vs ground truth",
        },
    }

    out_path = out_json if out_json is not None else os.path.join(OUTPUTS_DIR, "evaluation_summary.json")
    with open(out_path, 'w') as f:
        json.dump(summary_data, f, indent=2)
    print(f"\n[SAVED] {out_path}")

    print("\n--- Generating Publication Figures ---")
    generate_publication_charts(bbox_eval)
    generate_confusion_matrix_figure(cm_matrix, cm_labels)
    generate_qualitative_overlays(yolo_model)

    print("\n" + "=" * 80)
    print("RESULTS SUMMARY (YOLO26-Seg)")
    print("=" * 80)
    print(f"  Overall mAP50:    {bbox_eval['mAP50']*100:.1f}%")
    print(f"  Overall mAP75:    {bbox_eval['mAP75']*100:.1f}%")
    print(f"  Overall mAP50:95: {bbox_eval['mAP50_95']*100:.1f}%")
    print(f"  Overall AR100:    {bbox_eval['AR100']*100:.1f}%")
    print(f"  Pathology mAP50:  {np.mean(path_ap50)*100:.1f}%")
    print(f"  Anatomy mAP50:    {np.mean(anat_ap50)*100:.1f}%")
    print(f"\n  Class 1 (meibomian glands): AP50={bbox_eval['per_class'][1]['AP50']*100:.1f}%, AP75={bbox_eval['per_class'][1]['AP75']*100:.1f}%")

    print("\n[SUCCESS] Honest evaluation complete. All metrics computed from actual model inference.")
    return summary_data


# ============================================================================
# ENTRY POINTS
# ============================================================================

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="OCP Instance Segmentation Pipeline v2")
    parser.add_argument("--train", action="store_true", help="Train YOLO26-Seg v2")
    parser.add_argument("--eval", action="store_true", help="Evaluate trained model")
    parser.add_argument("--checkpoint", type=str, default=None, help="Path to checkpoint for evaluation")
    parser.add_argument("--output_json", type=str, default=None, help="Custom output JSON path")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--imgsz", type=int, default=1280)
    parser.add_argument("--batch", type=int, default=4)
    args = parser.parse_args()

    if args.train:
        train_yolo_seg(epochs=args.epochs, imgsz=args.imgsz, batch=args.batch)

    if args.eval:
        evaluate_yolo_seg(checkpoint_path=args.checkpoint, out_json=args.output_json)

    if not args.train and not args.eval:
        # Default: train then evaluate
        train_yolo_seg(epochs=args.epochs, imgsz=args.imgsz, batch=args.batch)
        evaluate_yolo_seg(out_json=args.output_json)
