import json
import logging
import re
from typing import Any, List

from fastapi import HTTPException
from google import genai

from .config import GOOGLE_API_KEY, LLM_MODEL

logger = logging.getLogger(__name__)

llm_client = genai.Client(api_key=GOOGLE_API_KEY)


def generate_questions(part_content: str, part_title: str) -> List[dict[str, Any]]:
    logger.info("Generating questions for part: %s", part_title)
    prompt = (
        f"Generate 10 multiple-choice questions based on the following content from the section '{part_title}'. "
        "The questions should be of varying difficulty: 3 easy, 5 medium, and 2 hard. "
        "Each question must have 4 options, with exactly one correct answer. "
        "The options should be plausible but not obvious, and the correct option should be randomly positioned (not following any pattern like always B or A/C). "
        "Output in JSON format only as an array of objects:\n\n"
        "[\n"
        "  {\n"
        '    "question": "string",\n'
        '    "options": ["option1", "option2", "option3", "option4"],\n'
        '    "correct_index": 0-3,\n'
        '    "difficulty": "easy"|"medium"|"hard"\n'
        "  },\n"
        "  ...\n"
        "]\n\n"
        f"CONTENT:\n{part_content}"
    )
    llm_models = [LLM_MODEL, "models/gemini-2.5-pro", "models/gemini-2.5-flash"]

    llm_response = None
    last_exc: Exception | None = None
    for model_name in llm_models:
        logger.info("Trying LLM model for questions: %s", model_name)
        try:
            llm_response = llm_client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            logger.info("Successfully generated questions with model: %s", model_name)
            break
        except Exception as exc:
            logger.warning("Failed with model %s for questions: %s", model_name, exc)
            last_exc = exc

    if llm_response is None:
        logger.error("All LLM models failed for questions")
        return []

    response_text = llm_response.text if hasattr(llm_response, "text") else ""
    logger.info("Received questions response, length: %d", len(response_text))
    
    # Extract JSON from markdown code blocks if present
    json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
    if json_match:
        json_str = json_match.group(1)
    else:
        json_str = response_text
    
    try:
        questions = json.loads(json_str)
        logger.info("Successfully parsed %d questions", len(questions))
        return questions
    except json.JSONDecodeError as e:
        logger.warning("Failed to parse questions JSON: %s", e)
        return []
