"""
Text Processor Tool - For agent use in text processing and analysis
Provides various text processing capabilities
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
import re
from collections import Counter, defaultdict
import string

logger = logging.getLogger(__name__)

@dataclass
class TextAnalysis:
    word_count: int
    sentence_count: int
    paragraph_count: int
    readability_score: float
    sentiment: str
    key_topics: List[str]
    language: str

class TextProcessor:
    def __init__(self):
        self.stop_words = {
            'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
            'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
            'to', 'was', 'will', 'with', 'i', 'you', 'we', 'they', 'this',
            'that', 'those', 'these', 'or', 'but', 'not', 'can', 'could',
            'would', 'should', 'may', 'might', 'must', 'shall'
        }
        
        # Simple sentiment words
        self.positive_words = {
            'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
            'positive', 'best', 'better', 'love', 'like', 'enjoy', 'happy',
            'pleased', 'satisfied', 'successful', 'win', 'achieve', 'benefit'
        }
        
        self.negative_words = {
            'bad', 'terrible', 'awful', 'horrible', 'worst', 'poor', 'negative',
            'hate', 'dislike', 'unhappy', 'sad', 'angry', 'frustrated', 'fail',
            'failure', 'problem', 'issue', 'difficult', 'hard', 'wrong', 'error'
        }
    
    async def analyze_text(self, text: str) -> TextAnalysis:
        """
        Comprehensive text analysis
        """
        try:
            logger.info("Analyzing text content")
            
            # Basic statistics
            word_count = len(self._extract_words(text))
            sentence_count = len(self._split_sentences(text))
            paragraph_count = len(self._split_paragraphs(text))
            
            # Readability score (simplified Flesch-Kincaid)
            readability_score = self._calculate_readability(text)
            
            # Sentiment analysis
            sentiment = self._analyze_sentiment(text)
            
            # Key topics
            key_topics = self._extract_key_topics(text)
            
            # Language detection (simple)
            language = self._detect_language(text)
            
            return TextAnalysis(
                word_count=word_count,
                sentence_count=sentence_count,
                paragraph_count=paragraph_count,
                readability_score=readability_score,
                sentiment=sentiment,
                key_topics=key_topics,
                language=language
            )
            
        except Exception as e:
            logger.error(f"Text analysis failed: {e}")
            raise
    
    async def process_text(self, text: str, operations: List[str]) -> Dict[str, Any]:
        """
        Apply multiple text processing operations
        """
        try:
            results = {}
            processed_text = text
            
            for operation in operations:
                if operation == "clean":
                    processed_text = self._clean_text(processed_text)
                    results["cleaned"] = processed_text
                
                elif operation == "normalize":
                    processed_text = self._normalize_text(processed_text)
                    results["normalized"] = processed_text
                
                elif operation == "extract_entities":
                    entities = self._extract_entities(processed_text)
                    results["entities"] = entities
                
                elif operation == "extract_numbers":
                    numbers = self._extract_numbers(processed_text)
                    results["numbers"] = numbers
                
                elif operation == "extract_dates":
                    dates = self._extract_dates(processed_text)
                    results["dates"] = dates
                
                elif operation == "extract_emails":
                    emails = self._extract_emails(processed_text)
                    results["emails"] = emails
                
                elif operation == "extract_urls":
                    urls = self._extract_urls(processed_text)
                    results["urls"] = urls
                
                elif operation == "tokenize":
                    tokens = self._tokenize(processed_text)
                    results["tokens"] = tokens
                
                elif operation == "stem":
                    tokens = self._tokenize(processed_text)
                    stemmed = [self._stem_word(word) for word in tokens]
                    results["stemmed"] = stemmed
                
                elif operation == "remove_stopwords":
                    tokens = self._tokenize(processed_text)
                    filtered = [word for word in tokens if word not in self.stop_words]
                    results["filtered"] = filtered
            
            return results
            
        except Exception as e:
            logger.error(f"Text processing failed: {e}")
            return {"error": str(e)}
    
    async def compare_texts(self, text1: str, text2: str) -> Dict[str, Any]:
        """
        Compare two texts
        """
        try:
            # Analyze both texts
            analysis1 = await self.analyze_text(text1)
            analysis2 = await self.analyze_text(text2)
            
            # Calculate similarities
            words1 = set(self._extract_words(text1.lower()))
            words2 = set(self._extract_words(text2.lower()))
            
            common_words = words1.intersection(words2)
            jaccard_similarity = len(common_words) / len(words1.union(words2))
            
            # Topic similarity
            topics1 = set(analysis1.key_topics)
            topics2 = set(analysis2.key_topics)
            topic_similarity = len(topics1.intersection(topics2)) / len(topics1.union(topics2))
            
            return {
                "text1_analysis": analysis1,
                "text2_analysis": analysis2,
                "jaccard_similarity": jaccard_similarity,
                "topic_similarity": topic_similarity,
                "common_words": list(common_words)[:20],  # Top 20 common words
                "length_difference": abs(len(text1) - len(text2)),
                "word_count_difference": abs(analysis1.word_count - analysis2.word_count)
            }
            
        except Exception as e:
            logger.error(f"Text comparison failed: {e}")
            return {"error": str(e)}
    
    def _extract_words(self, text: str) -> List[str]:
        """
        Extract words from text
        """
        words = re.findall(r'\b\w+\b', text.lower())
        return [word for word in words if word not in string.punctuation]
    
    def _split_sentences(self, text: str) -> List[str]:
        """
        Split text into sentences
        """
        sentences = re.split(r'[.!?]+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def _split_paragraphs(self, text: str) -> List[str]:
        """
        Split text into paragraphs
        """
        paragraphs = re.split(r'\n\s*\n', text)
        return [p.strip() for p in paragraphs if p.strip()]
    
    def _calculate_readability(self, text: str) -> float:
        """
        Calculate readability score (simplified Flesch-Kincaid)
        """
        sentences = self._split_sentences(text)
        words = self._extract_words(text)
        
        if not sentences or not words:
            return 0.0
        
        # Average sentence length
        avg_sentence_length = len(words) / len(sentences)
        
        # Count syllables (simplified - count vowel groups)
        def count_syllables(word):
            vowels = "aeiouy"
            syllable_count = 0
            prev_was_vowel = False
            
            for char in word.lower():
                if char in vowels:
                    if not prev_was_vowel:
                        syllable_count += 1
                    prev_was_vowel = True
                else:
                    prev_was_vowel = False
            
            return max(1, syllable_count)
        
        total_syllables = sum(count_syllables(word) for word in words)
        avg_syllables_per_word = total_syllables / len(words)
        
        # Flesch reading ease score
        score = 206.835 - (1.015 * avg_sentence_length) - (84.6 * avg_syllables_per_word)
        
        return max(0, min(100, score))
    
    def _analyze_sentiment(self, text: str) -> str:
        """
        Simple sentiment analysis
        """
        words = self._extract_words(text.lower())
        
        positive_count = sum(1 for word in words if word in self.positive_words)
        negative_count = sum(1 for word in words if word in self.negative_words)
        
        if positive_count > negative_count * 1.5:
            return "positive"
        elif negative_count > positive_count * 1.5:
            return "negative"
        else:
            return "neutral"
    
    def _extract_key_topics(self, text: str, max_topics: int = 10) -> List[str]:
        """
        Extract key topics from text
        """
        # Extract noun phrases and important terms
        words = self._extract_words(text.lower())
        filtered_words = [word for word in words if word not in self.stop_words and len(word) > 3]
        
        # Count word frequency
        word_freq = Counter(filtered_words)
        
        # Return most common words as topics
        return [word for word, count in word_freq.most_common(max_topics)]
    
    def _detect_language(self, text: str) -> str:
        """
        Simple language detection based on common words
        """
        # Very basic language detection
        common_english_words = {'the', 'and', 'is', 'to', 'of', 'in', 'that', 'have', 'it', 'for'}
        words = set(self._extract_words(text.lower()))
        
        english_overlap = len(words.intersection(common_english_words))
        
        if english_overlap > 3:
            return "english"
        else:
            return "unknown"
    
    def _clean_text(self, text: str) -> str:
        """
        Clean text by removing extra whitespace and special characters
        """
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s.,!?;:()-]', '', text)
        
        return text.strip()
    
    def _normalize_text(self, text: str) -> str:
        """
        Normalize text (lowercase, remove extra spaces)
        """
        text = text.lower()
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    def _extract_entities(self, text: str) -> Dict[str, List[str]]:
        """
        Extract named entities (simplified)
        """
        entities = {
            "emails": self._extract_emails(text),
            "urls": self._extract_urls(text),
            "dates": self._extract_dates(text),
            "numbers": self._extract_numbers(text),
            "phone_numbers": self._extract_phone_numbers(text)
        }
        
        return {k: v for k, v in entities.items() if v}
    
    def _extract_emails(self, text: str) -> List[str]:
        """
        Extract email addresses
        """
        pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        return re.findall(pattern, text)
    
    def _extract_urls(self, text: str) -> List[str]:
        """
        Extract URLs
        """
        pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
        return re.findall(pattern, text)
    
    def _extract_dates(self, text: str) -> List[str]:
        """
        Extract dates
        """
        patterns = [
            r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',
            r'\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b',
            r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b'
        ]
        
        dates = []
        for pattern in patterns:
            dates.extend(re.findall(pattern, text, re.IGNORECASE))
        
        return dates
    
    def _extract_numbers(self, text: str) -> List[str]:
        """
        Extract numbers with context
        """
        pattern = r'\b\d+(?:,\d{3})*(?:\.\d+)?\s*(?:%|percent|million|billion|thousand|USD|EUR|GBP|\$|€|£)?\b'
        return re.findall(pattern, text, re.IGNORECASE)
    
    def _extract_phone_numbers(self, text: str) -> List[str]:
        """
        Extract phone numbers
        """
        patterns = [
            r'\b\d{3}-\d{3}-\d{4}\b',
            r'\b\(\d{3}\)\s*\d{3}-\d{4}\b',
            r'\b\d{3}\.\d{3}\.\d{4}\b'
        ]
        
        phones = []
        for pattern in patterns:
            phones.extend(re.findall(pattern, text))
        
        return phones
    
    def _tokenize(self, text: str) -> List[str]:
        """
        Tokenize text
        """
        return self._extract_words(text)
    
    def _stem_word(self, word: str) -> str:
        """
        Simple stemming (Porter stemmer approximation)
        """
        word = word.lower()
        
        # Simple stemming rules
        if word.endswith('ing'):
            return word[:-3]
        elif word.endswith('ed'):
            return word[:-2]
        elif word.endswith('ly'):
            return word[:-2]
        elif word.endswith('tion'):
            return word[:-4]
        elif word.endswith('ness'):
            return word[:-4]
        
        return word
