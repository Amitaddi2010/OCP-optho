"""
eval_sahi.py — SAHI Sliced Inference Evaluation Pipeline
=========================================================
Runs Sliced Aided Hyper Inference (SAHI) on the held-out test set
using the baseline v1 model (best_yolo26_seg.pt).
Outputs full audited evaluation summary schema to outputs/evaluation_summary_sahi.json.
"""

import os
import sys
import json
import hashlib
import datetime
import time
import numpy as np
import cv2
from collections import defaultdict
from pycocotools.coco import COCO
from pycocotools.cocoeval import COCOeval
from pycocotools import mask as mask_util
from sahi import AutoDetectionModel
from sahi.predict import get_sliced_prediction

SCRIPT_VERSION = "2.0.0-sahi"

BASE_DIR = r"e:\Amit Data\OCP_Detection"
DATASET_DIR = os.path.join(BASE_DIR, "Dataset")
PROCESSED_DIR = os.path.join(DATASET_DIR, "processed")
SPLITS_DIR = os.path.join(PROCESSED_DIR, "splits")
YOLO_DIR = os.path.join(DATASET_DIR, "yolo_dataset")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
MODELS_DIR = os.path.join(BASE_DIR, "models")
FIGURES_DIR = os.path.join(BASE_DIR, "reports", "figures")

# Categories
with open(os.path.join(PROCESSED_DIR, "merged_coco.json"), 'r', encoding='utf-8') as f:
    merged_coco = json.load(f)

CATEGORIES = merged_coco['categories']
CAT_ID_TO_NAME = {c['id']: c['name'] for c in CATEGORIES}
CAT_NAME_TO_ID = {c['name']: c['id'] for c in CATEGORIES}
PATHOLOGY_IDS = [c['id'] for c in CATEGORIES if c['supercategory'] == 'pathology']
ANATOMY_IDS = [c['id'] for c in CATEGORIES if c['supercategory'] == 'anatomy']


def sha256_file(filepath):
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()


def run_sahi_inference(detection_model, coco_gt, slice_size=640, overlap_ratio=0.2):
    test_images = coco_gt.loadImgs(coco_gt.getImgIds())
    detections_bbox = []
    detections_segm = []

    print(f"\nRunning SAHI sliced inference on {len(test_images)} test images...")
    print(f"  slice_size={slice_size}, overlap_ratio={overlap_ratio}, perform_standard_pred=True")

    t0 = time.time()
    for idx, img_info in enumerate(test_images):
        img_id = img_info['id']
        fn = img_info['file_name']
        img_path = os.path.join(PROCESSED_DIR, "images", fn)

        if not os.path.exists(img_path):
            continue

        img_h = img_info['height']
        img_w = img_info['width']

        sahi_result = get_sliced_prediction(
            img_path,
            detection_model,
            slice_height=slice_size,
            slice_width=slice_size,
            overlap_height_ratio=overlap_ratio,
            overlap_width_ratio=overlap_ratio,
            perform_standard_pred=True,
            postprocess_type="GREEDYNMM",
            postprocess_match_metric="IOU",
            postprocess_match_threshold=0.50,
            force_postprocess_type=True,
            verbose=0
        )

        for op in sahi_result.object_prediction_list:
            cat_id = int(op.category.id) + 1  # 0-indexed -> 1-indexed COCO
            conf_score = float(op.score.value)

            bx1 = float(op.bbox.minx)
            by1 = float(op.bbox.miny)
            bx2 = float(op.bbox.maxx)
            by2 = float(op.bbox.maxy)
            bw = bx2 - bx1
            bh = by2 - by1

            det_bbox = {
                "image_id": int(img_id),
                "category_id": cat_id,
                "bbox": [bx1, by1, bw, bh],
                "score": conf_score,
            }
            detections_bbox.append(det_bbox)

            # Segmentation
            rle_encoded = None
            if op.mask is not None and hasattr(op.mask, 'bool_mask'):
                try:
                    bool_arr = op.mask.bool_mask.astype(np.uint8)
                    rle = mask_util.encode(np.asfortranarray(bool_arr))
                    if isinstance(rle['counts'], bytes):
                        rle['counts'] = rle['counts'].decode('utf-8')
                    rle_encoded = rle
                except Exception:
                    rle_encoded = None

            if rle_encoded is None:
                rx1, ry1 = max(0.0, bx1), max(0.0, by1)
                rx2, ry2 = min(float(img_w), bx2), min(float(img_h), by2)
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

        if (idx + 1) % 10 == 0 or (idx + 1) == len(test_images):
            elapsed = time.time() - t0
            print(f"  Processed {idx+1}/{len(test_images)} images ({elapsed:.1f}s, avg {elapsed/(idx+1):.2f}s/img)...")

    print(f"  Total SAHI detections: {len(detections_bbox)} bbox, {len(detections_segm)} segm")
    return detections_bbox, detections_segm


def run_cocoeval(coco_gt, detections, iou_type="bbox"):
    if not detections:
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


def main():
    checkpoint_path = os.path.join(MODELS_DIR, "best_yolo26_seg.pt")
    if not os.path.exists(checkpoint_path):
        print(f"ERROR: Checkpoint not found at {checkpoint_path}")
        sys.exit(1)

    ckpt_hash = sha256_file(checkpoint_path)
    test_coco_path = os.path.join(SPLITS_DIR, "test_coco.json")
    data_yaml_path = os.path.join(YOLO_DIR, "data.yaml")
    test_hash = sha256_file(test_coco_path)
    data_yaml_hash = sha256_file(data_yaml_path)

    print("=" * 80)
    print("RUNNING SAHI SLICED INFERENCE EVALUATION ON v1 CHECKPOINT")
    print("=" * 80)
    print(f"  Checkpoint: {checkpoint_path} (SHA256: {ckpt_hash[:12]}...)")
    print(f"  Test COCO : {test_coco_path} (SHA256: {test_hash[:12]}...)")

    coco_gt = COCO(test_coco_path)

    detection_model = AutoDetectionModel.from_pretrained(
        model_type='yolov8',
        model_path=checkpoint_path,
        confidence_threshold=0.01,
        device='cuda:0'
    )

    detections_bbox, detections_segm = run_sahi_inference(
        detection_model, coco_gt, slice_size=640, overlap_ratio=0.2
    )

    print("\n--- BBox Evaluation (SAHI) ---")
    bbox_eval = run_cocoeval(coco_gt, detections_bbox, "bbox")

    print("\n--- Segmentation Evaluation (SAHI) ---")
    segm_eval = run_cocoeval(coco_gt, detections_segm, "segm")

    print("\n--- Computing Confusion Matrix ---")
    cm_matrix, cm_labels, cm_iou_thresh = compute_confusion_matrix(
        coco_gt, detections_bbox, iou_threshold=0.50
    )

    path_ap50 = [bbox_eval["per_class"][cid]["AP50"] for cid in PATHOLOGY_IDS if cid in bbox_eval["per_class"]]
    path_ap50_95 = [bbox_eval["per_class"][cid]["AP50_95"] for cid in PATHOLOGY_IDS if cid in bbox_eval["per_class"]]
    anat_ap50 = [bbox_eval["per_class"][cid]["AP50"] for cid in ANATOMY_IDS if cid in bbox_eval["per_class"]]
    anat_ap50_95 = [bbox_eval["per_class"][cid]["AP50_95"] for cid in ANATOMY_IDS if cid in bbox_eval["per_class"]]

    seg_path_ap50 = [segm_eval["per_class"][cid]["AP50"] for cid in PATHOLOGY_IDS if cid in segm_eval["per_class"]]
    seg_path_ap50_95 = [segm_eval["per_class"][cid]["AP50_95"] for cid in PATHOLOGY_IDS if cid in segm_eval["per_class"]]
    seg_anat_ids = [cid for cid in ANATOMY_IDS if cid not in [18, 21]]
    seg_anat_ap50 = [segm_eval["per_class"][cid]["AP50"] for cid in seg_anat_ids if cid in segm_eval["per_class"]]
    seg_anat_ap50_95 = [segm_eval["per_class"][cid]["AP50_95"] for cid in seg_anat_ids if cid in segm_eval["per_class"]]

    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    summary_data = {
        "metadata": {
            "timestamp": timestamp,
            "script_version": SCRIPT_VERSION,
            "inference_method": "SAHI (Sliced Aided Hyper Inference) + GREEDYNMM merge",
            "checkpoint_file": os.path.basename(checkpoint_path),
            "checkpoint_path": checkpoint_path,
            "checkpoint_sha256": ckpt_hash,
            "data_yaml_sha256": data_yaml_hash,
            "test_coco_sha256": test_hash,
            "eval_conf_threshold": 0.01,
            "slice_size": 640,
            "overlap_ratio": 0.2,
            "postprocess_type": "GREEDYNMM",
            "perform_standard_pred": True,
            "num_test_images": len(coco_gt.getImgIds()),
            "num_test_annotations": len(coco_gt.getAnnIds()),
            "num_detections_bbox": len(detections_bbox),
            "num_detections_segm": len(detections_segm),
        },
        "model": {
            "name": "YOLO26-Seg (v1) + SAHI GREEDYNMM",
            "architecture": "yolo11s-seg (SAHI sliced 640x640, overlap 0.2, GREEDYNMM merge)",
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
                "aggregate_21class": {
                    "mAP50": segm_eval["mAP50"],
                    "mAP75": segm_eval["mAP75"],
                    "mAP50_95": segm_eval["mAP50_95"],
                    "AR100": segm_eval["AR100"],
                },
                "pathology_subset": {
                    "mAP50": round(float(np.mean(seg_path_ap50)), 6) if seg_path_ap50 else 0.0,
                    "mAP50_95": round(float(np.mean(seg_path_ap50_95)), 6) if seg_path_ap50_95 else 0.0,
                },
                "anatomy_subset_decoupled": {
                    "mAP50": round(float(np.mean(seg_anat_ap50)), 6) if seg_anat_ap50 else 0.0,
                    "mAP50_95": round(float(np.mean(seg_anat_ap50_95)), 6) if seg_anat_ap50_95 else 0.0,
                },
                "excluded_classes_from_segmentation": [18, 21],
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

    out_path = os.path.join(OUTPUTS_DIR, "evaluation_summary_sahi_nmm.json")
    with open(out_path, 'w') as f:
        json.dump(summary_data, f, indent=2)
    print(f"\n[SAVED] {out_path}")

    print("\n" + "=" * 80)
    print("RESULTS SUMMARY (YOLO26-Seg v1 + SAHI GREEDYNMM)")
    print("=" * 80)
    print(f"  Overall Box  mAP50:    {bbox_eval['mAP50']*100:.1f}%")
    print(f"  Overall Box  mAP75:    {bbox_eval['mAP75']*100:.1f}%")
    print(f"  Overall Box  mAP50:95: {bbox_eval['mAP50_95']*100:.1f}%")
    print(f"  Overall Box  AR100:    {bbox_eval['AR100']*100:.1f}%")
    print(f"  Overall Mask mAP50 (21-class): {segm_eval['mAP50']*100:.1f}%")
    print(f"  Overall Mask mAP75 (21-class): {segm_eval['mAP75']*100:.1f}%")
    print(f"  Pathology Mask mAP50: {np.mean(seg_path_ap50)*100:.1f}%")
    print(f"  Anatomy Mask mAP50 (decoupled): {np.mean(seg_anat_ap50)*100:.1f}%")
    print(f"\n  Class 1 (meibomian glands):")
    print(f"    Box  AP50: {bbox_eval['per_class'][1]['AP50']*100:.2f}%, AP75: {bbox_eval['per_class'][1]['AP75']*100:.2f}%")
    print(f"    Segm AP50: {segm_eval['per_class'][1]['AP50']*100:.2f}%, AP75: {segm_eval['per_class'][1]['AP75']*100:.2f}%")

    return summary_data


if __name__ == "__main__":
    main()
