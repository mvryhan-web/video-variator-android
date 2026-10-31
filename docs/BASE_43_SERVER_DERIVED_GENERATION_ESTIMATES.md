# BASE #43 — approximate generations from approved server rate only

Original BASE §43 asks customers to understand the approximate number of AI generations available with an approved subscription AI-credit allowance or prepaid credit pack. Before this change Pricing showed credit counts and price, but no usage estimate.

`approvedGenerationEstimates(config,credits)` reads only the server-supplied `AI_CREDIT_RATES_JSON` projection exposed as `/api/ai-billing/config` `rates`; it does **not** guess Image/Video costs, combine allocations, fabricate credits, or use model provider costs to invent a consumer price. If a valid positive unique rate is unavailable for an output kind, that kind is omitted. If no supported rate applies, no generation estimate is displayed.

The UI says estimates are alternatives **if the entire credit allowance is spent on one kind**, and notes that model, quality, duration and output quantity affect the actual amount. It only decorates an existing server-approved credit-pack or subscription allowance. The real server quote, wallet reserve/capture and Stripe signed payment gates remain authoritative; displaying an estimate does **not** make checkout enabled or a plan newly approved. No private media or user data is shown.

Tests include approved Image/Video rates, lower-than-one-generation balances, zero/malformed/duplicate rates and safely bounded positive credit quantities. Current BASE #43 still PARTIAL / NOT LIVE; owner-approved real economics, terms, provider availability, trial subscription and staging acceptance remain required.
