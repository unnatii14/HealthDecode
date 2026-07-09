"""
RAG Service — retrieves grounding context for the AI explanations.

Builds a small semantic index over the project's verified medical knowledge
(``knowledge_base.yaml`` + ``reference_ranges.yaml``). For each biomarker, the AI
explanation is grounded in the top-k retrieved documents so it stays factual.

Primary path: sentence-transformers embeddings + FAISS (real vector search).
Fallback path: a dependency-free keyword overlap search, so retrieval still works
if the ML stack isn't installed.
"""
from __future__ import annotations

import re
from typing import Dict, List

import yaml

from app.config import settings


def _tokenize(text: str) -> set:
    return set(re.findall(r"[a-z0-9]+", (text or "").lower()))


class RagService:
    def __init__(self) -> None:
        self._docs: List[Dict] = []          # [{"key": name, "text": document}]
        self._index = None                    # FAISS index (or None)
        self._embedder = None
        self._built = False

    # ---- Corpus ----------------------------------------------------------
    def _load_documents(self) -> List[Dict]:
        docs: List[Dict] = []

        # Reference ranges -> one short doc per biomarker.
        try:
            with open(settings.REFERENCE_RANGES_PATH, "r", encoding="utf-8") as f:
                ranges = yaml.safe_load(f) or {}
            for item in ranges.get("biomarkers", []):
                name = item.get("name", "")
                rng = item.get("range") or item.get("male_range") or item.get("female_range") or []
                text = (
                    f"{name} ({item.get('category', 'General')}). "
                    f"Unit: {item.get('unit', '')}. "
                    f"Typical reference range: {rng}. "
                )
                docs.append({"key": name, "text": text})
        except Exception as exc:  # noqa: BLE001
            print(f"⚠️  RAG: could not load reference ranges: {exc}")

        # Knowledge base -> a richer doc per nutrient/biomarker.
        try:
            with open(settings.KNOWLEDGE_BASE_PATH, "r", encoding="utf-8") as f:
                kb = yaml.safe_load(f) or {}
            for item in kb.get("nutrients", []):
                name = item.get("name", "")
                parts = [f"{name}: {item.get('description', '')}".strip()]
                if item.get("benefits"):
                    parts.append("Benefits: " + "; ".join(item["benefits"]))
                if item.get("deficiency_symptoms"):
                    parts.append("Low-level signs: " + "; ".join(item["deficiency_symptoms"]))
                if item.get("sources"):
                    parts.append("Sources: " + "; ".join(item["sources"]))
                if item.get("reference_range"):
                    parts.append(f"Reference: {item['reference_range']}")
                docs.append({"key": name, "text": " ".join(parts)})
        except Exception as exc:  # noqa: BLE001
            print(f"⚠️  RAG: could not load knowledge base: {exc}")

        return docs

    # ---- Index build -----------------------------------------------------
    def build(self) -> None:
        self._docs = self._load_documents()
        if self._docs:
            try:
                import faiss
                import numpy as np
                from sentence_transformers import SentenceTransformer

                self._embedder = SentenceTransformer(settings.EMBEDDING_MODEL)
                vectors = self._embedder.encode(
                    [d["text"] for d in self._docs], normalize_embeddings=True
                )
                vectors = np.asarray(vectors, dtype="float32")
                index = faiss.IndexFlatIP(vectors.shape[1])
                index.add(vectors)
                self._index = index
                print(f"✅ RAG: FAISS index built over {len(self._docs)} documents")
            except Exception as exc:  # noqa: BLE001
                self._index = None
                print(f"⚠️  RAG: vector index unavailable ({exc}); using keyword fallback")
        self._built = True

    # ---- Retrieval -------------------------------------------------------
    def retrieve(self, query: str, top_k: int | None = None) -> str:
        if not self._built:
            self.build()
        if not self._docs:
            return ""
        k = top_k or settings.RAG_TOP_K

        if self._index is not None and self._embedder is not None:
            import numpy as np

            qv = np.asarray(self._embedder.encode([query], normalize_embeddings=True), dtype="float32")
            _, idx = self._index.search(qv, min(k, len(self._docs)))
            hits = [self._docs[i] for i in idx[0] if i >= 0]
        else:
            hits = self._keyword_search(query, k)

        return "\n\n".join(h["text"] for h in hits)

    def _keyword_search(self, query: str, k: int) -> List[Dict]:
        q = _tokenize(query)
        if not q:
            return self._docs[:k]
        scored = []
        for doc in self._docs:
            overlap = len(q & _tokenize(doc["key"] + " " + doc["text"]))
            # Boost exact name matches so e.g. "Vitamin D" grounds on the right doc.
            if query.lower() in doc["key"].lower():
                overlap += 10
            if overlap:
                scored.append((overlap, doc))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [doc for _, doc in scored[:k]] or self._docs[:k]
