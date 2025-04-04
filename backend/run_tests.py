import subprocess
import sys
import os

def collect_tests():
    """Collect all tests (quietly) and write them to test_list.txt."""
    with open("test_list.txt", "w") as f:
        subprocess.run(["pytest", "--collect-only", "-q"], stdout=f, text=True)
    print("Collected all tests into test_list.txt. "
          "Please edit it (comment out lines) if needed.")

def run_selected_tests():
    """Run only the tests that aren't commented out in test_list.txt."""
    # Read lines, ignoring those that start with '#'
    with open("test_list.txt", "r") as f:
        tests_to_run = [
            line.strip()
            for line in f
            if line.strip() and not line.strip().startswith("#")
        ]
    if not tests_to_run:
        print("No tests to run (all commented out or file empty).")
        sys.exit(1)

    cmd = ["pytest"] + tests_to_run
    print(f"Running tests: {tests_to_run}")
    subprocess.run(cmd)

if __name__ == "__main__":
    # Basic usage: python run_tests.py collect OR python run_tests.py run
    if len(sys.argv) < 2:
        print("Usage: python run_tests.py [collect|run]")
        sys.exit(1)

    if sys.argv[1] == "collect":
        collect_tests()
    elif sys.argv[1] == "run":
        run_selected_tests()
    else:
        print("Unknown command. Use 'collect' or 'run'.")
