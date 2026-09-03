import os
import json
import shutil
import yaml

BASE_DIR = r"e:\Amit Data\OCP_Detection"
DATASET_DIR = os.path.join(BASE_DIR, "Dataset")
PROCESSED_DIR = os.path.join(DATASET_DIR, "processed")
PROCESSED_IMAGES_DIR = os.path.join(PROCESSED_DIR, "images")
SPLITS_DIR = os.path.join(PROCESSED_DIR, "splits")

RF_DETR_DIR = os.path.join(DATASET_DIR, "rf_detr_dataset")
YOLO_DIR = os.path.join(DATASET_DIR, "yolo_dataset")

def convert_to_rf_detr_format():
    print("=" * 80)
    print("CONVERTING TO RF-DETR-SEG (COCO-SEG) FORMAT")
    print("=" * 80)
    
    rf_ann_dir = os.path.join(RF_DETR_DIR, "annotations")
    rf_img_dir = os.path.join(RF_DETR_DIR, "images")
    os.makedirs(rf_ann_dir, exist_ok=True)
    os.makedirs(rf_img_dir, exist_ok=True)
    
    # Process splits
    for split in ["train", "val", "test"]:
        src_coco = os.path.join(SPLITS_DIR, f"{split}_coco.json")
        with open(src_coco, 'r', encoding='utf-8') as f:
            coco_data = json.load(f)
            
        # Target path
        dest_coco = os.path.join(rf_ann_dir, f"instances_{split}.json")
        with open(dest_coco, 'w', encoding='utf-8') as f:
            json.dump(coco_data, f, indent=2)
            
        print(f"  Exported RF-DETR-Seg annotation: {dest_coco} ({len(coco_data['images'])} images, {len(coco_data['annotations'])} masks)")

    # Create config file for RF-DETR-Seg
    config_data = {
        "dataset_name": "OCP_Anatomy_Seg",
        "format": "coco_instance_segmentation",
        "num_classes": 23,
        "train_annotations": "annotations/instances_train.json",
        "val_annotations": "annotations/instances_val.json",
        "test_annotations": "annotations/instances_test.json",
        "image_root": os.path.relpath(PROCESSED_IMAGES_DIR, RF_DETR_DIR).replace("\\", "/"),
        "categories": coco_data["categories"]
    }
    
    cfg_path = os.path.join(RF_DETR_DIR, "dataset_config.json")
    with open(cfg_path, 'w', encoding='utf-8') as f:
        json.dump(config_data, f, indent=2)
    print(f"  Exported RF-DETR-Seg config: {cfg_path}")

def convert_to_yolo_seg_format():
    print("\n" + "=" * 80)
    print("CONVERTING TO YOLO26-SEG / ULTRALYTICS SEGMENTATION FORMAT")
    print("=" * 80)
    
    for split in ["train", "val", "test"]:
        split_img_dir = os.path.join(YOLO_DIR, "images", split)
        split_lbl_dir = os.path.join(YOLO_DIR, "labels", split)
        os.makedirs(split_img_dir, exist_ok=True)
        os.makedirs(split_lbl_dir, exist_ok=True)
        
        src_coco = os.path.join(SPLITS_DIR, f"{split}_coco.json")
        with open(src_coco, 'r', encoding='utf-8') as f:
            coco_data = json.load(f)
            
        # Map image_id -> image entry
        img_map = {img['id']: img for img in coco_data['images']}
        
        # Group annotations by image_id
        ann_map = {img['id']: [] for img in coco_data['images']}
        for ann in coco_data['annotations']:
            ann_map[ann['image_id']].append(ann)
            
        label_file_count = 0
        total_poly_count = 0
        
        for img_id, img_info in img_map.items():
            fn = img_info['file_name']
            src_img_path = os.path.join(PROCESSED_IMAGES_DIR, fn)
            dest_img_path = os.path.join(split_img_dir, fn)
            
            # Copy image to YOLO split folder
            if not os.path.exists(dest_img_path):
                shutil.copy2(src_img_path, dest_img_path)
                
            w = float(img_info['width'])
            h = float(img_info['height'])
            
            # Label file
            base_name, _ = os.path.splitext(fn)
            lbl_file_path = os.path.join(split_lbl_dir, f"{base_name}.txt")
            
            lines = []
            for ann in ann_map[img_id]:
                # YOLO class index is 0-indexed: category_id - 1
                cat_idx = ann['category_id'] - 1
                segmentation = ann.get('segmentation', [])
                
                if segmentation:
                    for poly in segmentation:
                        if len(poly) < 6:
                            continue
                        # Normalize polygon points
                        norm_poly = []
                        for i in range(0, len(poly), 2):
                            nx = min(1.0, max(0.0, poly[i] / w))
                            ny = min(1.0, max(0.0, poly[i+1] / h)) if i+1 < len(poly) else 0.0
                            norm_poly.extend([f"{nx:.6f}", f"{ny:.6f}"])
                            
                        line = f"{cat_idx} " + " ".join(norm_poly)
                        lines.append(line)
                        total_poly_count += 1
                else:
                    # Fallback to bbox converted to 4-point polygon if segmentation missing
                    bx, by, bw, bh = ann['bbox']
                    x1 = min(1.0, max(0.0, bx / w))
                    y1 = min(1.0, max(0.0, by / h))
                    x2 = min(1.0, max(0.0, (bx + bw) / w))
                    y2 = min(1.0, max(0.0, (by + bh) / h))
                    line = f"{cat_idx} {x1:.6f} {y1:.6f} {x2:.6f} {y1:.6f} {x2:.6f} {y2:.6f} {x1:.6f} {y2:.6f}"
                    lines.append(line)
                    total_poly_count += 1
                    
            with open(lbl_file_path, 'w', encoding='utf-8') as f:
                f.write("\n".join(lines) + ("\n" if lines else ""))
            label_file_count += 1
            
        print(f"  Exported YOLO split '{split}': {len(img_map)} images, {label_file_count} label files, {total_poly_count} polygon instances")

    # Generate data.yaml
    with open(os.path.join(SPLITS_DIR, "train_coco.json"), 'r', encoding='utf-8') as f:
        train_coco = json.load(f)
        
    categories = train_coco['categories']
    cat_names_dict = {c['id'] - 1: c['name'] for c in categories}
    
    yaml_content = {
        "path": YOLO_DIR.replace("\\", "/"),
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "nc": len(categories),
        "names": cat_names_dict
    }
    
    yaml_path = os.path.join(YOLO_DIR, "data.yaml")
    with open(yaml_path, 'w', encoding='utf-8') as f:
        yaml.dump(yaml_content, f, sort_keys=False)
        
    print(f"  Exported YOLO dataset yaml: {yaml_path}")

if __name__ == "__main__":
    convert_to_rf_detr_format()
    convert_to_yolo_seg_format()
