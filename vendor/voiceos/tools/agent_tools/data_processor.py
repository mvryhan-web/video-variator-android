"""
Data Processor Tool - For agent use in data analysis and processing
Provides comprehensive data handling, analysis, and visualization capabilities
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass
import json
import csv
import statistics
from collections import defaultdict, Counter
import re
import math

logger = logging.getLogger(__name__)

@dataclass
class DataAnalysis:
    summary: Dict[str, Any]
    statistics: Dict[str, float]
    patterns: List[str]
    insights: List[str]
    recommendations: List[str]
    limitations: List[str]

class DataProcessor:
    def __init__(self):
        self.supported_formats = ['json', 'csv', 'txt', 'list', 'dict']
    
    async def process_data(self, data: Union[str, List, Dict], analysis_type: str = "comprehensive") -> DataAnalysis:
        """
        Process and analyze data with comprehensive analysis
        """
        try:
            logger.info(f"Processing data with analysis type: {analysis_type}")
            
            # Parse and validate data
            parsed_data = self._parse_data(data)
            if not parsed_data:
                return DataAnalysis(
                    summary={"error": "No valid data provided"},
                    statistics={},
                    patterns=[],
                    insights=[],
                    recommendations=["Provide valid data for analysis"],
                    limitations=["No data to analyze"]
                )
            
            # Perform analysis based on type
            if analysis_type == "comprehensive":
                return await self._comprehensive_analysis(parsed_data)
            elif analysis_type == "statistical":
                return await self._statistical_analysis(parsed_data)
            elif analysis_type == "descriptive":
                return await self._descriptive_analysis(parsed_data)
            elif analysis_type == "trend":
                return await self._trend_analysis(parsed_data)
            else:
                return await self._comprehensive_analysis(parsed_data)
                
        except Exception as e:
            logger.error(f"Data processing failed: {e}")
            return DataAnalysis(
                summary={"error": str(e)},
                statistics={},
                patterns=[],
                insights=[],
                recommendations=["Data processing failed"],
                limitations=[f"Processing error: {str(e)}"]
            )
    
    def _parse_data(self, data: Union[str, List, Dict]) -> Optional[Dict[str, Any]]:
        """
        Parse various data formats into structured format
        """
        try:
            if isinstance(data, str):
                # Try to parse as JSON first
                try:
                    parsed = json.loads(data)
                    return {"type": "structured", "data": parsed}
                except json.JSONDecodeError:
                    # Try CSV format
                    if ',' in data and '\n' in data:
                        return self._parse_csv(data)
                    else:
                        # Treat as text
                        return {"type": "text", "data": data}
            
            elif isinstance(data, list):
                return {"type": "list", "data": data}
            
            elif isinstance(data, dict):
                return {"type": "dict", "data": data}
            
            return None
            
        except Exception as e:
            logger.error(f"Data parsing failed: {e}")
            return None
    
    def _parse_csv(self, csv_data: str) -> Dict[str, Any]:
        """
        Parse CSV data
        """
        try:
            lines = csv_data.strip().split('\n')
            if len(lines) < 2:
                return {"type": "text", "data": csv_data}
            
            # Parse CSV
            reader = csv.DictReader(lines)
            data = list(reader)
            
            return {"type": "csv", "data": data}
            
        except Exception:
            return {"type": "text", "data": csv_data}
    
    async def _comprehensive_analysis(self, parsed_data: Dict[str, Any]) -> DataAnalysis:
        """
        Perform comprehensive data analysis
        """
        data_type = parsed_data["type"]
        data = parsed_data["data"]
        
        # Generate summary
        summary = self._generate_summary(data_type, data)
        
        # Calculate statistics
        stats = self._calculate_statistics(data_type, data)
        
        # Identify patterns
        patterns = self._identify_patterns(data_type, data)
        
        # Generate insights
        insights = self._generate_insights(data_type, data, stats, patterns)
        
        # Create recommendations
        recommendations = self._generate_recommendations(data_type, data, insights)
        
        # Identify limitations
        limitations = self._identify_limitations(data_type, data)
        
        return DataAnalysis(
            summary=summary,
            statistics=stats,
            patterns=patterns,
            insights=insights,
            recommendations=recommendations,
            limitations=limitations
        )
    
    async def _statistical_analysis(self, parsed_data: Dict[str, Any]) -> DataAnalysis:
        """
        Perform statistical analysis
        """
        data_type = parsed_data["type"]
        data = parsed_data["data"]
        
        # Focus on statistical measures
        stats = self._calculate_statistics(data_type, data)
        
        return DataAnalysis(
            summary={"analysis_type": "statistical", "data_points": len(data) if isinstance(data, list) else 1},
            statistics=stats,
            patterns=[],
            insights=[f"Statistical analysis completed with {len(stats)} measures"],
            recommendations=["Consider data distribution and outliers"],
            limitations=["Statistical analysis limited by data size and quality"]
        )
    
    async def _descriptive_analysis(self, parsed_data: Dict[str, Any]) -> DataAnalysis:
        """
        Perform descriptive analysis
        """
        data_type = parsed_data["type"]
        data = parsed_data["data"]
        
        summary = self._generate_summary(data_type, data)
        
        return DataAnalysis(
            summary=summary,
            statistics={},
            patterns=[],
            insights=["Descriptive analysis completed"],
            recommendations=["Consider deeper analysis for insights"],
            limitations=["Only descriptive statistics provided"]
        )
    
    async def _trend_analysis(self, parsed_data: Dict[str, Any]) -> DataAnalysis:
        """
        Perform trend analysis
        """
        data_type = parsed_data["type"]
        data = parsed_data["data"]
        
        trends = self._identify_trends(data_type, data)
        
        return DataAnalysis(
            summary={"analysis_type": "trend", "trends_found": len(trends)},
            statistics={},
            patterns=trends,
            insights=[f"Trend analysis identified {len(trends)} patterns"],
            recommendations=["Monitor trends over time for validation"],
            limitations=["Trend analysis requires temporal data"]
        )
    
    def _generate_summary(self, data_type: str, data: Any) -> Dict[str, Any]:
        """
        Generate data summary
        """
        summary = {"data_type": data_type}
        
        if data_type == "list":
            summary.update({
                "total_items": len(data),
                "data_types": list(set(type(item).__name__ for item in data)),
                "sample_items": data[:3] if len(data) > 0 else []
            })
        elif data_type == "dict":
            summary.update({
                "total_keys": len(data),
                "key_types": {k: type(v).__name__ for k, v in data.items()},
                "keys": list(data.keys())[:5]
            })
        elif data_type == "csv":
            summary.update({
                "total_rows": len(data),
                "total_columns": len(data[0]) if data else 0,
                "columns": list(data[0].keys()) if data else []
            })
        elif data_type == "text":
            summary.update({
                "character_count": len(data),
                "word_count": len(data.split()),
                "line_count": len(data.split('\n'))
            })
        else:
            summary.update({
                "data_preview": str(data)[:100] + "..." if len(str(data)) > 100 else str(data)
            })
        
        return summary
    
    def _calculate_statistics(self, data_type: str, data: Any) -> Dict[str, float]:
        """
        Calculate statistical measures
        """
        stats = {}
        
        if data_type == "list":
            numeric_data = [item for item in data if isinstance(item, (int, float))]
            if numeric_data:
                stats.update({
                    "mean": statistics.mean(numeric_data),
                    "median": statistics.median(numeric_data),
                    "mode": statistics.mode(numeric_data) if len(set(numeric_data)) < len(numeric_data) else None,
                    "std_dev": statistics.stdev(numeric_data) if len(numeric_data) > 1 else 0,
                    "min": min(numeric_data),
                    "max": max(numeric_data),
                    "range": max(numeric_data) - min(numeric_data)
                })
        
        elif data_type == "csv" and data:
            # Calculate statistics for numeric columns
            for column in data[0].keys():
                column_data = [row.get(column) for row in data if row.get(column) is not None]
                numeric_column = [float(val) for val in column_data if isinstance(val, (int, float, str)) and str(val).replace('.', '').replace('-', '').isdigit()]
                
                if numeric_column:
                    stats[f"{column}_mean"] = statistics.mean(numeric_column)
                    stats[f"{column}_median"] = statistics.median(numeric_column)
                    stats[f"{column}_std"] = statistics.stdev(numeric_column) if len(numeric_column) > 1 else 0
        
        elif data_type == "text":
            words = data.split()
            word_lengths = [len(word) for word in words]
            if word_lengths:
                stats.update({
                    "avg_word_length": statistics.mean(word_lengths),
                    "median_word_length": statistics.median(word_lengths),
                    "max_word_length": max(word_lengths),
                    "min_word_length": min(word_lengths)
                })
        
        return stats
    
    def _identify_patterns(self, data_type: str, data: Any) -> List[str]:
        """
        Identify patterns in data
        """
        patterns = []
        
        if data_type == "list":
            # Frequency analysis
            if data:
                freq = Counter(data)
                most_common = freq.most_common(3)
                patterns.extend([f"Most common item: {item} (appears {count} times)" for item, count in most_common])
                
                # Check for sequences
                if len(data) > 3:
                    is_sequence = all(isinstance(data[i], (int, float)) and isinstance(data[i+1], (int, float)) 
                                   and abs(data[i+1] - data[i]) < 10 for i in range(len(data)-1))
                    if is_sequence:
                        patterns.append("Data appears to be a numeric sequence")
        
        elif data_type == "csv" and data:
            # Check for correlations
            numeric_columns = [col for col in data[0].keys() if all(
                str(row.get(col)).replace('.', '').replace('-', '').isdigit() 
                for row in data if row.get(col) is not None
            )]
            
            if len(numeric_columns) > 1:
                patterns.append(f"Found {len(numeric_columns)} numeric columns for correlation analysis")
        
        elif data_type == "text":
            # Word frequency patterns
            words = data.lower().split()
            word_freq = Counter(words)
            common_words = word_freq.most_common(5)
            patterns.extend([f"Frequent word: '{word}' (appears {count} times)" for word, count in common_words])
            
            # Check for repeated phrases
            sentences = data.split('.')
            if len(sentences) > 1:
                avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences)
                patterns.append(f"Average sentence length: {avg_sentence_length:.1f} words")
        
        return patterns
    
    def _identify_trends(self, data_type: str, data: Any) -> List[str]:
        """
        Identify trends in data
        """
        trends = []
        
        if data_type == "list" and len(data) > 2:
            numeric_data = [item for item in data if isinstance(item, (int, float))]
            if len(numeric_data) > 2:
                # Simple trend detection
                first_half = numeric_data[:len(numeric_data)//2]
                second_half = numeric_data[len(numeric_data)//2:]
                
                first_avg = statistics.mean(first_half)
                second_avg = statistics.mean(second_half)
                
                if second_avg > first_avg * 1.1:
                    trends.append("Upward trend detected")
                elif second_avg < first_avg * 0.9:
                    trends.append("Downward trend detected")
                else:
                    trends.append("No significant trend detected")
        
        return trends
    
    def _generate_insights(self, data_type: str, data: Any, stats: Dict[str, float], patterns: List[str]) -> List[str]:
        """
        Generate insights from analysis
        """
        insights = []
        
        # Data quality insights
        if data_type == "list":
            if len(data) < 10:
                insights.append("Limited data size may affect analysis reliability")
            elif len(data) > 1000:
                insights.append("Large dataset suitable for statistical analysis")
        
        # Statistical insights
        if stats:
            if "std_dev" in stats and stats["std_dev"] > 0:
                cv = stats["std_dev"] / abs(stats["mean"]) if stats["mean"] != 0 else 0
                if cv > 0.3:
                    insights.append("High variability detected in data")
                elif cv < 0.1:
                    insights.append("Low variability - data is quite consistent")
        
        # Pattern-based insights
        if patterns:
            insights.append(f"Identified {len(patterns)} notable patterns")
        
        return insights
    
    def _generate_recommendations(self, data_type: str, data: Any, insights: List[str]) -> List[str]:
        """
        Generate actionable recommendations
        """
        recommendations = []
        
        if data_type == "list":
            if len(data) < 30:
                recommendations.append("Consider collecting more data for better statistical significance")
            
            numeric_ratio = len([x for x in data if isinstance(x, (int, float))]) / len(data)
            if numeric_ratio < 0.5:
                recommendations.append("Consider data cleaning to improve numeric analysis")
        
        elif data_type == "csv" and data:
            if len(data[0]) > 10:
                recommendations.append("Consider dimensionality reduction techniques")
            
            missing_data = any(any(val is None or val == '' for val in row.values()) for row in data)
            if missing_data:
                recommendations.append("Handle missing data before advanced analysis")
        
        # General recommendations
        if insights:
            recommendations.append("Validate insights with domain knowledge")
        
        recommendations.append("Consider visualization for better data understanding")
        
        return recommendations
    
    def _identify_limitations(self, data_type: str, data: Any) -> List[str]:
        """
        Identify analysis limitations
        """
        limitations = []
        
        if data_type == "list":
            if len(data) < 10:
                limitations.append("Small sample size limits statistical significance")
            
            mixed_types = len(set(type(item).__name__ for item in data)) > 1
            if mixed_types:
                limitations.append("Mixed data types limit analysis options")
        
        elif data_type == "text":
            if len(data.split()) < 50:
                limitations.append("Limited text content for meaningful analysis")
        
        limitations.append("Analysis based on provided data only")
        limitations.append("External context may affect interpretation")
        
        return limitations
    
    async def clean_data(self, data: Union[str, List, Dict], cleaning_options: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Clean and preprocess data
        """
        try:
            options = cleaning_options or {}
            
            # Parse data
            parsed_data = self._parse_data(data)
            if not parsed_data:
                return {"success": False, "error": "Unable to parse data"}
            
            data_type = parsed_data["type"]
            cleaned_data = parsed_data["data"]
            
            # Apply cleaning based on type
            if data_type == "list":
                cleaned_data = self._clean_list_data(cleaned_data, options)
            elif data_type == "csv":
                cleaned_data = self._clean_csv_data(cleaned_data, options)
            elif data_type == "text":
                cleaned_data = self._clean_text_data(cleaned_data, options)
            
            return {
                "success": True,
                "original_type": data_type,
                "cleaned_data": cleaned_data,
                "cleaning_applied": list(options.keys())
            }
            
        except Exception as e:
            logger.error(f"Data cleaning failed: {e}")
            return {"success": False, "error": str(e)}
    
    def _clean_list_data(self, data: List, options: Dict[str, Any]) -> List:
        """
        Clean list data
        """
        cleaned = data.copy()
        
        # Remove null values
        if options.get("remove_null", True):
            cleaned = [item for item in cleaned if item is not None and item != ""]
        
        # Remove duplicates
        if options.get("remove_duplicates", False):
            seen = set()
            cleaned = [item for item in cleaned if not (item in seen or seen.add(item))]
        
        # Sort data
        if options.get("sort", False):
            try:
                cleaned.sort()
            except TypeError:
                pass  # Can't sort mixed types
        
        return cleaned
    
    def _clean_csv_data(self, data: List[Dict], options: Dict[str, Any]) -> List[Dict]:
        """
        Clean CSV data
        """
        cleaned = []
        
        for row in data:
            cleaned_row = {}
            
            for key, value in row.items():
                # Remove null values
                if options.get("remove_null", True) and (value is None or value == ""):
                    continue
                
                # Clean string values
                if isinstance(value, str):
                    value = value.strip()
                    if options.get("lowercase_strings", False):
                        value = value.lower()
                
                cleaned_row[key] = value
            
            cleaned.append(cleaned_row)
        
        return cleaned
    
    def _clean_text_data(self, data: str, options: Dict[str, Any]) -> str:
        """
        Clean text data
        """
        cleaned = data
        
        # Remove extra whitespace
        if options.get("normalize_whitespace", True):
            cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        
        # Remove special characters
        if options.get("remove_special_chars", False):
            cleaned = re.sub(r'[^\w\s.,!?;:()-]', '', cleaned)
        
        # Convert to lowercase
        if options.get("lowercase", False):
            cleaned = cleaned.lower()
        
        return cleaned
    
    async def generate_visualization_data(self, data: Union[str, List, Dict], chart_type: str = "auto") -> Dict[str, Any]:
        """
        Generate data for visualization (text-based representation)
        """
        try:
            parsed_data = self._parse_data(data)
            if not parsed_data:
                return {"success": False, "error": "Unable to parse data for visualization"}
            
            data_type = parsed_data["type"]
            data_content = parsed_data["data"]
            
            if chart_type == "auto":
                chart_type = self._suggest_chart_type(data_type, data_content)
            
            if chart_type == "histogram":
                return self._create_histogram(data_type, data_content)
            elif chart_type == "bar_chart":
                return self._create_bar_chart(data_type, data_content)
            elif chart_type == "line_chart":
                return self._create_line_chart(data_type, data_content)
            else:
                return {"success": False, "error": f"Unsupported chart type: {chart_type}"}
                
        except Exception as e:
            logger.error(f"Visualization generation failed: {e}")
            return {"success": False, "error": str(e)}
    
    def _suggest_chart_type(self, data_type: str, data: Any) -> str:
        """
        Suggest appropriate chart type
        """
        if data_type == "list":
            numeric_data = [item for item in data if isinstance(item, (int, float))]
            if len(numeric_data) > len(data) * 0.7:
                return "histogram"
            else:
                return "bar_chart"
        elif data_type == "csv":
            return "bar_chart"
        else:
            return "bar_chart"
    
    def _create_histogram(self, data_type: str, data: Any) -> Dict[str, Any]:
        """
        Create histogram data
        """
        if data_type == "list":
            numeric_data = [item for item in data if isinstance(item, (int, float))]
            
            if not numeric_data:
                return {"success": False, "error": "No numeric data for histogram"}
            
            # Create bins
            min_val, max_val = min(numeric_data), max(numeric_data)
            bin_count = min(10, len(set(numeric_data)))
            bin_width = (max_val - min_val) / bin_count if max_val != min_val else 1
            
            bins = {}
            for value in numeric_data:
                bin_index = int((value - min_val) / bin_width)
                bin_index = min(bin_index, bin_count - 1)
                bin_key = f"{min_val + bin_index * bin_width:.1f}-{min_val + (bin_index + 1) * bin_width:.1f}"
                bins[bin_key] = bins.get(bin_key, 0) + 1
            
            return {
                "success": True,
                "chart_type": "histogram",
                "data": bins,
                "title": "Data Distribution"
            }
        
        return {"success": False, "error": "Histogram not supported for this data type"}
    
    def _create_bar_chart(self, data_type: str, data: Any) -> Dict[str, Any]:
        """
        Create bar chart data
        """
        if data_type == "list":
            freq = Counter(data)
            return {
                "success": True,
                "chart_type": "bar_chart",
                "data": dict(freq.most_common(10)),
                "title": "Frequency Distribution"
            }
        
        elif data_type == "csv" and data:
            # Use first column for bar chart
            first_column = list(data[0].keys())[0]
            values = [row.get(first_column) for row in data if row.get(first_column)]
            
            if values:
                freq = Counter(values)
                return {
                    "success": True,
                    "chart_type": "bar_chart",
                    "data": dict(freq.most_common(10)),
                    "title": f"{first_column} Distribution"
                }
        
        return {"success": False, "error": "Unable to create bar chart"}
    
    def _create_line_chart(self, data_type: str, data: Any) -> Dict[str, Any]:
        """
        Create line chart data
        """
        if data_type == "list":
            numeric_data = [item for item in data if isinstance(item, (int, float))]
            
            if len(numeric_data) > 1:
                return {
                    "success": True,
                    "chart_type": "line_chart",
                    "data": {"x": list(range(len(numeric_data))), "y": numeric_data},
                    "title": "Data Trend"
                }
        
        return {"success": False, "error": "Unable to create line chart"}
