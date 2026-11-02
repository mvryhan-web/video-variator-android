"""Deprecated: synthetic sine-wave fixtures are not speech and must not be
published as JARVIX voice samples. Use a licensed speech model before adding
audio assets. The previous misleading output and public sample WAVs were
removed; this script intentionally produces nothing.
"""

if __name__ == "__main__":
    raise SystemExit(
        "No JARVIX speech model is configured. Refusing to generate tone WAVs as speech."
    )
