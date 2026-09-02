# BVSelect (vendored)

Unmodified copy of BVSelect v1.3 - https://github.com/BMSVieira/BVSelect-VanillaJS
MIT licensed, see LICENSE. Vanilla JS, no dependencies.

Used by combo-select.js to render the searchable dropdown filters of the admin
grids. Vendored rather than loaded from a CDN so that the admin keeps working
without outbound network access, and so the version is pinned.

The stylesheet lives alongside the module's other styles, at
skin/adminhtml/default/default/bl/customgrid/bvselect/bvselect.css.

To update, replace both files from `js/` and `css/` upstream, then re-check
combo-select.js - it is the only caller, and it works around two quirks of this
version that are described in its comments.
