import os
import json
import numpy as np
from collections import defaultdict, Counter

BASE_DIR = r"e:\Amit Data\OCP_Detection"
DATASET_DIR = os.path.join(BASE_DIR, "Dataset")
PROCESSED_DIR = os.path.join(DATASET_DIR, "processed")
SPLITS_DIR = os.path.join(PROCESSED_DIR, "splits")
os.makedirs(SPLITS_DIR, exist_ok=True)

def stratified_multilabel_split(target_ratios=(0.70, 0.15, 0.15), seed=42):
    np.random.seed(seed)
    
    merged_json_path = os.path.join(PROCESSED_DIR, "merged_coco.json")
    with open(merged_json_path, 'r', encoding='utf-8') as f:
        coco_data = json.load(f)
        
    images = coco_data['images']
    annotations = coco_data['annotations']
    categories = coco_data['categories']
    
    cat_id_to_name = {c['id']: c['name'] for c in categories}
    num_classes = len(categories)
    
    # Map image_id -> annotations
    img_to_anns = defaultdict(list)
    for ann in annotations:
        img_to_anns[ann['image_id']].append(ann)
        
    # Map image_id -> set of category IDs present
    img_to_cats = {img['id']: set(ann['category_id'] for ann in img_to_anns[img['id']]) for img in images}
    
    # Track class frequencies (how many images contain each class)
    cat_to_img_ids = defaultdict(list)
    for img_id, cats in img_to_cats.items():
        for cid in cats:
            cat_to_img_ids[cid].append(img_id)
            
    # Sort classes by image frequency ascending (rarest first)
    sorted_cats = sorted(categories, key=lambda c: len(cat_to_img_ids[c['id']]))
    
    n_total = len(images)
    target_counts = [int(round(r * n_total)) for r in target_ratios]
    # adjust for rounding
    target_counts[0] = n_total - sum(target_counts[1:])
    
    split_img_ids = [[], [], []] # 0: train, 1: val, 2: test
    split_cat_counts = [defaultdict(int), defaultdict(int), defaultdict(int)]
    assigned_images = set()
    
    print("=" * 80)
    print("ITERATIVE MULTI-LABEL STRATIFICATION")
    print(f"Total Images: {n_total}, Target Split Ratios: {target_ratios} -> Targets: {target_counts}")
    print("=" * 80)
    
    # Phase 1: Guarantee rare classes in all 3 splits (classes with <= 30 images)
    print("\n[Phase 1] Ensuring rare classes representation across train/val/test...")
    for cat in sorted_cats:
        cid = cat['id']
        cname = cat['name']
        available_imgs = [iid for iid in cat_to_img_ids[cid] if iid not in assigned_images]
        np.random.shuffle(available_imgs)
        
        # Check current representations in splits
        reps = [split_cat_counts[s][cid] for s in range(3)]
        
        for s in [1, 2, 0]: # prioritize val (1) and test (2), then train (0)
            if split_cat_counts[s][cid] == 0 and available_imgs:
                chosen_img = available_imgs.pop(0)
                assigned_images.add(chosen_img)
                split_img_ids[s].append(chosen_img)
                for other_cid in img_to_cats[chosen_img]:
                    split_cat_counts[s][other_cid] += 1
                    
        # If there are still available images for this class, allocate according to remaining ratio
        while available_imgs:
            # Pick split that has lowest proportion of this class relative to target
            proportions = [
                split_cat_counts[s][cid] / max(1, target_counts[s])
                for s in range(3)
            ]
            chosen_split = int(np.argmin(proportions))
            
            chosen_img = available_imgs.pop(0)
            assigned_images.add(chosen_img)
            split_img_ids[chosen_split].append(chosen_img)
            for other_cid in img_to_cats[chosen_img]:
                split_cat_counts[chosen_split][other_cid] += 1

    # Phase 2: Iterative assignment of remaining images
    remaining_imgs = [img['id'] for img in images if img['id'] not in assigned_images]
    np.random.shuffle(remaining_imgs)
    print(f"\n[Phase 2] Assigning remaining {len(remaining_imgs)} images iteratively...")
    
    for img_id in remaining_imgs:
        cats = img_to_cats[img_id]
        
        # Compute loss/score for assigning this image to each split
        scores = []
        for s in range(3):
            # Target count penalty
            count_penalty = len(split_img_ids[s]) / target_counts[s]
            
            # Class distribution balance penalty
            class_penalties = []
            for cid in cats:
                current_c_prop = split_cat_counts[s][cid] / max(1, sum(split_cat_counts[i][cid] for i in range(3)))
                target_c_prop = target_ratios[s]
                class_penalties.append(abs(current_c_prop - target_c_prop))
                
            mean_class_penalty = np.mean(class_penalties) if class_penalties else 0
            # Weighted combined score
            score = 0.6 * count_penalty + 0.4 * mean_class_penalty
            scores.append(score)
            
        chosen_split = int(np.argmin(scores))
        assigned_images.add(img_id)
        split_img_ids[chosen_split].append(img_id)
        for cid in cats:
            split_cat_counts[chosen_split][cid] += 1

    # Output verification
    split_names = ['train', 'val', 'test']
    print("\n" + "=" * 80)
    print("SPLIT RESULTS SUMMARY")
    print("=" * 80)
    for s, sname in enumerate(split_names):
        print(f"Split: {sname.upper()} -> {len(split_img_ids[s])} images ({len(split_img_ids[s])/n_total*100:.1f}%)")

    # Verify every class has representation in every split
    print("\nPer-class instance count across splits:")
    print(f"{'ID':<3} | {'Class Name':<32} | {'Train':<7} | {'Val':<7} | {'Test':<7} | {'Total':<7}")
    print("-" * 75)
    
    split_ann_counts = [defaultdict(int), defaultdict(int), defaultdict(int)]
    for s in range(3):
        img_set = set(split_img_ids[s])
        for ann in annotations:
            if ann['image_id'] in img_set:
                split_ann_counts[s][ann['category_id']] += 1
                
    zero_rep_errors = []
    for cat in categories:
        cid = cat['id']
        cname = cat['name']
        c_train = split_ann_counts[0][cid]
        c_val = split_ann_counts[1][cid]
        c_test = split_ann_counts[2][cid]
        c_tot = c_train + c_val + c_test
        print(f"{cid:<3} | {cname:<32} | {c_train:<7} | {c_val:<7} | {c_test:<7} | {c_tot:<7}")
        if c_train == 0 or c_val == 0 or c_test == 0:
            zero_rep_errors.append((cid, cname, c_train, c_val, c_test))
            
    if zero_rep_errors:
        print(f"\n[WARNING] Classes with 0 representation in a split: {zero_rep_errors}")
    else:
        print("\n[SUCCESS] Every one of the 23 classes is guaranteed represented in Train, Val, and Test splits!")

    # Save COCO JSON for each split
    id_to_img_obj = {img['id']: img for img in images}
    for s, sname in enumerate(split_names):
        split_set = set(split_img_ids[s])
        split_imgs = [id_to_img_obj[iid] for iid in split_img_ids[s]]
        split_anns = [ann for ann in annotations if ann['image_id'] in split_set]
        
        split_coco = {
            "info": coco_data.get("info", {}),
            "licenses": coco_data.get("licenses", []),
            "categories": categories,
            "images": split_imgs,
            "annotations": split_anns
        }
        
        out_file = os.path.join(SPLITS_DIR, f"{sname}_coco.json")
        with open(out_file, 'w', encoding='utf-8') as f:
            json.dump(split_coco, f, indent=2)
        print(f"Saved {out_file} ({len(split_imgs)} images, {len(split_anns)} annotations)")
        
    return split_img_ids, split_ann_counts

if __name__ == "__main__":
    stratified_multilabel_split()
