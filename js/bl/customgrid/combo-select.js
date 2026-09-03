/**
 * NOTICE OF LICENSE
 *
 * This source file is subject to the Open Software License (OSL 3.0)
 * that is bundled with this package in the file LICENSE.txt.
 * It is also available through the world-wide-web at this URL:
 * http://opensource.org/licenses/osl-3.0.php
 *
 * @category   BL
 * @package    BL_CustomGrid
 * @license    http://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

/**
 * Combobox rendering for the searchable dropdown filters of the admin grids.
 *
 * blcg.SearchableSelect keeps the native <select> and puts a search field above
 * it. That works, but it is two controls in one filter cell and it doubles the
 * height of the filter row. This renders the same feature as a single combobox
 * that opens a panel with the search field inside it, using the vendored
 * BVSelect library (see bvselect/README.md).
 *
 * Which of the two is used is set by
 * "Custom Grids > General > Searchable Dropdowns Style". This one applies to
 * the grid filters only; the grid editor keeps blcg.SearchableSelect, whose
 * focusSearch() the editor relies on, and whose inline layout suits the
 * editor's own positioning better.
 */

if (typeof(blcg) == 'undefined') {
    var blcg = {};
}

blcg.ComboSelect = {
    STORAGE_KEY: 'blcg.comboSelect',
    
    /**
     * Return whether the library this rendering depends on is present
     * 
     * @return bool
     */
    isAvailable: function()
    {
        return (typeof(BVSelect) != 'undefined');
    },
    
    /**
     * BVSelect resolves its target element with getElementById, so the select
     * needs an ID, and that ID has to actually resolve back to it - duplicate
     * IDs do occur on some admin pages
     * 
     * @param Element select
     * @return string
     */
    ensureUniqueId: function(select)
    {
        if (select.id && (document.getElementById(select.id) === select)) {
            return select.id;
        }
        
        var id;
        
        do {
            id = 'blcg-combo-select-' + Math.random().toString(36).slice(2, 10);
        } while (document.getElementById(id));
        
        select.id = id;
        
        return id;
    },
    
    /**
     * Selects whose value is watched for changes
     */
    watched: [],
    
    syncQueued: false,
    
    /**
     * BVSelect writes the chosen option straight onto the native select, so
     * form serialization - and therefore the grid's Search button - is correct
     * either way. But it only ever calls an inline onchange attribute, it never
     * dispatches an event, so anything bound with observe() or addEventListener
     * would never hear about it. Watch the selects handled here and fire the
     * event instead.
     * 
     * @param Element select
     */
    watch: function(select, box)
    {
        this.watched.push({ element: select, box: box, lastValue: select.value });
        
        if (!this.isWatching) {
            this.isWatching = true;
            document.addEventListener('click', this.scheduleSync.bind(this), true);
            document.addEventListener('keyup', this.scheduleSync.bind(this), true);
        }
    },
    
    scheduleSync: function()
    {
        if (this.syncQueued) {
            return;
        }
        
        this.syncQueued = true;
        
        setTimeout(function() {
            this.syncQueued = false;
            
            // Drop the entries whose select went away with an AJAX grid reload
            this.watched = this.watched.filter(function(entry) {
                return entry.element.isConnected;
            });
            
            this.watched.each(function(entry) {
                if (entry.element.value !== entry.lastValue) {
                    entry.lastValue = entry.element.value;
                    this.reflectEmptyState(entry.element, entry.box);
                    entry.element.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }.bind(this));
        }.bind(this), 0);
    },
    
    /**
     * @param string string
     * @return string
     */
    translate: function(string)
    {
        return (typeof(Translator) != 'undefined') ? Translator.translate(string) : string;
    },
    
    /**
     * Give a nameless empty option something to display.
     *
     * Both the closed control and the list row are drawn from the option's
     * text, so an option that is empty in both value and label - which is how
     * Magento writes the "no value" choice of a grid filter and of most
     * attribute dropdowns - renders as a blank box and an invisible row.
     * Naming the option fixes both at once, and keeps working when the library
     * redraws the control after a selection.
     *
     * Options that already carry a label, such as "All Countries", are left
     * alone: they are clear as they are.
     *
     * @param Element select
     * @param string placeholder
     */
    labelEmptyOption: function(select, placeholder)
    {
        if (placeholder === '') {
            return;
        }
        
        $A(select.options).each(function(option) {
            if ((option.value === '') && (option.text.strip() === '')) {
                option.text = placeholder;
            }
        });
    },
    
    /**
     * Mark a combobox that currently holds no value, so it can be shown as a
     * prompt rather than as a chosen value
     * 
     * @param Element select
     * @param Element box
     */
    reflectEmptyState: function(select, box)
    {
        if (!box) {
            return;
        }
        
        if (blcg.Tools.isEmptyValue(select.value)) {
            box.addClassName('blcg-combo-select-is-empty');
        } else {
            box.removeClassName('blcg-combo-select-is-empty');
        }
    },
    
    /**
     * Turn the given select element into a combobox, if it is eligible
     * 
     * @param Element select
     * @param object config Accepts a "placeholder" for the empty option
     * @return bool Whether the combobox was created
     */
    apply: function(select, config)
    {
        if (!this.isAvailable()
            || !(select = $(select))
            || select.multiple
            || select.retrieve(this.STORAGE_KEY, null)
            || !blcg.SearchableSelect.isEligible(select)) {
            return false;
        }
        
        config = config || {};
        var placeholder = (typeof(config.placeholder) != 'undefined') ? config.placeholder : '';
        this.labelEmptyOption(select, placeholder);
        
        try {
            new BVSelect({
                selector: '#' + this.ensureUniqueId(select),
                width: '100%',
                searchbox: true,
                search_autofocus: true,
                search_placeholder: this.translate('Search...'),
                placeholder: (placeholder !== '') ? placeholder : (select.options.length ? select.options[0].text : ''),
                // Handled with CSS instead, see the note in styles.css
                offset: false
            });
        } catch (e) {
            // Leave a usable native select rather than a half-built widget
            select.style.display = '';
            return false;
        }
        
        select.store(this.STORAGE_KEY, true);
        
        var box = select.next('.bv_mainselect');
        this.watch(select, box);
        this.reflectEmptyState(select, box);
        
        return true;
    },
    
    /**
     * Turn every eligible select inside the given container into a combobox
     * 
     * @param Element container
     * @return int Number of comboboxes created
     */
    applyToContainer: function(container)
    {
        var count = 0;
        
        if (!(container = $(container))) {
            return count;
        }
        
        var config = { placeholder: this.translate('-- Please Select --') };
        
        container.select('select').each(function(select) {
            /*
             * A combobox holds one value, so multiples go to the widget built
             * for them - see multi-select.js.
             */
            if (select.multiple) {
                if ((typeof(blcg.MultiSelect) != 'undefined') && blcg.MultiSelect.apply(select)) {
                    count++;
                }
                
                return;
            }
            
            if (this.apply(select, config)) {
                /*
                 * BVSelect hides the original select with an inline
                 * "display: none". Prototype's Validation.isVisible() walks up
                 * from a field and treats a display:none one as absent,
                 * skipping every rule on it - so on a form that would silently
                 * turn off required-entry validation for any field replaced
                 * here. This class keeps the select in the layout, one pixel
                 * wide and transparent, so it still validates. See styles.css.
                 */
                select.addClassName('blcg-combo-select-source');
                
                var box = select.next('.bv_mainselect');
                
                if (box) {
                    box.addClassName('blcg-combo-select-form');
                }
                
                count++;
            }
        }.bind(this));
        
        return count;
    }
};

/**
 * Handler in charge of making the long dropdowns of admin forms searchable.
 *
 * Which forms is a configuration value, because it depends on the store: the
 * product form is the one that usually needs it, since attributes like a
 * publisher or supplier list grow into the hundreds of options.
 */
blcg.ComboSelect.AdminForms = {
    isInitialized: false,
    observed: [],
    
    init: function()
    {
        if (this.isInitialized
            || !blcg.SearchableSelect.isEnabled()
            || !blcg.ComboSelect.isAvailable()) {
            return;
        }
        
        this.selectors = blcg.SearchableSelect.config.formSelectors || [];
        
        if (!this.selectors.length) {
            return;
        }
        
        this.isInitialized = true;
        this.applyToDocument();
    },
    
    /**
     * @return Element[]
     */
    getForms: function()
    {
        var forms = [];
        
        this.selectors.each(function(selector) {
            try {
                $$(selector).each(function(form) {
                    if (forms.indexOf(form) === -1) {
                        forms.push(form);
                    }
                });
            } catch (e) {
                // A selector typed into the config field can be invalid
            }
        });
        
        return forms;
    },
    
    applyToDocument: function()
    {
        this.getForms().each(function(form) {
            blcg.ComboSelect.applyToContainer(form);
            this.observe(form);
        }.bind(this));
    },
    
    /**
     * Most of an admin form's tabs are fetched over AJAX, and their fields
     * therefore appear well after dom:loaded. Watching the form covers those,
     * and anything else that adds fields later, without needing a hook into
     * each individual screen.
     * 
     * @param Element form
     */
    observe: function(form)
    {
        if (typeof(MutationObserver) == 'undefined' || this.observed.indexOf(form) !== -1) {
            return;
        }
        
        this.observed.push(form);
        var handler = this;
        var scheduled = false;
        
        new MutationObserver(function() {
            if (scheduled) {
                return;
            }
            
            scheduled = true;
            
            // Coalesce the burst of mutations a tab load produces into one pass
            setTimeout(function() {
                scheduled = false;
                
                try {
                    blcg.ComboSelect.applyToContainer(form);
                } catch (e) {}
            }, 200);
        }).observe(form, { childList: true, subtree: true });
    }
};

document.observe('dom:loaded', function() {
    blcg.ComboSelect.AdminForms.init();
});
