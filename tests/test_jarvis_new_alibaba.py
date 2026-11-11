"""Offline checks: zero network, zero model costs, no third-party imports."""
import unittest

from jarvis_new.alibaba import ConfigurationBlocked, SINGAPORE_BASE, resolve_route, status


class ModelStudioSafetyTests(unittest.TestCase):
    def settings(self):
        return {
            "JARVIX_NEW_USE_ALIBABA": "true",
            "JARVIX_NEW_ALLOW_NETWORK": "true",
            "JARVIX_NEW_FREE_QUOTA_VERIFIED": "true",
            "JARVIX_NEW_FREE_MODEL_ALLOWLIST": "verified-model,another-model",
            "JARVIX_NEW_TEXT_MODEL": "verified-model",
            "DASHSCOPE_API_KEY": "test-secret-stays-private",
        }

    def test_disabled_by_default(self):
        with self.assertRaises(ConfigurationBlocked):
            resolve_route({})

    def test_no_network_permission(self):
        values = self.settings()
        values.pop("JARVIX_NEW_ALLOW_NETWORK")
        with self.assertRaisesRegex(ConfigurationBlocked, "disabled"):
            resolve_route(values)

    def test_requires_verified_free_quota(self):
        values = self.settings()
        values.pop("JARVIX_NEW_FREE_QUOTA_VERIFIED")
        with self.assertRaises(ConfigurationBlocked):
            resolve_route(values)

    def test_model_must_be_explicitly_allowlisted(self):
        values = self.settings()
        values["JARVIX_NEW_TEXT_MODEL"] = "wan2.6-t2v"
        with self.assertRaises(ConfigurationBlocked):
            resolve_route(values)

    def test_missing_key_blocked(self):
        values = self.settings()
        values.pop("DASHSCOPE_API_KEY")
        with self.assertRaises(ConfigurationBlocked):
            resolve_route(values)

    def test_existing_voiceos_transport_wiring(self):
        values = self.settings()
        route = resolve_route(values)
        child = route.voiceos_environment({})
        self.assertEqual(child["OPENAI_API_BASE"], SINGAPORE_BASE)
        self.assertEqual(child["VOICEOS_LLM_API_BASE"], SINGAPORE_BASE)
        self.assertEqual(child["OPENAI_API_KEY"], values["DASHSCOPE_API_KEY"])
        self.assertEqual(child["LLM_PROVIDER"], "api")
        self.assertNotIn(values["DASHSCOPE_API_KEY"], repr(route))
        self.assertNotIn(values["DASHSCOPE_API_KEY"], str(route.safe_details()))

    def test_workspace_endpoint_and_invalid_workspace(self):
        values = self.settings()
        values["JARVIX_NEW_ALIBABA_WORKSPACE_ID"] = "llm-test123"
        self.assertEqual(
            resolve_route(values).base_url,
            "https://llm-test123.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
        )
        values["JARVIX_NEW_ALIBABA_WORKSPACE_ID"] = "bad.example.com"
        with self.assertRaises(ConfigurationBlocked):
            resolve_route(values)

    def test_read_only_diagnostics(self):
        data = status(self.settings())
        self.assertTrue(data["key_configured"])
        self.assertNotIn(self.settings()["DASHSCOPE_API_KEY"], str(data))


if __name__ == "__main__":
    unittest.main()
