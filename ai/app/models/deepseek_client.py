import os
import json
import re
import logging
from typing import Optional, Tuple, List
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
logger = logging.getLogger(__name__)

class DeepSeekClient:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        """Initialize DeepSeek client with API key from environment"""
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        
        if not self.api_key:
            logger.error("❌ No DeepSeek API key found. Set DEEPSEEK_API_KEY in .env")
            self.client = None
            return
        
        try:
            self.client = OpenAI(
                api_key=self.api_key,
                base_url="https://api.deepseek.com"
            )
            logger.info(f"✅ DeepSeek client initialized with key: {self.api_key[:8]}...")
            
            # Test the connection quickly
            self._test_connection()
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize DeepSeek client: {str(e)}")
            self.client = None

    def _test_connection(self):
        """Test if the API key works"""
        try:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[{"role": "user", "content": "test"}],
                max_tokens=5
            )
            logger.info("✅ DeepSeek connection test passed")
        except Exception as e:
            logger.warning(f"⚠️ DeepSeek connection test failed: {str(e)}")

    def generate(self, prompt: str, max_retries: int = 3, temperature: float = 0.3) -> str:
        """
        Generate content using DeepSeek API with retry logic
        
        Args:
            prompt: The user prompt to send
            max_retries: Number of retries on failure
            temperature: Controls randomness (0-1, lower = more deterministic)
        
        Returns:
            Generated text response
        """
        if not self.client:
            raise RuntimeError("DeepSeek client not initialized. Check API key.")
        
        for attempt in range(max_retries):
            try:
                response = self.client.chat.completions.create(
                    model="deepseek-chat",
                    messages=[
                        {"role": "system", "content": "You are a helpful academic assistant. Always respond with valid JSON when requested."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=temperature,
                    max_tokens=1000
                )
                return response.choices[0].message.content
                
            except Exception as e:
                logger.warning(f"Attempt {attempt + 1}/{max_retries} failed: {str(e)}")
                if attempt == max_retries - 1:
                    raise RuntimeError(f"DeepSeek generation failed after {max_retries} attempts: {str(e)}")
        
        raise RuntimeError("Max retries exceeded")

    def generate_json(self, prompt: str, max_retries: int = 3) -> dict:
        """
        Generate and parse JSON response from DeepSeek
        
        Args:
            prompt: The user prompt that requests JSON output
            max_retries: Number of retries on failure
        
        Returns:
            Parsed JSON dictionary
        """
        # Add instruction to return only JSON
        json_prompt = f"{prompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no extra text, no code blocks."
        
        for attempt in range(max_retries):
            try:
                raw = self.generate(json_prompt, temperature=0.1)
                
                # Extract JSON from response
                json_match = re.search(r'\{.*\}', raw, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
                else:
                    logger.warning(f"Attempt {attempt + 1}: No JSON found in response: {raw[:100]}")
                    
            except json.JSONDecodeError as e:
                logger.warning(f"Attempt {attempt + 1}: JSON parse error: {str(e)}")
            except Exception as e:
                logger.warning(f"Attempt {attempt + 1}: {str(e)}")
        
        # Return default on all failures
        return {}

# Global singleton instance
deepseek_client = DeepSeekClient()