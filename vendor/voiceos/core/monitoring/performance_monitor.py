"""
Performance Monitor Module - Comprehensive performance monitoring and metrics
Tracks latency, resource usage, and system performance
"""

import asyncio
import logging
import time
import psutil
import threading
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, deque
import json
from pathlib import Path

logger = logging.getLogger(__name__)

class MetricType(Enum):
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    TIMER = "timer"

class AlertLevel(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

@dataclass
class Metric:
    name: str
    metric_type: MetricType
    value: float
    timestamp: float
    labels: Dict[str, str] = field(default_factory=dict)
    unit: str = ""

@dataclass
class PerformanceAlert:
    metric_name: str
    level: AlertLevel
    message: str
    timestamp: float
    threshold: float
    actual_value: float
    labels: Dict[str, str] = field(default_factory=dict)

@dataclass
class PerformanceConfig:
    enable_monitoring: bool = True
    collection_interval: float = 1.0  # seconds
    retention_period: int = 3600  # 1 hour
    enable_alerts: bool = True
    alert_thresholds: Dict[str, Dict[str, float]] = field(default_factory=dict)
    enable_profiling: bool = False
    max_memory_usage_mb: int = 2048
    cpu_threshold: float = 80.0
    response_time_threshold_ms: float = 1000.0

class PerformanceMonitor:
    def __init__(self, config: PerformanceConfig = None):
        self.config = config or PerformanceConfig()
        
        # Metrics storage
        self.metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=self.config.retention_period))
        self.counters: Dict[str, float] = defaultdict(float)
        self.gauges: Dict[str, float] = defaultdict(float)
        self.histograms: Dict[str, List[float]] = defaultdict(list)
        self.timers: Dict[str, List[float]] = defaultdict(list)
        
        # Performance data
        self.system_metrics: Dict[str, Any] = {}
        self.process_metrics: Dict[str, Any] = {}
        
        # Alerts
        self.alerts: List[PerformanceAlert] = []
        self.alert_handlers: List[Callable] = []
        
        # Monitoring state
        self.monitoring_active = False
        self.monitoring_task: Optional[asyncio.Task] = None
        self.collection_thread: Optional[threading.Thread] = None
        
        # Initialize default thresholds
        self._initialize_thresholds()
        
        # Start monitoring if enabled
        if self.config.enable_monitoring:
            self.start_monitoring()
    
    def _initialize_thresholds(self):
        """
        Initialize default alert thresholds
        """
        self.config.alert_thresholds.update({
            "cpu_usage": {"warning": 70.0, "error": 85.0, "critical": 95.0},
            "memory_usage": {"warning": 70.0, "error": 85.0, "critical": 95.0},
            "response_time": {"warning": 500.0, "error": 1000.0, "critical": 2000.0},
            "error_rate": {"warning": 0.05, "error": 0.10, "critical": 0.20},
            "throughput": {"warning": 10.0, "error": 5.0, "critical": 1.0}
        })
    
    def start_monitoring(self):
        """
        Start performance monitoring
        """
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        
        # Start async monitoring task
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        
        # Start system metrics collection thread
        self.collection_thread = threading.Thread(target=self._collect_system_metrics, daemon=True)
        self.collection_thread.start()
        
        logger.info("Performance monitoring started")
    
    def stop_monitoring(self):
        """
        Stop performance monitoring
        """
        self.monitoring_active = False
        
        if self.monitoring_task:
            self.monitoring_task.cancel()
        
        if self.collection_thread and self.collection_thread.is_alive():
            self.collection_thread.join(timeout=5.0)
        
        logger.info("Performance monitoring stopped")
    
    async def _monitoring_loop(self):
        """
        Main monitoring loop
        """
        while self.monitoring_active:
            try:
                # Collect process metrics
                await self._collect_process_metrics()
                
                # Check alerts
                if self.config.enable_alerts:
                    self._check_alerts()
                
                # Clean old metrics
                self._cleanup_old_metrics()
                
                await asyncio.sleep(self.config.collection_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
                await asyncio.sleep(self.config.collection_interval)
    
    def _collect_system_metrics(self):
        """
        Collect system-level metrics
        """
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=0.1)
            cpu_count = psutil.cpu_count()
            cpu_freq = psutil.cpu_freq()
            
            self.system_metrics.update({
                "cpu_percent": cpu_percent,
                "cpu_count": cpu_count,
                "cpu_freq_current": cpu_freq.current if cpu_freq else 0,
                "cpu_freq_min": cpu_freq.min if cpu_freq else 0,
                "cpu_freq_max": cpu_freq.max if cpu_freq else 0
            })
            
            # Memory metrics
            memory = psutil.virtual_memory()
            self.system_metrics.update({
                "memory_total": memory.total,
                "memory_available": memory.available,
                "memory_percent": memory.percent,
                "memory_used": memory.used,
                "memory_free": memory.free
            })
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            self.system_metrics.update({
                "disk_total": disk.total,
                "disk_used": disk.used,
                "disk_free": disk.free,
                "disk_percent": disk.percent
            })
            
            # Network metrics
            network = psutil.net_io_counters()
            self.system_metrics.update({
                "network_bytes_sent": network.bytes_sent,
                "network_bytes_recv": network.bytes_recv,
                "network_packets_sent": network.packets_sent,
                "network_packets_recv": network.packets_recv
            })
            
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")
    
    async def _collect_process_metrics(self):
        """
        Collect process-level metrics
        """
        try:
            process = psutil.Process()
            
            # Process CPU and memory
            process_cpu = process.cpu_percent()
            process_memory = process.memory_info()
            process_memory_mb = process_memory.rss / 1024 / 1024
            
            self.process_metrics.update({
                "process_cpu_percent": process_cpu,
                "process_memory_rss": process_memory.rss,
                "process_memory_vms": process_memory.vms,
                "process_memory_mb": process_memory_mb,
                "process_num_threads": process.num_threads(),
                "process_create_time": process.create_time(),
                "process_status": process.status()
            })
            
            # Record metrics
            self.record_metric("cpu_usage", process_cpu, MetricType.GAUGE, unit="percent")
            self.record_metric("memory_usage", process_memory_mb, MetricType.GAUGE, unit="mb")
            
        except Exception as e:
            logger.error(f"Failed to collect process metrics: {e}")
    
    def record_metric(self, name: str, value: float, metric_type: MetricType, 
                     labels: Dict[str, str] = None, unit: str = ""):
        """
        Record a performance metric
        """
        metric = Metric(
            name=name,
            metric_type=metric_type,
            value=value,
            timestamp=time.time(),
            labels=labels or {},
            unit=unit
        )
        
        self.metrics[name].append(metric)
        
        # Update specific metric types
        if metric_type == MetricType.COUNTER:
            self.counters[name] += value
        elif metric_type == MetricType.GAUGE:
            self.gauges[name] = value
        elif metric_type == MetricType.HISTOGRAM:
            self.histograms[name].append(value)
            # Keep only recent values
            if len(self.histograms[name]) > 1000:
                self.histograms[name] = self.histograms[name][-500:]
        elif metric_type == MetricType.TIMER:
            self.timers[name].append(value)
            # Keep only recent values
            if len(self.timers[name]) > 1000:
                self.timers[name] = self.timers[name][-500:]
    
    def increment_counter(self, name: str, value: float = 1.0, labels: Dict[str, str] = None):
        """
        Increment a counter metric
        """
        self.record_metric(name, value, MetricType.COUNTER, labels)
    
    def set_gauge(self, name: str, value: float, labels: Dict[str, str] = None):
        """
        Set a gauge metric
        """
        self.record_metric(name, value, MetricType.GAUGE, labels)
    
    def record_timer(self, name: str, duration: float, labels: Dict[str, str] = None):
        """
        Record a timer metric
        """
        self.record_metric(name, duration * 1000, MetricType.TIMER, labels, unit="ms")
    
    def record_histogram(self, name: str, value: float, labels: Dict[str, str] = None):
        """
        Record a histogram metric
        """
        self.record_metric(name, value, MetricType.HISTOGRAM, labels)
    
    def start_timer(self, name: str) -> str:
        """
        Start a timer and return timer ID
        """
        timer_id = f"{name}_{int(time.time() * 1000000)}"
        self.record_metric(f"{name}_start", time.time(), MetricType.GAUGE, labels={"timer_id": timer_id})
        return timer_id
    
    def end_timer(self, name: str, timer_id: str) -> float:
        """
        End a timer and record duration
        """
        current_time = time.time()
        start_metric_name = f"{name}_start"
        
        # Find start time
        start_time = None
        for metric in reversed(self.metrics.get(start_metric_name, [])):
            if metric.labels.get("timer_id") == timer_id:
                start_time = metric.value
                break
        
        if start_time is None:
            logger.warning(f"Timer {timer_id} not found for {name}")
            return 0.0
        
        duration = current_time - start_time
        self.record_timer(name, duration)
        return duration
    
    def _check_alerts(self):
        """
        Check for performance alerts
        """
        current_time = time.time()
        
        # Check CPU usage
        cpu_usage = self.process_metrics.get("process_cpu_percent", 0)
        self._check_threshold_alert("cpu_usage", cpu_usage, current_time)
        
        # Check memory usage
        memory_usage = self.process_metrics.get("process_memory_mb", 0)
        max_memory = self.config.max_memory_usage_mb
        memory_percent = (memory_usage / max_memory) * 100 if max_memory > 0 else 0
        self._check_threshold_alert("memory_usage", memory_percent, current_time)
        
        # Check response times
        if "response_time" in self.timers and self.timers["response_time"]:
            avg_response_time = sum(self.timers["response_time"][-10:]) / min(10, len(self.timers["response_time"]))
            self._check_threshold_alert("response_time", avg_response_time, current_time)
        
        # Clean old alerts
        self.alerts = [alert for alert in self.alerts if current_time - alert.timestamp < 3600]
    
    def _check_threshold_alert(self, metric_name: str, value: float, timestamp: float):
        """
        Check if metric value triggers alert
        """
        thresholds = self.config.alert_thresholds.get(metric_name, {})
        
        for level_name, threshold in thresholds.items():
            level = AlertLevel(level_name)
            
            if value >= threshold:
                # Check if we already have a recent alert for this
                recent_alerts = [
                    alert for alert in self.alerts
                    if (alert.metric_name == metric_name and 
                        alert.level == level and 
                        timestamp - alert.timestamp < 300)  # 5 minutes
                ]
                
                if not recent_alerts:
                    alert = PerformanceAlert(
                        metric_name=metric_name,
                        level=level,
                        message=f"{metric_name} {value:.2f} exceeds {level_name} threshold {threshold}",
                        timestamp=timestamp,
                        threshold=threshold,
                        actual_value=value
                    )
                    
                    self.alerts.append(alert)
                    self._trigger_alert(alert)
    
    def _trigger_alert(self, alert: PerformanceAlert):
        """
        Trigger performance alert
        """
        logger.warning(f"Performance Alert [{alert.level.value.upper()}]: {alert.message}")
        
        # Call alert handlers
        for handler in self.alert_handlers:
            try:
                handler(alert)
            except Exception as e:
                logger.error(f"Alert handler failed: {e}")
    
    def add_alert_handler(self, handler: Callable):
        """
        Add alert handler function
        """
        self.alert_handlers.append(handler)
        logger.info("Added alert handler")
    
    def get_metric_summary(self, metric_name: str, period: int = 300) -> Dict[str, Any]:
        """
        Get summary statistics for a metric
        """
        current_time = time.time()
        cutoff_time = current_time - period
        
        # Get recent metrics
        recent_metrics = [
            metric for metric in self.metrics.get(metric_name, [])
            if metric.timestamp >= cutoff_time
        ]
        
        if not recent_metrics:
            return {"count": 0}
        
        values = [metric.value for metric in recent_metrics]
        
        summary = {
            "count": len(values),
            "min": min(values),
            "max": max(values),
            "avg": sum(values) / len(values),
            "latest": values[-1],
            "period": period
        }
        
        # Add percentiles
        sorted_values = sorted(values)
        n = len(sorted_values)
        if n > 0:
            summary.update({
                "p50": sorted_values[int(n * 0.5)],
                "p90": sorted_values[int(n * 0.9)],
                "p95": sorted_values[int(n * 0.95)],
                "p99": sorted_values[int(n * 0.99)]
            })
        
        return summary
    
    def get_performance_report(self) -> Dict[str, Any]:
        """
        Get comprehensive performance report
        """
        current_time = time.time()
        
        return {
            "timestamp": current_time,
            "monitoring_active": self.monitoring_active,
            "system_metrics": self.system_metrics.copy(),
            "process_metrics": self.process_metrics.copy(),
            "alerts": [
                {
                    "metric": alert.metric_name,
                    "level": alert.level.value,
                    "message": alert.message,
                    "timestamp": alert.timestamp,
                    "threshold": alert.threshold,
                    "actual": alert.actual_value
                }
                for alert in self.alerts[-10:]  # Last 10 alerts
            ],
            "metric_summaries": {
                name: self.get_metric_summary(name)
                for name in ["cpu_usage", "memory_usage", "response_time"]
                if name in self.metrics
            },
            "counters": dict(self.counters),
            "gauges": dict(self.gauges),
            "statistics": {
                "total_metrics": sum(len(metrics) for metrics in self.metrics.values()),
                "total_alerts": len(self.alerts),
                "monitoring_uptime": current_time - (self.monitoring_task._start_time if self.monitoring_task else current_time)
            }
        }
    
    def export_metrics(self, file_path: str, format: str = "json"):
        """
        Export metrics to file
        """
        try:
            report = self.get_performance_report()
            
            with open(file_path, 'w') as f:
                if format.lower() == "json":
                    json.dump(report, f, indent=2)
                else:
                    # Simple text format
                    f.write("VoiceOS Performance Report\n")
                    f.write("=" * 30 + "\n\n")
                    
                    f.write(f"Timestamp: {report['timestamp']}\n")
                    f.write(f"Monitoring Active: {report['monitoring_active']}\n\n")
                    
                    f.write("System Metrics:\n")
                    for key, value in report['system_metrics'].items():
                        f.write(f"  {key}: {value}\n")
                    
                    f.write("\nProcess Metrics:\n")
                    for key, value in report['process_metrics'].items():
                        f.write(f"  {key}: {value}\n")
            
            logger.info(f"Metrics exported to {file_path}")
            
        except Exception as e:
            logger.error(f"Failed to export metrics: {e}")
    
    def _cleanup_old_metrics(self):
        """
        Clean up old metrics beyond retention period
        """
        cutoff_time = time.time() - self.config.retention_period
        
        for name, metrics in self.metrics.items():
            # Remove old metrics
            self.metrics[name] = deque(
                (metric for metric in metrics if metric.timestamp >= cutoff_time),
                maxlen=self.config.retention_period
            )
    
    def create_performance_dashboard_data(self) -> Dict[str, Any]:
        """
        Create data for performance dashboard
        """
        return {
            "real_time": {
                "cpu_usage": self.process_metrics.get("process_cpu_percent", 0),
                "memory_usage_mb": self.process_metrics.get("process_memory_mb", 0),
                "memory_percent": (self.process_metrics.get("process_memory_mb", 0) / 
                                self.config.max_memory_usage_mb * 100) if self.config.max_memory_usage_mb > 0 else 0
            },
            "alerts": {
                "active_count": len([a for a in self.alerts if time.time() - a.timestamp < 300]),
                "recent": [
                    {
                        "level": alert.level.value,
                        "message": alert.message,
                        "time": alert.timestamp
                    }
                    for alert in sorted(self.alerts, key=lambda a: a.timestamp, reverse=True)[:5]
                ]
            },
            "metrics": {
                name: self.get_metric_summary(name, period=60)  # Last minute
                for name in ["cpu_usage", "memory_usage", "response_time"]
                if name in self.metrics
            }
        }
    
    async def benchmark_operation(self, name: str, operation: Callable, iterations: int = 100) -> Dict[str, Any]:
        """
        Benchmark an operation
        """
        logger.info(f"Benchmarking {name} with {iterations} iterations")
        
        times = []
        
        for i in range(iterations):
            start_time = time.time()
            
            try:
                if asyncio.iscoroutinefunction(operation):
                    await operation()
                else:
                    operation()
                
                duration = time.time() - start_time
                times.append(duration)
                
            except Exception as e:
                logger.error(f"Benchmark iteration {i} failed: {e}")
        
        if not times:
            return {"error": "All iterations failed"}
        
        # Calculate statistics
        times.sort()
        n = len(times)
        
        results = {
            "operation": name,
            "iterations": iterations,
            "total_time": sum(times),
            "avg_time": sum(times) / n,
            "min_time": times[0],
            "max_time": times[-1],
            "p50": times[int(n * 0.5)],
            "p90": times[int(n * 0.9)],
            "p95": times[int(n * 0.95)],
            "p99": times[int(n * 0.99)],
            "ops_per_second": 1.0 / (sum(times) / n) if times else 0
        }
        
        # Record benchmark metrics
        self.record_timer(f"benchmark_{name}", results["avg_time"])
        self.record_histogram(f"benchmark_{name}_distribution", results["ops_per_second"])
        
        logger.info(f"Benchmark completed: {results['ops_per_second']:.2f} ops/sec")
        
        return results
    
    async def shutdown(self):
        """
        Shutdown performance monitor
        """
        self.stop_monitoring()
        logger.info("Performance monitor shutdown complete")
