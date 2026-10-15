"""Repository structure and relevant source-context processing service.

Provides high-performance file tree construction, ignore filtering,
repository architecture inference, and token-bounded code context extraction.
"""

import math
import os
import re
from typing import Any, Dict, List, Optional, Set, Tuple

from app.core.logging import logger
from app.schemas.repository import (
    ExtractCodeContextResponse,
    FileNode,
    FileSnippet,
    FileTreeResponse,
    RepositoryContextResponse,
    RepositoryMetadata,
)

DEFAULT_IGNORE_DIR_PATTERNS: Set[str] = {
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    "venv",
    "env",
    "dist",
    "build",
    ".next",
    ".nuxt",
    ".turbo",
    ".cache",
    ".output",
    ".vscode",
    ".idea",
    "coverage",
    ".pytest_cache",
    "htmlcov",
    ".egg-info",
}

DEFAULT_IGNORE_EXTENSIONS: Set[str] = {
    "png",
    "jpg",
    "jpeg",
    "gif",
    "ico",
    "svg",
    "webp",
    "bmp",
    "mp4",
    "mp3",
    "wav",
    "pdf",
    "zip",
    "tar",
    "gz",
    "rar",
    "7z",
    "exe",
    "dll",
    "so",
    "dylib",
    "woff",
    "woff2",
    "ttf",
    "eot",
    "pyc",
    "pyo",
    "pyd",
    "class",
    "o",
    "obj",
}

LANGUAGE_EXTENSION_MAP: Dict[str, str] = {
    "py": "Python",
    "js": "JavaScript",
    "jsx": "JavaScript (React)",
    "ts": "TypeScript",
    "tsx": "TypeScript (React)",
    "json": "JSON",
    "md": "Markdown",
    "html": "HTML",
    "css": "CSS",
    "scss": "SCSS",
    "sass": "Sass",
    "rs": "Rust",
    "go": "Go",
    "java": "Java",
    "c": "C",
    "cpp": "C++",
    "h": "C/C++ Header",
    "sh": "Shell Script",
    "bash": "Bash",
    "ps1": "PowerShell",
    "sql": "SQL",
    "yaml": "YAML",
    "yml": "YAML",
    "toml": "TOML",
    "dockerfile": "Docker",
}


class RepositoryContextService:
    """Service handling repository tree parsing, metadata analysis, and context extraction."""

    def __init__(self):
        pass

    @staticmethod
    def estimate_tokens(text: str) -> int:
        """Estimates token count using standard heuristic (~4 characters per token)."""
        if not text:
            return 0
        return max(1, math.ceil(len(text) / 4))

    def should_ignore_path(self, path: str, extra_ignores: Optional[List[str]] = None) -> bool:
        """Determines whether a file or directory path should be excluded from analysis."""
        normalized = path.replace("\\", "/").strip("/")
        parts = normalized.split("/")

        # Check directories against ignore sets
        for part in parts:
            if part in DEFAULT_IGNORE_DIR_PATTERNS or part.startswith("."):
                # Exception: keep top-level .github or specific config files
                if part in {".github"} and normalized.startswith(".github/"):
                    continue
                return True

        # Check file extension
        filename = parts[-1]
        if "." in filename:
            ext = filename.rsplit(".", 1)[-1].lower()
            if ext in DEFAULT_IGNORE_EXTENSIONS:
                return True

        if extra_ignores:
            for pattern in extra_ignores:
                if pattern in normalized:
                    return True

        return False

    def build_file_tree(
        self,
        file_paths: List[str],
        ignore_patterns: Optional[List[str]] = None,
        max_depth: int = 10,
    ) -> FileTreeResponse:
        """Builds a hierarchical tree from a flat list of file paths.

        Filters out noisy directories and files, and identifies key documentation/manifest files.
        """
        filtered_files: List[str] = []
        total_files = len(file_paths)

        for p in file_paths:
            if not self.should_ignore_path(p, ignore_patterns):
                filtered_files.append(p.replace("\\", "/"))

        # Build nested tree
        tree_root: Dict[str, Any] = {"children": {}}
        total_directories = 0

        for file_path in filtered_files:
            parts = file_path.split("/")
            if len(parts) > max_depth:
                parts = parts[:max_depth]

            current = tree_root
            for i, part in enumerate(parts):
                is_file = i == len(parts) - 1
                if is_file:
                    ext = part.rsplit(".", 1)[-1].lower() if "." in part else None
                    current["children"][part] = {
                        "path": "/".join(parts[: i + 1]),
                        "name": part,
                        "type": "file",
                        "extension": ext,
                    }
                else:
                    if part not in current["children"]:
                        total_directories += 1
                        current["children"][part] = {
                            "path": "/".join(parts[: i + 1]),
                            "name": part,
                            "type": "directory",
                            "children": {},
                        }
                    current = current["children"][part]

        def convert_to_nodes(node_dict: Dict[str, Any]) -> List[FileNode]:
            nodes: List[FileNode] = []
            for name, data in sorted(
                node_dict.items(),
                key=lambda x: (0 if x[1]["type"] == "directory" else 1, x[0].lower()),
            ):
                children = None
                if data["type"] == "directory" and "children" in data:
                    children = convert_to_nodes(data["children"])

                nodes.append(
                    FileNode(
                        path=data["path"],
                        name=data["name"],
                        type=data["type"],
                        extension=data.get("extension"),
                        children=children,
                    )
                )
            return nodes

        tree_nodes = convert_to_nodes(tree_root["children"])
        key_files = self.identify_key_files(filtered_files)

        return FileTreeResponse(
            total_files=total_files,
            filtered_files=len(filtered_files),
            total_directories=total_directories,
            tree=tree_nodes,
            key_files=key_files,
        )

    def identify_key_files(self, file_paths: List[str]) -> Dict[str, str]:
        """Identifies standard repository documentation and manifest files."""
        key_files: Dict[str, str] = {}
        normalized = [p.replace("\\", "/") for p in file_paths]

        for p in normalized:
            lower = p.lower()
            name = os.path.basename(lower)

            if name in {"readme.md", "readme.rst", "readme.txt", "readme"}:
                if "readme" not in key_files or "/" not in p:
                    key_files["readme"] = p
            elif name in {"contributing.md", "contributing.rst", "contributing"}:
                if "contributing" not in key_files:
                    key_files["contributing"] = p
            elif name in {"license", "license.md", "license.txt"}:
                if "license" not in key_files:
                    key_files["license"] = p
            elif name in {"code_of_conduct.md"}:
                key_files["code_of_conduct"] = p
            elif "pull_request_template" in name:
                key_files["pr_template"] = p
            elif name == "package.json":
                if "package_json" not in key_files:
                    key_files["package_json"] = p
            elif name in {"requirements.txt", "pyproject.toml", "setup.py"}:
                if "python_manifest" not in key_files:
                    key_files["python_manifest"] = p
            elif name == "cargo.toml":
                key_files["cargo_manifest"] = p
            elif name == "go.mod":
                key_files["go_manifest"] = p

        return key_files

    def analyze_repository_context(
        self,
        metadata: RepositoryMetadata,
        file_paths: List[str],
        key_files_content: Optional[Dict[str, str]] = None,
        focus_area: Optional[str] = None,
    ) -> RepositoryContextResponse:
        """Analyzes repository structure, languages, frameworks, and creates a grounded summary."""
        key_files_content = key_files_content or {}
        normalized_paths = [p.replace("\\", "/") for p in file_paths if not self.should_ignore_path(p)]

        # Detect languages from file extensions
        lang_counts: Dict[str, int] = {}
        for p in normalized_paths:
            ext = p.rsplit(".", 1)[-1].lower() if "." in p else ""
            if ext in LANGUAGE_EXTENSION_MAP:
                lang = LANGUAGE_EXTENSION_MAP[ext]
                lang_counts[lang] = lang_counts.get(lang, 0) + 1

        sorted_langs = sorted(lang_counts.keys(), key=lambda l: lang_counts[l], reverse=True)
        detected_languages = sorted_langs[:5] if sorted_langs else ([metadata.language] if metadata.language else ["Unknown"])

        # Detect key structural directories
        top_dirs = set()
        for p in normalized_paths:
            parts = p.split("/")
            if len(parts) > 1 and not parts[0].startswith("."):
                top_dirs.add(parts[0])
        key_directories = sorted(list(top_dirs))

        # Detect entry points
        entry_patterns = {
            "main.py", "app.py", "wsgi.py", "index.js", "server.js", "app.js",
            "main.ts", "index.ts", "app.tsx", "main.go", "main.rs", "src/index.js",
            "src/main.js", "src/index.ts", "src/main.ts", "src/server.js", "src/app.js"
        }
        entry_points = [p for p in normalized_paths if p in entry_patterns or os.path.basename(p) in entry_patterns]

        # Detect config files
        config_patterns = {
            "package.json", "tsconfig.json", "vite.config.js", "vite.config.ts",
            "pyproject.toml", "setup.cfg", "requirements.txt", "docker-compose.yml",
            "Dockerfile", ".editorconfig", "eslint.config.js", ".eslintrc.json"
        }
        config_files = [p for p in normalized_paths if os.path.basename(p) in config_patterns]

        # Detect test frameworks
        test_frameworks = []
        has_tests = any("test" in p.lower() for p in normalized_paths)
        if any("pytest" in p.lower() or "test_" in os.path.basename(p) for p in normalized_paths):
            test_frameworks.append("pytest")
        if any("jest" in p.lower() or p.endswith(".test.js") or p.endswith(".test.ts") for p in normalized_paths):
            test_frameworks.append("Jest / Node Test Runner")
        if any("vitest" in p.lower() for p in normalized_paths):
            test_frameworks.append("Vitest")
        if not test_frameworks and has_tests:
            test_frameworks.append("Generic Test Suite")

        # Detect documentation files
        doc_files = [p for p in normalized_paths if p.endswith(".md") or "docs/" in p]

        # Inferred project type
        has_react = any("react" in p.lower() or p.endswith(".tsx") or p.endswith(".jsx") for p in normalized_paths)
        has_node = "package.json" in [os.path.basename(p) for p in config_files]
        has_fastapi = any("fastapi" in key_files_content.get(p, "").lower() for p in key_files_content) or any("app/main.py" in p for p in normalized_paths)
        has_python = "Python" in detected_languages or "python_manifest" in self.identify_key_files(normalized_paths)

        if has_react and has_node and has_python:
            project_type = "Full-Stack Application (React + Node.js Express + Python AI Service)"
        elif has_react and has_node:
            project_type = "React Frontend with Node.js API"
        elif has_fastapi:
            project_type = "Python FastAPI Service"
        elif has_python:
            project_type = "Python Application / Service"
        elif has_node:
            project_type = "Node.js JavaScript/TypeScript Service"
        else:
            project_type = f"{detected_languages[0]} Repository" if detected_languages else "Software Project"

        # Construct safe, grounded markdown summary
        summary_lines = [
            f"# Repository Context: {metadata.owner}/{metadata.name}",
            "",
            f"**Project Type:** {project_type}  ",
            f"**Primary Languages:** {', '.join(detected_languages)}  ",
            f"**Default Branch:** `{metadata.default_branch}`  ",
            f"**Open Issues:** {metadata.open_issues} | **Stars:** {metadata.stars}  ",
            "",
            "## Architecture Overview",
            f"- **Key Directories:** {', '.join(f'`{d}/`' for d in key_directories[:8]) if key_directories else 'Flat hierarchy'}",
            f"- **Entry Points:** {', '.join(f'`{ep}`' for ep in entry_points[:5]) if entry_points else 'Not explicitly detected'}",
            f"- **Testing Stack:** {', '.join(test_frameworks) if test_frameworks else 'No explicit framework detected'}",
            f"- **Core Configurations:** {', '.join(f'`{os.path.basename(c)}`' for c in config_files[:6]) if config_files else 'None'}",
        ]

        if focus_area:
            summary_lines.extend([
                "",
                f"## Focus Area: {focus_area}",
                f"Analysis prioritized towards components matching `{focus_area}`.",
            ])

        # If README content is provided, append a concise excerpt
        readme_path = next((p for p in key_files_content if "readme" in p.lower()), None)
        if readme_path and key_files_content.get(readme_path):
            excerpt = key_files_content[readme_path].strip()
            # truncate excerpt safely
            if len(excerpt) > 1200:
                excerpt = excerpt[:1200] + "\n...[truncated for brevity]"
            summary_lines.extend([
                "",
                "## README Summary",
                excerpt,
            ])

        summary_markdown = "\n".join(summary_lines)
        estimated_tokens = self.estimate_tokens(summary_markdown)

        return RepositoryContextResponse(
            project_type=project_type,
            languages_detected=detected_languages,
            key_directories=key_directories,
            entry_points=entry_points,
            config_files=config_files,
            test_frameworks=test_frameworks,
            documentation_files=doc_files[:10],
            summary_markdown=summary_markdown,
            estimated_tokens=estimated_tokens,
        )

    def extract_code_context(
        self,
        query: str,
        files: List[Dict[str, str]],
        max_tokens: int = 8000,
    ) -> ExtractCodeContextResponse:
        """Ranks repository files by relevance to a query and returns snippets within token budget."""
        query_terms = set(re.findall(r"\w+", query.lower()))
        scored_files: List[Tuple[float, Dict[str, str]]] = []

        for f in files:
            path = f.get("path", "")
            content = f.get("content", "")
            if not path or not content:
                continue

            score = 0.0
            path_lower = path.lower()
            content_lower = content.lower()

            # Path matches (high weight)
            for term in query_terms:
                if len(term) >= 3 and term in path_lower:
                    score += 3.0

            # Content term matches
            for term in query_terms:
                if len(term) >= 3:
                    matches = content_lower.count(term)
                    score += min(matches * 0.5, 4.0)

            # Bonus for key files
            base = os.path.basename(path_lower)
            if base in {"package.json", "pyproject.toml", "readme.md"}:
                score += 1.0

            if score > 0:
                scored_files.append((score, f))

        # Sort descending by score
        scored_files.sort(key=lambda x: x[0], reverse=True)

        selected_snippets: List[FileSnippet] = []
        total_tokens = 0

        for score, f in scored_files:
            path = f["path"]
            content = f["content"]
            ext = path.rsplit(".", 1)[-1].lower() if "." in path else None
            lang = LANGUAGE_EXTENSION_MAP.get(ext, ext)

            # Estimate tokens
            file_tokens = self.estimate_tokens(content)

            # If file exceeds remaining budget, truncate or take relevant window
            if total_tokens + file_tokens > max_tokens:
                remaining_tokens = max_tokens - total_tokens
                if remaining_tokens < 150:
                    break  # Stop if budget too low for useful content
                # Truncate content to fit remaining budget
                max_chars = remaining_tokens * 4
                content = content[:max_chars] + "\n\n...[Content truncated to fit token budget]"
                file_tokens = remaining_tokens

            total_tokens += file_tokens
            normalized_score = min(round(score / 10.0, 2), 1.0)

            selected_snippets.append(
                FileSnippet(
                    path=path,
                    content=content,
                    language=lang,
                    token_estimate=file_tokens,
                    relevance_score=normalized_score,
                )
            )

            if total_tokens >= max_tokens:
                break

        return ExtractCodeContextResponse(
            query=query,
            selected_snippets=selected_snippets,
            total_tokens=total_tokens,
            files_considered=len(files),
            files_included=len(selected_snippets),
        )


repository_context_service = RepositoryContextService()
