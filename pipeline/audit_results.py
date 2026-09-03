import os
import sys
import json
import numpy as np

def audit_evaluation_summary(json_path):
    print(f"Auditing {json_path}...")
    if not os.path.exists(json_path):
        print(f"ERROR: File not found: {json_path}")
        sys.exit(1)

    with open(json_path, 'r') as f:
        data = json.load(f)

    # 1. Check for fabricated models (e.g., duplicated AR100 or AP metrics across models)
    if 'models' in data: # The old format had a models block or similar. If we see it, we check.
        print("Checking for duplicated metrics across models...")
        models = data['models']
        ar100_vals = []
        for model_name, model_data in models.items():
            try:
                ar100 = model_data['bbox_eval']['aggregate']['AR100']
                ar100_vals.append((model_name, ar100))
            except KeyError:
                pass
        
        if len(ar100_vals) >= 2:
            val1 = ar100_vals[0][1]
            for name, val in ar100_vals[1:]:
                if abs(val1 - val) < 1e-10:
                    print(f"ERROR: Identical AR100 detected between models. Fabrication suspected. {ar100_vals[0][0]}: {val1}, {name}: {val}")
                    sys.exit(1)

    # 2. Check for metadata completeness
    print("Checking metadata completeness...")
    metadata = data.get('metadata', {})
    required_keys = ['checkpoint_sha256', 'test_coco_sha256', 'timestamp']
    for key in required_keys:
        if key not in metadata:
            print(f"ERROR: Missing required metadata key: {key}")
            sys.exit(1)

    # 3. Check for hardcoded statistical_testing block
    if 'statistical_testing' in data:
        print("ERROR: Found 'statistical_testing' block. Statistical testing must be run dynamically and not saved in the main evaluation summary json.")
        sys.exit(1)

    # 4. Check for hardcoded ablations block
    if 'ablations' in data:
        print("ERROR: Found 'ablations' block. Ablation results must be run dynamically and not saved in the main evaluation summary json.")
        sys.exit(1)

    # 5. Check confusion matrix plausibility (non-trivial)
    if 'confusion_matrix' in data:
        print("Checking confusion matrix plausibility...")
        cm = np.array(data['confusion_matrix']['matrix'])
        if cm.sum() == 0:
            print("ERROR: Confusion matrix is empty.")
            sys.exit(1)
        # Check if it looks suspiciously hardcoded (like an identity matrix + some noise)
        # If the sum is exactly 1089 (total annotations) plus some FPs, it's likely real.
        # But we'll just check if it's identical to the old hardcoded one by looking at sum.
        # Actually, let's just make sure it has non-zero elements off-diagonal.
        if np.all(cm == np.diag(np.diagonal(cm))):
            print("ERROR: Confusion matrix is perfectly diagonal. Highly suspicious.")
            # We won't exit 1 for perfect diagonal if it's a perfect model, but here it's impossible.
    else:
        print("ERROR: Confusion matrix missing.")
        sys.exit(1)

    print("SUCCESS: Evaluation summary passed integrity audit.")
    sys.exit(0)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python audit_results.py <evaluation_summary.json>")
        sys.exit(1)
    
    audit_evaluation_summary(sys.argv[1])
