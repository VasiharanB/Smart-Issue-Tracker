import os
import json
import logging
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from django.conf import settings

logger = logging.getLogger(__name__)

class GeminiVerificationResponse(BaseModel):
    same_issue: bool = Field(
        description="True if the two support tickets describe the exact same underlying issue, request, or bug. False otherwise."
    )
    confidence: int = Field(
        description="Confidence percentage (0 to 100) on the deduplication match evaluation."
    )
    reason: str = Field(
        description="A concise reasoning explaining the decision, citing specific details from both tickets."
    )


class GeminiVerifier:
    def __init__(self):
        self.api_key = getattr(settings, "GEMINI_API_KEY", os.environ.get("GEMINI_API_KEY"))
        if not self.api_key:
            logger.warning(
                "GEMINI_API_KEY is not configured in settings or environment. "
                "API requests to Gemini will fail unless auth is handled implicitly."
            )
        self.client = genai.Client(api_key=self.api_key)
        self.model_name = getattr(settings, "GEMINI_MODEL_NAME", "gemini-1.5-flash")

    def verify(self, new_ticket: Dict[str, Any], existing_ticket: Dict[str, Any]) -> Dict[str, Any]:
        prompt = f"""
        You are a Senior Support Engineer triage system.
        Compare the two support tickets below and determine whether both tickets refer to the same underlying user problem.

        Treat wording differences, additional details, error descriptions, or slightly more specific contexts as duplicates if the user is experiencing the same core issue.
        
        Examples:
        - "Login failed", "Cannot sign in", and "Unable to login after password reset" should be considered duplicates if they describe the same authentication problem.
        - Payment/billing failures with minor variations in description or error messages should be considered duplicates if they point to the same underlying checkout or billing system issue.

        Support Ticket A (Existing Master Ticket):
        - Category: {existing_ticket.get('category', 'Unknown')}
        - Subject: {existing_ticket.get('subject', 'No Subject')}
        - Description: {existing_ticket.get('description', 'No Description')}

        Support Ticket B (New Ticket):
        - Category: {new_ticket.get('category', 'Unknown')}
        - Subject: {new_ticket.get('subject', 'No Subject')}
        - Description: {new_ticket.get('description', 'No Description')}

        Are these two tickets reporting the same underlying issue? Respond in the schema format specified.
        """

        import time
        max_retries = 3
        backoff_factor = 2

        for attempt in range(max_retries):
            try:
                logger.info(f"Attempting Gemini validation. Try {attempt + 1}/{max_retries} for model '{self.model_name}'")

                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=GeminiVerificationResponse,
                        temperature=0.1
                    )
                )

                result = json.loads(response.text)
                result["verification_source"] = "gemini"
                logger.info(f"Gemini evaluation finished successfully on attempt {attempt + 1}. Same Issue: {result.get('same_issue')}, Confidence: {result.get('confidence')}%")
                return result

            except Exception as e:
                logger.warning(f"Gemini verification failed on attempt {attempt + 1} with error: {type(e).__name__}: {str(e)}")
                if attempt == max_retries - 1:
                    logger.error("All Gemini API attempts failed. Falling back to local unique classification.")
                    return {
                        "same_issue": False,
                        "confidence": 0,
                        "verification_source": "fallback",
                        "reason": f"Gemini verification failed after {max_retries} attempts: {str(e)}"
                    }
                time.sleep(backoff_factor ** attempt)
