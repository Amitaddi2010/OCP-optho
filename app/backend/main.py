import os
import io
import json
import base64
import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from services.segmentation_service import OCPInferenceService, CATEGORIES, PALETTE

BASE_DIR = r"e:\Amit Data\OCP_Detection"
TEST_IMAGES_DIR = os.path.join(BASE_DIR, "Dataset", "yolo_dataset", "images", "test")
PROCESSED_IMAGES_DIR = os.path.join(BASE_DIR, "Dataset", "processed", "images")
FIGURES_DIR = os.path.join(BASE_DIR, "reports", "figures")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")

app = FastAPI(
    title="OCP Detection & Eye Anatomy Instance Segmentation API",
    description="Clinical & Research AI service for slit-lamp ophthalmic instance segmentation and OCP triage.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Inference Engine
inference_service = OCPInferenceService()

@app.get("/api/info")
def get_model_info():
    eval_path = os.path.join(OUTPUTS_DIR, "evaluation_summary.json")
    eval_data = {}
    if os.path.exists(eval_path):
        with open(eval_path, 'r', encoding='utf-8') as f:
            eval_data = json.load(f)
            
    return {
        "model_name": "YOLO26-Seg (Ophthalmic Instance Segmentation)",
        "model_path": inference_service.model_path,
        "input_resolution": "1600x1200 / 640x640 multi-scale",
        "total_classes": len(CATEGORIES),
        "categories": CATEGORIES,
        "palette": PALETTE,
        "benchmarks": eval_data
    }

@app.get("/api/samples")
def get_sample_cases():
    """
    Returns curated clinical demonstration cases from the test split.
    """
    if not os.path.exists(TEST_IMAGES_DIR):
        return {"samples": []}
        
    sample_files = [f for f in os.listdir(TEST_IMAGES_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png'))][:12]
    
    samples = []
    for idx, fn in enumerate(sample_files):
        eye_side = "OD (Right Eye)" if "OD" in fn else ("OS (Left Eye)" if "OS" in fn else "Bilateral")
        samples.append({
            "id": idx + 1,
            "filename": fn,
            "eye_side": eye_side,
            "thumbnail_url": f"/api/sample-image/{fn}",
            "description": f"Slit-lamp examination case {idx+1} ({eye_side})"
        })
        
    return {"samples": samples}

@app.get("/api/sample-image/{filename}")
def get_sample_image(filename: str):
    img_path = os.path.join(TEST_IMAGES_DIR, filename)
    if not os.path.exists(img_path):
        img_path = os.path.join(PROCESSED_IMAGES_DIR, filename)
    if not os.path.exists(img_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(img_path)

@app.post("/api/segment/predict")
async def predict_segmentation(
    file: UploadFile = File(None),
    sample_filename: str = Form(None),
    confidence: float = Form(0.20),
    iou: float = Form(0.60)
):
    """
    Predicts instance segmentation masks, bboxes, and clinical triage report.
    Supports either file upload or sample_filename.
    """
    try:
        if file is not None:
            contents = await file.read()
            pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
        elif sample_filename:
            img_path = os.path.join(TEST_IMAGES_DIR, sample_filename)
            if not os.path.exists(img_path):
                img_path = os.path.join(PROCESSED_IMAGES_DIR, sample_filename)
            if not os.path.exists(img_path):
                raise HTTPException(status_code=404, detail="Sample image not found")
            pil_image = Image.open(img_path).convert("RGB")
        else:
            raise HTTPException(status_code=400, detail="Either 'file' or 'sample_filename' must be provided")

        image_np = np.array(pil_image)
        prediction_result = inference_service.predict(image_np, conf_threshold=confidence, iou_threshold=iou)
        
        return JSONResponse(content=prediction_result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
