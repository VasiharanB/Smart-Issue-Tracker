import os
import json
import logging
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
import google.generativeai as genai
from django.conf import settings
from google.api_core.exceptions import ResourceExhausted, GoogleAPIError

logger = logging.getLogger(__name__)

class GeminiVerificationResponse(BaseModel):
    """
    Pydantic schema enforcing structured model outputs from the Gemini model.
    """
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
    """
    Service wrapper for the Gemini model to analyze support ticket payloads 
    and output structured duplicate confirmations.
    """
    def __init__(self):
        # Read API key from Django configuration settings, falling back to standard OS environment keys
        self.api_key = getattr(settings, "GEMINI_API_KEY", os.environ.get("GEMINI_API_KEY"))
        if not self.api_key:
            logger.warning(
                "GEMINI_API_KEY is not configured in settings or environment. "
                "API requests to Gemini will fail unless auth is handled implicitly."
            )
        
        genai.configure(api_key=self.api_key)
        # Default to stable 1.5/2.0 Flash recommended for text processing Tasks
        self.model_name = getattr(settings, "GEMINI_MODEL_NAME", "gemini-1.5-flash")

    def verify(self, new_ticket: Dict[str, Any], existing_ticket: Dict[str, Any]) -> Dict[str, Any]:
        """
        Submits support tickets metadata to Gemini for structured comparison.
        Implements 3 retries with exponential backoff and a 10-second timeout.
        
        Args:
            new_ticket (Dict[str, Any]): Dictionary containing category, subject, and description.
            existing_ticket (Dict[str, Any]): Dictionary containing category, subject, and description.
            
        Returns:
            Dict[str, Any]: Dict matching the json model: same_issue, confidence, reason, verification_source.
        """
        # Formulate instructions for the model
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
                model = genai.GenerativeModel(self.model_name)
                
                # Use generation config to enforce JSON structures matching Pydantic response schema
                # Pass timeout options (10 seconds) in request_options
                response = model.generate_content(
                    prompt,
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json",
                        response_schema=GeminiVerificationResponse,
                        temperature=0.1  # Low temperature for deterministic evaluation
                    ),
                    request_options={"timeout": 10.0}
                )
                
                # Load and parse text returned from model into clean dict structures
                result = json.loads(response.text)
                result["verification_source"] = "gemini"
                logger.info(f"Gemini evaluation finished successfully on attempt {attempt + 1}. Same Issue: {result.get('same_issue')}, Confidence: {result.get('confidence')}%")
                return result
                
            except (ResourceExhausted, GoogleAPIError, Exception) as e:
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
