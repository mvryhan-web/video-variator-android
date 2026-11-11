"""
Summarizer Tool - For agent use in content summarization
Provides various summarization strategies
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
import re
from collections import Counter
import math

logger = logging.getLogger(__name__)

@dataclass
class SummaryResult:
    summary: str
    key_points: List[str]
    confidence: float
    method: str
    metadata: Dict[str, Any]

class Summarizer:
    def __init__(self):
        self.stop_words = {
            'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
            'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
            'to', 'was', 'will', 'with', 'i', 'you', 'we', 'they', 'this',
            'that', 'those', 'these', 'or', 'but', 'not', 'can', 'could',
            'would', 'should', 'may', 'might', 'must', 'shall'
        }
    
    async def summarize(self, content: str, summary_type: str = "extractive", 
                       max_length: int = 500, language: str = "english") -> SummaryResult:
        """
        Summarize content using the specified method
        """
        try:
            logger.info(f"Summarizing content using {summary_type} method")
            
            # Clean content
            cleaned_content = self._clean_content(content)
            
            if not cleaned_content:
                return SummaryResult(
                    summary="No content to summarize",
                    key_points=[],
                    confidence=0.0,
                    method=summary_type,
                    metadata={"error": "Empty content"}
                )
            
            # Choose summarization method
            if summary_type == "extractive":
                result = await self._extractive_summary(cleaned_content, max_length)
            elif summary_type == "abstractive":
                result = await self._abstractive_summary(cleaned_content, max_length)
            elif summary_type == "bullet_points":
                result = await self._bullet_point_summary(cleaned_content, max_length)
            else:
                # Default to extractive
                result = await self._extractive_summary(cleaned_content, max_length)
            
            return result
            
        except Exception as e:
            logger.error(f"Summarization failed: {e}")
            return SummaryResult(
                summary="Summarization failed",
                key_points=[],
                confidence=0.0,
                method=summary_type,
                metadata={"error": str(e)}
            )
    
    async def _extractive_summary(self, content: str, max_length: int) -> SummaryResult:
        """
        Extractive summarization - select important sentences
        """
        try:
            # Split into sentences
            sentences = self._split_sentences(content)
            
            if len(sentences) <= 3:
                # Content is already short
                summary = ' '.join(sentences)
                key_points = sentences
                confidence = 0.9
            else:
                # Score sentences
                sentence_scores = self._score_sentences(sentences)
                
                # Select top sentences
                num_sentences = min(len(sentences), max(3, math.ceil(max_length / 100)))
                top_sentences = sorted(
                    sentence_scores.items(), 
                    key=lambda x: x[1], 
                    reverse=True
                )[:num_sentences]
                
                # Maintain original order
                selected_sentences = []
                for sentence in sentences:
                    if sentence in [score for score, _ in top_sentences]:
                        selected_sentences.append(sentence)
                
                summary = ' '.join(selected_sentences)
                key_points = selected_sentences
                confidence = min(0.8, len(selected_sentences) / len(sentences))
            
            # Trim to max length
            if len(summary) > max_length:
                summary = summary[:max_length].rsplit(' ', 1)[0] + "..."
            
            return SummaryResult(
                summary=summary,
                key_points=key_points,
                confidence=confidence,
                method="extractive",
                metadata={
                    "original_length": len(content),
                    "summary_length": len(summary),
                    "compression_ratio": len(summary) / len(content),
                    "sentence_count": len(sentences)
                }
            )
            
        except Exception as e:
            logger.error(f"Extractive summarization failed: {e}")
            raise
    
    async def _abstractive_summary(self, content: str, max_length: int) -> SummaryResult:
        """
        Abstractive summarization - generate new summary sentences
        """
        try:
            # For now, implement a simplified abstractive approach
            # In a full implementation, this would use an LLM
            
            # Extract key phrases and concepts
            key_phrases = self._extract_key_phrases(content)
            
            # Generate summary based on key phrases
            summary_sentences = []
            
            for phrase in key_phrases[:5]:  # Top 5 key phrases
                # Find sentences containing this phrase
                sentences = self._split_sentences(content)
                relevant_sentences = [
                    s for s in sentences 
                    if phrase.lower() in s.lower() and len(s) > 20
                ]
                
                if relevant_sentences:
                    # Take the most relevant sentence
                    summary_sentences.append(relevant_sentences[0])
            
            # Combine and clean
            summary = ' '.join(summary_sentences)
            
            # Trim to max length
            if len(summary) > max_length:
                summary = summary[:max_length].rsplit(' ', 1)[0] + "..."
            
            return SummaryResult(
                summary=summary,
                key_points=summary_sentences,
                confidence=0.6,  # Lower confidence for abstractive
                method="abstractive",
                metadata={
                    "key_phrases": key_phrases,
                    "original_length": len(content),
                    "summary_length": len(summary)
                }
            )
            
        except Exception as e:
            logger.error(f"Abstractive summarization failed: {e}")
            # Fallback to extractive
            return await self._extractive_summary(content, max_length)
    
    async def _bullet_point_summary(self, content: str, max_length: int) -> SummaryResult:
        """
        Bullet point summarization
        """
        try:
            # Extract key points
            key_points = await self._extract_key_points(content)
            
            # Create bullet point summary
            bullet_points = []
            for point in key_points[:7]:  # Limit to 7 points
                bullet_point = f"• {point}"
                bullet_points.append(bullet_point)
            
            summary = '\n'.join(bullet_points)
            
            # Trim to max length
            while len(summary) > max_length and bullet_points:
                bullet_points.pop()
                summary = '\n'.join(bullet_points)
            
            return SummaryResult(
                summary=summary,
                key_points=key_points,
                confidence=0.7,
                method="bullet_points",
                metadata={
                    "point_count": len(bullet_points),
                    "original_length": len(content),
                    "summary_length": len(summary)
                }
            )
            
        except Exception as e:
            logger.error(f"Bullet point summarization failed: {e}")
            raise
    
    def _clean_content(self, content: str) -> str:
        """
        Clean and normalize content
        """
        # Remove extra whitespace
        content = re.sub(r'\s+', ' ', content)
        
        # Remove special characters but keep punctuation
        content = re.sub(r'[^\w\s.,!?;:()-]', '', content)
        
        # Remove extra spaces around punctuation
        content = re.sub(r'\s+([.,!?;:])', r'\1', content)
        
        return content.strip()
    
    def _split_sentences(self, content: str) -> List[str]:
        """
        Split content into sentences
        """
        # Simple sentence splitting
        sentences = re.split(r'[.!?]+', content)
        sentences = [s.strip() for s in sentences if s.strip() and len(s) > 10]
        return sentences
    
    def _score_sentences(self, sentences: List[str]) -> Dict[str, float]:
        """
        Score sentences based on importance
        """
        scores = {}
        
        # Calculate word frequencies
        all_words = []
        for sentence in sentences:
            words = self._extract_words(sentence)
            all_words.extend(words)
        
        word_freq = Counter(all_words)
        
        # Score each sentence
        for sentence in sentences:
            words = self._extract_words(sentence)
            score = 0
            
            for word in words:
                # Higher score for frequent words (but not stop words)
                if word not in self.stop_words:
                    score += word_freq.get(word, 0)
            
            # Bonus for longer sentences (within reason)
            if 10 <= len(words) <= 25:
                score *= 1.2
            
            # Bonus for sentences with numbers
            if re.search(r'\d', sentence):
                score *= 1.1
            
            scores[sentence] = score
        
        return scores
    
    def _extract_words(self, sentence: str) -> List[str]:
        """
        Extract words from sentence
        """
        words = re.findall(r'\b\w+\b', sentence.lower())
        return [word for word in words if word not in self.stop_words and len(word) > 2]
    
    def _extract_key_phrases(self, content: str) -> List[str]:
        """
        Extract key phrases from content
        """
        # Simple key phrase extraction (noun phrases)
        phrases = []
        
        # Look for common patterns
        patterns = [
            r'\b(?:the|a|an)\s+([a-z]+\s+[a-z]+)\b',  # Articles + two words
            r'\b([a-z]+\s+of\s+[a-z]+)\b',  # X of Y
            r'\b([a-z]+\s+and\s+[a-z]+)\b',  # X and Y
            r'\b([a-z]+\s+[a-z]+\s+[a-z]+)\b'  # Three words
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            phrases.extend(matches)
        
        # Count frequency and return top phrases
        phrase_freq = Counter(phrases)
        return [phrase for phrase, count in phrase_freq.most_common(10)]
    
    async def _extract_key_points(self, content: str) -> List[str]:
        """
        Extract key points from content
        """
        sentences = self._split_sentences(content)
        sentence_scores = self._score_sentences(sentences)
        
        # Get top sentences as key points
        top_sentences = sorted(
            sentence_scores.items(), 
            key=lambda x: x[1], 
            reverse=True
        )
        
        return [sentence for sentence, score in top_sentences[:10]]
    
    async def compare_summaries(self, summaries: List[SummaryResult]) -> Dict[str, Any]:
        """
        Compare multiple summaries
        """
        try:
            comparison = {
                "methods": [s.method for s in summaries],
                "lengths": [len(s.summary) for s in summaries],
                "confidences": [s.confidence for s in summaries],
                "compression_ratios": [s.metadata.get("compression_ratio", 0) for s in summaries]
            }
            
            # Find best summary based on confidence and length
            best_score = 0
            best_summary = None
            
            for summary in summaries:
                score = summary.confidence * (1 - abs(len(summary.summary) - 200) / 1000)
                if score > best_score:
                    best_score = score
                    best_summary = summary
            
            comparison["best_summary"] = best_summary.method if best_summary else None
            comparison["best_score"] = best_score
            
            return comparison
            
        except Exception as e:
            logger.error(f"Summary comparison failed: {e}")
            return {"error": str(e)}
