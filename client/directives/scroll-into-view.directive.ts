import { Directive, ElementRef, Input } from '@angular/core';

@Directive({
    selector: '[ipmScrollIntoView]'
})

export class ScrollIntoViewDirective {

    private condition: boolean;

    @Input() set ipmScrollIf(cond:boolean) {
        this.condition = cond || false;
        if (this.condition) {
            setTimeout(() => this.el.nativeElement.scrollIntoView(false), 100);
        }
    }

    constructor(private el: ElementRef) {}
}
