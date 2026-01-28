# Nach Yomi Bot - Claude Code Instructions

## Project Overview
Daily Nach Yomi Telegram Bot with Rav Breitowitz's shiurim. Uses Ralph Wiggum technique for iterative development.

## Tech Stack
- Node.js with Telegraf
- - Sefaria API, Kol Halashon integration
  - - Docker deployment
   
    - ## Development Workflow
   
    - ### Using Ralph Wiggum Loop
    - ```bash
      ./ralph.sh "Your task. Output COMPLETE when done." --max-iterations 20
      ./ralph.sh --prompt-file prompts/feature.md --verbose
      ```

      ### Testing
      ```bash
      npm test
      ```

      ## Completion Signals
      - `<promise>COMPLETE</promise>` - Task finished
      - - `<promise>BLOCKED</promise>` - Needs human input
