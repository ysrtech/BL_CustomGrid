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
 * Searchable widget for multiple-selection fields.
 *
 * The combobox in combo-select.js deliberately skips these: it picks one value,
 * and the library behind it cannot represent a multiple. That library does have
 * a "multiple" mode, and it is not safe to use here - it never reads the
 * options already selected, so a field opens showing its placeholder with no row
 * highlighted however many values are stored, and its label then reports only
 * what was clicked in that session rather than what is actually selected. On a
 * product attribute holding hundreds of options that is worse than the native
 * control, so this is a purpose-built widget instead.
 *
 * The native select stays the source of truth throughout: every toggle writes
 * straight to it and fires a change event, so anything else bound to the field
 * behaves exactly as it would with the native control.
 */

if (typeof(blcg) == 'undefined') {
    var blcg = {};
}

blcg.MultiSelect = {
    STORAGE_KEY: 'blcg.multiSelect',
    
    /** How many values to name in the closed control before summarising */
    MAX_NAMED: 3,
    
    /**
     * @param string string
     * @return string
     */
    translate: function(string)
    {
        return (typeof(Translator) != 'undefined') ? Translator.translate(string) : string;
    },
    
    /**
     * @param string value
     * @return string
     */
    escape: function(value)
    {
        return String(value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },
    
    /**
     * @param Element select
     * @return bool
     */
    isEligible: function(select)
    {
        return select.multiple
            && !select.retrieve(this.STORAGE_KEY, null)
            && (select.readAttribute('blcg-searchable') !== '0')
            && (blcg.SearchableSelect.countSelectableOptions(select) > blcg.SearchableSelect.getMinOptions());
    },
    
    /**
     * Turn the given multiple-selection field into a searchable widget
     * 
     * @param Element select
     * @return bool Whether the widget was created
     */
    apply: function(select)
    {
        if (!blcg.SearchableSelect.isEnabled()
            || !(select = $(select))
            || !this.isEligible(select)) {
            return false;
        }
        
        var widget = this.build(select);
        select.store(this.STORAGE_KEY, widget);
        
        return true;
    },
    
    build: function(select)
    {
        var rows = '';
        
        $A(select.options).each(function(option, index) {
            rows += '<li class="blcg-multiselect-option"><label>'
                 + '<input type="checkbox" data-index="' + index + '"' + (option.selected ? ' checked' : '') + ' /> '
                 + '<span>' + this.escape(option.text) + '</span></label></li>';
        }.bind(this));
        
        var box = new Element('div', { 'class': 'blcg-multiselect' });
        
        box.update(
            '<div class="blcg-multiselect-control"><span class="blcg-multiselect-summary"></span>'
            + '<i class="blcg-multiselect-arrow"></i></div>'
            + '<div class="blcg-multiselect-panel">'
            + '<div class="blcg-multiselect-search"><input type="text" autocomplete="off" placeholder="'
            + this.escape(this.translate('Search...')) + '" /></div>'
            + '<div class="blcg-multiselect-actions">'
            + '<a href="#" class="blcg-multiselect-none">' + this.escape(this.translate('Clear')) + '</a>'
            + '</div>'
            + '<ul class="blcg-multiselect-options">' + rows + '</ul>'
            + '</div>',
        );
        
        select.insert({ after: box });
        
        /*
         * The library that powers the single-value combobox hides its source
         * with an inline "display: none", and Prototype's
         * Validation.isVisible() treats a display:none field as absent and
         * skips every rule on it. Nothing hides this select for us, so use the
         * same class rather than display:none, for the same reason: the field
         * has to stay visible to the validator.
         */
        select.addClassName('blcg-combo-select-source');
        
        this.bind(select, box);
        this.refresh(select, box);
        
        return box;
    },
    
    bind: function(select, box)
    {
        var handler = this;
        var control = box.down('.blcg-multiselect-control');
        var panel = box.down('.blcg-multiselect-panel');
        var search = box.down('.blcg-multiselect-search input');
        
        control.observe('click', function(event) {
            event.stop();
            handler.toggle(box);
        });
        
        box.down('.blcg-multiselect-options').observe('change', function(event) {
            var checkbox = Event.element(event);
            
            if (checkbox.type !== 'checkbox') {
                return;
            }
            
            select.options[parseInt(checkbox.readAttribute('data-index'), 10)].selected = checkbox.checked;
            handler.refresh(select, box);
            
            // The native select is the value, so anything bound to it - a
            // dependent field, a validator - has to hear about the change
            select.dispatchEvent(new Event('change', { bubbles: true }));
        });
        
        box.down('.blcg-multiselect-none').observe('click', function(event) {
            event.stop();
            
            box.select('.blcg-multiselect-options input').each(function(checkbox) {
                checkbox.checked = false;
                select.options[parseInt(checkbox.readAttribute('data-index'), 10)].selected = false;
            });
            
            handler.refresh(select, box);
            select.dispatchEvent(new Event('change', { bubbles: true }));
        });
        
        search.observe('keyup', function() {
            handler.filter(box, search.value);
        });
        
        // Clicking the search box must not fold the panel away
        panel.observe('click', function(event) { event.stopPropagation(); });
        
        document.observe('click', function(event) {
            if (!Event.element(event).up || !Event.element(event).up('.blcg-multiselect')) {
                handler.close(box);
            }
        });
        
        document.observe('keydown', function(event) {
            if (event.keyCode === Event.KEY_ESC) {
                handler.close(box);
            }
        });
    },
    
    filter: function(box, term)
    {
        term = term.toLowerCase().strip();
        
        box.select('.blcg-multiselect-option').each(function(row) {
            var matches = (term === '') || (row.down('span').innerHTML.toLowerCase().indexOf(term) !== -1);
            row.style.display = matches ? '' : 'none';
        });
    },
    
    /**
     * Restate in the closed control what the native select currently holds
     * 
     * @param Element select
     * @param Element box
     */
    refresh: function(select, box)
    {
        var names = [];
        
        $A(select.options).each(function(option) {
            if (option.selected) {
                names.push(option.text);
            }
        });
        
        var summary = box.down('.blcg-multiselect-summary');
        
        if (names.length === 0) {
            summary.update(this.escape(this.translate('None selected')));
            box.addClassName('blcg-multiselect-is-empty');
            return;
        }
        
        box.removeClassName('blcg-multiselect-is-empty');
        
        var shown = names.slice(0, this.MAX_NAMED).map(this.escape).join(', ');
        
        if (names.length > this.MAX_NAMED) {
            shown += ' ' + this.escape(this.translate('and %s more').replace('%s', names.length - this.MAX_NAMED));
        }
        
        summary.update(shown);
    },
    
    toggle: function(box)
    {
        if (box.hasClassName('blcg-multiselect-open')) {
            this.close(box);
        } else {
            this.open(box);
        }
    },
    
    open: function(box)
    {
        $$('.blcg-multiselect-open').each(function(other) {
            if (other !== box) {
                other.removeClassName('blcg-multiselect-open');
            }
        });
        
        box.addClassName('blcg-multiselect-open');
        box.down('.blcg-multiselect-search input').focus();
    },
    
    close: function(box)
    {
        box.removeClassName('blcg-multiselect-open');
    }
};
