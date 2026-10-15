"""AST-based code analysis and relevant-file discovery."""

import ast
from pathlib import Path


SUPPORTED_EXTENSIONS = {
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".java",
    ".go",
    ".rs",
}


def analyze_python_code(source_code: str) -> dict:
    """Extract structural information from Python source code."""
    try:
        tree = ast.parse(source_code)
    except SyntaxError as exc:
        return {
            "language": "python",
            "valid": False,
            "error": str(exc),
            "imports": [],
            "functions": [],
            "classes": [],
        }

    imports = []
    functions = []
    classes = []

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imports.extend(alias.name for alias in node.names)

        elif isinstance(node, ast.ImportFrom):
            module = node.module or ""
            imports.append(module)

        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            functions.append({
                "name": node.name,
                "line": node.lineno,
                "async": isinstance(node, ast.AsyncFunctionDef),
            })

        elif isinstance(node, ast.ClassDef):
            classes.append({
                "name": node.name,
                "line": node.lineno,
            })

    return {
        "language": "python",
        "valid": True,
        "error": None,
        "imports": sorted(set(imports)),
        "functions": sorted(functions, key=lambda item: item["line"]),
        "classes": sorted(classes, key=lambda item: item["line"]),
    }


def find_relevant_files(
    repository_path: str,
    query: str,
    max_results: int = 20,
) -> list[dict]:
    """Find repository files whose paths or names match a query."""
    root = Path(repository_path).resolve()

    if not root.is_dir():
        raise ValueError("Repository path must point to an existing directory.")

    if not query.strip():
        raise ValueError("Search query cannot be empty.")

    if max_results < 1:
        raise ValueError("max_results must be at least 1.")

    ignored_directories = {
        ".git",
        ".venv",
        "venv",
        "__pycache__",
        "node_modules",
        "dist",
        "build",
    }

    terms = query.lower().split()
    results = []

    for path in root.rglob("*"):
        if not path.is_file():
            continue

        relative_path = path.relative_to(root)

        if any(part in ignored_directories for part in relative_path.parts):
            continue

        if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue

        searchable = str(relative_path).lower()
        matched_terms = [term for term in terms if term in searchable]

        if matched_terms:
            results.append({
                "path": relative_path.as_posix(),
                "score": len(matched_terms) / len(terms),
                "matched_terms": matched_terms,
            })

    results.sort(key=lambda item: (-item["score"], item["path"]))

    return results[:max_results]

