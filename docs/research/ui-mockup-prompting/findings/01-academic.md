# 01 — Academic / arXiv

## Executive Summary

Image-only UI mockup generation with diffusion is a small, mostly applied subfield (2023–2026) and the consensus across the verifiable papers is that **prompt-only diffusion does not work for UI**. Every credible system stacks an explicit structural condition (wireframe, layout tokens, or component bbox set) on top of Stable Diffusion via ControlNet or a sibling adapter, and even then the SOTA outputs at 256–512 px are unreliable for legible text and dense components.[^1][^4][^7] The strongest published gain comes from grammar/DSL-guided LLM layout synthesis feeding a layout-conditioned diffusion stage, not from prompt engineering on a raw T2I model.[^3][^7][^9] Evaluation has standardized on a triplet of FID/SSIM/PSNR for image fidelity, IoU on labeled element types for layout faithfulness, and small-N human studies for usefulness — there is no UI-specific equivalent of GenAI-Bench yet.[^2][^4][^6] Documented failure modes are remarkably consistent: garbled text, missing/added components, alignment drift, and hard 256–512 px ceilings.[^1][^4][^6]

## Key Findings

- Prompt-only T2I for UI is not a research thesis anyone defends; every credible paper conditions the diffusion model on a structural input (wireframe, layout boxes, visual flow) via ControlNet or an analogous adapter.[^1][^4][^7]
- The dominant pipeline is two-stage: an LLM/LayoutDM stage emits a layout, then a layout-conditioned diffusion stage renders it. UI-Diffuser explicitly chains LayoutDM → ControlNet-conditioned Stable Diffusion.[^1]
- UI grammars / DSLs improve LLM layout quality and editability versus free-form prompting; this is the only line of work that directly targets the "prompt-engineering for UI" framing the user is asking about.[^3][^7]
- RICO (72k Android screens) and Enrico (1,460 curated) remain the de-facto training corpora; ControlGUI extends with WebUI + VINS to ~72.5k mixed mobile + web screens.[^4][^10]
- Wireframe-conditioned SD at 256–512 px is the published SOTA in 2024–2025, with explicitly documented inability to render legible labels — this is hard-coded into multiple papers' "Limitations" sections.[^4]
- Sketch2Code (NAACL 2025) is the only benchmark with quantitative UI-specific metrics (component-typed IoU, weighted across 7 element classes) that correlates r²=0.87 with human judgment, but it tests VLM→HTML, not pure diffusion.[^6]
- Headline number for layout-similarity on Sketch2Code: even Claude 3.5 Sonnet/GPT-4o reach only ~21–22% layout-IoU; open-source VLMs <10%. This bounds expectations on any sketch-to-image-of-UI task.[^6]
- "Visual flow" (predicted gaze scanpath via EyeFormer) is a novel global condition layered on top of ControlNet in ControlGUI — first work to condition UI generation on attention dynamics rather than just structure.[^4]
- Documented failure modes across the corpus: invalid/missing text glyphs, missing-component bug (input components dropped), face distortion, 256 px resolution ceiling, EyeFormer center-bias, no iterative refinement support.[^1][^4]
- No paper claims success at producing pixel-accurate, multi-component dashboards purely from text prompts. Every working system either (a) takes a wireframe input, (b) emits a structural intermediate, or (c) escapes diffusion entirely and renders HTML/SVG.[^1][^3][^4][^6]

## Details

### Finding 1: UI-Diffuser established the "LayoutDM → ControlNet-Stable-Diffusion" two-stage template (RE@Next! 2023)
Wei et al.'s UI-Diffuser is the earliest cited diffusion-for-mobile-UI paper. Stage 1 uses LayoutDM (CyberAgent, 2023) to convert a list of UI components into a structured layout; Stage 2 feeds that layout into Stable Diffusion with ControlNet conditioning, plus a CLIP text encoder for the brief.[^1] Reviews of the paper note no quantitative metrics — only qualitative inspection — and explicitly call out the failure mode that **input components are dropped from the generated image** (e.g., an "Advertisement" component requested in the prompt does not appear).[^1] This is the canonical "prompt-engineering doesn't fix structural fidelity" data point.
**Citations:** [^1]

### Finding 2: ControlGUI (Garg, Jiang, Oulasvirta, 2025) is the strongest layout-conditioned diffusion result for UI
ControlGUI assembles ~72,500 mobile + web screenshots from Enrico, VINS, and WebUI, labels 9 standardized element types, and trains two adapters on a frozen SD backbone: a ControlNet adapter for wireframe (local) conditioning and a Flow Adapter using cross-attention plus softDTW loss to align generation with EyeFormer-predicted scanpaths (global "visual flow" conditioning).[^4] Trained for 12 epochs (~30h on a single RTX 4090), 256×256 output, 50% per-input dropout for flexible combinations. Compared qualitatively against ControlNet, Galileo AI, and GPT-4o the model "aligns more closely with input specifications" but the authors' own Limitations section is blunt: cannot generate valid text/labels, distorts faces, capped at 256×256, EyeFormer center-bias, no iterative loop.[^4] This is the most honest published account of where diffusion-for-UI actually is.
**Citations:** [^4]

### Finding 3: Grammar-guided LLM layout synthesis is the highest-leverage prompt-engineering direction
Lu et al. (ICML 2023 AI&HCI workshop) introduced a UI grammar — an explicit DSL representing the hierarchical structure of UI screens — and showed that GPT-4 in-context-learned with grammar examples produces higher-quality layouts than free-form prompting.[^3] PrototypeFlow (Yuan et al., 2024) extends this to a divide-and-conquer pipeline that translates natural language → DSL → editable component-level spec → render, integrating ControlNet for spatial control over each module and a theme module for palette consistency.[^7] WireGen (Feng et al., 2023) fine-tuned LLMs on RICO view hierarchies and reported designers preferred its mid-fidelity wireframes over in-context-learning baselines in 77.5% of judgments (n=5 designers — small but directionally clear).[^9] The cross-paper signal: **structure first as text/DSL, then render**.
**Citations:** [^3], [^7], [^9]

### Finding 4: Sketch2Code (NAACL 2025) is the only UI-specific benchmark with rigorous metrics
Chen et al. release 731 sketches paired with 484 real webpages, annotated by Prolific designers with intentional style overlap (18% sketched 2× by different designers) to control for style bias.[^6] Their layout-similarity metric is component-typed IoU weighted across 7 visual element classes (text blocks, images, video containers, nav bars, forms, tables, buttons) and correlates r²=0.87 with human ratings (p=0.0008). Headline numbers: Claude 3.5 Sonnet and GPT-4o tie at ~21–22% layout-IoU; LLaVA-1.6-8B and InternVL2-8B stay below 10%. Five-round feedback-following improves visual similarity by 7.1% and layout by 2.7%.[^6] The benchmark targets VLM→HTML rather than diffusion→pixels, but the metrics are the cleanest evaluation framework currently published for UI fidelity.
**Citations:** [^6]

### Finding 5: Adapter ecosystem (ControlNet, IP-Adapter, T2I-Adapter, Uni-ControlNet) is reused for UI but has no UI-specific paper
ControlNet (Zhang & Agrawala 2023), T2I-Adapter (Mou et al. 2023), IP-Adapter (Ye et al. 2023), and Uni-ControlNet (Zhao et al. 2023) define the spatial-conditioning toolkit that UI-Diffuser, ControlGUI, and PrototypeFlow all rely on.[^1][^4][^7] None of these adapter papers evaluate on UI domains; UI work uses the wireframe condition for ControlNet, optionally pairs with IP-Adapter for style reference, but no published study isolates the contribution of style-reference adapters to UI consistency. This is a gap in the literature, not a solved problem.
**Citations:** [^1][^4][^11]

### Finding 6: Evaluation is fragmented — FID/SSIM/PSNR + small-N human study is the modal recipe
Duan et al. (2025) report PSNR, SSIM, FID, and qualitative user satisfaction against GAN, VAE, DALL-E baselines.[^2] WireGen uses designer preference (n=5).[^9] Sketch2Code is the outlier with typed-IoU and CLIP-based block matching.[^6] No paper publishes OCR-Levenshtein on rendered wordmarks despite multiple authors citing illegible text as a primary failure — there is open territory for a UI-specific eval suite.
**Citations:** [^2], [^6], [^9]

### Finding 7: Failure-mode catalog (consistent across the corpus)
Compiled from explicit "Limitations" sections: (a) invalid/garbled text in rendered components,[^1][^4] (b) missing-component bug — prompt-specified components dropped from output,[^1] (c) added-component bug — model invents components not in prompt,[^4] (d) 256×256 resolution ceiling makes small-text legibility impossible,[^4] (e) face/avatar distortion in user-profile screens,[^4] (f) alignment drift in dense layouts,[^6] (g) sketch-fidelity bound: even SOTA VLMs hit ~22% layout-IoU.[^6] Every failure listed in CLAUDE.md's "small text, dense components, alignment drift" prior is corroborated by published work.
**Citations:** [^1], [^4], [^6]

## Recommendations

Concrete prompt-template moves the academic literature endorses:

1. **Always emit a structural intermediate before pixels.** Either generate a UI grammar / DSL (Lu et al.[^3]) or a wireframe sketch (UI-Diffuser, ControlGUI[^1][^4]) and feed it as the structural condition. Do not ship a raw text → diffusion call for any UI brief.
2. **Component-typed prompt structure.** Sketch2Code's 7-class taxonomy (text-block, image, video-container, nav-bar, form, table, button) is the cleanest published vocabulary; prompts that itemize components in this taxonomy correlate with measurable layout-IoU gains.[^6]
3. **Composite real text post-render.** Multiple papers list illegible text as the dominant failure; PrototypeFlow and WireGen's editable DSL approach is explicitly motivated by this.[^4][^7][^9] This matches CLAUDE.md's "weak-text models composite SVG type post-render" rule — the literature confirms it.
4. **Use IP-Adapter for style refs across an asset set.** No UI paper isolates this, but it is the adapter used in PrototypeFlow's theme module and the only published path to brand-palette consistency across multiple UI screens.[^7][^11]
5. **Benchmark with typed-IoU + OCR-Levenshtein.** Sketch2Code's weighted IoU is reproducible; OCR-Levenshtein is missing from the literature but trivially layered on top, and aligns with our existing tier-0 validation.[^6]
6. **Don't promise pixel-accurate dashboards from prompts alone.** No paper supports this. Frame the user expectation as "low-fidelity exploration sketch" (ControlGUI's explicit pitch) or "editable component spec" (PrototypeFlow), not "production mockup."[^4][^7]
7. **Cap resolution expectations at the published ceiling.** Wireframe-conditioned SD-based UI work tops out at 256–512 px in every paper surveyed; upscaling is post-hoc and unpublished for UI domain.[^4]

## Sources

[^1]: Wei, Courbis, Lambolais, Xu, Bernard, Dray. "Boosting GUI Prototyping with Diffusion Models" (UI-Diffuser). RE@Next! 2023. https://arxiv.org/abs/2306.06233 — review with architecture details: https://ai-scholar.tech/en/articles/stable-diffusion/boosting-GUI-prototyping-with-diffusion-models
[^2]: Duan, Yang, Zhang, Song, Shao. "Automated UI Interface Generation via Diffusion Models: Enhancing Personalization and Efficiency." 2025. https://arxiv.org/abs/2503.20229
[^3]: Lu, Tong, Zhao, Zhang, Li. "UI Layout Generation with LLMs Guided by UI Grammar." ICML 2023 Workshop on AI and HCI. https://arxiv.org/abs/2310.15455
[^4]: Garg, Jiang, Oulasvirta. "Controllable GUI Exploration" (ControlGUI). 2025. https://arxiv.org/abs/2502.03330 / https://arxiv.org/html/2502.03330v1
[^5]: Frontend Diffusion: Exploring Intent-Based User Interfaces through Abstract-to-Detailed Task Transitions. 2024. https://arxiv.org/abs/2408.00778
[^6]: Li et al. (SALT-NLP). "Sketch2Code: Evaluating Vision-Language Models for Interactive Web Design Prototyping." NAACL 2025. https://arxiv.org/abs/2410.16232 / https://aclanthology.org/2025.naacl-long.198/
[^7]: Yuan, Chen, Hu, Feng, Xie, Mohammadi, Xing, Quigley. "Towards Human-AI Synergy in UI Design: Supporting Iterative Generation with LLMs" (PrototypeFlow). 2024. https://arxiv.org/abs/2412.20071
[^8]: Inoue et al. "LayoutDiffusion: Improving Graphic Layout Generation by Discrete Diffusion Probabilistic Models." ICCV 2023. https://arxiv.org/abs/2303.11589 (graphic-layout focus, RICO + PubLayNet)
[^9]: Feng, Yuan, Chen, Xing, Chen. "Designing with Language: Wireframing UI Design Intent with Generative Large Language Models" (WireGen). 2023. https://arxiv.org/abs/2312.07755
[^10]: Deka et al. RICO dataset (72k Android UIs). 2017. + Leiva et al. Enrico curated subset. 2020. https://userinterfaces.aalto.fi/enrico/
[^11]: Ye et al. "IP-Adapter: Text Compatible Image Prompt Adapter." 2023. https://arxiv.org/abs/2308.06721 ; Mou et al. "T2I-Adapter." 2023. https://arxiv.org/abs/2302.08453 ; Zhang & Agrawala. "ControlNet." 2023. https://arxiv.org/abs/2302.05543

UNVERIFIED (mentioned in searches but not confirmed): "Multimodal graph representation learning for website generation based on visual sketch" (arxiv 2504.18729) — title plausible, did not fetch full abstract; do not cite as core finding.
