import logging
import re
from typing import Optional

from google.genai import types
from google.adk.models.llm_response import LlmResponse
from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_request import LlmRequest

logger = logging.getLogger("kisan_sahayak.security")

# Feature 1: Prompt Injection Protection Patterns
PROMPT_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(?:previous|all|the)\s+instructions", re.IGNORECASE),
    re.compile(r"reveal\s+(?:system|developer|hidden|your|internal|instructions|\s+)*prompt", re.IGNORECASE),
    re.compile(r"show\s+(?:hidden|system|developer|your|internal|instructions|\s+)*prompt", re.IGNORECASE),
    re.compile(r"reveal\s+(?:system|developer|hidden|your|internal|instructions|\s+)*instructions", re.IGNORECASE),
    re.compile(r"act\s+as\s+(?:another\s+assistant|chatgpt|claude|gemini|system)", re.IGNORECASE),
    re.compile(r"\bjailbreak\b", re.IGNORECASE),
    re.compile(r"\bjailbroken\b", re.IGNORECASE),
    re.compile(r"prompt\s+extraction", re.IGNORECASE),
    re.compile(r"instruction\s+override", re.IGNORECASE),
    re.compile(r"role\s+manipulation", re.IGNORECASE),
    re.compile(r"system\s+prompt\s+leakage", re.IGNORECASE),
    re.compile(r"tool\s+misuse", re.IGNORECASE),
]

# Feature 2: Personally Identifiable Information (PII) Patterns
PII_PATTERNS = {
    "EMAIL": re.compile(r"\b[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\b"),
    # Aadhaar is 12 digits, optional space grouped 4-4-4
    "AADHAAR": re.compile(r"\b\d{4}\s\d{4}\s\d{4}\b|\b\d{12}\b"),
    # PAN is 5 letters, 4 digits, 1 letter
    "PAN": re.compile(r"\b[a-zA-Z]{5}\d{4}[a-zA-Z]\b"),
    # Phone numbers: Indian formats like +91 9876543210, 9876543210, etc.
    "PHONE_NUMBER": re.compile(r"\b(?:\+91[\-\s]?)?[6-9]\d{9}\b|\b\d{10}\b"),
    # Credit/Debit Card Number (basic detection, 13-19 digits, or spaces)
    "CREDIT_DEBIT_CARD": re.compile(r"\b(?:\d{4}[\s-]?){3,4}\d{1,4}\b|\b\d{13,19}\b"),
    # Bank Account Number (reasonable heuristic: 9-18 digits)
    "BANK_ACCOUNT": re.compile(r"\b\d{9,18}\b"),
}

BLOCK_RESPONSE_PROMPT_INJECTION = (
    "Sorry, I can't reveal internal instructions or modify my operating behavior. "
    "Please ask a farming-related question."
)

BLOCK_RESPONSE_PII_ONLY = (
    "⚠️ [Warning: Please do not share sensitive personal information (such as Aadhaar, PAN, email, or phone numbers).]"
    " Please ask a farming-related question without sharing personal details."
)

FRIENDLY_PII_WARNING = (
    "⚠️ [Warning: Please do not share sensitive personal information (such as Aadhaar, PAN, email, or phone numbers).]\n\n"
)


def detect_prompt_injection(text: str) -> bool:
    """Checks if the text contains potential prompt injection attempts."""
    for pattern in PROMPT_INJECTION_PATTERNS:
        if pattern.search(text):
            logger.warning(f"[SECURITY] Prompt injection pattern matched: {pattern.pattern}")
            return True
    return False


def redact_pii(text: str) -> tuple[str, list[str]]:
    """Detects and redacts PII patterns in order, returning the redacted text and detected types."""
    detected_types = []
    redacted_text = text

    # Apply redactors in specific order to avoid overlap mismatches
    # 1. Email
    if PII_PATTERNS["EMAIL"].search(redacted_text):
        detected_types.append("EMAIL")
        redacted_text = PII_PATTERNS["EMAIL"].sub("[REDACTED]", redacted_text)

    # 2. Aadhaar
    if PII_PATTERNS["AADHAAR"].search(redacted_text):
        detected_types.append("AADHAAR")
        redacted_text = PII_PATTERNS["AADHAAR"].sub("[REDACTED]", redacted_text)

    # 3. PAN
    if PII_PATTERNS["PAN"].search(redacted_text):
        detected_types.append("PAN")
        redacted_text = PII_PATTERNS["PAN"].sub("[REDACTED]", redacted_text)

    # 4. Credit/Debit Card
    if PII_PATTERNS["CREDIT_DEBIT_CARD"].search(redacted_text):
        detected_types.append("CREDIT_DEBIT_CARD")
        redacted_text = PII_PATTERNS["CREDIT_DEBIT_CARD"].sub("[REDACTED]", redacted_text)

    # 5. Phone Number (applied after cards to prevent partial matching)
    if PII_PATTERNS["PHONE_NUMBER"].search(redacted_text):
        detected_types.append("PHONE_NUMBER")
        redacted_text = PII_PATTERNS["PHONE_NUMBER"].sub("[REDACTED]", redacted_text)

    # 6. Bank Account
    if PII_PATTERNS["BANK_ACCOUNT"].search(redacted_text):
        detected_types.append("BANK_ACCOUNT")
        redacted_text = PII_PATTERNS["BANK_ACCOUNT"].sub("[REDACTED]", redacted_text)

    return redacted_text, detected_types


def before_model_check(callback_context: CallbackContext, llm_request: LlmRequest) -> Optional[LlmResponse]:
    """ADK before_model_callback that checks for prompt injection and PII in the user prompt."""
    if not llm_request.contents:
        return None

    last_content = llm_request.contents[-1]
    if last_content.role != "user" or not last_content.parts:
        return None

    # Retrieve full text from the user's last message parts
    parts_text = []
    text_parts_indices = []
    for idx, part in enumerate(last_content.parts):
        if part.text:
            parts_text.append(part.text)
            text_parts_indices.append(idx)

    if not parts_text:
        return None

    full_user_text = " ".join(parts_text)

    # 1. Prompt Injection Protection
    if detect_prompt_injection(full_user_text):
        return LlmResponse(
            content=types.Content(
                role="model",
                parts=[types.Part.from_text(text=BLOCK_RESPONSE_PROMPT_INJECTION)]
            )
        )

    # 2. PII Detection and Redaction
    redacted_text, detected_pii_types = redact_pii(full_user_text)
    if detected_pii_types:
        for pii_type in detected_pii_types:
            logger.warning(f"[SECURITY] PII detected of type: {pii_type}")

        # Check if remaining text (after removing '[REDACTED]' labels) can be safely answered
        clean_text = redacted_text.replace("[REDACTED]", "").strip()
        # Remove punctuation to see if any actual text remains
        clean_text_alpha = re.sub(r"[^\w\s]", "", clean_text).strip()

        if len(clean_text_alpha) < 3:
            # Not enough safe context left to answer, block and return PII warning
            return LlmResponse(
                content=types.Content(
                    role="model",
                    parts=[types.Part.from_text(text=BLOCK_RESPONSE_PII_ONLY)]
                )
            )

        # Mutate request content in-place with redacted text so model doesn't see PII
        # Distribute redacted text back to the first text part, empty out the other text parts
        first_text_part_idx = text_parts_indices[0]
        last_content.parts[first_text_part_idx].text = redacted_text
        for idx in text_parts_indices[1:]:
            last_content.parts[idx].text = ""

        # Set PII warning trigger flag in session state
        callback_context.session.state["pii_warning_triggered"] = True
        logger.info(f"pii_warning_triggered set to True in before_model_check on agent: {callback_context.agent_name}")

    return None


def after_model_check(callback_context: CallbackContext, llm_response: LlmResponse) -> Optional[LlmResponse]:
    """ADK after_model_callback that prepends a friendly PII warning if PII was previously detected."""
    logger.info(f"after_model_check called on agent: {callback_context.agent_name}, session state: {callback_context.session.state}")

    # Skip warning injection on intermediate tool calls (e.g. transfer_to_agent)
    if llm_response.get_function_calls():
        logger.info(f"after_model_check skipped on agent: {callback_context.agent_name} because response contains function calls.")
        return None

    # Check if the warning flag is set in session state
    if callback_context.session.state.get("pii_warning_triggered"):
        logger.info(f"pii_warning_triggered is True in after_model_check on agent: {callback_context.agent_name}")
        # Clear warning flag first so it doesn't persist across future turns
        callback_context.session.state["pii_warning_triggered"] = False

        if (
            llm_response.content
            and llm_response.content.parts
            and llm_response.content.parts[0].text
        ):
            original_text = llm_response.content.parts[0].text
            llm_response.content.parts[0].text = FRIENDLY_PII_WARNING + original_text

        return llm_response

    return None
