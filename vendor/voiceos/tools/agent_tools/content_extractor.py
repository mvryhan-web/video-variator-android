"""
Content Extractor Tool - For agent use in extracting and processing content
Handles various content types and formats
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass
import re
import json

from bs4 import BeautifulSoup
import requests
from readability import Document

logger = logging.getLogger(__name__)

@dataclass
class ExtractedContent:
    title: str
    content: str
    metadata: Dict[str, Any]
    source_type: str
    extraction_method: str

class ContentExtractor:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'VoiceOS-Agent/1.0 (Content Extraction)'
        })
    
    async def extract_from_url(self, url: str, method: str = "auto") -> Optional[ExtractedContent]:
        """
        Extract content from a URL
        """
        try:
            logger.info(f"Extracting content from: {url}")
            
            # Fetch the page
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            html_content = response.text
            
            # Choose extraction method
            if method == "auto":
                method = self._choose_extraction_method(html_content)
            
            # Extract content based on method
            if method == "readability":
                return await self._extract_with_readability(html_content, url)
            elif method == "beautifulsoup":
                return await self._extract_with_beautifulsoup(html_content, url)
            else:
                # Fallback to simple extraction
                return await self._extract_simple(html_content, url)
                
        except Exception as e:
            logger.error(f"Failed to extract content from {url}: {e}")
            return None
    
    def _choose_extraction_method(self, html_content: str) -> str:
        """
        Choose the best extraction method for the content
        """
        # Check if it's a simple HTML page
        if len(html_content) < 50000:  # Small page
            return "beautifulsoup"
        
        # Check if it has good structure for readability
        if '<article' in html_content or '<main' in html_content:
            return "readability"
        
        # Default to readability for complex pages
        return "readability"
    
    async def _extract_with_readability(self, html_content: str, url: str) -> ExtractedContent:
        """
        Extract content using readability library
        """
        try:
            doc = Document(html_content)
            
            return ExtractedContent(
                title=doc.title(),
                content=doc.summary(),
                metadata={
                    "url": url,
                    "method": "readability",
                    "content_length": len(doc.summary())
                },
                source_type="web_page",
                extraction_method="readability"
            )
            
        except Exception as e:
            logger.warning(f"Readability extraction failed, falling back: {e}")
            return await self._extract_with_beautifulsoup(html_content, url)
    
    async def _extract_with_beautifulsoup(self, html_content: str, url: str) -> ExtractedContent:
        """
        Extract content using BeautifulSoup
        """
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Extract title
            title_tag = soup.find('title')
            title = title_tag.get_text().strip() if title_tag else "No title"
            
            # Remove unwanted elements
            for element in soup(['script', 'style', 'nav', 'footer', 'header', 'aside']):
                element.decompose()
            
            # Try to find main content
            main_content = None
            
            # Look for common content containers
            for selector in ['main', 'article', '[role="main"]', '.content', '.post-content']:
                element = soup.select_one(selector)
                if element:
                    main_content = element
                    break
            
            # Fallback to body
            if not main_content:
                main_content = soup.find('body')
            
            # Extract text
            if main_content:
                content = main_content.get_text()
            else:
                content = soup.get_text()
            
            # Clean up text
            content = self._clean_text(content)
            
            return ExtractedContent(
                title=title,
                content=content,
                metadata={
                    "url": url,
                    "method": "beautifulsoup",
                    "content_length": len(content)
                },
                source_type="web_page",
                extraction_method="beautifulsoup"
            )
            
        except Exception as e:
            logger.error(f"BeautifulSoup extraction failed: {e}")
            return await self._extract_simple(html_content, url)
    
    async def _extract_simple(self, html_content: str, url: str) -> ExtractedContent:
        """
        Simple text extraction fallback
        """
        try:
            # Simple regex-based extraction
            title_match = re.search(r'<title[^>]*>(.*?)</title>', html_content, re.IGNORECASE)
            title = title_match.group(1).strip() if title_match else "No title"
            
            # Remove HTML tags
            text_content = re.sub(r'<[^>]+>', ' ', html_content)
            text_content = self._clean_text(text_content)
            
            return ExtractedContent(
                title=title,
                content=text_content,
                metadata={
                    "url": url,
                    "method": "simple",
                    "content_length": len(text_content)
                },
                source_type="web_page",
                extraction_method="simple"
            )
            
        except Exception as e:
            logger.error(f"Simple extraction failed: {e}")
            raise
    
    def _clean_text(self, text: str) -> str:
        """
        Clean extracted text
        """
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove leading/trailing whitespace
        text = text.strip()
        
        return text
    
    async def extract_from_text(self, text: str, source_type: str = "plain_text") -> ExtractedContent:
        """
        Extract content from plain text
        """
        try:
            # Clean the text
            cleaned_text = self._clean_text(text)
            
            return ExtractedContent(
                title="Text Content",
                content=cleaned_text,
                metadata={
                    "source_type": source_type,
                    "content_length": len(cleaned_text)
                },
                source_type=source_type,
                extraction_method="direct"
            )
            
        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
            raise
    
    async def extract_key_points(self, content: str, max_points: int = 10) -> List[str]:
        """
        Extract key points from content
        """
        try:
            # Simple key point extraction based on sentences
            sentences = re.split(r'[.!?]+', content)
            sentences = [s.strip() for s in sentences if s.strip()]
            
            # Score sentences based on length and keywords
            scored_sentences = []
            for sentence in sentences:
                score = len(sentence.split())  # Word count
                if any(keyword in sentence.lower() for keyword in 
                      ['important', 'key', 'main', 'primary', 'significant', 'crucial']):
                    score += 5
                
                scored_sentences.append((score, sentence))
            
            # Sort by score and take top sentences
            scored_sentences.sort(key=lambda x: x[0], reverse=True)
            
            key_points = [sentence for score, sentence in scored_sentences[:max_points]]
            
            return key_points
            
        except Exception as e:
            logger.error(f"Key point extraction failed: {e}")
            return []
    
    async def extract_structured_data(self, content: str) -> Dict[str, Any]:
        """
        Extract structured data from content
        """
        try:
            # Look for common patterns
            structured_data = {}
            
            # Extract URLs
            url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
            urls = re.findall(url_pattern, content)
            if urls:
                structured_data['urls'] = urls
            
            # Extract email addresses
            email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            emails = re.findall(email_pattern, content)
            if emails:
                structured_data['emails'] = emails
            
            # Extract dates (simple pattern)
            date_pattern = r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b'
            dates = re.findall(date_pattern, content)
            if dates:
                structured_data['dates'] = dates
            
            # Extract numbers with units
            number_pattern = r'\b\d+(?:,\d{3})*(?:\.\d+)?\s*(?:%|percent|million|billion|thousand|USD|EUR|GBP|\$|€|£)\b'
            numbers = re.findall(number_pattern, content, re.IGNORECASE)
            if numbers:
                structured_data['numbers'] = numbers
            
            return structured_data
            
        except Exception as e:
            logger.error(f"Structured data extraction failed: {e}")
            return {}
