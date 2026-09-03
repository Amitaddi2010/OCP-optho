import os
import json
import shutil
from PIL import Image
import numpy as np

# Path definitions
BASE_DIR = r"e:\Amit Data\OCP_Detection"
DATASET_DIR = os.path.join(BASE_DIR, "Dataset")
P2_DIR = os.path.join(DATASET_DIR, "project-2-at-2026-09-01-16-03-79bc00c6")
P3_DIR = os.path.join(DATASET_DIR, "project-3-at-2026-09-01-16-04-9149a461")
PROCESSED_DIR = os.path.join(DATASET_DIR, "processed")
OUTPUT_IMAGES_DIR = os.path.join(PROCESSED_DIR, "images")

os.makedirs(OUTPUT_IMAGES_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

# 23 Canonical Categories: 13 OCP Pathologies + 10 Anatomical Structures
CANONICAL_CATEGORIES = [
    # 13 OCP Pathology Classes
    {"id": 1, "name": "Obstructed meibomian glands", "supercategory": "pathology", "type": "OCP"},
    {"id": 2, "name": "OCP Rounding of lid margins", "supercategory": "pathology", "type": "OCP"},
    {"id": 3, "name": "OCP Sub-conjunctival fibrosis", "supercategory": "pathology", "type": "OCP"},
    {"id": 4, "name": "OCP vascularised cornea", "supercategory": "pathology", "type": "OCP"},
    {"id": 5, "name": "OCP LSCD", "supercategory": "pathology", "type": "OCP"},
    {"id": 6, "name": "OCP Symblephron", "supercategory": "pathology", "type": "OCP"},
    {"id": 7, "name": "caruncle fibrosis", "supercategory": "pathology", "type": "OCP"},
    {"id": 8, "name": "OCP Forniceal shortening", "supercategory": "pathology", "type": "OCP"},
    {"id": 9, "name": "OCP Ankyloblephron", "supercategory": "pathology", "type": "OCP"},
    {"id": 10, "name": "OCP trichiasis", "supercategory": "pathology", "type": "OCP"},
    {"id": 11, "name": "OCP corneal epithelial defect", "supercategory": "pathology", "type": "OCP"},
    {"id": 12, "name": "Perforated cornea", "supercategory": "pathology", "type": "OCP"},
    {"id": 13, "name": "Discharge", "supercategory": "pathology", "type": "OCP"},
    
    # 10 Harmonized Anatomical Classes
    {"id": 14, "name": "bulbar conjunctiva", "supercategory": "anatomy", "type": "Anatomy"},
    {"id": 15, "name": "limbus", "supercategory": "anatomy", "type": "Anatomy"},
    {"id": 16, "name": "Upper eyelid", "supercategory": "anatomy", "type": "Anatomy"},
    {"id": 17, "name": "Cornea", "supercategory": "anatomy", "type": "Anatomy"},
    {"id": 18, "name": "Right eye", "supercategory": "anatomy", "type": "Anatomy"},
    {"id": 19, "name": "lower eyelid", "supercategory": "anatomy", "type": "Anatomy"},
    {"id": 20, "name": "caruncle", "supercategory": "anatomy", "type": "Anatomy"},
    {"id": 21, "name": "Left eye", "supercategory": "anatomy", "type": "Anatomy"},
    {"id": 22, "name": "palpebral conjunctiva", "supercategory": "anatomy", "type": "Anatomy"},
    {"id": 23, "name": "forniceal conjunctiva", "supercategory": "anatomy", "type": "Anatomy"}
]

NAME_TO_CANONICAL_ID = {c["name"]: c["id"] for c in CANONICAL_CATEGORIES}

# Harmonization Map for variations in Project 2 and Project 3
HARMONIZATION_MAP = {
    # Project 2 names (mostly matching canonical)
    "Obstructed meibomian glands": "Obstructed meibomian glands",
    "OCP Rounding of lid margins": "OCP Rounding of lid margins",
    "OCP Sub-conjunctival fibrosis": "OCP Sub-conjunctival fibrosis",
    "OCP vascularised cornea": "OCP vascularised cornea",
    "OCP LSCD": "OCP LSCD",
    "OCP Symblephron": "OCP Symblephron",
    "caruncle fibrosis": "caruncle fibrosis",
    "OCP Forniceal shortening": "OCP Forniceal shortening",
    "OCP Ankyloblephron": "OCP Ankyloblephron",
    "OCP trichiasis": "OCP trichiasis",
    "OCP corneal epithelial defect": "OCP corneal epithelial defect",
    "Perforated cornea": "Perforated cornea",
    "Discharge": "Discharge",
    "bulbar conjunctiva": "bulbar conjunctiva",
    "limbus": "limbus",
    "Upper eyelid": "Upper eyelid",
    "Cornea": "Cornea",
    "Right eye": "Right eye",
    "lower eyelid": "lower eyelid",
    "caruncle": "caruncle",
    "Left eye": "Left eye",
    "palpebral conjunctiva": "palpebral conjunctiva",
    "forniceal conjunctiva": "forniceal conjunctiva",

    # Project 3 names mapping to canonical
    "Lower lid": "lower eyelid",
    "Upper lid": "Upper eyelid",
    "Limbus": "limbus",
    "Palpebral conjunctiva": "palpebral conjunctiva",
    "Forniceal conjunctiva": "forniceal conjunctiva"
}

def clamp_bbox(bbox, width, height):
    """
    Clamps bbox [x, y, w, h] to valid image boundaries [0, width] and [0, height].
    """
    x, y, w, h = bbox
    x1 = max(0.0, float(x))
    y1 = max(0.0, float(y))
    x2 = min(float(width), max(x1, float(x) + float(w)))
    y2 = min(float(height), max(y1, float(y) + float(h)))
    new_w = max(0.0, x2 - x1)
    new_h = max(0.0, y2 - y1)
    return [round(x1, 2), round(y1, 2), round(new_w, 2), round(new_h, 2)]

def clamp_segmentation(segmentation, width, height):
    """
    Clamps polygon segmentation coordinates [[x1, y1, x2, y2, ...]] to image bounds.
    """
    clamped_seg = []
    for poly in segmentation:
        clamped_poly = []
        for i in range(0, len(poly), 2):
            px = max(0.0, min(float(width), float(poly[i])))
            py = max(0.0, min(float(height), float(poly[i+1]))) if i+1 < len(poly) else 0.0
            clamped_poly.extend([round(px, 2), round(py, 2)])
        if len(clamped_poly) >= 6:  # Valid polygon has at least 3 points (6 coords)
            clamped_seg.append(clamped_poly)
    return clamped_seg

def process_and_copy_image(src_path, dest_path):
    """
    Ensures image is in RGB format, converts RGBA PNGs to RGB JPEGs.
    Returns: (width, height, format, original_size)
    """
    with Image.open(src_path) as img:
        orig_size = img.size
        orig_format = img.format
        orig_mode = img.mode
        
        # Convert RGBA or Palette to RGB
        if img.mode != 'RGB':
            rgb_img = img.convert('RGB')
        else:
            rgb_img = img.copy()
            
        # Save as standard high quality JPEG
        rgb_img.save(dest_path, "JPEG", quality=95)
        w, h = rgb_img.size
        return w, h, orig_format, orig_mode, orig_size

def clean_and_merge_datasets():
    print("=" * 80)
    print("STARTING DATASET CLEANING, NORMALIZATION, AND HARMONIZATION")
    print("=" * 80)
    
    # Load Project 2
    with open(os.path.join(P2_DIR, "result.json"), 'r', encoding='utf-8') as f:
        p2_json = json.load(f)
        
    # Load Project 3
    with open(os.path.join(P3_DIR, "result.json"), 'r', encoding='utf-8') as f:
        p3_json = json.load(f)
        
    p2_cat_map = {c['id']: c['name'] for c in p2_json['categories']}
    p3_cat_map = {c['id']: c['name'] for c in p3_json['categories']}
    
    merged_images = []
    merged_annotations = []
    
    global_image_id = 1
    global_ann_id = 1
    
    diff_summary = {
        "p2_raw_images": len(p2_json['images']),
        "p2_raw_annotations": len(p2_json['annotations']),
        "p3_raw_images": len(p3_json['images']),
        "p3_raw_annotations": len(p3_json['annotations']),
        "dropped_images": [],
        "normalized_screenshots": [],
        "resolution_deviations": [],
        "clamped_bboxes_p2": 0,
        "clamped_bboxes_p3": 0,
        "harmonized_classes_count": {}
    }
    
    # Track Old ID to New ID mapping
    p2_old_to_new_img_id = {}
    
    # -------------------------------------------------------------
    # 1. Process Project 2 Images
    # -------------------------------------------------------------
    print("\n[1/3] Processing Project 2...")
    for img in p2_json['images']:
        old_id = img['id']
        filename = os.path.basename(img['file_name'])
        
        # Explicitly drop the empty id 49 duplicate entry
        if old_id == 49 and filename == "b6f75bd2-OS_2024-05-22_11-34-24_001.jpg":
            print(f"  --> Dropping empty duplicate image: ID={old_id}, file={filename}")
            diff_summary["dropped_images"].append({"id": old_id, "file_name": filename, "reason": "empty duplicate entry"})
            continue
            
        src_img_path = os.path.join(P2_DIR, "images", filename)
        if not os.path.exists(src_img_path):
            print(f"  [ERROR] Image not found on disk: {src_img_path}")
            continue
            
        # Target filename: standardized to .jpg
        base_name, ext = os.path.splitext(filename)
        dest_filename = f"P2_{base_name}.jpg"
        dest_img_path = os.path.join(OUTPUT_IMAGES_DIR, dest_filename)
        
        w, h, orig_fmt, orig_mode, orig_size = process_and_copy_image(src_img_path, dest_img_path)
        
        if orig_fmt != 'JPEG' or orig_mode != 'RGB':
            print(f"  --> Normalized screenshot {filename} ({orig_fmt}/{orig_mode}) to RGB JPEG")
            diff_summary["normalized_screenshots"].append({
                "original_file": filename,
                "dest_file": dest_filename,
                "orig_format": orig_fmt,
                "orig_mode": orig_mode,
                "orig_size": orig_size
            })
            
        if (w, h) != (1600, 1200):
            diff_summary["resolution_deviations"].append({
                "file": dest_filename,
                "resolution": f"{w}x{h}",
                "project": "Project 2"
            })
            
        img_entry = {
            "id": global_image_id,
            "file_name": dest_filename,
            "width": w,
            "height": h,
            "source_project": "project-2-at-2026-09-01-16-03-79bc00c6",
            "original_filename": filename,
            "original_id": old_id
        }
        merged_images.append(img_entry)
        p2_old_to_new_img_id[old_id] = (global_image_id, w, h)
        global_image_id += 1

    # Process Project 2 Annotations
    for ann in p2_json['annotations']:
        old_img_id = ann['image_id']
        if old_img_id not in p2_old_to_new_img_id:
            # Annotation belongs to dropped image
            continue
            
        new_img_id, img_w, img_h = p2_old_to_new_img_id[old_img_id]
        raw_cat_name = p2_cat_map[ann['category_id']]
        canonical_name = HARMONIZATION_MAP.get(raw_cat_name, raw_cat_name)
        canonical_cat_id = NAME_TO_CANONICAL_ID[canonical_name]
        
        # Check coordinate clamping
        raw_bbox = ann.get('bbox', [0, 0, 0, 0])
        if raw_bbox[0] < 0 or raw_bbox[1] < 0:
            diff_summary["clamped_bboxes_p2"] += 1
            
        clamped_b = clamp_bbox(raw_bbox, img_w, img_h)
        clamped_s = clamp_segmentation(ann.get('segmentation', []), img_w, img_h)
        area = clamped_b[2] * clamped_b[3]
        
        ann_entry = {
            "id": global_ann_id,
            "image_id": new_img_id,
            "category_id": canonical_cat_id,
            "category_name": canonical_name,
            "bbox": clamped_b,
            "segmentation": clamped_s,
            "area": round(float(area), 2),
            "iscrowd": ann.get('iscrowd', 0),
            "source_project": "project-2"
        }
        merged_annotations.append(ann_entry)
        global_ann_id += 1

    # -------------------------------------------------------------
    # 2. Process Project 3 Images & Annotations
    # -------------------------------------------------------------
    print("\n[2/3] Processing Project 3...")
    p3_old_to_new_img_id = {}
    
    for img in p3_json['images']:
        old_id = img['id']
        filename = os.path.basename(img['file_name'])
        
        src_img_path = os.path.join(P3_DIR, "images", filename)
        if not os.path.exists(src_img_path):
            print(f"  [ERROR] Image not found on disk: {src_img_path}")
            continue
            
        base_name, ext = os.path.splitext(filename)
        dest_filename = f"P3_{base_name}.jpg"
        dest_img_path = os.path.join(OUTPUT_IMAGES_DIR, dest_filename)
        
        w, h, orig_fmt, orig_mode, orig_size = process_and_copy_image(src_img_path, dest_img_path)
        
        if (w, h) != (1600, 1200):
            diff_summary["resolution_deviations"].append({
                "file": dest_filename,
                "resolution": f"{w}x{h}",
                "project": "Project 3"
            })
            
        img_entry = {
            "id": global_image_id,
            "file_name": dest_filename,
            "width": w,
            "height": h,
            "source_project": "project-3-at-2026-09-01-16-04-9149a461",
            "original_filename": filename,
            "original_id": old_id
        }
        merged_images.append(img_entry)
        p3_old_to_new_img_id[old_id] = (global_image_id, w, h)
        global_image_id += 1

    for ann in p3_json['annotations']:
        old_img_id = ann['image_id']
        if old_img_id not in p3_old_to_new_img_id:
            continue
            
        new_img_id, img_w, img_h = p3_old_to_new_img_id[old_img_id]
        raw_cat_name = p3_cat_map[ann['category_id']]
        canonical_name = HARMONIZATION_MAP.get(raw_cat_name, raw_cat_name)
        canonical_cat_id = NAME_TO_CANONICAL_ID[canonical_name]
        
        diff_summary["harmonized_classes_count"][raw_cat_name] = diff_summary["harmonized_classes_count"].get(raw_cat_name, 0) + 1
        
        raw_bbox = ann.get('bbox', [0, 0, 0, 0])
        if raw_bbox[0] < 0 or raw_bbox[1] < 0:
            diff_summary["clamped_bboxes_p3"] += 1
            
        clamped_b = clamp_bbox(raw_bbox, img_w, img_h)
        clamped_s = clamp_segmentation(ann.get('segmentation', []), img_w, img_h)
        area = clamped_b[2] * clamped_b[3]
        
        ann_entry = {
            "id": global_ann_id,
            "image_id": new_img_id,
            "category_id": canonical_cat_id,
            "category_name": canonical_name,
            "bbox": clamped_b,
            "segmentation": clamped_s,
            "area": round(float(area), 2),
            "iscrowd": ann.get('iscrowd', 0),
            "source_project": "project-3"
        }
        merged_annotations.append(ann_entry)
        global_ann_id += 1

    # -------------------------------------------------------------
    # 3. Assemble Merged COCO Output
    # -------------------------------------------------------------
    print("\n[3/3] Assembling Unified COCO Export...")
    merged_coco = {
        "info": {
            "description": "OCP Detection and Eye Anatomy Instance Segmentation Dataset (Merged & Harmonized)",
            "version": "1.0",
            "year": 2026,
            "date_created": "2026-09-02",
            "source_projects": [
                "project-2-at-2026-09-01-16-03-79bc00c6",
                "project-3-at-2026-09-01-16-04-9149a461"
            ]
        },
        "licenses": [],
        "categories": CANONICAL_CATEGORIES,
        "images": merged_images,
        "annotations": merged_annotations
    }
    
    merged_json_path = os.path.join(PROCESSED_DIR, "merged_coco.json")
    with open(merged_json_path, 'w', encoding='utf-8') as f:
        json.dump(merged_coco, f, indent=2)
        
    diff_summary_path = os.path.join(PROCESSED_DIR, "diff_summary.json")
    with open(diff_summary_path, 'w', encoding='utf-8') as f:
        json.dump(diff_summary, f, indent=2)

    print(f"\nSuccessfully created merged COCO dataset:")
    print(f"  Target File: {merged_json_path}")
    print(f"  Total Valid Images: {len(merged_images)} (509 from P2, 86 from P3)")
    print(f"  Total Annotations: {len(merged_annotations)} (5857 from P2, 631 from P3)")
    print(f"  Clamped BBoxes: P2={diff_summary['clamped_bboxes_p2']}, P3={diff_summary['clamped_bboxes_p3']}")
    print(f"  Screenshots normalized: {len(diff_summary['normalized_screenshots'])}")
    print(f"  Resolution deviations: {len(diff_summary['resolution_deviations'])}")

    return merged_coco, diff_summary

if __name__ == "__main__":
    clean_and_merge_datasets()
