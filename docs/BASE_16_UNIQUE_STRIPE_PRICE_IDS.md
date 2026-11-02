# BASE 16 — One Stripe Price ID per AI credit pack

Existing billingCatalog already validated each unique SKU, but did not reject duplicate Stripe priceId values. Distinct SKU and credit amounts sharing one Price ID could otherwise produce different wallet value for the same customer payment after a misconfiguration.

The new fail-closed check rejects the entire AI credit pack catalog whenever two packs reuse a Price ID, including identical-value packs. Existing malformed-config behavior returns empty packs/rates and null revision. Correct distinct packs work unchanged.

No modifications to actual Stripe Products/Prices, signed webhook, subscriptions, wallet, provider, owner assets, production, or main. Feature flags stay OFF. Focused unit/CI cover catalog and old billing regressions. Full BASE #16 remains PARTIAL until live economics and customer payment/refund tests.