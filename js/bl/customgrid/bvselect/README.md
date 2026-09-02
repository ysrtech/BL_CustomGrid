# BVSelect (vendored)

Unmodified copy of BVSelect v1.3 - https://github.com/BMSVieira/BVSelect-VanillaJS
MIT licensed, see LICENSE. Vanilla JS, no dependencies.

Used by combo-select.js to render the searchable dropdown filters of the admin
grids. Vendored rather than loaded from a CDN so that the admin keeps working
without outbound network access, and so the version is pinned.

The stylesheet lives alongside the module's other styles, at
skin/adminhtml/default/default/bl/customgrid/bvselect/bvselect.css.

`bvselect.js` is unmodified. `bvselect.css` has five selectors scoped - see the
header comment in that file. Upstream declares `.arrow`, `.up`, `.down`,
`.nofocus` and `.innerinput` globally, and Magento's grid pager uses
`class="arrow"` on its previous/next images, so upstream's
`.arrow { float: right }` displaced the pager arrows on every admin grid.

To update, replace both files from `js/` and `css/` upstream, re-apply that
scoping, and re-check combo-select.js - it is the only caller, and it works
around two quirks of this version that are described in its comments.
