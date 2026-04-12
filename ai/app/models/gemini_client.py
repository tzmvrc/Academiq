# app/models/gemini_client.py

import os
import time
import logging
from typing import List, Tuple, Optional
from dotenv import load_dotenv
from google import genai
from google.genai.errors import ClientError

load_dotenv()
logger = logging.getLogger(__name__)

class GeminiClient:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        # Load API keys from environment (GEMINI_API_KEY1..KEY10)
        self.keys = []
        i = 1
        while True:
            key = os.getenv(f"GEMINI_API_KEY{i}")
            if not key:
                break
            self.keys.append(key.strip())
            logger.info(f"📌 Loaded GEMINI_API_KEY{i}: {key[:8]}... (length {len(key)})")
            i += 1

        if not self.keys:
            logger.error("❌ No Gemini API keys found. Set GEMINI_API_KEY1..KEY10")
            self.working_pairs = []
            return

        logger.info(f"✅ Total {len(self.keys)} API keys loaded.")
        # Candidate models in order of preference (newest first)
        self.candidate_models = [
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemini-1.5-flash",
            "gemini-pro",
        ]
        logger.info(f"📋 Candidate models: {self.candidate_models}")
        self.working_pairs = []  # List of (client, model_name)
        self.current_index = 0
        self._refresh_working_pairs()

    def _refresh_working_pairs(self, force: bool = False) -> None:
        """Test all keys and models, rebuild working_pairs list."""
        if self.working_pairs and not force:
            logger.debug("Working pairs already exist and force=False; skipping refresh.")
            return
        logger.info("🔄 Refreshing working pairs (testing keys & models)...")
        new_pairs = []
        for key_idx, key in enumerate(self.keys, start=1):
            logger.info(f"🔑 Testing key #{key_idx}: {key[:8]}...")
            for model in self.candidate_models:
                try:
                    client = genai.Client(api_key=key, http_options={"timeout": 5})
                    # Quick test – generate a trivial response
                    client.models.generate_content(model=model, contents="test")
                    new_pairs.append((client, model))
                    logger.info(f"✅ Key {key[:8]}... works with model {model}")
                    break  # Use first working model per key
                except ClientError as e:
                    err = str(e)
                    if "404" in err or "not found" in err.lower():
                        logger.warning(f"⚠️ Key {key[:8]}... model {model} not available (404)")
                    elif "429" in err or "quota" in err.lower():
                        logger.warning(f"⚠️ Key {key[:8]}... model {model} quota exceeded (429)")
                    else:
                        logger.warning(f"⚠️ Key {key[:8]}... model {model} ClientError: {err[:100]}")
                    continue
                except Exception as e:
                    logger.warning(f"⚠️ Key {key[:8]}... model {model} unexpected error: {str(e)[:100]}")
                    continue
            else:
                logger.error(f"❌ Key {key[:8]}... failed with all candidate models.")
        if not new_pairs:
            logger.error("❌ No working key+model pairs found after full scan.")
        else:
            logger.info(f"✅ Found {len(new_pairs)} working key+model pairs.")
            for idx, (client, model) in enumerate(new_pairs):
                logger.info(f"   Pair {idx+1}: key {client.api_key[:8]}... model {model}")
        self.working_pairs = new_pairs
        if self.working_pairs:
            self.current_index = 0
            self._set_current_pair(0)

    def _set_current_pair(self, idx: int) -> None:
        self.current_index = idx
        self.current_client, self.current_model = self.working_pairs[idx]
        logger.info(f"🔧 Current working pair set to key {self.current_client.api_key[:8]}... model {self.current_model}")

    def _rotate(self) -> bool:
        """Switch to next working pair in the list. Returns True if rotated."""
        if not self.working_pairs or len(self.working_pairs) < 2:
            return False
        new_idx = (self.current_index + 1) % len(self.working_pairs)
        if new_idx == self.current_index:
            return False
        self._set_current_pair(new_idx)
        logger.info(f"🔄 Rotated to key {self.current_client.api_key[:8]}... model {self.current_model}")
        return True

    def _find_working_pair_on_the_fly(self) -> Tuple[Optional[genai.Client], Optional[str]]:
        """Fallback: try all keys and models until one works (called when no pre‑cached pairs)."""
        logger.info("🔍 Attempting on‑the‑fly discovery of working key+model...")
        for key_idx, key in enumerate(self.keys, start=1):
            for model in self.candidate_models:
                try:
                    client = genai.Client(api_key=key, http_options={"timeout": 10})
                    client.models.generate_content(model=model, contents="test")
                    logger.info(f"✅ On‑the‑fly found key {key[:8]}... with model {model}")
                    return client, model
                except Exception:
                    continue
        logger.error("❌ On‑the‑fly discovery failed: no working pair found.")
        return None, None

    def generate(self, prompt: str, max_retries: int = 3) -> str:
        """
        Generate content using the first working key/model, with automatic rotation
        on quota/errors. If all cached pairs fail, it will attempt on‑the‑fly discovery.
        """
        # If no working pairs cached, try to refresh (in case keys were added later)
        if not self.working_pairs:
            logger.warning("No working pairs cached; attempting refresh.")
            self._refresh_working_pairs()
            if not self.working_pairs:
                # Still none – try on‑the‑fly
                client, model = self._find_working_pair_on_the_fly()
                if not client:
                    raise RuntimeError("No working Gemini key/model found at all.")
                # Cache this pair for future requests
                self.working_pairs = [(client, model)]
                self.current_index = 0
                self._set_current_pair(0)

        # Use cached pairs with rotation
        for attempt in range(max_retries):
            logger.debug(f"Generation attempt {attempt+1}/{max_retries} using key {self.current_client.api_key[:8]}... model {self.current_model}")
            try:
                response = self.current_client.models.generate_content(
                    model=self.current_model,
                    contents=prompt
                )
                return response.text
            except ClientError as e:
                error_str = str(e)
                # Quota exceeded → rotate
                if "429" in error_str or "quota" in error_str.lower():
                    logger.warning(f"⚠️ Quota exceeded on {self.current_client.api_key[:8]}/{self.current_model}")
                    if self._rotate():
                        continue
                    else:
                        # All cached pairs exhausted – try to refresh
                        logger.warning("All cached pairs exhausted, refreshing working pairs...")
                        self._refresh_working_pairs(force=True)
                        if not self.working_pairs:
                            # Fallback to on‑the‑fly
                            client, model = self._find_working_pair_on_the_fly()
                            if client:
                                self.working_pairs = [(client, model)]
                                self._set_current_pair(0)
                                continue
                            else:
                                raise RuntimeError("No working Gemini key/model found (quota/all failed).")
                        continue
                # Other errors (e.g., 404, invalid model) – try to rotate or refresh
                else:
                    logger.warning(f"⚠️ Error on {self.current_client.api_key[:8]}/{self.current_model}: {error_str[:100]}")
                    if self._rotate():
                        continue
                    else:
                        # Try to refresh the whole list (maybe a new model became available)
                        logger.warning("Rotation failed, attempting full refresh of working pairs.")
                        self._refresh_working_pairs(force=True)
                        if self.working_pairs:
                            continue
                        else:
                            # Last resort: on‑the‑fly
                            client, model = self._find_working_pair_on_the_fly()
                            if client:
                                self.working_pairs = [(client, model)]
                                self._set_current_pair(0)
                                continue
                            else:
                                raise RuntimeError(f"All pairs failed. Last error: {error_str[:200]}")
            except Exception as e:
                logger.error(f"Unexpected error during generation: {str(e)}")
                if self._rotate():
                    continue
                else:
                    raise RuntimeError(f"Generation failed after retries: {str(e)}")
        raise RuntimeError("Max retries exceeded")

# Global singleton instance
gemini_client = GeminiClient()