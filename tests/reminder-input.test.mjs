import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseReminderText,extractTicketDateTimes} from '../app/src/main/assets/reminder-input-parser.js';
const now=new Date(2026,9,10,13,34);
test('Russian spoken reminder is the primary task entry',()=>{
 const x=parseReminderText('Напомни завтра в 18:00 позвонить врачу за час',now);
 assert.equal(x.date,'2026-10-11');
 assert.equal(x.time,'18:00');
 assert.equal(x.advanceMinutes,60);
 assert.match(x.title,/позвонить врачу/i);
});
test('spoken monthly deadline and date without year',()=>{
 const x=parseReminderText('Напомни 15 ноября в 14:30 выключить подписку',now);
 assert.equal(x.date,'2026-11-15');
 assert.equal(x.time,'14:30');
});
test('recognized French and English dates',()=>{
 assert.equal(parseReminderText('Remind me 12 November 2026 at 14:30',now).date,'2026-11-12');
 assert.equal(parseReminderText('Rappelle-moi demain à 12:15',now).time,'12:15');
});
test('weekly voice recurrence contains all selected days',()=>{
 const x=parseReminderText('Каждый понедельник, вторник и субботу в 18:00 заниматься спортом',now);
 assert.equal(x.recurrence,'weekly');
 assert.deepEqual(x.weekdays,[1,2,6]);
 assert.equal(x.time,'18:00');
});
test('voice detects ambiguous times without choosing one',()=>{
 const x=parseReminderText('Встреча 12.10.2026 14:00 или 16:30',now);
 assert.equal(x.time,null);
 assert.ok(x.notes.includes('MULTIPLE_TIMES'));
});
test('OCR ticket offers multiple dates and times for human confirmation',()=>{
 const x=extractTicketDateTimes('DEPART 14 NOV 2026 08:15 ARRIVAL 15 NOV 2026 11:40',now);
 assert.deepEqual(x.dates.map(v=>v.date),['2026-11-14','2026-11-15']);
 assert.deepEqual(x.times,['08:15','11:40']);
});
test('not every photographed number should be interpreted as a date',()=>{
 const x=extractTicketDateTimes('Train 987654 Seat 12 Coach 9 Time 18:30',now);
 assert.equal(x.dates.length,0);
 assert.deepEqual(x.times,['18:30']);
});

test('natural spoken times without colon and one month deadline',()=>{
 const a=parseReminderText('Напомни завтра в 18 часов пойти на спорт',now);
 assert.equal(a.date,'2026-10-11');
 assert.equal(a.time,'18:00');
 const b=parseReminderText('Через месяц в 19 отключить подписку',now);
 assert.equal(b.date,'2026-11-10');
 assert.equal(b.time,'19:00');
});
