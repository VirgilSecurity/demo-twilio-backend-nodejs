import { Directive, OnInit, ElementRef } from '@angular/core';

declare var jQuery: any;

/**
 * Directive which trigger sidebar.
 *
 * @link semantic-ui.com/modules/sidebar.html
 */
@Directive({
    host: {
        '(click)': 'onClick($event)'
    },
    inputs: [
        'options: ipmSidebar',
        'toggle: ipmSidebarToggle'
    ],
    selector: '[ipmSidebar]'
})
export class SidebarDirective implements OnInit {

    public options: any;
    public toggle: string;

    constructor(private el: ElementRef) { }

    public ngOnInit() {
        if (typeof jQuery === 'undefined') {
            console.log('jQuery is not loaded');
            return;
        }

        let options = this.options || {};
        if (options.context) {
            options.context = jQuery(options.context);
        }

        let $sidebar = jQuery(this.el.nativeElement).sidebar(options);

        if(this.toggle) {
            $sidebar.sidebar('attach events', this.toggle)
        }
    }

    public onClick(event: MouseEvent) {
        let $el = jQuery(this.el.nativeElement);
        let $target = jQuery(event.target);
        if ($el.is('.menu') && $target.is('a.item')) {
            $el.sidebar('hide');
        }
    }
}