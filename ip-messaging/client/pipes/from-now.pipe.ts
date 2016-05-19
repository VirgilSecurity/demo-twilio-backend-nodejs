import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment'

@Pipe({name: 'ipmFromNow'})
export class FromNowPipe implements PipeTransform {
    
  transform(value: Date): string {    
    return moment(value).fromNow();
  }
}