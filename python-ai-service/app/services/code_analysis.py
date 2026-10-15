"""Code analysis service interface for Member 2 implementation.

Provides AST/structural parsing and syntax extraction contracts.
"""

import ast
from typing import List
from app.core.logging import logger
from app.schemas.analysis import CodeAnalysisRequest, CodeAnalysisResponse, CodeSymbol


class CodeAnalysisService:
    """Service responsible for structural and syntactic code analysis."""

    def analyze_code(self, request: CodeAnalysisRequest) -> CodeAnalysisResponse:
        """Analyzes code syntax, symbols, and dependencies.

        Serves as the foundation interface for Member 2's implementation.
        Includes built-in baseline AST extraction for Python files.
        """
        file_path = request.file_path
        content = request.code_content
        lines = content.splitlines()
        line_count = len(lines)
        symbols: List[CodeSymbol] = []
        dependencies: List[str] = []

        # Baseline Python AST extraction if python file
        if file_path.endswith(".py"):
            try:
                tree = ast.parse(content)
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
                        symbols.append(
                            CodeSymbol(
                                name=node.name,
                                type="function",
                                line_start=node.lineno,
                                line_end=getattr(node, "end_lineno", None),
                                docstring=ast.get_docstring(node),
                            )
                        )
                    elif isinstance(node, ast.ClassDef):
                        symbols.append(
                            CodeSymbol(
                                name=node.name,
                                type="class",
                                line_start=node.lineno,
                                line_end=getattr(node, "end_lineno", None),
                                docstring=ast.get_docstring(node),
                            )
                        )
                    elif isinstance(node, ast.Import):
                        for alias in node.names:
                            dependencies.append(alias.name)
                    elif isinstance(node, ast.ImportFrom):
                        if node.module:
                            dependencies.append(node.module)
            except Exception as e:
                logger.warning(f"AST parsing failed for {file_path}: {e}")

        lang = request.language or ("Python" if file_path.endswith(".py") else "Code")

        return CodeAnalysisResponse(
            file_path=file_path,
            language=lang,
            line_count=line_count,
            symbols=symbols,
            dependencies=sorted(list(set(dependencies))),
            complexity_notes=f"File contains {line_count} lines and {len(symbols)} identified symbols.",
            relevant_sections=[],
        )


code_analysis_service = CodeAnalysisService()
