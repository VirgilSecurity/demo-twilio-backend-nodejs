import { Directive, ElementRef } from '@angular/core';

declare var jQuery: any;

@Directive({ selector: '[ipmTooltip]' })

export class TooltipDirective {

    constructor (private el: ElementRef) {
        jQuery(this.el.nativeElement).popup();
    }
}