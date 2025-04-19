const core = require("@actions/core"); // provide utilities to execute command line scripts
const exec = require("@actions/exec"); // provide a lot of functionality to interact with github api & get access to a lot of information from contexts within our action
const github = require("@actions/github"); // provide a lot of functionality to interact with github api & get access to a lot of information from contexts within our action

const validateBranchName = (branchName) =>
  /^[a-zA-Z0-9_\-\.\/]+$/.test(branchName);

const validateDirectoryName = (directoryName) =>
  /^[a-zA-Z0-9_\-\/]+$/.test(directoryName);

async function run() {
  /*
    1. Parse inputs:
      1.1 base branch from which to check for updates
      1.2 target branch to use to create the PR
      1.3 Github Token for authentication purposes (to create PRs)
      1.4 Working directory for which to check for dependencies
    2. Execute the `npm update` command within the working directory
    3. Check whether there are modified package*.json files
    4. If there are modified files:
      4.1 Add and commit files to the target branch
      4.2 Create a PR to the base-branch using the octokit API
    5. Otherwise, conclude the custom action
  */
  const baseBranch = core.getInput("base-branch", {
    required: true,
  });
  const targetBranch = core.getInput("target-branch", {
    required: true,
  });
  const ghToken = core.getInput("gh-token", {
    required: true,
  });
  const workingDirectory = core.getInput("working-directory", {
    required: true,
  });
  const debug = core.getBooleanInput("debug");

  const commonExecOptions = {
    cwd: workingDirectory,
    env: {
      GITHUB_TOKEN: ghToken,
    },
  };
  core.setSecret(ghToken);

  if (!validateBranchName(baseBranch)) {
    core.setFailed(
      `Invalid base branch name: ${baseBranch}. Branch names should include only characters, numbers, underscores, hyphens, forward slashes, and dots.`
    );
    return;
  }

  if (!validateBranchName(targetBranch)) {
    core.setFailed(
      `Invalid target branch name: ${targetBranch}. Branch names should include only characters, numbers, underscores, hyphens, forward slashes, and dots.`
    );
    return;
  }

  if (!validateDirectoryName(workingDirectory)) {
    core.setFailed(
      `Invalid working directory: ${workingDirectory}. Directory names should include only characters, numbers, underscores, hyphens, and forward slashes.`
    );
    return;
  }

  core.info(`[js-dependency-update] - Base branch is ${baseBranch}`);
  core.info(`[js-dependency-update] - Target branch is ${targetBranch}`);
  core.info(
    `[js-dependency-update] - Working directory is ${workingDirectory}`
  );

  await exec.exec("npm update", { ...commonExecOptions });

  const gitStatus = await exec.getExecOutput("git status -s package*.json", {
    ...commonExecOptions,
  });

  if (gitStatus.stdout.length > 0) {
    core.info("[js-dependency-update] - There are updates available!");
    await exec.exec("git config --global user.name 'sudeshnt'");
    await exec.exec("git config --global user.email 'sudeshnt93@gmail.com'");
    await exec.exec(`git checkout -b ${targetBranch}`, [], {
      ...commonExecOptions,
    });
    await exec.exec("git add package.json package-lock.json", [], {
      ...commonExecOptions,
    });
    await exec.exec("git commit -m 'chore: update dependencies'", [], {
      ...commonExecOptions,
    });
    await exec.exec("git push -u origin ${targetBranch} --force", [], {
      // for a real repo, we may not use force push, instead rebase the target branch with the base branch
      ...commonExecOptions,
    });

    const octokit = new github.getOctokit(ghToken);

    try {
      await octokit.rest.pulls.create({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        base: baseBranch,
        head: targetBranch,
        title: "chore: update npm dependencies",
        body: "This PR updates the dependencies to the latest versions.",
      });
    } catch (error) {
      core.error(error);
      core.setFailed(
        `[js-dependency-update] Failed to create PR: ${error.message}. Please check the target branch and the base branch.`
      );
    }
  } else {
    core.info("[js-dependency-update] - No updates at this point in time!");
  }

  if (debug) {
    core.info("Debug mode is enabled");
  }
}

run();
