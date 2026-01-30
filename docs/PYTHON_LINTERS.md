# Python Linter Frameworks & Settings

This project adheres to strict coding standards enforced by the following "GOAT" (Greatest of All Time) Python linter frameworks and configurations.

## 1. Ruff (Primary Linter & Formatter)

**Ruff** is used as the primary, high-performance linter. It replaces Flake8, isort, and others.

### Configuration (`pyproject.toml`)

- **Selected Rule Sets:**
  - `E`: pycodestyle errors (Style checks)
  - `F`: Pyflakes (Logic errors, unused imports)
  - `B`: flake8-bugbear (Common bugs and design problems)
  - `S`: flake8-bandit (Security checks)

- **Global Ignores:**
  - `E501`: Line too long (We rely on soft wrapping or reasonable discretion rather than a hard limit)

- **Per-File Ignores:**
  - `tests/*`: `S101` (Allows use of `assert` in tests, which Bandit normally flags)

## 2. Pylint (Secondary Analysis)

**Pylint** is used for additional static analysis, specifically targeting code quality and bad practices not covered by Ruff.

### Configuration (`pyproject.toml`)

- **Disabled Checks (Noise Reduction):**
  - `C0114`: Missing module docstring
  - `C0115`: Missing class docstring
  - `C0116`: Missing function docstring
    _Rationale: We prioritize self-documenting code and specific comments over mandatory docstrings for every element._

- **Enabled Checks:**
  - `global-statement`: Explicitly flags usage of the `global` keyword to discourage mutable global state.

## 3. Bandit (Security)

**Bandit** is used to find common security issues in Python code. Note that Ruff's `S` ruleset also covers many of these.

### Configuration (`pyproject.toml`)

- **Excluded Directories:**
  - `venv`
  - `tests`
- **Skips:**
  - `B101`: Use of assert (Skipped globally in Bandit config, though Ruff handles this granularly)

## Usage

To run the linters, typically you would use:

```bash
# Run Ruff
ruff check .

# Run Pylint
pylint apps/ai-service
```
