# Enhanced Admin Grids for OpenMage
## Version 2.0.0.1

This is the updated and maintained version of the Enhanced Admin Grids extension compatible with Magento 1.9 and the latest versions of OpenMage.
All the old mysql4 resource classes, deprecated in the latest versions of OpenMage, have been migrated, and it has been tested with PHP 8.2.

## Searchable dropdowns

Grid columns based on long option lists (order status, attribute values, stores, customer groups, ...)
get a search field above their dropdown, which filters the available options while typing.
It is added both to the grid filters (in the filter row of the grid header) and to the dropdowns
of the grid editor, either when editing a value directly in the grid or in a separate window.

* Type to narrow down the options. Several words can be used, the options matching all of them are kept.
* The empty option and the currently selected options are always kept, so a value can never be lost.
* `ENTER` selects the only remaining option when there is just one left, and applies the grid filters.
* `ESCAPE` resets the search field, arrow down moves to the dropdown itself.

The feature can be turned off, and the number of options from which the search field is added can be
changed, in *System > Configuration > Enhanced Admin Grids > Base Configuration > General*
("Add A Search Field To Long Dropdowns", 10 options by default).
