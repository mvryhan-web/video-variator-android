"""Register the owner task tools in the ORIGINAL VoiceOS ToolRegistry.

Requires upstream VoiceOS import path, but never changes upstream source.
Tools report recorded facts and queue tasks. They do NOT perform billing,
post to production, or pretend queued work is completed.
"""
from __future__ import annotations

import os
from pathlib import Path

from .coordinator import Coordinator


def owner_coordinator() -> Coordinator:
    root = Path(os.getenv("JARVIX_NEW_LOCAL_STATE_DIR")
                or os.getenv("LOCALAPPDATA")
                or (Path.home() / ".jarvix-new"))
    return Coordinator(root / "jarvix-new-tasks.sqlite",
                       owner=os.getenv("JARVIX_NEW_OWNER_ID", "local-owner"))


def register_jarvix_tools(registry, coordinator: Coordinator | None = None) -> list[str]:
    """Add only safe coordinator tools; execution still uses VoiceOS guardrails."""
    from tools.tool_registry import ToolMetadata, ToolCategory

    coordinator = coordinator or owner_coordinator()

    class JARVIXNewAcceptTask:
        TOOL_METADATA = ToolMetadata(
            name="jarvix_new_accept_task",
            description=(
                "Record an Image, Video, Music or photo_compress task in the "
                "JARVIX NEW owner journal. This ONLY QUEUES work. It does not "
                "create media, run a model or spend credits; never say it is finished."
            ),
            category=ToolCategory.AGENT_TOOLS,
            version="0.1.0",
            author="DEEPSYQ",
            safety_level="low",
            execution_surface="host",
            parameters={
                "kind": {"type": "string", "description": "image, video, music, photo_compress"},
                "prompt": {"type": "string", "description": "The user's exact task text"},
            },
            tags=["jarvix", "task", "queue"],
        )

        def execute(self, kind: str = "", prompt: str = "") -> dict:
            if kind == "photo_compress":
                return {"ok": False, "reason": "Photo requires an explicitly chosen file. "
                        "Use the trusted local file-selection workflow, not a model-supplied path."}
            job_id = coordinator.submit(kind, prompt)
            return {"ok": True, "id": job_id, "status": "queued", "dispatched": False,
                    "media_created": False, "message": "Accepted into the task journal only."}

    class JARVIXNewReport:
        TOOL_METADATA = ToolMetadata(
            name="jarvix_new_task_report",
            description=("Read VERIFIED task journal states for this owner. "
                         "Use this when the user asks what you did today. "
                         "Simulated jobs must be described as simulations."),
            category=ToolCategory.AGENT_TOOLS,
            version="0.1.0",
            author="DEEPSYQ",
            safety_level="low",
            execution_surface="host",
            tags=["jarvix", "report", "status"],
        )

        def execute(self) -> dict:
            return {"ok": True, **coordinator.report()}

    class JARVIXNewTaskStatus:
        TOOL_METADATA = ToolMetadata(
            name="jarvix_new_task_status",
            description="Get the recorded status of a specific JARVIX NEW task.",
            category=ToolCategory.AGENT_TOOLS,
            version="0.1.0",
            author="DEEPSYQ",
            safety_level="low",
            execution_surface="host",
            parameters={"job_id": {"type": "string", "description": "JARVIX NEW task ID"}},
            tags=["jarvix", "status"],
        )

        def execute(self, job_id: str = "") -> dict:
            if not job_id:
                return {"ok": False, "reason": "Missing task ID"}
            try:
                record = coordinator.get(job_id)
            except LookupError:
                return {"ok": False, "reason": "Task not found in this owner scope"}
            return {"ok": True, "id": job_id, "kind": record["kind"],
                    "status": record["status"], "detail": record["detail"] or "",
                    "updated_at": record["updated_at"]}

    names = []
    for cls in (JARVIXNewAcceptTask, JARVIXNewReport, JARVIXNewTaskStatus):
        if not registry.register_tool(cls):
            raise RuntimeError(f"Failed to register {cls.TOOL_METADATA.name} in VoiceOS")
        names.append(cls.TOOL_METADATA.name)
    return names
