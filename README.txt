HYSTERIA'S CURE — HAI REVIEW FLOW REPLACEMENT PACKAGE

Files included:
- app.py: full backend; pending submissions go to pendingQuestions, with batch idempotency.
- question-bank.html: full page with textbook upload/library UI and loads the new review modules.
- question-bank.js: full admin bank manager; unverified manual submissions go to pendingQuestions.
- question-selector.js: practice selector only accepts verified published remote questions.
- hai-draft-review.js: complete draft review/edit/approve/submit flow.
- hai-pending-review.js: final approval queue; only Approve & Publish writes to questionBank.
- firebase-rules.json: admin-only queue and publishing rules.
- hai-studio.html and hai-studio.js: saved current versions, included for completeness.

INSTALLATION:
1. Back up your current deployed files and Firebase rules first.
2. Replace backend app.py with this app.py and deploy on Render. Keep your existing HAI package and environment variables.
3. Replace these GitHub files: question-bank.html; js/question-bank.js; js/question-selector.js; js/hai-draft-review.js; js/hai-pending-review.js.
4. Replace hai-studio.html and js/hai-studio.js with included versions only if your deployed versions differ.
5. Review firebase-rules.json carefully and publish it. This package restricts questionBank writes to the designated admin UID.
6. Deploy and hard-refresh. Test with one draft: submit -> verify it appears in pendingQuestions only -> approve -> verify it appears in questionBank with verified=true.

IMPORTANT: This package was syntax-checked locally. It was not tested against your live Firebase project or Render deployment.
