"""
Verified disease knowledge base and grounding lookup tool for tomato and wheat crops.
This file is dependency-free and serves as the single source of truth for disease data.
"""

# The verified disease database matching API_CONTRACTS.md §0.5
# Uses ASCII Unicode escapes for Hindi characters to ensure robust, corruption-free display.
DISEASE_DB = {
    "early_blight": {
        "crop": "tomato",
        "hindi_name": "\u0905\u0917\u0947\u0924\u0940 \u091d\u0941\u0932\u0938\u093e (Early Blight)",
        "symptoms": "Purani pattiyaan par gol, bhoore aur kaale dhabbe bante hain jinme target board jaise gol challe (rings) dikhte hain.",
        "treatment": "Copper-based fungicide (jaise Copper Oxychloride) ya Mancozeb ka chidkaav karein.",
        "prevention": [
            "Paudhon ke beech sahi doori rakhein",
            "Crop rotation (fasal chakra) apnayein",
            "Khet me saaf-safai rakhein aur prabhavit hisso ko nikaal dein"
        ]
    },
    "late_blight": {
        "crop": "tomato",
        "hindi_name": "\u092a\u091b\u0947\u0924\u0940 \u091d\u0941\u0932\u0938\u093e (Late Blight)",
        "symptoms": "Pattiyaan par gehre bhoore, geele dhabbe bante hain jo tezi se phailte hain. Sardi aur nami wale mausam me patti ke neeche safed fafund dikhti hai.",
        "treatment": "Metalaxyl + Mancozeb ya Cymoxanil + Mancozeb group ki fungicide ka chidkaav karein.",
        "prevention": [
            "Khet me paani jama na hone dein",
            "Swasth aur certified beej ka hi upyog karein",
            "Fasal par nazar rakhein aur hawa ki awajahahi sahi rakhein"
        ]
    },
    "leaf_curl_virus": {
        "crop": "tomato",
        "hindi_name": "\u092a\u0930\u094d\u0923 \u0915\u0941\u0902\u091a\u0928 \u0930\u094b\u0917 / \u0932\u0940\u092b \u0915\u0930\u094d\u0932 (Leaf Curl Virus)",
        "symptoms": "Pattiyaan upar ki taraf mudne aur sikudne lagti hain, choti aur peeli ho jaati hain. Paudha chota (stunted) reh jata hai.",
        "treatment": "Ye virus insect (Whitefly) se phailta hai. Imidacloprid ya Acetamiprid ka chidkaav karke safed makkhi (whitefly) ko niyantrit karein. Prabhavit paudhon ko ukhadkar phenk dein.",
        "prevention": [
            "Nursery ko net/jalee se dhak kar rakhein",
            "Khet ke aas-paas kharpatwar saaf rakhein",
            "Whitefly par kabu paane ke liye yellow sticky traps lagayein"
        ]
    },
    "yellow_rust": {
        "crop": "wheat",
        "hindi_name": "\u092a\u0940\u0932\u093e \u0930\u0924\u0941\u0906 (Yellow Rust)",
        "symptoms": "Pattiyaan par peele rang ke chhote-chhote dhabbe ya dhariyaan (stripes) ban jaati hain jo peele powder (spores) jaisi lagti hain.",
        "treatment": "Propiconazole (jaise Tilt) ya Tebuconazole fungicide ka chidkaav karein.",
        "prevention": [
            "Rust-resistant (pratirodhi) kismein lagayein",
            "Beejopchar (seed treatment) karke hi buvai karein",
            "Nitrogen khad ka zyaada upyog na karein"
        ]
    },
    "brown_rust": {
        "crop": "wheat",
        "hindi_name": "\u092d\u0942\u0930\u093e \u0930\u0924\u0941\u0906 (Brown Rust)",
        "symptoms": "Pattiyaan par gol aur bhoore-laal rang ke chhote dhabbe (pustules) bikhre hue dikhte hain, jo haath lagane par bhoora powder chhodte hain.",
        "treatment": "Propiconazole 25% EC ya Triadimefon fungicide ka chidkaav karein.",
        "prevention": [
            "Sahi samay par buvai karein",
            "Khet ki niyamit nigrani karein",
            "Unnat aur pratirodhi beejo ka upyog karein"
        ]
    },
    "powdery_mildew": {
        "crop": "wheat",
        "hindi_name": "\u091a\u0942\u0930\u094d\u0923\u0940 \u0906\u0938\u093f\u0924\u093e (Powdery Mildew)",
        "symptoms": "Pattiyaan aur tano par safed ya bhoore rang ke churan (powder) jaise dhabbe dikhte hain jo fafund ki wajah se hote hain.",
        "treatment": "Hexaconazole ya Propiconazole ya wettable sulphur ka chidkaav karein.",
        "prevention": [
            "Khet me hawa ka circulation sahi rakhein",
            "Paudhon ki ghani buvai se bachein",
            "Santulit matra me khad ka upyog karein"
        ]
    }
}


def _make_error_response(code: str, message: str) -> dict:
    """Helper to construct a standard error response envelope."""
    return {
        "status": "error",
        "data": None,
        "error": {
            "code": code,
            "message": message,
            "retryable": False
        },
        "confidence": None,
        "source": "local_kb",
        "clarification": None,
        "meta": {
            "multi_intent": {
                "detected": False,
                "secondary_intent": None
            }
        }
    }


def _make_not_found_response() -> dict:
    """Helper to construct a standard not-found success response envelope."""
    return {
        "status": "success",
        "data": {
            "found": False,
            "note": "This exact disease isn't in the verified database. Give general, cautious advice and recommend local expert confirmation."
        },
        "confidence": None,
        "source": "local_kb",
        "error": None,
        "clarification": None,
        "meta": {
            "multi_intent": {
                "detected": False,
                "secondary_intent": None
            }
        }
    }


def _make_success_response(disease_key: str, disease_info: dict) -> dict:
    """Helper to construct a standard success response envelope."""
    return {
        "status": "success",
        "data": {
            "found": True,
            "crop": disease_info.get("crop"),
            "disease_key": disease_key,
            "hindi_name": disease_info.get("hindi_name"),
            "symptoms": disease_info.get("symptoms"),
            "treatment": disease_info.get("treatment"),
            "prevention": disease_info.get("prevention")
        },
        "confidence": None,
        "source": "local_kb",
        "error": None,
        "clarification": None,
        "meta": {
            "multi_intent": {
                "detected": False,
                "secondary_intent": None
            }
        }
    }


def lookup_disease_info(crop: str, disease_key: str) -> dict:
    """
    Local grounding function tool for the Crop Doctor Agent.
    Returns verified treatment/prevention data so the agent never states
    dosage-relevant facts from memory alone.

    Args:
        crop: The crop type, must be 'tomato' or 'wheat'.
        disease_key: The disease key to lookup in the verified database.

    Returns:
        dict: A response envelope matching API_CONTRACTS.md §1.
    """
    # Type checking and input validation
    if not isinstance(crop, str) or not isinstance(disease_key, str) or not crop.strip() or not disease_key.strip():
        return _make_error_response("E_INVALID_INPUT", "Crop and disease_key must be non-empty strings.")

    # Normalize inputs before comparison (mixed case, whitespace)
    norm_crop = crop.strip().lower()
    norm_key = disease_key.strip().lower()

    # Verify if crop is supported
    if norm_crop not in ("tomato", "wheat"):
        return _make_error_response(
            "E_UNSUPPORTED_CROP",
            f"'{crop}' is not in the verified database (only tomato/wheat supported)."
        )

    # Safe lookup using DISEASE_DB.get() to avoid direct indexing
    disease_info = DISEASE_DB.get(norm_key)

    # Unrecognized disease_key, or key valid for a different crop -> found: false
    if not disease_info or disease_info.get("crop") != norm_crop:
        return _make_not_found_response()

    # Success path - disease found in local knowledge base
    return _make_success_response(norm_key, disease_info)
