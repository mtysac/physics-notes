# contributing

thanks for checking this out. here's how to contribute if you want to.

## adding notes

1. add the pdf to `assets/`
2. add a card in `index.html` inside the `notes-container` div (follow the same pattern as existing cards)
3. add the new class to the note card styles in `css/style.css`
4. optionally create an html version in `notes/` using KaTeX (see existing files for the pattern)

## adding a simulator

1. create a new html page (e.g. `your-sim.html`)
2. create matching css in `css/your-sim.css` and js in `js/your-sim.js`
3. add a card in `index.html` inside the `sims-container` div
4. add a screenshot to `assets/` for the card preview

## code style

- run `npm run lint` before committing — all js files must pass with no errors
- keep js files focused — one file per simulator
- no frameworks, keep it vanilla html/css/js

## reporting issues

open a github issue describing what's wrong or what's missing.
