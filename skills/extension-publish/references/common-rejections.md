# Common Rejections & Fixes

## Rejection Reasons

### 1. Single Purpose Violation

**Cause**: Extension does multiple unrelated things (e.g., ad blocker + password manager + tab organizer).

**Fix**:

- Define one primary purpose
- Remove features unrelated to that purpose
- Split into separate extensions if needed
- Justify all features as serving the single purpose in submission notes

---

### 2. Excessive Permissions

**Cause**: Requesting permissions not used or broader than needed.

**Fix**:

- Audit every permission — remove unused ones
- Replace `<all_urls>` with specific domains where possible
- Use `activeTab` instead of `tabs` + broad hosts when feasible
- Use optional permissions for non-core features

---

### 3. Missing Privacy Policy

**Cause**: Extension collects user data but no privacy policy URL provided.

**Fix**:

- Host policy at stable public URL (GitHub Pages, own domain)
- Add URL in Developer Dashboard "Privacy practices" tab
- Policy must cover: data collected, use, storage, sharing, deletion

---

### 4. Missing Permission Justification

**Cause**: Sensitive permissions listed without explanation in submission form.

**Fix**:

- In submission form, fill "Permission justifications" for each flagged permission
- Be specific: "We use `tabs` to detect the active tab URL to match ad rules"
- One justification per permission, 1–3 sentences

---

### 5. Deceptive Behavior / Description Mismatch

**Cause**: Extension behaves differently than described, or impersonates another product.

**Fix**:

- Rewrite description to match actual functionality exactly
- Remove any claims that can't be demonstrated
- Don't use competitor brand names misleadingly
- Test that every listed feature works before submitting

---

### 6. Keyword Spam in Listing

**Cause**: Title or description stuffed with keywords, repeated terms, or unrelated terms.

**Fix**:

- Remove repetitive keywords
- Write naturally for users, not search engines
- Each keyword should appear at most 2–3× in entire listing

---

### 7. Remote Code Execution

**Cause**: Extension loads and executes remote JavaScript, uses `eval()`, or `new Function()`.

**Fix**:

- Remove all `eval()` and `new Function()` calls
- Bundle all logic into extension package
- If dynamic content needed, use declarative approaches
- Set strict `content_security_policy` in manifest

---

### 8. User Data Handling Violations

**Cause**: Collecting, selling, or transmitting user data without disclosure.

**Fix**:

- Declare all data collection in Dashboard "Privacy practices"
- Never sell user data
- Minimize data collection — only what's necessary
- Encrypt data in transit (HTTPS only)
- Add clear in-extension disclosure if collecting sensitive data

---

### 9. Non-Functional Extension

**Cause**: Extension crashes, has JS errors, or core features don't work.

**Fix**:

- Test on fresh Chrome profile before every submission
- Check `chrome://extensions` for errors after loading
- Test in both normal and incognito mode
- Verify all API calls succeed in production environment

---

### 10. Broken or Inaccessible Features

**Cause**: Links 404, required sign-in blocks features, geoblocked content.

**Fix**:

- Test all external URLs used in extension
- Provide test account credentials in submission notes if login required
- Note any geographic restrictions in submission notes
- Ensure demo mode or basic functionality available without account

---

## Appeal Process

1. Review rejection email — note specific policy cited
2. Fix the issue completely before appealing
3. Go to Developer Dashboard → select rejected item → "Appeal"
4. Write concise appeal: what was wrong, what you fixed, how you verified
5. Do not appeal without fixing — wastes queue position
6. If appeal denied, fix further and resubmit as new version

## Resubmission Tips

- Increment version number in `manifest.json`
- Add submission notes explaining changes made
- Reference the rejection reason and your fix explicitly
- Include test instructions if features require specific setup
- Typical review time after resubmission: 1–7 days
