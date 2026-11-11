"""Store MSIX manifest tests; no package, certificate, Store account or network."""
import importlib.util
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

FILE = Path(__file__).resolve().parents[1] / "scripts" / "jarvix_new_store_package.py"
SPEC = importlib.util.spec_from_file_location("jarvix_new_store_package", FILE)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class StoreManifestTests(unittest.TestCase):
    def test_owner_identity_is_required(self):
        for name in ("", "X", "../../foo", "<script>", "not real identity"):
            with self.assertRaises(ValueError):
                MODULE.render_manifest(name, "CN=Real Partner Center Publisher", "Verified publisher")

    def test_no_invented_publisher(self):
        with self.assertRaises(ValueError):
            MODULE.render_manifest("Owner.JarvixNew", "Imaginary Company", "Company")
        with self.assertRaises(ValueError):
            MODULE.render_manifest("Owner.JarvixNew", "CN=Foo\nHacked", "Company")

    def test_real_partner_center_registration_values(self):
        # Exact fields supplied by the Microsoft Partner Center account owner.
        # The apparent Jarix/Jarvix spelling difference is deliberately
        # preserved in the PACKAGE IDENTITY: never guess a correction.
        name = "Deepsyq.JarixbyDeepsyq"
        publisher = "CN=7B5BC7EE-DA65-44E2-8CAC-D02C7C2CA333"
        display = "Deepsyq"
        manifest = ET.fromstring(MODULE.render_manifest(name, publisher, display))
        ns = {"f": MODULE.FOUNDATION}
        identity = manifest.find("f:Identity", ns)
        self.assertEqual(identity.attrib["Name"], name)
        self.assertEqual(identity.attrib["Publisher"], publisher)
        props = manifest.find("f:Properties", ns)
        self.assertEqual(props.find("f:PublisherDisplayName", ns).text, display)
        self.assertEqual(props.find("f:DisplayName", ns).text, "JARVIX by DEEPSYQ")

    def test_msix_manifest_matches_owner_identity(self):
        data = MODULE.render_manifest(
            "Owner.JarvixNew", "CN=Actual Verified Identity",
            "Actual Verified Identity", "1.2.3.4")
        doc = ET.fromstring(data)
        ns = {"f": MODULE.FOUNDATION, "uap": MODULE.UAP,
              "rescap": MODULE.RESCAP, "uap10": MODULE.UAP10}
        identity = doc.find("f:Identity", ns)
        self.assertEqual(identity.attrib["Name"], "Owner.JarvixNew")
        self.assertEqual(identity.attrib["Publisher"], "CN=Actual Verified Identity")
        self.assertEqual(identity.attrib["Version"], "1.2.3.4")
        self.assertEqual(identity.attrib["ProcessorArchitecture"], "x64")
        app = doc.find("f:Applications/f:Application", ns)
        self.assertEqual(app.attrib["Executable"], r"JARVIX_NEW\JARVIX_NEW.exe")
        cap = doc.find("f:Capabilities/rescap:Capability", ns)
        self.assertEqual(cap.attrib["Name"], "runFullTrust")
        self.assertEqual(app.attrib[f"{{{MODULE.UAP10}}}TrustLevel"], "mediumIL")
        logo = doc.find("f:Applications/f:Application/uap:VisualElements", ns)
        self.assertEqual(logo.attrib["Square44x44Logo"], r"Assets\Square44x44Logo.png")


if __name__ == "__main__":
    unittest.main()
