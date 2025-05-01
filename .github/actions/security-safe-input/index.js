const core = require("@actions/core");

async function run() {
  try {
    const prTitle = core.getInput("pr-title");
    if (prTitle.startsWith("feat")) {
      core.setFailed("PR is a feature PR");
    } else {
      core.setFailed("PR is not a feature PR");
    }
  } catch (e) {
    core.setFailed(e.message);
  }
}

run();
