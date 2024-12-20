# Moku Proviers

## Overview

- Each provider is instantiated and executedduring runtime.
- Each provider has a special `tableName` in Memory.
- The provider checks if it's respective data (via its `tableName`) has an update in the last 30 minutes.
- If it does, it will execute then provider will return the last executed data.
- If not, then the provider script will execute and return the latest data.

## Notes

- Using `./scripts/*.py` to handle llm interactions, computations and transformations. Because...
    - Gemini 2.0 SDK w/ TypeScript not yet supported?
    - I felt like it (skill issue)
- idk if we'll end up using the pattern of node + python. if so, i can generaliaze a bit more
