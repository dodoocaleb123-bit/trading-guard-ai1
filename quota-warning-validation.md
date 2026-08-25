# Twelve Data quota-warning validation notes

- Desktop `/scanner` screenshot after restart: page layout is readable; the cadence card renders correctly and the live diagnostics query was still showing its explicit `checking` state.
- Mobile `/scanner` screenshot at 375px: header, actions, cadence heading, and loading health banner remain readable and fit the viewport without horizontal overflow.
- The screenshots were taken before a fresh post-release scanner cycle completed, so the provider warning banner itself requires a later live-cycle check against a newly persisted `marketDataError`.
