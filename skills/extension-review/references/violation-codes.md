# Chrome Web Store Violation Codes

Reference: https://developer.chrome.com/docs/webstore/troubleshooting

## CRITICAL — Immediate Rejection

| Code          | Name                      | Description                                      |
| ------------- | ------------------------- | ------------------------------------------------ |
| Blue Argon    | Remote Code Execution     | eval(), external scripts, remote code loading    |
| Red Titanium  | Code Obfuscation          | Base64 encoding, char encoding (minification OK) |
| Grey Silicon  | Cryptocurrency Mining     | Mining on user machines                          |
| Blue Zinc     | Copyright Circumvention   | Paywall bypass, video downloaders                |
| Blue Copper   | Unauthorized Downloads    | Facilitating piracy                              |
| Blue Titanium | Enforcement Circumvention | Evading review process                           |

## HIGH — Very Likely Rejection

| Code             | Name                     | Description                                  |
| ---------------- | ------------------------ | -------------------------------------------- |
| Purple Potassium | Excessive Permissions    | Requesting unused or unnecessary permissions |
| Purple Lithium   | Missing Privacy Policy   | Collecting data without privacy policy       |
| Yellow Zinc      | Missing Metadata         | No icons, description, or screenshots        |
| Red Magnesium    | Single Purpose Violation | Multiple unrelated features                  |
| Red Nickel       | Deceptive Behavior       | Functionality doesn't match description      |
| Red Copper       | Impersonation            | Copying other extensions or brands           |
| Purple Copper    | Insecure Transmission    | Sending user data over HTTP                  |
| Purple Nickel    | No Data Disclosure       | Collecting data without consent              |
| Purple Magnesium | Data Handling Violation  | Unnecessary browsing activity collection     |
| Red Zinc         | Deceptive Installation   | Misleading marketing or CTAs                 |
| Yellow Magnesium | Non-Functional           | Extension doesn't work as described          |

## MEDIUM — May Cause Rejection

| Code             | Name                   | Description                             |
| ---------------- | ---------------------- | --------------------------------------- |
| Yellow Argon     | Keyword Stuffing       | Spam keywords in metadata               |
| Yellow Potassium | Minimum Functionality  | No real value or features               |
| Yellow Nickel    | Spam                   | Duplicate extensions, fake reviews      |
| Yellow Lithium   | Redirection Only       | Just launches another app/site          |
| Grey Titanium    | Undisclosed Affiliates | Hidden affiliate links                  |
| Blue Nickel      | Override API Bypass    | Modifying new tab without Overrides API |

## CONTENT — Content Policy

| Code           | Name                 | Description                         |
| -------------- | -------------------- | ----------------------------------- |
| Grey Zinc      | Illegal Activities   | Facilitating illegal activities     |
| Grey Copper    | Online Gambling      | Gambling functionality              |
| Grey Lithium   | Pornographic Content | Sexually explicit material          |
| Grey Magnesium | Hate Content         | Hate speech or discrimination       |
| Grey Nickel    | Non-Family-Safe      | Adult content without "Mature" flag |
| Grey Potassium | Violent Content      | Gratuitous violence or harassment   |

## Appeal Process

1. Review rejection email for specific violation code
2. Fix ALL identified issues
3. Submit appeal via Chrome Web Store Developer Dashboard
4. Provide detailed explanation of changes made
5. Typical response time: 1-3 business days

## Key Rules

- **Minification is OK** (webpack/vite output) — obfuscation is NOT
- **activeTab > host_permissions** — always prefer narrowest permission
- **Privacy policy required** if ANY user data is collected/transmitted
- **Single purpose**: one clear, defined functionality per extension
- **Description must match** actual functionality exactly
