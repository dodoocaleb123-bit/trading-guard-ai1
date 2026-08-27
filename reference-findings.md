# Chat reference findings

## Supplied phone and laptop screenshots

- The chat canvas is white and reaches the visible edges of the chat surface.
- The top header has internal padding; its contents do not touch the top edge. The panel icon and assistant identity sit on the left, while Export and Clear are black circular icon-only controls on the right.
- The assistant identity is left-aligned, not a centered group. The assistant name is bold black and the subtitle is small uppercase text beneath it.
- The empty-state prompt is centered horizontally in the chat canvas, uses a large heavy gray treatment, and is split over two lines.
- The bottom composer is an inset rounded ash-gray capsule, not a full-bleed field. It has an internal vertical divider/caret at the left, a light gray placeholder, and a black circular send control at the right.
- The helper caption below the composer is centered and wraps naturally on the phone; it is small dark text and is not part of the gray capsule. In the supplied laptop reference it spans two centered lines as well.
- The screenshots do not show blue user message bubbles; the reference empty state has no messages. Existing app history may still display messages during validation, but its bubble colors should not override the reference ash/gray treatment.
- The phone screenshot includes no in-app keyboard; native keyboard behavior must remain delegated to the device/browser.

## Laptop artboard confirmation

- The laptop reference keeps the existing app sidebar at the left and the chat surface starts immediately beside it.
- The chat header is approximately 80 px high with the panel icon and assistant identity inset from the top-left; Export and Clear are inset from the top-right.
- The bottom capsule is centered within the chat surface with substantial left/right inset, while the helper caption is centered below it. The caption does not touch the physical viewport edges in this laptop composition.
- Cherry AI uses the same geometry as White AI; only the name, subtitle, placeholder, and empty-state prompt change.
