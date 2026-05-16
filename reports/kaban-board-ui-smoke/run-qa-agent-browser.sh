#!/usr/bin/env bash
set -euo pipefail

RUN_DIR="C:/Users/Ben10/Documents/Agent Reports/reports/kaban-board-ui-smoke"
ASSETS="$RUN_DIR/assets"
SESSION="kaban-ui-smoke-agent-browser"
mkdir -p "$ASSETS"
rm -f "$ASSETS"/*.png "$ASSETS/session.webm" "$ASSETS/qa-results.json" "$ASSETS/agent-browser-console.log" "$ASSETS/agent-browser-errors.log"

# agent-browser recording shells out to ffmpeg. Git Bash did not inherit the
# updated Windows PATH after `winget install ffmpeg`, so add common install dirs.
export PATH="/c/Users/Ben10/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.1-full_build/bin:/c/Users/Ben10/scoop/shims:/c/Users/Ben10/scoop/apps/ffmpeg/current/bin:$PATH"

AB=(agent-browser --session "$SESSION" --executable-path "C:/Program Files/Google/Chrome/Application/chrome.exe" --screenshot-dir "$ASSETS")

run() { echo "+ agent-browser ${*:2}" ; "${AB[@]}" "$@"; }
assert_js() {
  local name="$1" js="$2"
  echo "+ ASSERT $name"
  run eval "(() => { const ok = ($js); if (!ok) throw new Error('$name'); return 'PASS $name'; })()" >/dev/null
  echo "PASS $name"
}
shot() { run screenshot "$ASSETS/$1" >/dev/null; echo "SAVED $1"; }

run close --all >/dev/null 2>&1 || true
run record start "$ASSETS/session.webm" http://localhost:5173
run wait 1000
run eval "localStorage.clear(); location.reload(); 'cleared localStorage and reloaded'" >/dev/null
run wait 1000

# TC-01
run snapshot -i -c
assert_js "TC-01 header is Kaban Board" "document.querySelector('h1')?.textContent.trim() === 'Kaban Board'"
assert_js "TC-01 all columns visible" "['Backlog','To Do','In Progress','Done'].every(t => [...document.querySelectorAll('h2')].some(h => h.textContent.trim() === t))"
assert_js "TC-01 initial demo cards visible" "document.querySelectorAll('.task-card').length === 5"
assert_js "TC-01 stats visible" "['TASKS','HIGH','DONE'].every(t => document.querySelector('.stats')?.innerText.includes(t))"
shot "01-initial-board.png"

# TC-02
run fill 'input[aria-label="Task title"]' 'QA test task'
run fill 'input[aria-label="Task description"]' 'Created by QA agent'
run fill 'input[aria-label="Task tag"]' 'QA'
run select 'select[aria-label="Priority"]' 'High'
run select 'select[aria-label="Target column"]' 'todo'
run click 'button[type="submit"]'
run wait 300
assert_js "TC-02 new task in To Do" "[...document.querySelectorAll('article.column')].find(c => c.querySelector('h2')?.textContent.trim()==='To Do')?.innerText.includes('QA test task')"
assert_js "TC-02 priority and tag shown" "(() => { const card=[...document.querySelectorAll('.task-card')].find(c=>c.innerText.includes('QA test task')); return card && card.querySelector('.priority')?.textContent.trim()==='High' && card.querySelector('.tag')?.textContent.trim()==='QA'; })()"
assert_js "TC-02 task count updated" "[...document.querySelectorAll('.stat-card')].find(s=>s.innerText.includes('TASKS'))?.querySelector('strong')?.textContent === '6'"
shot "02-added-task.png"

# TC-03
run fill 'input[aria-label="Search tasks"]' 'QA test task'
run wait 300
assert_js "TC-03 search leaves one visible task" "document.querySelectorAll('.task-card').length === 1 && document.body.innerText.includes('QA test task')"
shot "03-search-filter.png"
run focus 'input[aria-label="Search tasks"]'
run press Control+a
run press Backspace
run wait 300
assert_js "TC-03 clear search restores board" "document.querySelectorAll('.task-card').length === 6"
shot "04-search-cleared.png"

# TC-04: use agent-browser drag; add stable data attributes via agent-browser eval first.
run eval "(() => { [...document.querySelectorAll('.task-card')].find(c=>c.innerText.includes('QA test task')).setAttribute('data-qa','qa-card'); [...document.querySelectorAll('article.column')].find(c=>c.querySelector('h2')?.textContent.trim()==='In Progress').setAttribute('data-qa','progress-column'); return 'marked'; })()" >/dev/null
run drag '[data-qa="qa-card"]' '[data-qa="progress-column"]'
run wait 500
assert_js "TC-04 card moved to In Progress" "[...document.querySelectorAll('article.column')].find(c => c.querySelector('h2')?.textContent.trim()==='In Progress')?.innerText.includes('QA test task')"
assert_js "TC-04 card removed from To Do" "![...document.querySelectorAll('article.column')].find(c => c.querySelector('h2')?.textContent.trim()==='To Do')?.innerText.includes('QA test task')"
shot "05-dragged-to-progress.png"

# TC-05
run click 'button[aria-label="Delete QA test task"]'
run wait 300
assert_js "TC-05 task deleted" "!document.body.innerText.includes('QA test task')"
shot "06-task-deleted.png"

# TC-06
run fill 'input[aria-label="Task title"]' 'Persistence check'
run fill 'input[aria-label="Task description"]' 'Should survive refresh'
run fill 'input[aria-label="Task tag"]' 'Storage'
run select 'select[aria-label="Priority"]' 'Medium'
run select 'select[aria-label="Target column"]' 'todo'
run click 'button[type="submit"]'
run wait 300
assert_js "TC-06 task added before refresh" "document.body.innerText.includes('Persistence check')"
shot "07-before-refresh.png"
run reload
run wait 1000
assert_js "TC-06 task persists after refresh" "document.body.innerText.includes('Persistence check')"
shot "08-after-refresh.png"

# TC-07
run set viewport 390 844
run wait 300
run fill 'input[aria-label="Task title"]' 'Mobile QA'
run fill 'input[aria-label="Task description"]' 'Small task'
run fill 'input[aria-label="Task tag"]' 'MOB'
run select 'select[aria-label="Priority"]' 'Low'
run select 'select[aria-label="Target column"]' 'todo'
run click 'button[type="submit"]'
run wait 300
assert_js "TC-07 mobile task creation" "document.body.innerText.includes('Mobile QA')"
assert_js "TC-07 no horizontal overflow" "document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2"
shot "09-mobile-layout.png"

# TC-08
run set viewport 1280 800
run eval "window.scrollTo(0,0); document.querySelector('input[aria-label=\\\"Task title\\\"]').focus(); 'focused title'" >/dev/null
run press Tab
run press Tab
assert_js "TC-08 keyboard focus reaches form" "['Task description','Task tag','Priority'].includes(document.activeElement?.getAttribute('aria-label'))"
assert_js "TC-08 search input accessible label" "document.querySelectorAll(\"input[aria-label='Search tasks']\").length === 1"
assert_js "TC-08 delete buttons labeled" "document.querySelectorAll(\"button.icon-button[aria-label^='Delete ']\").length > 0"
shot "10-keyboard-focus.png"

# TC-09
run eval "window.__beforeEmpty = document.querySelectorAll('.task-card').length; 'stored count'" >/dev/null
run focus 'input[aria-label="Task title"]'
run press Control+a
run press Backspace
run fill 'input[aria-label="Task description"]' 'No title should not add'
run fill 'input[aria-label="Task tag"]' 'Blank'
run click 'button[type="submit"]'
run wait 300
assert_js "TC-09 blank title not added" "document.querySelectorAll('.task-card').length === window.__beforeEmpty"
shot "11-empty-title-check.png"

run console > "$ASSETS/agent-browser-console.log" || true
run errors > "$ASSETS/agent-browser-errors.log" || true
run eval "(() => JSON.stringify({ userAgent: navigator.userAgent, viewport: { width: innerWidth, height: innerHeight }, localStorageKeys: Object.keys(localStorage), url: location.href }, null, 2))()" > "$ASSETS/environment.json"
run record stop
run close

echo '{"status":"pass","tool":"agent-browser","url":"http://localhost:5173","screenshots":11,"video":"assets/session.webm"}' > "$ASSETS/qa-results.json"
