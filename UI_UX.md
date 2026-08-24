# GeoSR UI/UX Specification

## 1. UX objective

GeoSR should let a first-time user understand and demonstrate the complete workflow without learning remote-sensing terminology first. The interface uses plain language at the primary level and exposes scientific terms as secondary labels, tooltips, and Expert mode details.

## 2. Experience principles

1. Show one primary next action.
2. Use Select, Enhance, Analyze, Export as the mental model.
3. Explain technical metrics rather than hiding them.
4. Never fill an empty state with invented values.
5. Keep satellite imagery visually dominant.
6. Use animation to clarify state changes, not decorate the screen.
7. Make cached, live, reference-based, and no-reference results visibly different.

## 3. Information architecture

### 3.1 Navigation

| Label | Purpose | MVP status |
| --- | --- | --- |
| Home | Product summary and recent demo state | Working |
| Enhance Image | Select input and run 4x SR | Working |
| Compare Results | Before/after comparison | Working |
| Analyze Land | NDVI and green-cover analysis | Working |
| Detect Changes | Two-date analysis | Coming next |
| Quality Check | Validation and consistency | Partially working |
| Downloads | Generated GeoTIFFs and reports | Working |
| Settings | Local preferences | Minimal |
| Help | Band order, metrics, limitations | Working |

### 3.2 Simple and Expert modes

Simple mode:

- Plain-language labels.
- Bundled sample selection.
- One Enhance Image button.
- Essential results only.

Expert mode:

- Band mapping.
- Raw metadata.
- Model identifier and device.
- Reference status.
- Metric definitions.
- Advanced export details.

Expert mode does not change the scientific computation; it changes the amount of information shown.

## 4. Primary workflow

~~~mermaid
flowchart LR
    Select["1 Select Image"] --> Enhance["2 Enhance"]
    Enhance --> Analyze["3 Analyze"]
    Analyze --> Export["4 Export"]
~~~

### 4.1 Select Image

Default:

- Two large bundled sample cards: Urban and Crops.
- Upload GeoTIFF secondary action.
- Short band requirement: B04, B03, B02, B08.

Valid selection:

- Show thumbnail, filename or sample name, dimensions, CRS, resolution, and reference availability.
- Enable Enhance Image.

Invalid selection:

- Preserve the user's input card.
- Show the exact problem and correction.
- Do not show a generic Something went wrong message.

### 4.2 Enhance

The primary button reads Enhance Image.

During processing:

- Lock duplicate submission.
- Show model-preparation, preprocessing, enhancement, and export progress as human-readable stages.
- Keep the rest of the page usable.
- Provide an estimated time only when based on measured local history; otherwise say Processing locally.

Completed:

- Advance the workflow to Analyze.
- Focus the comparison result heading.
- Announce completion for assistive technology.

Cached fallback:

- Show Cached Result badge beside the model status.
- Explain that the output was previously generated using the same pinned baseline.

### 4.3 Analyze

The MVP opens Crops by default for a crop sample and shows:

- NDVI preview.
- Green-cover percentage.
- Vegetation-health legend.
- Threshold information.

City and Disaster tabs remain visible but marked Coming next until genuine models exist.

### 4.4 Export

Offer:

- Download GeoTIFF, primary analytical output.
- Download Preview, secondary visual output.
- Create Report, presentation artifact.

Each item states its format and purpose.

## 5. Main dashboard layout

### 5.1 Desktop

~~~text
┌──────────────┬──────────────────────────────────────────────────────┐
│ Sidebar      │ Search, Simple/Expert, date and status              │
│              ├──────────────────────────────────────────────────────┤
│ Navigation   │ Step 1 — Step 2 — Step 3 — Step 4                  │
│              ├──────────────────────────────────────────────────────┤
│              │ Heading, primary action and summary pills           │
│              ├───────────────────────────────┬──────────────────────┤
│              │ Before/after satellite viewer │ Quality & Trust      │
│              ├───────────────┬───────────────┴──────────────────────┤
│ Settings     │ Consistency   │ Analysis and future change card     │
│ Help         ├───────────────┴──────────────────────────────────────┤
│              │ Status and export actions                           │
└──────────────┴──────────────────────────────────────────────────────┘
~~~

The comparison viewer receives the largest visual area.

### 5.2 Tablet

- Sidebar collapses to an icon rail or drawer.
- Quality panel moves below the comparison viewer.
- Analysis cards use a two-column grid.

### 5.3 Mobile

Mobile is supported for reviewing results, not the primary live presentation:

- Navigation becomes a sheet.
- Workflow becomes a compact progress list.
- Cards stack vertically.
- Comparison slider remains operable.

## 6. Screen specifications

### 6.1 Enhance Image screen

Header:

- Title: Enhance Satellite Imagery.
- Subtitle: Turn 10 m Sentinel-2 imagery into clearer, analysis-ready 2.5 m maps.
- Primary: Enhance Image.
- Secondary: Upload GeoTIFF.

Summary:

- Original Detail: 10 m.
- Enhanced Detail: 2.5 m.
- Improvement: 4x.
- Cloud Obstruction: value from metadata or Not available.

Comparison:

- Heading: See the Improvement.
- Instruction: Drag the slider to compare the original and enhanced image.
- Labels: Before · 10 m and After · 2.5 m.
- Layer switch: Natural Color, Vegetation, Infrared.

### 6.2 Quality & Trust panel

| Plain label | Technical label | Display rule |
| --- | --- | --- |
| Image Similarity | PSNR | Only with HR reference |
| Structure Match | SSIM | Only with HR reference |
| Color Accuracy | Spectral consistency | State reference type |
| Processing Time | Runtime | Always after live inference |
| Reliability | Future calibrated score | Waiting until implemented |

Before inference:

No quality scores yet. Enhance the image to calculate them.

Without reference:

High-resolution reference unavailable. Consistency checks do not represent ground-truth accuracy.

### 6.3 Consistency panel

Use the title Where should I review carefully? for Simple mode and Reconstruction Consistency for Expert mode.

The map may show local residuals after reducing SR output to source resolution. It must not be titled formal uncertainty.

Legend:

- More consistent.
- Review carefully.

### 6.4 Analyze Land screen

MVP content:

- Enhanced natural-color preview.
- NDVI preview.
- Green-cover percentage.
- Threshold legend.
- Download NDVI.

Future content:

- Field boundaries.
- Built-up regions.
- Road extraction.
- Flood or damage analysis.

## 7. Component strategy

### 7.1 shadcn/ui

Use for:

- Buttons and icon buttons.
- Cards.
- Tabs.
- Tooltips.
- Dialogs.
- Select controls.
- Alerts.
- Skeleton loaders.
- Progress.
- Sheets and drawers.

### 7.2 Componentry

Use at most a few low-cost effects:

- Subtle heading entrance.
- Card hover transition on sample selection.
- Result-state transition.

Do not use shader, particle, image-trail, matrix, liquid, or cursor-heavy effects.

### 7.3 Custom components

- Accessible before/after slider.
- Satellite layer switcher.
- Metric row with availability state.
- Sample card.
- Job-status stepper.
- NDVI legend.

## 8. Visual system

### 8.1 Color tokens

| Token | Suggested value | Use |
| --- | --- | --- |
| Forest 950 | #052E24 | Sidebar and highest contrast |
| Forest 800 | #0B4A38 | Primary dark |
| Emerald 700 | #087A55 | Primary actions |
| Emerald 100 | #DCEFE5 | Active and success surfaces |
| Sage 50 | #F4F7F1 | Secondary surfaces |
| Ivory | #FBFAF5 | Main canvas |
| Charcoal | #17211D | Primary text |
| Muted | #67736D | Secondary text |
| Amber | #D98B1F | Review warning |
| Coral | #D84E4E | Removed/error areas |

Check final values for WCAG contrast before implementation.

### 8.2 Typography

- UI text: a highly legible sans-serif.
- Optional display serif only for major headings.
- Body size: 16 px target.
- Minimum helper text: 12 to 13 px.
- Use tabular numerals for metrics.

### 8.3 Shape and depth

- Card radius: 14 to 18 px.
- Control height: at least 40 px.
- Thin neutral borders.
- Restrained shadows.
- Avoid excessive translucent glass effects over satellite images.

## 9. Interaction states

Every asynchronous component requires:

- Idle.
- Disabled.
- Hover.
- Keyboard focus.
- Loading.
- Success.
- Warning.
- Error.
- Cached.

Metric rows additionally require:

- Waiting.
- Measured with reference.
- Consistency-only.
- Unavailable.

## 10. Accessibility

- Logical heading order.
- Keyboard-accessible slider, tabs, dialogs, and downloads.
- Visible focus rings.
- Text equivalents for map legends.
- Non-color status icons and labels.
- Minimum target size of 40 by 40 px.
- Reduced-motion support.
- Alt text describing the imagery state, not claiming features that were not verified.
- Live-region announcements for job state.

## 11. Content guidelines

Use:

- Enhance Image.
- High-resolution reference unavailable.
- Cached Result.
- Review carefully.
- Consistency check.

Avoid:

- AI magically restores.
- Ground truth generated.
- 100% accurate.
- Guaranteed details.
- Uncertainty score when no calibrated uncertainty exists.

## 12. Demo usability acceptance

- A new user identifies the primary action within five seconds.
- The bundled sample can be selected and enhanced in three primary actions.
- The comparison slider works with mouse and keyboard.
- The user understands why some metrics are unavailable.
- Cached results cannot be mistaken for live inference.
- The output and NDVI downloads have clear labels.

