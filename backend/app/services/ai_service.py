"""
AI Service — Groq-powered biomarker extraction and grounded explanations.

Uses Groq's free, OpenAI-compatible API for two jobs:

1. extract_biomarkers(text): read raw (OCR'd) report text and return structured
   biomarkers as JSON — far more robust than regex across varied report layouts.
2. explain_biomarker(...): generate a plain-language, RAG-grounded explanation of a
   single result using ONLY retrieved medical context (guards against hallucination).

If no GROQ_API_KEY is configured, `available` is False and callers fall back to the
existing regex extraction / static knowledge base.
"""
from __future__ import annotations

import json
import re
from typing import Dict, List

from app.config import settings


EXTRACTION_SYSTEM = (
    "You are a precise medical data extraction assistant. You extract lab test "
    "results from report text and return strict JSON only — no prose."
)

EXTRACTION_PROMPT = """Extract EVERY lab test result from the medical report below.

For each result return:
- "name": the standard test / biomarker name (e.g. "Hemoglobin", "LDL Cholesterol")
- "value": the numeric value only (a number, no units)
- "unit": the unit of measurement (e.g. "g/dL", "mg/dL"), or "" if not stated

Ignore patient details, dates, headers, and printed reference ranges.
If nothing looks like a lab result, return an empty list.

Return JSON exactly like:
{{"biomarkers": [{{"name": "Hemoglobin", "value": 13.2, "unit": "g/dL"}}]}}

REPORT:
\"\"\"
{text}
\"\"\"
"""

EXPLAIN_SYSTEM = (
    "You are a careful, friendly health-literacy assistant. You explain lab results "
    "in simple language a non-doctor can understand. You use ONLY the provided "
    "context, you never diagnose or prescribe treatment, and you keep it brief and "
    "calm. Return strict JSON only."
)

EXPLAIN_PROMPT = """A person's lab result:
- Test: {name}
- Value: {value} {unit}
- Status vs. normal range: {status}

Using ONLY the medical context below, produce:
- "explanation": 2-3 simple, reassuring sentences on what this test measures and what
  a {status} result may generally indicate.
- "implications": up to 3 short, general, non-alarming points (awareness / lifestyle,
  never a diagnosis or prescription).

If the context is insufficient, say so plainly in the explanation.

CONTEXT:
\"\"\"
{context}
\"\"\"

Return JSON exactly like:
{{"explanation": "...", "implications": ["...", "..."]}}
"""


def _safe_json(raw: str) -> dict | list:
    """Parse model output as JSON, tolerating stray prose or code fences."""
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    # Grab the first {...} or [...] block.
    match = re.search(r"(\{.*\}|\[.*\])", raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            return {}
    return {}


class AIService:
    def __init__(self) -> None:
        self.api_key = settings.GROQ_API_KEY
        self.model = settings.GROQ_MODEL
        self.base_url = settings.GROQ_BASE_URL
        self._client = None

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    def _get_client(self):
        if self._client is None:
            from openai import OpenAI

            self._client = OpenAI(api_key=self.api_key, base_url=self.base_url)
        return self._client

    def _chat(self, system: str, user: str, json_mode: bool = True) -> str:
        kwargs = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.0,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        response = self._get_client().chat.completions.create(**kwargs)
        return response.choices[0].message.content or ""

    # ---- Extraction -------------------------------------------------------
    def extract_biomarkers(self, text: str) -> List[Dict]:
        """Return [{name, value, unit}] extracted from raw report text."""
        raw = self._chat(EXTRACTION_SYSTEM, EXTRACTION_PROMPT.format(text=text[:6000]))
        return self._parse_biomarkers(raw)

    @staticmethod
    def _parse_biomarkers(raw: str) -> List[Dict]:
        data = _safe_json(raw)
        if isinstance(data, dict):
            items = data.get("biomarkers") or data.get("results") or []
        elif isinstance(data, list):
            items = data
        else:
            items = []

        out: List[Dict] = []
        seen: set[str] = set()
        for item in items:
            if not isinstance(item, dict):
                continue
            try:
                name = str(item["name"]).strip()
                value = float(item["value"])
            except (KeyError, TypeError, ValueError):
                continue
            if not name or name.lower() in seen:
                continue
            seen.add(name.lower())
            out.append({"name": name, "value": value, "unit": str(item.get("unit", "")).strip()})
        return out

    # ---- Grounded explanation --------------------------------------------
    def explain_biomarker(self, name: str, value: float, unit: str, status: str, context: str) -> Dict:
        """Return {explanation, implications} grounded in the provided context."""
        raw = self._chat(
            EXPLAIN_SYSTEM,
            EXPLAIN_PROMPT.format(name=name, value=value, unit=unit, status=status, context=context[:2500]),
        )
        data = _safe_json(raw)
        if not isinstance(data, dict):
            return {"explanation": "", "implications": []}
        explanation = str(data.get("explanation", "")).strip()
        implications = data.get("implications", [])
        if not isinstance(implications, list):
            implications = [str(implications)]
        implications = [str(x).strip() for x in implications if str(x).strip()][:3]
        return {"explanation": explanation, "implications": implications}
