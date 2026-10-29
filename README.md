# ADSeeker++: Towards Industrial Anomaly Cognition

[Paper (PDF)](Towards_Industrial_Anomaly_Cognition.pdf) · [Dataset](#repository-map) · [Method](#how-inference-works) · [Usage](#usage-for-the-complete-project) · [Results](#results-reported-in-the-paper)

**ADSeeker++** combines internal anomaly knowledge from **ADAgent** with a query-relevant normal image selected by **Image-RAG**. A task-specific Qwen3-VL model then uses the query image, retrieved reference, and anomaly heatmap to answer industrial inspection questions. The companion **MMIK-400K** benchmark connects scene knowledge pretraining, closed-form anomaly understanding, and open-ended anomaly cognition.

> **Release status:** This GitHub repository currently contains the project homepage, paper, and figures. The source code, datasets, indexes, and checkpoints are being prepared for release. The usage commands below describe the complete project layout and require those files.

<p align="center">
  <img src="assets/figures/paper_fig7_adseeker_overview.png" alt="ADSeeker++ architecture with ADAgent, Image-RAG and vision-language reasoning" width="100%">
</p>
<p align="center"><em>Paper Fig. 7. ADAgent learns normal-to-anomaly relations; Image-RAG selects a relevant normal reference for the vision-language model.</em></p>

## Repository map

| Component | Purpose |
| --- | --- |
| `ADAgent/` | Train and evaluate the detector, or generate a heatmap for one image. |
| `Image-RAG/` | Retrieve one normal reference from eight candidates using ColQwen similarity and optional KDE-GMM. |
| `VLM/` | Run MMAD, MMIK-400K ClosedQA, and MMIK-400K OpenQA with Qwen3-VL + task LoRA. |
| `ADAgent_Heatmap/` | Cached heatmaps and query-to-heatmap manifests for the three VLM tasks. |
| `Data/` | The `newnew/` image/annotation collection and `MMIK-400K-IAC/` images, masks, and QA splits. |

The paper reports **461,388 industrial images**, **432 object categories**, **1,271,155 closed QA pairs**, and **133,140 open QA pairs** across MMIK-400K. In the complete project, each folder above has its own task split and file layout.

<p align="center"><img src="assets/figures/paper_fig3_task_paradigms.png" alt="MMIK-400K task structure compared with earlier benchmarks" width="100%"></p>
<p align="center"><em>Paper Fig. 3. MMIK-400K connects scene knowledge pretraining, structured ClosedQA, and open-ended OpenQA.</em></p>

<p align="center"><img src="assets/figures/paper_fig4_mmiK_samples.png" alt="Representative MMIK-400K categories and anomalies" width="75%"></p>
<p align="center"><em>Paper Fig. 4. Samples illustrate variation in materials, appearance, and anomaly morphology.</em></p>

The paper describes multi-source collection, region-of-interest standardization, expert-reviewed masks, and associated knowledge annotations. Local data paths and splits are documented in `Data/README.md`.

<p align="center"><img src="assets/figures/paper_fig2_data_pipeline.png" alt="MMIK-400K data collection and annotation pipeline" width="80%"></p>
<p align="center"><em>Paper Fig. 2. Source images are standardized before mask annotation and knowledge generation.</em></p>

## How inference works

1. **Image-RAG** reads the query's eight normal candidates and selects a top-1 reference. `--gmm` enables the KDE-GMM distribution term; `--no-gmm` uses similarity alone.
2. **ADAgent** supplies an anomaly heatmap, either from `ADAgent_Heatmap/` or by running a specified checkpoint through `infer_joint.py`.
3. **Qwen3-VL + task LoRA** receives the normal reference, heatmap, query image, and question. ClosedQA returns a choice; OpenQA returns free text.

<p align="center"><img src="assets/figures/paper_fig13_irag_distribution.png" alt="Image-RAG normal-reference selection examples" width="70%"></p>
<p align="center"><em>Paper Fig. 13. Query similarity and candidate-density modeling guide normal-reference selection.</em></p>

<p align="center"><img src="assets/figures/paper_fig11_knowledge_roles.png" alt="Qualitative comparison of internal and external knowledge" width="80%"></p>
<p align="center"><em>Paper Fig. 11. Internal and external knowledge provide complementary anomaly evidence.</em></p>

## Usage for the complete project

Run the following commands from the repository root. The detector and VLM pin different PyTorch versions, so install them in separate environments. Python 3.10 and an NVIDIA GPU are recommended for the provided checkpoints.

```bash
cd /path/to/ADSeeker_code_reorg
export REPO="$PWD"
export RUNS="${TMPDIR:-/tmp}/adseeker_demo"
mkdir -p "$RUNS"

python3 -m venv .venv-vlm
. .venv-vlm/bin/activate
python -m pip install -r VLM/MMAD/requirements.txt -r Image-RAG/I-RAG/requirements.txt
deactivate

python3 -m venv .venv-adagent
. .venv-adagent/bin/activate
python -m pip install -r ADAgent/requirements.txt
deactivate

export VLM_PYTHON="$REPO/.venv-vlm/bin/python"
export ADAGENT_PYTHON="$REPO/.venv-adagent/bin/python"
export CUDA_VISIBLE_DEVICES=0
export HF_HUB_OFFLINE=1
export TRANSFORMERS_OFFLINE=1
```

The commands expect these local assets:

```text
ADAgent/weight/backbone/ViT-L-14-336px.pt
ADAgent/weight/<task>/final_model.pth
Image-RAG/I-RAG/models/
Image-RAG/MMAD/{candidate_images,colqwen_index,manifests}/
Image-RAG/MMIK-400K/shared/{candidate_images,colqwen_index,manifests}/
VLM/<task>/{base_model,sft_adapter}/
Data/MMIK-400K-IAC/
```

The complete local project uses large datasets, indexes, and checkpoints. The GitHub documentation-only checkout cannot run these commands yet. Cached heatmap inference also requires `ADAgent_Heatmap/`.

## Quick start

### 1. Generate a heatmap with ADAgent

```bash
"$ADAGENT_PYTHON" ADAgent/ADAgent.py infer \
  --checkpoint weight/MMIK/final_model.pth \
  --image "$REPO/Data/MMIK-400K-IAC/Asphalt Road/test/fissure/005.jpg" \
  --output-dir "$RUNS/adagent_single" --device cuda:0
```

The output contains a grayscale heatmap, an overlay, a float-map NPZ, and a JSON score. Other checkpoints and full training/test commands are listed in `ADAgent/README.md`.

### 2. Retrieve a normal reference with Image-RAG

```bash
"$VLM_PYTHON" Image-RAG/I-RAG/run_irag.py \
  --task mmik-openqa \
  --query 'MMIK-400K-IAC/Asphalt Road/test/Artificial blurring/001.jpg' \
  --device cuda:0 --gmm --output-dir "$RUNS/irag_single"
```

The result contains the selected reference and retrieval record. Use `--task mmik-closedqa` or `--task mmad` for the other indexes. See `I-RAG/README.md` for batch retrieval.

### 3. Ask Qwen3-VL using cached heatmaps

**MMIK-400K ClosedQA**

```bash
"$VLM_PYTHON" 'VLM/MMIK-400K ClosedQA/infer.py' \
  --query 'MMIK-400K-IAC/Iron filings/test/good/032.jpg' \
  --question 'Is there an anomaly in the query image?' \
  --options-json '{"A":"Yes","B":"No"}' \
  --gmm --device cuda:0 --output "$RUNS/mmik_closedqa.json"
```

**MMIK-400K OpenQA**

```bash
"$VLM_PYTHON" 'VLM/MMIK-400K OpenQA/infer.py' \
  --query 'MMIK-400K-IAC/Asphalt Road/test/Artificial blurring/001.jpg' \
  --question 'Describe the visible deviation from a normal road surface.' \
  --gmm --device cuda:0 --output "$RUNS/mmik_openqa.json"
```

**MMAD ClosedQA**

```bash
"$VLM_PYTHON" VLM/MMAD/infer.py \
  --query 'DS-MVTec/bottle/image/broken_large/000.png' \
  --question 'Is there an anomaly in the query image?' \
  --options-json '{"A":"Yes","B":"No"}' \
  --gmm --device cuda:0 --output "$RUNS/mmad_closedqa.json"
```

MMAD query images are read from the dataset location expected by the local manifest. If the dataset is elsewhere, pass `--query-image /absolute/path/to/query.png`. Add `--dry-run` to check resources without loading Qwen. The cached MMIK ClosedQA heatmaps cover a subset of test queries; use a query listed in its manifest.

### 4. Run the detector and VLM together

Use `infer_joint.py` to generate a heatmap from a checkpoint in the same request:

```bash
"$VLM_PYTHON" 'VLM/MMIK-400K OpenQA/infer_joint.py' \
  --query 'MMIK-400K-IAC/Asphalt Road/test/Artificial blurring/001.jpg' \
  --question 'Describe the visible deviation from a normal road surface.' \
  --adagent-checkpoint "$REPO/ADAgent/weight/MMIK/final_model.pth" \
  --adagent-python "$ADAGENT_PYTHON" --adagent-device cuda:0 \
  --gmm --device cuda:0 --output "$RUNS/mmik_openqa_joint.json"
```

Both modes retrieve a reference through Image-RAG. Commands for each task/mode and their output formats are collected in `VLM/INFERENCE_COMMANDS.md`.

### 5. Train or evaluate ADAgent

```bash
"$ADAGENT_PYTHON" ADAgent/ADAgent.py train --config reproduce/MMIK/train.json
"$ADAGENT_PYTHON" ADAgent/ADAgent.py test  --config reproduce/MMIK/test_mula.json
```

The training configuration writes new checkpoints under `ADAgent/outputs/MMIK/train/`. The VLM directory provides inference bundles; it does not contain a Qwen SFT training entry point.

## Results reported in the paper

**Table 8** of the accompanying paper reports the following ADSeeker++ results. ClosedQA is mean accuracy (%) over seven tasks; OpenQA averages Normal Rule, Deviation, and Evidence Decision.

| MMAD ClosedQA ↑ | MMIK-400K ClosedQA ↑ | OpenQA ROUGE-L ↑ | OpenQA BERTScore ↑ | OpenQA SBERT ↑ |
| ---: | ---: | ---: | ---: | ---: |
| 79.69 | 60.76 | 26.71 | 89.19 | 57.43 |

The quick-start commands run individual queries. See the [paper](Towards_Industrial_Anomaly_Cognition.pdf) for the full evaluation protocol.

## Paper

**Zekai Zhang et al.**, *Towards Industrial Anomaly Cognition: A Large-Scale Knowledge Benchmark, Challenges, and Baselines* (2026). Figures on this page are cropped from the [paper PDF](Towards_Industrial_Anomaly_Cognition.pdf): Figs. 2, 3, 4, 7, 11, and 13.
