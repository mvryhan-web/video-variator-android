export function pollClaimSeconds(value=5){
 const n=Number(value);return Number.isFinite(n)?Math.max(3,Math.min(60,Math.floor(n))):5;
}
export async function claimProviderPoll(db,jobId,{minSeconds=5}={}){
 const seconds=pollClaimSeconds(minSeconds);
 const {rows}=await db.query(`UPDATE vv_generation_jobs SET last_polled_at=NOW()
  WHERE id=$1 AND status='processing' AND operation IS NOT NULL AND deleted=false
    AND (last_polled_at IS NULL OR last_polled_at<=NOW()-make_interval(secs=>$2::int))
  RETURNING last_polled_at`,[jobId,seconds]);
 return rows.length>0;
}
