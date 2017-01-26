import { Directive, Input } from '@angular/core';

declare var jQuery: any;

@Directive({
    selector: '[ipmModalTrigger]',
    host: {
        '(click)': 'onClick()'
    }
})

export class ModalTriggerDirective {
    
    @Input('ipmModalTrigger') public data: any;
    @Input('onOk') onOk: Function;
    @Input('onCancel') onCancel: Function;

    constructor() { }

    onClick() {
        if (typeof jQuery === 'undefined') {
            console.log('jQuery is not loaded');
            return;
        }
        
        if (!this.data.hasOwnProperty('selector')) {
            console.log('target selector missing for modal');
            return;
        }

        jQuery('.ui.modal.' + this.data.selector)
            .modal({
                onApprove: this.onOk,
                onDeny:    this.onCancel
            })
            .modal('show');

    }

}