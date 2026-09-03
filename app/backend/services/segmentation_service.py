import os
import cv2
import json
import numpy as np
from PIL import Image
from ultralytics import YOLO

BASE_DIR = r"e:\Amit Data\OCP_Detection"
MODELS_DIR = os.path.join(BASE_DIR, "models")
PROCESSED_DIR = os.path.join(BASE_DIR, "Dataset", "processed")
TEST_IMAGES_DIR = os.path.join(BASE_DIR, "Dataset", "yolo_dataset", "images", "test")

# Load Canonical Categories
with open(os.path.join(PROCESSED_DIR, "merged_coco.json"), 'r', encoding='utf-8') as f:
    merged_coco = json.load(f)

CATEGORIES = merged_coco['categories']
CAT_ID_TO_INFO = {c['id']: c for c in CATEGORIES}
CAT_NAME_TO_ID = {c['name']: c['id'] for c in CATEGORIES}

# Distinct Clinical Palette
# Warm / Crimson for OCP Pathology Alerts, Cool / Emerald / Sapphire for Anatomy
PALETTE = {
    1: {"color": "#F59E0B", "name": "Obstructed meibomian glands", "type": "OCP"},
    2: {"color": "#EF4444", "name": "OCP Rounding of lid margins", "type": "OCP"},
    3: {"color": "#DC2626", "name": "OCP Sub-conjunctival fibrosis", "type": "OCP"},
    4: {"color": "#B91C1C", "name": "OCP vascularised cornea", "type": "OCP"},
    5: {"color": "#991B1B", "name": "OCP LSCD", "type": "OCP"},
    6: {"color": "#7F1D1D", "name": "OCP Symblephron", "type": "OCP"},
    7: {"color": "#EA580C", "name": "caruncle fibrosis", "type": "OCP"},
    8: {"color": "#C2410C", "name": "OCP Forniceal shortening", "type": "OCP"},
    9: {"color": "#9A3412", "name": "OCP Ankyloblephron", "type": "OCP"},
    10: {"color": "#D97706", "name": "OCP trichiasis", "type": "OCP"},
    11: {"color": "#E11D48", "name": "OCP corneal epithelial defect", "type": "OCP"},
    12: {"color": "#BE123C", "name": "Perforated cornea", "type": "OCP Critical"},
    13: {"color": "#881337", "name": "Discharge", "type": "OCP"},
    14: {"color": "#059669", "name": "bulbar conjunctiva", "type": "Anatomy"},
    15: {"color": "#10B981", "name": "limbus", "type": "Anatomy"},
    16: {"color": "#2563EB", "name": "Upper eyelid", "type": "Anatomy"},
    17: {"color": "#3B82F6", "name": "Cornea", "type": "Anatomy"},
    18: {"color": "#6366F1", "name": "Right eye", "type": "Anatomy"},
    19: {"color": "#0284C7", "name": "lower eyelid", "type": "Anatomy"},
    20: {"color": "#0D9488", "name": "caruncle", "type": "Anatomy"},
    21: {"color": "#4F46E5", "name": "Left eye", "type": "Anatomy"},
    22: {"color": "#14B8A6", "name": "palpebral conjunctiva", "type": "Anatomy"},
    23: {"color": "#06B6D4", "name": "forniceal conjunctiva", "type": "Anatomy"}
}

class OCPInferenceService:
    def __init__(self, model_path=None):
        controlled_path = os.path.join(MODELS_DIR, "ocp_yolo26_seg_controlled_1280.pt")
        v1_path = os.path.join(MODELS_DIR, "best_yolo26_seg.pt")
        
        if model_path and os.path.exists(model_path):
            self.model_path = model_path
        elif os.path.exists(controlled_path):
            self.model_path = controlled_path
        elif os.path.exists(v1_path):
            self.model_path = v1_path
        else:
            self.model_path = "yolo11s-seg.pt"
            
        print(f"Loading OCP Segmentation Model from: {self.model_path}")
        self.model = YOLO(self.model_path)
        
    def reload_model(self, new_path):
        if os.path.exists(new_path):
            self.model_path = new_path
            self.model = YOLO(self.model_path)
            return True
        return False

    def predict(self, image_np, conf_threshold=0.20, iou_threshold=0.60):
        """
        Runs instance segmentation inference on input image.
        Returns serialized detection masks, bboxes, classes, confidences, and clinical triage.
        """
        h, w = image_np.shape[:2]
        results = self.model(image_np, conf=conf_threshold, iou=iou_threshold, verbose=False)[0]
        
        detections = []
        pathology_counts = {}
        anatomy_counts = {}
        
        if results.boxes is not None and len(results.boxes) > 0:
            boxes = results.boxes.xyxy.cpu().numpy()
            classes = results.boxes.cls.cpu().numpy().astype(int)
            scores = results.boxes.conf.cpu().numpy()
            masks = results.masks.xy if results.masks is not None else None
            
            for i in range(len(boxes)):
                cat_id = int(classes[i]) + 1 # 1-indexed native int
                cat_meta = PALETTE.get(cat_id, {"name": "Unknown", "type": "Unknown", "color": "#94A3B8"})
                cat_name = str(cat_meta["name"])
                cat_type = str(cat_meta["type"])
                conf = float(scores[i])
                
                # Bounding box
                x1, y1, x2, y2 = map(float, boxes[i])
                
                # Polygon segmentation
                poly_coords = []
                if masks is not None and i < len(masks) and len(masks[i]) >= 3:
                    poly_coords = [[float(p[0]), float(p[1])] for p in masks[i]]
                else:
                    poly_coords = [[float(x1), float(y1)], [float(x2), float(y1)], [float(x2), float(y2)], [float(x1), float(y2)]]
                    
                det_obj = {
                    "id": int(i + 1),
                    "class_id": int(cat_id),
                    "class_name": cat_name,
                    "type": cat_type,
                    "color": cat_meta["color"],
                    "confidence": round(float(conf), 4),
                    "bbox": [round(float(x1), 1), round(float(y1), 1), round(float(x2 - x1), 1), round(float(y2 - y1), 1)],
                    "polygon": [[round(float(p[0]), 1), round(float(p[1]), 1)] for p in poly_coords]
                }
                detections.append(det_obj)
                
                if "OCP" in cat_type or "Critical" in cat_type:
                    pathology_counts[cat_name] = int(pathology_counts.get(cat_name, 0) + 1)
                else:
                    anatomy_counts[cat_name] = int(anatomy_counts.get(cat_name, 0) + 1)

        # Determine Eye Side
        eye_side = "Unknown / Unspecified"
        if "Right eye" in anatomy_counts:
            eye_side = "OD (Right Eye)"
        elif "Left eye" in anatomy_counts:
            eye_side = "OS (Left Eye)"
            
        # Clinical Triage & Foster/Mondino Staging Estimation
        triage_report = self._generate_clinical_triage(pathology_counts, eye_side)
        
        return {
            "image_size": {"width": w, "height": h},
            "eye_side": eye_side,
            "total_detections": len(detections),
            "detections": detections,
            "pathology_summary": pathology_counts,
            "anatomy_summary": anatomy_counts,
            "clinical_triage": triage_report
        }

    def _generate_clinical_triage(self, pathology_counts, eye_side):
        """
        Synthesizes clinical findings according to Foster & Mondino staging criteria.
        """
        has_perforation = "Perforated cornea" in pathology_counts
        has_ankyloblephron = "OCP Ankyloblephron" in pathology_counts
        has_symblepharon = "OCP Symblephron" in pathology_counts
        has_forniceal_shortening = "OCP Forniceal shortening" in pathology_counts
        has_subconj_fibrosis = "OCP Sub-conjunctival fibrosis" in pathology_counts
        has_lscd = "OCP LSCD" in pathology_counts
        has_vascularization = "OCP vascularised cornea" in pathology_counts
        has_epithelial_defect = "OCP corneal epithelial defect" in pathology_counts
        has_meibomian_obstruction = "Obstructed meibomian glands" in pathology_counts
        
        # Stage Determination
        if has_ankyloblephron:
            stage = "Stage IV (End-stage / Ankyloblephron)"
            severity = "Critical / End-stage"
        elif has_symblepharon:
            stage = "Stage III (Symblepharon Formation)"
            severity = "Severe"
        elif has_forniceal_shortening:
            stage = "Stage II (Forniceal Shortening)"
            severity = "Moderate to Severe"
        elif has_subconj_fibrosis:
            stage = "Stage I (Early Sub-conjunctival Fibrosis)"
            severity = "Mild to Moderate"
        else:
            stage = "Non-Cicatricial / Baseline"
            severity = "Low / Baseline"
            
        alerts = []
        if has_perforation:
            alerts.append({
                "level": "EMERGENCY",
                "title": "Corneal Perforation Detected",
                "description": "Full-thickness corneal breakdown identified. Immediate tectonic surgical intervention / gluing recommended."
            })
        if has_lscd or has_vascularization:
            alerts.append({
                "level": "HIGH",
                "title": "Limbal Stem Cell Deficiency (LSCD) & Vascularization",
                "description": "Significant corneal surface conjunctivalization / neovascularization. Guard against epithelial breakdown."
            })
        if has_epithelial_defect:
            alerts.append({
                "level": "WARNING",
                "title": "Persistent Corneal Epithelial Defect",
                "description": "Fluorescein-positive epithelial ulceration detected; high risk for secondary bacterial keratitis."
            })
        if has_symblepharon:
            alerts.append({
                "level": "WARNING",
                "title": "Adhesive Symblepharon Bands",
                "description": "Palpebral-to-bulbar conjunctival adhesion restricting globe motility."
            })

        return {
            "estimated_foster_stage": stage,
            "clinical_severity": severity,
            "eye_side": eye_side,
            "critical_alerts": alerts,
            "pathology_count_total": sum(pathology_counts.values()),
            "recommendations": [
                "Comprehensive ocular surface disease index (OSDI) & fornix depth measurement.",
                "Systemic immunosuppressive therapy (e.g. Dapsone / Methotrexate / Rituximab) review.",
                "Scleral lens / amniotic membrane transplantation evaluation if LSCD/symblepharon progresses."
            ]
        }
