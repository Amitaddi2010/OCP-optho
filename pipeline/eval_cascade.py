"""
eval_cascade.py — Crop-and-Zoom Cascade Evaluation Pipeline
=============================================================
Evaluates the Crop-and-Zoom cascade on the held-out test set (95 images)
using baseline v1 weights (best_yolo26_seg.pt).

Includes two modes:
1. Oracle Mode (--oracle): Uses ground-truth eyelid margin regions (classes 2, 16, 19)
   to define the high-resolution crop ceiling.
2. Real Pipeline Mode: Uses Pass 1 predicted eyelid margin regions (classes 2, 16, 19)
   with fallback to full-frame if no margins detected.

All evaluations maintain identical settings: conf=0.001, iou=0.50, categories 18 & 21
decoupled from mask eval.
"""

import os
import sys
import json
import hashlib
import datetime
import time
import argparse
import numpy as np
import cv2
from collections import defaultdict
from pycocotools.coco import COCO
from pycocotools.cocoeval import COCOeval
from pycocotools import mask as mask_util
from ultralytics import YOLO

SCRIPT_VERSION = "2.0.0-cascade"

BASE_DIR = r"e:\Amit Data\OCP_Detection"
DATASET_DIR = os.path.join(BASE_DIR, "Dataset")
PROCESSED_DIR = os.path.join(DATASET_DIR, "processed")
SPLITS_DIR = os.path.join(PROCESSED_DIR, "splits")
YOLO_DIR = os.path.join(DATASET_DIR, "yolo_dataset")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
MODELS_DIR = os.path.join(BASE_DIR, "models")

# Categories
with open(os.path.join(PROCESSED_DIR, "merged_coco.json"), 'r', encoding='utf-8') as f:
    merged_coco = json.load(f)

CATEGORIES = merged_coco['categories']
CAT_ID_TO_NAME = {c['id']: c['name'] for c in CATEGORIES}
CAT_NAME_TO_ID = {c['name']: c['id'] for c in CATEGORIES}
PATHOLOGY_IDS = [c['id'] for c in CATEGORIES if c['supercategory'] == 'pathology']
ANATOMY_IDS = [c['id'] for c in CATEGORIES if c['supercategory'] == 'anatomy']

# Eyelid margin classes that enclose meibomian orifices:
# 2: OCP Rounding of lid margins, 16: Upper eyelid, 19: lower eyelid
EYELID_MARGIN_CAT_IDS = [2, 16, 19]


def sha256_file(filepath):
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()


def nms_boxes_and_masks(boxes, scores, segm_rles, iou_threshold=0.50):
    """Batched NMS for a single class (Class 1) across multiple overlapping crops."""
    if len(boxes) == 0:
        return [], [], []

    boxes = np.array(boxes)
    scores = np.array(scores)

    x1 = boxes[:, 0]
    y1 = boxes[:, 1]
    x2 = boxes[:, 0] + boxes[:, 2]
    y2 = boxes[:, 1] + boxes[:, 3]
    areas = boxes[:, 2] * boxes[:, 3]

    order = scores.argsort()[::-1]
    keep = []

    while order.size > 0:
        i = order[0]
        keep.append(i)

        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])

        w = np.maximum(0.0, xx2 - xx1)
        h = np.maximum(0.0, yy2 - yy1)
        inter = w * h
        ovr = inter / (areas[i] + areas[order[1:]] - inter + 1e-6)

        inds = np.where(ovr <= iou_threshold)[0]
        order = order[inds + 1]

    keep_boxes = [boxes[k].tolist() for k in keep]
    keep_scores = [scores[k] for k in keep]
    keep_segm = [segm_rles[k] for k in keep]
    return keep_boxes, keep_scores, keep_segm


def run_cascade_inference(model, coco_gt, oracle=False, eval_conf=0.001, eval_iou=0.50, lid_conf_thresh=0.05):
    test_images = coco_gt.loadImgs(coco_gt.getImgIds())
    detections_bbox = []
    detections_segm = []

    mode_name = "ORACLE (Ground-Truth Eyelid Crops)" if oracle else "REAL END-TO-END CASCADE (Predicted Eyelid Crops)"
    print(f"\nRunning Cascade Inference [{mode_name}] on {len(test_images)} test images...")

    fallback_count = 0
    total_crops_processed = 0

    t0 = time.time()
    for idx, img_info in enumerate(test_images):
        img_id = img_info['id']
        fn = img_info['file_name']
        img_path = os.path.join(PROCESSED_DIR, "images", fn)

        if not os.path.exists(img_path):
            continue

        im = cv2.imread(img_path)
        img_h, img_w = im.shape[:2]

        # Pass 1: Full-Frame Inference
        res_full = model(img_path, conf=eval_conf, iou=eval_iou, verbose=False)[0]

        # Collect Pass 1 detections for all classes EXCEPT Class 1
        full_boxes = res_full.boxes.xyxy.cpu().numpy() if res_full.boxes is not None else np.empty((0, 4))
        full_scores = res_full.boxes.conf.cpu().numpy() if res_full.boxes is not None else np.empty((0,))
        full_classes = res_full.boxes.cls.cpu().numpy().astype(int) if res_full.boxes is not None else np.empty((0,))
        full_masks_xy = res_full.masks.xy if res_full.masks is not None else None

        # Fallback cache for full-frame Class 1 detections in case no eyelid is detected
        fallback_c1_bbox = []
        fallback_c1_segm = []

        for i in range(len(full_boxes)):
            cat_id = int(full_classes[i]) + 1
            conf_score = float(full_scores[i])
            x1, y1, x2, y2 = full_boxes[i]
            bw, bh = float(x2 - x1), float(y2 - y1)

            # RLE for full-frame detection
            rle_encoded = None
            if full_masks_xy is not None and i < len(full_masks_xy) and len(full_masks_xy[i]) >= 3:
                poly = full_masks_xy[i].flatten().tolist()
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
                rx1, ry1 = max(0.0, float(x1)), max(0.0, float(y1))
                rx2, ry2 = min(float(img_w), float(x2)), min(float(img_h), float(y2))
                rect_poly = [rx1, ry1, rx2, ry1, rx2, ry2, rx1, ry2]
                rle_list = mask_util.frPyObjects([rect_poly], img_h, img_w)
                rle_encoded = rle_list[0]
                if isinstance(rle_encoded['counts'], bytes):
                    rle_encoded['counts'] = rle_encoded['counts'].decode('utf-8')

            det_b = {
                "image_id": int(img_id),
                "category_id": cat_id,
                "bbox": [float(x1), float(y1), bw, bh],
                "score": conf_score,
            }
            det_s = {
                "image_id": int(img_id),
                "category_id": cat_id,
                "segmentation": rle_encoded,
                "score": conf_score,
            }

            if cat_id == 1:
                # Store in fallback
                fallback_c1_bbox.append(det_b)
                fallback_c1_segm.append(det_s)
            else:
                # Always keep full-frame for non-Class-1 (preserves perfect unfragmented anatomy)
                detections_bbox.append(det_b)
                detections_segm.append(det_s)

        # Pass 2: Determine Eyelid Margin Crops
        crop_boxes = []

        if oracle:
            # Ground-truth eyelid margin boxes
            gt_anns = coco_gt.loadAnns(coco_gt.getAnnIds(imgIds=img_id, catIds=EYELID_MARGIN_CAT_IDS))
            for a in gt_anns:
                gx, gy, gw, gh = a['bbox']
                crop_boxes.append([gx, gy, gx + gw, gy + gh])
        else:
            # Predicted eyelid margin boxes from Pass 1
            for i in range(len(full_boxes)):
                cat_id = int(full_classes[i]) + 1
                if cat_id in EYELID_MARGIN_CAT_IDS and full_scores[i] >= lid_conf_thresh:
                    crop_boxes.append(full_boxes[i].tolist())

        # Pass 3: Process Crops for Class 1
        if len(crop_boxes) == 0:
            # Failure path: Fall back to full-frame Class 1 detections
            fallback_count += 1
            detections_bbox.extend(fallback_c1_bbox)
            detections_segm.extend(fallback_c1_segm)
        else:
            # Crop and zoom
            crop_c1_boxes = []
            crop_c1_scores = []
            crop_c1_masks = []

            for cb in crop_boxes:
                total_crops_processed += 1
                bx1, by1, bx2, by2 = cb
                bw = bx2 - bx1
                bh = by2 - by1

                # 15% padding margin, clamped
                cx1 = max(0, int(bx1 - 0.15 * bw))
                cy1 = max(0, int(by1 - 0.15 * bh))
                cx2 = min(img_w, int(bx2 + 0.15 * bw))
                cy2 = min(img_h, int(by2 + 0.15 * bh))

                crop_h = cy2 - cy1
                crop_w = cx2 - cx1
                if crop_h < 10 or crop_w < 10:
                    continue

                crop_img = im[cy1:cy2, cx1:cx2]

                # Run model on high-resolution crop
                res_crop = model(crop_img, conf=eval_conf, iou=eval_iou, verbose=False)[0]

                if res_crop.boxes is not None and len(res_crop.boxes) > 0:
                    c_boxes = res_crop.boxes.xyxy.cpu().numpy()
                    c_scores = res_crop.boxes.conf.cpu().numpy()
                    c_classes = res_crop.boxes.cls.cpu().numpy().astype(int)
                    c_masks_xy = res_crop.masks.xy if res_crop.masks is not None else None

                    for ci in range(len(c_boxes)):
                        # ONLY take Class 1 (meibomian glands) from crop
                        if c_classes[ci] != 0:  # 0-indexed for Class 1
                            continue

                        g_conf = float(c_scores[ci])
                        gx1, gy1, gx2, gy2 = c_boxes[ci]

                        # Shift coordinates back to full image space
                        full_gx1 = float(gx1 + cx1)
                        full_gy1 = float(gy1 + cy1)
                        full_gx2 = float(gx2 + cx1)
                        full_gy2 = float(gy2 + cy1)
                        full_gw = full_gx2 - full_gx1
                        full_gh = full_gy2 - full_gy1

                        # Shift polygon mask back to full image space
                        rle_crop_encoded = None
                        if c_masks_xy is not None and ci < len(c_masks_xy) and len(c_masks_xy[ci]) >= 3:
                            poly_pts = c_masks_xy[ci].copy()
                            poly_pts[:, 0] += cx1
                            poly_pts[:, 1] += cy1
                            shifted_poly = poly_pts.flatten().tolist()
                            if len(shifted_poly) >= 6:
                                try:
                                    rle_list = mask_util.frPyObjects([shifted_poly], img_h, img_w)
                                    if len(rle_list) > 0:
                                        rle_crop_encoded = rle_list[0]
                                        if isinstance(rle_crop_encoded['counts'], bytes):
                                            rle_crop_encoded['counts'] = rle_crop_encoded['counts'].decode('utf-8')
                                except Exception:
                                    rle_crop_encoded = None

                        if rle_crop_encoded is None:
                            rx1 = max(0.0, full_gx1)
                            ry1 = max(0.0, full_gy1)
                            rx2 = min(float(img_w), full_gx2)
                            ry2 = min(float(img_h), full_gy2)
                            rect_poly = [rx1, ry1, rx2, ry1, rx2, ry2, rx1, ry2]
                            rle_list = mask_util.frPyObjects([rect_poly], img_h, img_w)
                            rle_crop_encoded = rle_list[0]
                            if isinstance(rle_crop_encoded['counts'], bytes):
                                rle_crop_encoded['counts'] = rle_crop_encoded['counts'].decode('utf-8')

                        crop_c1_boxes.append([full_gx1, full_gy1, full_gw, full_gh])
                        crop_c1_scores.append(g_conf)
                        crop_c1_masks.append(rle_crop_encoded)

            # Batched NMS across crops for Class 1 to resolve overlapping crop seams
            if len(crop_c1_boxes) > 0:
                merged_boxes, merged_scores, merged_masks = nms_boxes_and_masks(
                    crop_c1_boxes, crop_c1_scores, crop_c1_masks, iou_threshold=0.50
                )
                for mb, ms, mm in zip(merged_boxes, merged_scores, merged_masks):
                    detections_bbox.append({
                        "image_id": int(img_id),
                        "category_id": 1,
                        "bbox": mb,
                        "score": ms,
                    })
                    detections_segm.append({
                        "image_id": int(img_id),
                        "category_id": 1,
                        "segmentation": mm,
                        "score": ms,
                    })
            else:
                # If crop produced 0 detections, fall back
                detections_bbox.extend(fallback_c1_bbox)
                detections_segm.extend(fallback_c1_segm)

        if (idx + 1) % 20 == 0 or (idx + 1) == len(test_images):
            print(f"  Processed {idx+1}/{len(test_images)} images ({time.time()-t0:.1f}s)...")

    print(f"  Completed inference. Total crops: {total_crops_processed}, Fallback images: {fallback_count}/{len(test_images)}")
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
        # Structurally exclude 18 and 21 from segmentation eval
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


def evaluate_cascade(oracle=False):
    checkpoint_path = os.path.join(MODELS_DIR, "best_yolo26_seg.pt")
    if not os.path.exists(checkpoint_path):
        print(f"ERROR: Checkpoint not found at {checkpoint_path}")
        sys.exit(1)

    ckpt_hash = sha256_file(checkpoint_path)
    test_coco_path = os.path.join(SPLITS_DIR, "test_coco.json")
    data_yaml_path = os.path.join(YOLO_DIR, "data.yaml")
    test_hash = sha256_file(test_coco_path)
    data_yaml_hash = sha256_file(data_yaml_path)

    mode_label = "Oracle" if oracle else "Real"
    print("=" * 80)
    print(f"RUNNING CROP-AND-ZOOM CASCADE EVALUATION [{mode_label.upper()} MODE]")
    print("=" * 80)

    coco_gt = COCO(test_coco_path)
    model = YOLO(checkpoint_path)

    detections_bbox, detections_segm = run_cascade_inference(
        model, coco_gt, oracle=oracle, eval_conf=0.001, eval_iou=0.50
    )

    print(f"\n--- BBox Evaluation ({mode_label} Cascade) ---")
    bbox_eval = run_cocoeval(coco_gt, detections_bbox, "bbox")

    print(f"\n--- Segmentation Evaluation ({mode_label} Cascade) ---")
    segm_eval = run_cocoeval(coco_gt, detections_segm, "segm")

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

    out_file = "evaluation_summary_cascade_oracle.json" if oracle else "evaluation_summary_cascade_real.json"
    out_path = os.path.join(OUTPUTS_DIR, out_file)

    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    summary_data = {
        "metadata": {
            "timestamp": timestamp,
            "script_version": SCRIPT_VERSION,
            "cascade_mode": "oracle" if oracle else "real_end_to_end",
            "checkpoint_file": os.path.basename(checkpoint_path),
            "checkpoint_path": checkpoint_path,
            "checkpoint_sha256": ckpt_hash,
            "data_yaml_sha256": data_yaml_hash,
            "test_coco_sha256": test_hash,
            "eval_conf_threshold": 0.001,
            "eval_iou_threshold": 0.50,
            "eyelid_margin_classes": EYELID_MARGIN_CAT_IDS,
            "crop_margin_padding": 0.15,
            "num_test_images": len(coco_gt.getImgIds()),
            "num_test_annotations": len(coco_gt.getAnnIds()),
            "num_detections_bbox": len(detections_bbox),
            "num_detections_segm": len(detections_segm),
        },
        "model": {
            "name": f"YOLO26-Seg (v1) + Crop-and-Zoom Cascade ({mode_label})",
            "architecture": f"yolo11s-seg (2-stage crop-and-zoom, {mode_label})",
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

    with open(out_path, 'w') as f:
        json.dump(summary_data, f, indent=2)
    print(f"\n[SAVED] {out_path}")

    print("\n" + "=" * 80)
    print(f"RESULTS SUMMARY (Cascade {mode_label})")
    print("=" * 80)
    print(f"  Overall Box  mAP50:    {bbox_eval['mAP50']*100:.1f}%")
    print(f"  Overall Box  mAP75:    {bbox_eval['mAP75']*100:.1f}%")
    print(f"  Overall Box  mAP50:95: {bbox_eval['mAP50_95']*100:.1f}%")
    print(f"  Overall Box  AR100:    {bbox_eval['AR100']*100:.1f}%")
    print(f"  Overall Mask mAP50 (21c): {segm_eval['mAP50']*100:.1f}%")
    print(f"  Overall Mask mAP75 (21c): {segm_eval['mAP75']*100:.1f}%")
    print(f"  Anatomy Mask mAP50 (decoupled): {np.mean(seg_anat_ap50)*100:.1f}%")
    print(f"\n  Class 1 (meibomian glands):")
    print(f"    Box  AP50: {bbox_eval['per_class'][1]['AP50']*100:.2f}%, AP75: {bbox_eval['per_class'][1]['AP75']*100:.2f}%")
    print(f"    Segm AP50: {segm_eval['per_class'][1]['AP50']*100:.2f}%, AP75: {segm_eval['per_class'][1]['AP75']*100:.2f}%")

    return summary_data


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--oracle", action="store_true", help="Run oracle mode with ground-truth eyelid margin crops")
    args = parser.parse_args()
    evaluate_cascade(oracle=args.oracle)
