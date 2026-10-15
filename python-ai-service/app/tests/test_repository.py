"""Test suite for repository context processing and tree endpoints."""

from fastapi import status


SAMPLE_FILE_PATHS = [
    "README.md",
    "CONTRIBUTING.md",
    "package.json",
    "server/src/server.js",
    "server/src/app.js",
    "server/src/routes/health.routes.js",
    "client/src/App.jsx",
    "client/src/main.jsx",
    "python-ai-service/app/main.py",
    "python-ai-service/requirements.txt",
    "node_modules/express/index.js",
    ".git/config",
    "dist/bundle.js",
    "assets/logo.png",
]


def test_parse_repository_tree_success(client):
    """Verifies parsing of flat file paths into filtered hierarchy and key files."""
    payload = {
        "files": SAMPLE_FILE_PATHS,
        "max_depth": 5,
    }

    response = client.post("/api/repository/tree", json=payload)
    assert response.status_code == status.HTTP_200_OK

    body = response.json()
    assert body["success"] is True
    data = body["data"]

    # Total files in input vs filtered (node_modules, .git, dist, logo.png should be filtered)
    assert data["total_files"] == len(SAMPLE_FILE_PATHS)
    assert data["filtered_files"] < data["total_files"]

    # Key files detected
    assert "readme" in data["key_files"]
    assert data["key_files"]["readme"] == "README.md"
    assert "contributing" in data["key_files"]
    assert data["key_files"]["contributing"] == "CONTRIBUTING.md"
    assert "package_json" in data["key_files"]

    # Tree roots structure
    tree = data["tree"]
    assert len(tree) > 0
    top_names = [node["name"] for node in tree]
    assert "README.md" in top_names
    assert "server" in top_names
    assert "node_modules" not in top_names
    assert ".git" not in top_names


def test_parse_repository_tree_empty_validation(client):
    """Verifies that an empty files list returns a 422 or 400 error."""
    response = client.post("/api/repository/tree", json={"files": []})
    assert response.status_code in [status.HTTP_400_BAD_REQUEST, 422]

    body = response.json()
    assert body["success"] is False
    assert "error" in body


def test_extract_repository_context_success(client):
    """Verifies extraction of architecture overview and repository summary."""
    payload = {
        "metadata": {
            "owner": "Neeraj-code-beep",
            "name": "OpenOrbit",
            "default_branch": "main",
            "language": "JavaScript",
            "stars": 12,
            "open_issues": 3,
        },
        "file_paths": SAMPLE_FILE_PATHS,
        "key_files_content": {
            "README.md": "# OpenOrbit\nAI-powered guide for open source contributions.",
            "package.json": '{"name": "openorbit"}',
        },
        "focus_area": "python-ai-service",
    }

    response = client.post("/api/repository/context", json=payload)
    assert response.status_code == status.HTTP_200_OK

    body = response.json()
    assert body["success"] is True
    data = body["data"]

    assert "Full-Stack Application" in data["project_type"] or "JavaScript" in data["languages_detected"]
    assert "server" in data["key_directories"] or "client" in data["key_directories"]
    assert "summary_markdown" in data
    assert "OpenOrbit" in data["summary_markdown"]
    assert "Focus Area" in data["summary_markdown"]
    assert data["estimated_tokens"] > 0


def test_extract_repository_context_missing_metadata(client):
    """Verifies validation error when required metadata is missing."""
    payload = {
        "file_paths": SAMPLE_FILE_PATHS,
    }

    response = client.post("/api/repository/context", json=payload)
    assert response.status_code == 422

    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "VALIDATION_ERROR"


def test_extract_code_context_ranking(client):
    """Verifies ranking and token budget bounding for code snippets."""
    payload = {
        "query": "health check endpoint route",
        "files": [
            {
                "path": "server/src/routes/health.routes.js",
                "content": "router.get('/health', (req, res) => res.json({ status: 'ok' }));",
            },
            {
                "path": "client/src/components/Header.jsx",
                "content": "export function Header() { return <header>OpenOrbit</header>; }",
            },
            {
                "path": "README.md",
                "content": "# OpenOrbit Documentation\nExplains how health checks work.",
            },
        ],
        "max_tokens": 500,
    }

    response = client.post("/api/repository/extract-context", json=payload)
    assert response.status_code == status.HTTP_200_OK

    body = response.json()
    assert body["success"] is True
    data = body["data"]

    assert data["files_included"] >= 1
    # health.routes.js should be first due to highest query relevance
    first_snippet = data["selected_snippets"][0]
    assert "health" in first_snippet["path"]
    assert first_snippet["relevance_score"] > 0.0
    assert data["total_tokens"] <= 500


def test_extract_code_context_empty_query(client):
    """Verifies 422 or 400 error on empty query string."""
    payload = {
        "query": "",
        "files": [
            {"path": "test.py", "content": "print('hello')"},
        ],
    }

    response = client.post("/api/repository/extract-context", json=payload)
    assert response.status_code in [status.HTTP_400_BAD_REQUEST, 422]
    assert response.json()["success"] is False
