import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DateTime} from 'luxon';
import {nextOccurrence} from '../server/reminders.js';

const paris='Europe/Paris';
const at=(date)=>DateTime.fromISO(date,{zone:'utc'});
const setup=(extras={})=>({
 date:'2026-10-12',time:'18:00',timezone:paris,
 recurrence:'none',weekdays:[],advanceMinutes:60,...extras
});

test('one-time Paris reminder alerts an hour before the appointment',()=>{
 const r=nextOccurrence(setup(),at('2026-10-10T12:00:00Z'));
 assert.equal(r.eventAt,'2026-10-12T16:00:00.000Z');
 assert.equal(r.triggerAt,'2026-10-12T15:00:00.000Z');
});

test('one-time reminders never reschedule into the past',()=>{
 assert.equal(nextOccurrence(setup(),at('2026-10-13T00:00:00Z')),null);
});

test('weekly Monday Tuesday Saturday recurrence schedules selected day only',()=>{
 const data=setup({recurrence:'weekly',weekdays:[1,2,6]});
 const a=nextOccurrence(data,at('2026-10-12T18:00:00Z'));
 assert.equal(a.eventAt,'2026-10-13T16:00:00.000Z');
 assert.equal(a.triggerAt,'2026-10-13T15:00:00.000Z');
 const b=nextOccurrence(data,at('2026-10-13T20:00:00Z'));
 assert.equal(b.eventAt,'2026-10-17T16:00:00.000Z');
});

test('daily recurring notifications follow time zone across DST',()=>{
 const data=setup({recurrence:'daily',date:'2026-10-24'});
 const before=nextOccurrence(data,at('2026-10-24T12:00:00Z'));
 const after=nextOccurrence(data,at('2026-10-25T12:00:00Z'));
 assert.equal(before.eventAt,'2026-10-24T16:00:00.000Z');
 assert.equal(after.eventAt,'2026-10-25T17:00:00.000Z');
 assert.equal(after.triggerAt,'2026-10-25T16:00:00.000Z');
});

test('monthly recurring reminders clamp the 31st to a shorter month',()=>{
 const data=setup({date:'2027-01-31',time:'10:00',recurrence:'monthly'});
 const feb=nextOccurrence(data,at('2027-02-01T00:00:00Z'));
 assert.equal(feb.eventAt,'2027-02-28T09:00:00.000Z');
});

test('a one-time reminder saved within its notice period notifies promptly',()=>{
 const data=setup({date:'2026-10-10',time:'18:00'});
 const now=at('2026-10-10T15:30:00Z');
 const result=nextOccurrence(data,now);
 assert.equal(result.eventAt,'2026-10-10T16:00:00.000Z');
 assert.equal(result.triggerAt,'2026-10-10T15:30:10.000Z');
});
