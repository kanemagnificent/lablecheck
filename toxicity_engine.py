"""
toxicity_engine.py
===================
Ingredient Toxicity / Consumer-Safety Advisory Engine.
"""

import json
import os
import re
from typing import Any, Dict, List, Optional


INGREDIENT_RISK_DB: List[Dict[str, Any]] = [
    # ARTIFICIAL COLORS / DYES
    {"name": "Tartrazine (E102 / Yellow 5)", "aliases": ["tartrazine", "e102", "e-102", "yellow 5", "fd&c yellow no. 5"],
     "risk_level": "moderate", "category": "artificial_color", "banned_in_india": False,
     "reason": "Synthetic azo dye linked to hyperactivity in children and allergic reactions."},
    {"name": "Sunset Yellow (E110 / Yellow 6)", "aliases": ["sunset yellow", "e110", "e-110", "yellow 6"],
     "risk_level": "moderate", "category": "artificial_color", "banned_in_india": False,
     "reason": "Azo dye associated with hyperactivity and allergic reactions."},
    {"name": "Allura Red (E129 / Red 40)", "aliases": ["allura red", "e129", "e-129", "red 40"],
     "risk_level": "moderate", "category": "artificial_color", "banned_in_india": False,
     "reason": "Synthetic red dye linked to hyperactivity in children."},
    {"name": "Carmoisine (E122)", "aliases": ["carmoisine", "e122", "e-122"],
     "risk_level": "moderate", "category": "artificial_color", "banned_in_india": False,
     "reason": "Azo dye associated with allergic and hyperactivity reactions."},
    {"name": "Erythrosine (E127 / Red 3)", "aliases": ["erythrosine", "e127", "e-127", "red 3"],
     "risk_level": "high", "category": "artificial_color", "banned_in_india": False,
     "reason": "Iodine-containing dye linked to thyroid tumors in animal studies."},
    {"name": "Rhodamine B", "aliases": ["rhodamine b", "rhodamine-b"],
     "risk_level": "high", "category": "artificial_color", "banned_in_india": True,
     "reason": "Industrial textile dye illegally used in food; prohibited by FSSAI."},
 
    # PRESERVATIVES & ADDITIVES
    {"name": "Sodium Benzoate (E211)", "aliases": ["sodium benzoate", "e211", "e-211"],
     "risk_level": "moderate", "category": "preservative", "banned_in_india": False,
     "reason": "Can form benzene (a known carcinogen) when combined with vitamin C under heat/light."},
    {"name": "Potassium Benzoate (E212)", "aliases": ["potassium benzoate", "e212", "e-212"],
     "risk_level": "moderate", "category": "preservative", "banned_in_india": False,
     "reason": "Benzene-formation risk when combined with ascorbic acid."},
    {"name": "Sodium Nitrite (E250)", "aliases": ["sodium nitrite", "e250", "e-250"],
     "risk_level": "high", "category": "preservative", "banned_in_india": False,
     "reason": "Can form nitrosamines (probable carcinogens) during cooking/digestion."},
    {"name": "BHA (E320)", "aliases": ["bha", "butylated hydroxyanisole", "e320"],
     "risk_level": "high", "category": "preservative", "banned_in_india": False,
     "reason": "Anticipated human carcinogen and suspected endocrine disruptor."},
    {"name": "BHT (E321)", "aliases": ["bht", "butylated hydroxytoluene", "e321"],
     "risk_level": "moderate", "category": "preservative", "banned_in_india": False,
     "reason": "Suspected endocrine disruptor."},

    # FLAVORS & FATS & STABILIZERS
    {"name": "Artificial Flavoring (unspecified)", "aliases": ["artificial flavour", "artificial flavor", "nature-identical flavoring", "synthetic flavouring"],
     "risk_level": "low", "category": "flavor_enhancer", "banned_in_india": False,
     "reason": "Umbrella term covering synthetic compounds; allergen risks cannot be individually assessed."},
    {"name": "Palm Oil", "aliases": ["palm oil", "fractionated fat"],
     "risk_level": "low", "category": "fat", "banned_in_india": False,
     "reason": "High in saturated fat versus unsaturated alternatives."},
    {"name": "Caramel Color (E150d)", "aliases": ["color (150d)", "150d", "e150d", "caramel color"],
     "risk_level": "low", "category": "artificial_color", "banned_in_india": False,
     "reason": "Ammonia-sulfite processed caramel color; contains trace 4-MEI."},
    {"name": "Emulsifiers / Stabilizers (Synthetic)", "aliases": ["471", "477", "410", "412", "322", "440"],
     "risk_level": "low", "category": "stabilizer", "banned_in_india": False,
     "reason": "Common commercial food thickeners and emulsifiers; generally safe in moderation."},
]

# Build lookup alias list
_ALIAS_INDEX: List[Dict[str, Any]] = []
for _entry in INGREDIENT_RISK_DB:
    for _alias in _entry["aliases"]:
        _ALIAS_INDEX.append({"alias": _alias, "pattern": re.compile(r"\b" + re.escape(_alias) + r"\b", re.IGNORECASE), "entry": _entry})
_ALIAS_INDEX.sort(key=lambda x: len(x["alias"]), reverse=True)

_RISK_WEIGHT = {"high": 25, "moderate": 15, "low": 5}

# Pattern catches variations: INGREDIENTS:, NGREDIENTS:, CONTAINS, etc.
_INGREDIENTS_HEADER_PATTERN = re.compile(r"(?:I?NGREDIENTS?|CONTAINS)\s*[:\-]?\s*", re.IGNORECASE)

_STOP_HEADERS = (
    r"nutritional?\s+(information|facts|value)?", r"allergen", r"net\s*(wt|weight|qty|quantity)",
    r"mrp|m\.r\.p", r"mfg|manufactured|best\s*before|expiry|use\s*by", r"storage",
    r"customer|consumer\s*care", r"fssai", r"batch|lot\s*no", r"marketed\s*by"
)
_STOP_PATTERN = re.compile(r"(?:" + "|".join(_STOP_HEADERS) + r")", re.IGNORECASE)


def extract_ingredients_section(raw_text: str) -> Optional[str]:
    if not raw_text:
        return None
    header_match = _INGREDIENTS_HEADER_PATTERN.search(raw_text)
    if not header_match:
        return None

    remainder = raw_text[header_match.end():]
    stop_match = _STOP_PATTERN.search(remainder)
    ingredients_text = remainder[: stop_match.start()] if stop_match else remainder
    return ingredients_text.strip(" \n\t.:;-") or None


def split_ingredient_tokens(ingredients_text: str) -> List[str]:
    if not ingredients_text:
        return []
    raw_tokens = re.split(r",(?![^(]*\))", ingredients_text)
    return [t.strip(" \n\t.;") for t in raw_tokens if t.strip()]


def _match_flagged_ingredients(ingredients_text: str) -> List[Dict[str, Any]]:
    flagged = []
    seen_entry_names = set()
    for record in _ALIAS_INDEX:
        if record["entry"]["name"] in seen_entry_names:
            continue
        match = record["pattern"].search(ingredients_text)
        if match:
            entry = record["entry"]
            flagged.append({
                "name": entry["name"],
                "matched_as": match.group(0),
                "risk_level": entry["risk_level"],
                "category": entry["category"],
                "banned_in_india": entry["banned_in_india"],
                "reason": entry["reason"],
            })
            seen_entry_names.add(entry["name"])
    return flagged


def compute_verdict(toxicity_score: int, high: int, moderate: int, banned_present: bool) -> Dict[str, str]:
    if banned_present or high >= 1 or toxicity_score < 50:
        return {
            "verdict": "NOT RECOMMENDED",
            "verdict_reason": "Contains high-risk or banned ingredients under safety regulations.",
        }
    if moderate >= 1 or toxicity_score < 85:
        return {
            "verdict": "USE WITH CAUTION",
            "verdict_reason": f"Contains moderate-risk ingredient(s) — best consumed in moderation.",
        }
    return {
        "verdict": "SAFE",
        "verdict_reason": "No high or moderate-risk additives detected.",
    }


def analyze_ingredients(raw_text: str) -> Dict[str, Any]:
    ingredients_text = extract_ingredients_section(raw_text)

    if not ingredients_text:
        return {
            "ingredients_raw_text": None,
            "ingredients_list": [],
            "flagged_ingredients": [],
            "safe_ingredients": [],
            "unrecognized_ingredients": [],
            "toxicity_score": 100,
            "verdict": "NO INGREDIENTS DETECTED",
            "verdict_reason": "No 'Ingredients:' section found.",
            "high_risk_count": 0,
            "moderate_risk_count": 0,
            "low_risk_count": 0,
        }

    tokens = split_ingredient_tokens(ingredients_text)
    flagged = _match_flagged_ingredients(ingredients_text)

    high = sum(1 for f in flagged if f["risk_level"] == "high")
    moderate = sum(1 for f in flagged if f["risk_level"] == "moderate")
    low = sum(1 for f in flagged if f["risk_level"] == "low")
    banned_present = any(f["banned_in_india"] for f in flagged)

    score = 100
    for f in flagged:
        score -= _RISK_WEIGHT.get(f["risk_level"], 0)
    toxicity_score = max(30, min(100, score))

    verdict_info = compute_verdict(toxicity_score, high, moderate, banned_present)

    safe_list = [t for t in tokens if not any(f["matched_as"].lower() in t.lower() for f in flagged)]

    return {
        "ingredients_raw_text": ingredients_text,
        "ingredients_list": tokens,
        "flagged_ingredients": flagged,
        "safe_ingredients": safe_list,
        "unrecognized_ingredients": [],
        "toxicity_score": toxicity_score,
        "verdict": verdict_info["verdict"],
        "verdict_reason": verdict_info["verdict_reason"],
        "high_risk_count": high,
        "moderate_risk_count": moderate,
        "low_risk_count": low,
    }


def run_toxicity_analysis(raw_text: str, enable_ai: bool = True) -> Dict[str, Any]:
    """Public integration entry point."""
    result = analyze_ingredients(raw_text or "")
    result["ai_advisory"] = None
    return result
