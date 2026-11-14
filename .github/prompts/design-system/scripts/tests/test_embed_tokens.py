"""Exercise token ancestor lookup through the CLI, including the Windows root."""

import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "embed-tokens.cjs"


@unittest.skipUnless(shutil.which("node"), "node not available")
class TestTokenAncestorLookup(unittest.TestCase):
    def run_script(self, directory, *arguments):
        return subprocess.run(
            [shutil.which("node"), str(SCRIPT), *arguments],
            cwd=directory, capture_output=True, text=True, timeout=3,
        )

    def test_missing_tokens_exits_at_the_filesystem_root(self):
        with tempfile.TemporaryDirectory() as temporary:
            result = self.run_script(temporary)
        self.assertEqual(result.returncode, 1)
        self.assertIn("Could not find assets/design-tokens.css", result.stderr)

    def test_nearest_ancestor_tokens_are_embedded_with_requested_options(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "assets").mkdir()
            (root / "assets/design-tokens.css").write_text(
                ":root { --color-primary: #123456; --unused: #FFFFFF; }", encoding="utf-8",
            )
            nested = root / "first/second"
            nested.mkdir(parents=True)
            result = self.run_script(nested, "--minimal", "--style")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("<style>", result.stdout)
        self.assertIn("--color-primary: #123456;", result.stdout)
        self.assertNotIn("--unused", result.stdout)


if __name__ == "__main__":
    unittest.main()
