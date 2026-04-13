# Unsplash Production Application Checklist

> Module: Core / Media Integration
> Version: 1.0.0
> Status: Ready for Submission
> Last Updated: April 2026

## Checklist Status

| Requirement | Status | Implementation |
|---|---|---|
| Hotlink photos to original Unsplash image URL | Done | Search results return original URLs from Unsplash API and the app stores hotlinked image URLs without local proxying. |
| Trigger downloads when user uses a photo | Done | When a user selects a photo from image search, frontend calls `/api/image-search/download` which forwards event to Unsplash `download_location`. |
| App does not use Unsplash logo and is not named similarly | Done | Product name remains `GIMS` with no Unsplash-like branding. |
| App name and description are accurate | Done | App identity and module descriptions are ERP-focused and consistent with current product scope. |
| Attribute photographer and Unsplash | Done | UI now shows attribution in result cards: `Photo by {Photographer} on Unsplash` with clickable links. |

## Implemented Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/image-search` | Fetches Unsplash photos with attribution metadata and download tracking URL. |
| POST | `/api/image-search/download` | Sends download event to Unsplash when user applies an image. |

## Attribution Format

Required display format used in UI:

`Photo by {Photographer Name} on Unsplash`

Both links are clickable:
- Photographer profile URL
- Unsplash photo page URL

## Screenshot Evidence (To Attach Before Submission)

Please capture and attach these screenshots in Unsplash developer application form:

1. Search result grid showing attribution text under each image.
2. Product form with selected Unsplash image.
3. Browser network panel showing POST to `/api/image-search/download` after selecting a photo.
4. App branding screen showing `GIMS` name (to prove distinct branding from Unsplash).

## Notes

- `UNSPLASH_ACCESS_KEY` must be configured in environment.
- Rate limit and auth errors are handled in API route and returned with clear messages.
- If rate limit is hit (429), user can retry later.
