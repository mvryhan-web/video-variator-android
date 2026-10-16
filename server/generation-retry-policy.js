// Recovery is never permission to repeat a paid provider submission.
// Existing task polling and settlement of a stored result are the only safe
// automated recovery actions; unknown/ambiguous starts remain review-only.
export function safeGenerationRecoveryAction(job){
 if(!job||job.deleted===true||job.providerTerminal===true)return 'hold_for_review';
 // BASE #10 retains provider operation for audit even after bytes are saved.
 // Once status is finalizing, the only allowed action is to settle the
 // existing wallet reservation; never repeat provider dispatch or polling.
 if(job.status==='finalizing')return 'settle_existing_wallet';
 if(job.status==='processing'&&typeof job.operation==='string'&&job.operation.trim())
  return 'poll_existing_operation';
 return 'hold_for_review';
}

// "retryable" in a public response may only mean retrying a read/poll of the
// SAME persisted job. A timed-out submit may already have incurred provider
// charges, even when the generic error classifier calls it retryable.
export function publicExistingJobRetryable({stage,retryable}={}){
 return retryable===true&&(stage==='provider_poll'||stage==='recovery_poll');
}
