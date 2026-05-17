Respond with **valid JSON only** (no markdown fences). Schema:

```json
{
  "caption": "string",
  "hashtags": ["tag1", "tag2"],
  "visualDirection": "string",
  "postImagePrompt": "string"
}
```

Rules:
- Turkish caption for Instagram feed (engaging, professional B2B tone, line breaks OK).
- 8–15 hashtags without leading # in array values.
- `visualDirection`: short English art direction for a single educational post cover image.
- `postImagePrompt`: detailed English prompt for an image model — square educational social post that **explains the article visually** (see image rules in main prompt).
- Do NOT include story, carousel, or multiple images.
