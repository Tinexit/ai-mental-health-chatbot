from __future__ import annotations

import json
import os
import re
from typing import Any
from urllib import error as urllib_error
from urllib import request as urllib_request


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


class MentalHealthAIService:
    def __init__(self) -> None:
        self._loaded = False
        self._load_error: str | None = None
        self.intent_pipeline = None
        self.chat_model = None
        self.chat_tokenizer = None

    def load_models(self) -> None:
        if self._loaded:
            return

        self._loaded = True
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

            intent_model_path = _env("INTENT_MODEL_PATH")
            chat_model_path = _env("CHAT_MODEL_PATH")

            if intent_model_path:
                self.intent_pipeline = pipeline(
                    "text-classification",
                    model=intent_model_path,
                    tokenizer=intent_model_path,
                )

            if chat_model_path:
                self.chat_tokenizer = AutoTokenizer.from_pretrained(chat_model_path)
                self.chat_model = AutoModelForCausalLM.from_pretrained(chat_model_path)
                if self.chat_tokenizer.pad_token is None:
                    self.chat_tokenizer.pad_token = self.chat_tokenizer.eos_token
        except Exception as exc:  # pragma: no cover - optional dependency/runtime branch
            self._load_error = str(exc)
            self.intent_pipeline = None
            self.chat_model = None
            self.chat_tokenizer = None

    def _gemini_is_configured(self) -> bool:
        return bool(_env("GEMINI_API_KEY") and _env("GEMINI_MODEL", "gemini-2.5-flash"))

    def _extract_gemini_text(self, payload: dict[str, Any]) -> str:
        candidates = payload.get("candidates") or []
        for candidate in candidates:
            content = candidate.get("content") or {}
            parts = content.get("parts") or []
            text_parts = [str(part.get("text", "")).strip() for part in parts if part.get("text")]
            combined = "\n".join(part for part in text_parts if part).strip()
            if combined:
                return combined
        return ""

    def _clean_response(self, response: str) -> str:
        response = re.sub(r"\n{3,}", "\n\n", response).strip()
        response = re.sub(r"^(assistant|support):\s*", "", response, flags=re.IGNORECASE)
        return response

    def _build_system_instruction(self) -> str:
        return (
            "You are Serenity Mind, a warm and emotionally intelligent mental wellness companion. "
            "Write like a calm, caring human support coach. "
            "Respond naturally, with empathy, emotional validation, and practical support. "
            "Keep most replies between 70 and 160 words. "
            "Use short paragraphs instead of sounding scripted. "
            "Reflect something specific from the user's words before offering guidance. "
            "Offer one or two small, realistic next steps. "
            "End with one gentle follow-up question when helpful. "
            "Do not use generic disclaimers unless safety requires it. "
            "Do not diagnose, shame, or overwhelm. "
            "Stay focused on mental health, stress, mood, relationships, sleep, burnout, coping, and self-care."
        )

    def _generate_with_gemini(self, message: str, history: list[dict[str, str]]) -> str:
        if not self._gemini_is_configured():
            return ""

        contents: list[dict[str, Any]] = []
        for turn in history[-8:]:
            role = "user" if turn["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": turn["content"]}]})
        contents.append({"role": "user", "parts": [{"text": message}]})

        payload = {
            "system_instruction": {"parts": [{"text": self._build_system_instruction()}]},
            "contents": contents,
            "generationConfig": {
                "temperature": 0.9,
                "topP": 0.95,
                "topK": 40,
                "maxOutputTokens": 220,
            },
        }

        request = urllib_request.Request(
            url=f"https://generativelanguage.googleapis.com/v1beta/models/{_env('GEMINI_MODEL', 'gemini-2.5-flash')}:generateContent",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": _env("GEMINI_API_KEY"),
            },
            method="POST",
        )

        try:
            with urllib_request.urlopen(request, timeout=20) as response:
                raw = response.read().decode("utf-8")
        except urllib_error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            self._load_error = f"Gemini HTTP {exc.code}: {detail[:240]}"
            return ""
        except Exception as exc:  # pragma: no cover - network/runtime branch
            self._load_error = f"Gemini request failed: {exc}"
            return ""

        parsed = json.loads(raw)
        generated = self._extract_gemini_text(parsed)
        cleaned = self._clean_response(generated)
        if cleaned:
            self._load_error = None
        return cleaned

    def _is_off_topic_sync(self, message: str) -> bool:
        self.load_models()

        if self.intent_pipeline is not None:
            try:
                result = self.intent_pipeline(message, truncation=True)[0]
                label = str(result.get("label", "")).lower()
                score = float(result.get("score", 0.0))
                if "off" in label and score >= 0.5:
                    return True
                if "mental" in label:
                    return False
            except Exception:
                pass

        lower = message.lower()
        mental_keywords = [
            "stress",
            "anxiety",
            "panic",
            "sad",
            "depress",
            "therapy",
            "self-care",
            "self care",
            "mental",
            "well-being",
            "wellbeing",
            "sleep",
            "burnout",
            "relationship",
            "emotion",
            "mood",
            "lonely",
            "overwhelmed",
            "grief",
            "trauma",
        ]
        off_topic_keywords = [
            "code",
            "coding",
            "react",
            "javascript",
            "python",
            "bug",
            "debug",
            "finance",
            "bitcoin",
            "stocks",
            "investment",
            "sports",
            "match score",
            "election",
            "politics",
            "weapon",
            "violence",
            "war strategy",
        ]

        has_mental_keyword = any(keyword in lower for keyword in mental_keywords)
        has_off_topic_keyword = any(keyword in lower for keyword in off_topic_keywords)
        return has_off_topic_keyword and not has_mental_keyword

    def _generate_message_sync(self, message: str, history: list[dict[str, str]]) -> str:
        lower = message.lower()

        if re.search(r"suicide|kill myself|self harm|hurt myself|want to die", lower):
            return (
                "I am really sorry you are experiencing this. You deserve immediate human support right now. "
                "Please contact local emergency services or a crisis line immediately. If you are in the U.S. or Canada, call or text 988. "
                "If you can, also reach out to someone physically near you right away."
            )

        gemini_response = self._generate_with_gemini(message, history)
        if gemini_response:
            return gemini_response

        self.load_models()
        if self.chat_model is not None and self.chat_tokenizer is not None:
            try:
                prompt_parts = [
                    "You are a supportive mental health chatbot. Respond with empathy, practical grounding, and clear boundaries."
                ]
                for turn in history[-8:]:
                    role = "User" if turn["role"] == "user" else "Support"
                    prompt_parts.append(f"{role}: {turn['content']}")
                prompt_parts.append(f"User: {message}")
                prompt_parts.append("Support:")
                prompt = "\n".join(prompt_parts)

                inputs = self.chat_tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
                output = self.chat_model.generate(
                    **inputs,
                    max_new_tokens=90,
                    do_sample=True,
                    temperature=0.8,
                    top_p=0.92,
                    pad_token_id=self.chat_tokenizer.eos_token_id,
                )
                generated = self.chat_tokenizer.decode(
                    output[0][inputs["input_ids"].shape[-1] :],
                    skip_special_tokens=True,
                )
                cleaned = generated.replace("Support:", "").replace("User:", "").strip().split("\n")[0].strip()
                if cleaned:
                    return cleaned
            except Exception:
                pass

        if any(word in lower for word in ["anxiety", "anxious", "panic", "stress", "nervous"]):
            return (
                "That sounds exhausting, and it makes sense that your body feels on edge. "
                "For this moment, try softening your shoulders, taking one slow breath in for 4 and out for 6, "
                "and noticing three things around you. What feels like the biggest source of stress right now?"
            )
        if any(word in lower for word in ["sad", "depressed", "hopeless", "crying", "empty"]):
            return (
                "I am sorry this feels so heavy. When sadness starts piling up, it can help to make the next step very small, "
                "like drinking some water, sitting by a window, or messaging one safe person. "
                "Do you want to tell me what has been weighing on you the most?"
            )
        if any(word in lower for word in ["sleep", "insomnia", "tired", "exhausted"]):
            return (
                "Sleep struggles can make everything feel heavier than usual. A gentle reset can help a little: dim the lights, "
                "step away from your phone for a few minutes, and slow your breathing down. "
                "If you want, I can help you build a simple bedtime routine."
            )
        if any(word in lower for word in ["relationship", "partner", "friend", "family", "lonely", "alone"]):
            return (
                "Relationships can hit us deeply, especially when we already feel emotionally stretched. "
                "It may help to name what you need most right now: comfort, space, reassurance, or clarity. "
                "What happened that left you feeling this way?"
            )
        if any(word in lower for word in ["overwhelmed", "burnout", "too much", "can't cope", "cannot cope"]):
            return (
                "That sounds like too much to hold at once. Let us lower the pressure for a minute: "
                "what is one thing that truly has to happen today, and what is one thing that can wait? "
                "We can sort it out one step at a time."
            )
        return (
            "Thank you for telling me that. I am here with you, and we can take this one piece at a time. "
            "Can you tell me a little more about how this has been affecting your mood, stress level, or daily routine?"
        )

    async def is_off_topic(self, message: str) -> bool:
        import asyncio

        return await asyncio.to_thread(self._is_off_topic_sync, message)

    async def generate_message(self, message: str, history: list[dict[str, str]]) -> str:
        import asyncio

        return await asyncio.to_thread(self._generate_message_sync, message, history)
