---
category: 29-rag-brand-knowledge
angle: 29a
title: "Brand Guideline Extraction for RAG — PDFs, URLs, and Structured Parsing"
date: 2026-04-20
tags:
  - brand-extraction
  - pdf-parsing
  - llamaindex
  - llamaparse
  - unstructured
  - dembrandt
  - brandfetch
  - rag
  - brand-bundle
status: research
---

# Brand Guideline Extraction for RAG

## What the problem actually is

A user arrives with a brand brief that lives in one of four places: a PDF brand guidelines document, a live website, a Figma file, or just a domain name. The prompt-to-asset server needs to turn any of these into a structured `BrandBundle` — palette hexes, typography descriptors, style prose, do-not lists — without requiring the user to manually fill a form.

This is a retrieval problem before it is a generation problem. The right answer is structured extraction into a typed schema, not free-form summarization.

---

## Path 1 — PDF brand guidelines (LlamaIndex + LlamaParse)

**LlamaIndex** ([github.com/run-llama/llama_index](https://github.com/run-llama/llama_index)) is the most practical framework for this path. Its structured extraction pattern works as follows:

1. Define a Pydantic model matching `BrandBundle` fields.
2. Attach it to an LLM via `llm.as_structured_llm(output_cls=BrandBundle)`.
3. Pass the parsed PDF through the LLM query.

The key bottleneck is PDF parsing. Standard text extraction loses color swatches (rendered as images), font specimens (often SVG or rasterized), and table-formatted guidelines. **LlamaParse** (the hosted SaaS parser from LlamaIndex) solves this by treating each page as an image, sending it to a vision-LLM, and producing structured markdown that preserves headings, table cells, and image captions. Relevant endpoint: `POST /api/parsing/upload`.

Practical limit: LlamaParse is a paid API (free tier ~1,000 pages/day as of 2026). For local-only pipelines, use **Unstructured** ([github.com/Unstructured-IO/unstructured](https://github.com/Unstructured-IO/unstructured)) with `strategy="hi_res"`, which renders PDFs as images via `pdf2image` + `detectron2` layout detection. It handles 64 file types and ships as Python package `unstructured`. The `hi_res` strategy adds ~30–60 s/page on CPU.

**Extraction schema for brand PDFs:**

```python
from pydantic import BaseModel, Field
from typing import Optional

class BrandBundle(BaseModel):
    brand_name: str
    primary_colors: list[str] = Field(description="Hex codes, e.g. ['#FF6A00', '#0B1220']")
    secondary_colors: list[str] = Field(default_factory=list)
    display_font: Optional[str] = Field(description="Primary typeface name")
    body_font: Optional[str] = Field(default=None)
    style_descriptors: list[str] = Field(description="Visual register words, e.g. ['minimal', 'editorial']")
    prohibited_elements: list[str] = Field(default_factory=list,
                                            description="Do-not list from brand guidelines")
```

Pass this to `as_structured_llm` and query against the parsed PDF chunks. The LLM handles ambiguity (e.g., a swatch image captioned "Primary: Ocean Blue" → resolves to `#0077B6` if the PDF includes hex).

**Caveat:** LLM extraction of hex codes from rasterized swatches requires the vision model to perform OCR on the swatch label. It fails silently when the label is absent or the swatch is decorative. Always post-validate hexes with a regex (`^#[0-9A-Fa-f]{6}$`) and reject invalid values rather than propagating LLM hallucinations.

---

## Path 2 — Live website (Dembrandt)

**Dembrandt** ([github.com/dembrandt/dembrandt](https://github.com/dembrandt/dembrandt)) is the most direct tool: one CLI command renders a URL via Playwright, analyzes computed DOM styles and CSS variables, and outputs confidence-scored DTCG design tokens.

Extracted artifacts: logo (detected from `<link rel="icon">` and `<img>` elements), color palette (semantic + primitive + composite), typography (font families with Google Fonts / Typekit source detection), spacing, borders, shadows.

Seven MCP tools ship with it: `get_design_tokens`, `get_color_palette`, `get_typography`, `get_component_styles`, `get_surfaces`, `get_spacing`, `get_brand_identity`. This makes dembrandt usable directly from the prompt-to-asset MCP server — call `get_color_palette(url)` and pipe the result into `BrandBundle.primary_colors`.

**Caveats:** Dembrandt analyzes rendered CSS, so it catches computed values but misses design intent — a brand that uses `#FF6A00` only as a hover accent will show it alongside `#0B1220` at roughly equal frequency. Confidence scores help, but human review of the palette rank-order is necessary before promotion to a production bundle.

---

## Path 3 — Domain name (Brandfetch API)

**Brandfetch** ([brandfetch.com/developers](https://brandfetch.com/developers)) is a brand data platform with a REST API that returns logos, colors, fonts, and firmographic data given a domain. A community MCP server wraps it: [github.com/djmoore711/brandfetch-mcp](https://github.com/djmoore711/brandfetch-mcp).

Single API call: `GET https://api.brandfetch.io/v2/brands/:domain`. Response includes `colors[].hex`, `fonts[].name`, `logos[].formats[].src` (SVG, PNG, WebP). Free tier: 10,000 lookups/month.

Use Brandfetch as the cold-start path when the user provides only a company name or domain. Then dembrandt as a secondary pass on the company's primary URL to fill in typography and spacing that Brandfetch omits.

---

## Recommended extraction pipeline for prompt-to-asset

```
User input (URL | PDF | domain)
        │
        ├─ domain → Brandfetch API → colors, fonts, logos
        │
        ├─ URL → dembrandt → DTCG tokens (palette, typography, spacing)
        │
        └─ PDF → LlamaParse → markdown chunks
                    └─ LLM structured extraction (Pydantic BrandBundle)
                    
All three paths → merge → human approval gate → brand-bundle.json
```

The merge step should prefer: PDF-extracted hexes (authoritative) > Brandfetch hexes (curated) > dembrandt computed hexes (derived). For typography, prefer PDF font names > Brandfetch > dembrandt CSS family name.

Always require a human approval gate before writing to the production bundle — structured extraction from PDFs has a ~10–20 % field error rate on hex codes and font names in practice, higher for guidelines documents that rely heavily on infographics.

---

## References

- LlamaIndex structured extraction — [developers.llamaindex.ai/python/framework/understanding/extraction](https://developers.llamaindex.ai/python/framework/understanding/extraction/)
- LlamaParse — [llamaindex.ai/blog/4-ways-llamacloud-scales-enterprise-rag](https://www.llamaindex.ai/blog/4-ways-llamacloud-scales-enterprise-rag)
- Unstructured — [github.com/Unstructured-IO/unstructured](https://github.com/Unstructured-IO/unstructured)
- Dembrandt — [github.com/dembrandt/dembrandt](https://github.com/dembrandt/dembrandt)
- Brandfetch Brand API — [brandfetch.com/developers](https://brandfetch.com/developers)
- brandfetch-mcp — [github.com/djmoore711/brandfetch-mcp](https://github.com/djmoore711/brandfetch-mcp)
- Firecrawl brand style guide cookbook — [docs.firecrawl.dev/developer-guides/cookbooks/brand-style-guide-generator-cookbook](https://docs.firecrawl.dev/developer-guides/cookbooks/brand-style-guide-generator-cookbook)
