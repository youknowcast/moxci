import { notifySlack } from "./slack-notify";
import { getArtifactUrl } from "./get-artifact";
import { notifyGithubPr } from "./github-notify";
import { notifyGithubCiStatus } from "./github-create-status";
type Options = {
  message: string;
  slack_message: string;
  label: string;
};

export const moxci = async (targetPath: string, options: Options) => {
  const {
    CIRCLE_PULL_REQUEST,
    CIRCLE_BUILD_NUM,
    GITHUB_TOKEN,
    CIRCLE_TOKEN,
    CIRCLE_PROJECT_USERNAME,
    CIRCLE_PROJECT_REPONAME,
    CIRCLE_SHA1,
    SLACK_WEBHOOK
  } = process.env;

  // Validation

  if (!CIRCLE_PROJECT_USERNAME) {
    console.error("Cannot find project username");
    return;
  }

  if (!CIRCLE_PROJECT_REPONAME) {
    console.error("Cannot find project reponame");
    return;
  }

  if (!CIRCLE_BUILD_NUM) {
    console.error("Cannot find build number");
    return;
  }

  if (!CIRCLE_TOKEN) {
    console.error("The environment variable CIRCLE_TOKEN must be required");
    return;
  }

  if (!CIRCLE_SHA1) {
    console.error("Cannot find commit SHA");
    return;
  }

  if (!CIRCLE_PULL_REQUEST) {
    console.log("CIRCLE_PULL_REQUEST is empty");
  }

  const circleciApiUrl = `https://circleci.com/api/v1.1/project/github/${CIRCLE_PROJECT_USERNAME}/${CIRCLE_PROJECT_REPONAME}/${CIRCLE_BUILD_NUM}/artifacts?circle-token=${CIRCLE_TOKEN}`;
  const artifactUrl = await getArtifactUrl(circleciApiUrl, targetPath);

  // Slack
  if (SLACK_WEBHOOK) {
    notifySlack(
      SLACK_WEBHOOK,
      artifactUrl,
      options.slack_message || options.message
    );
  } else {
    console.log("Slack webhook is not set or invalid");
  }

  // Github
  if (GITHUB_TOKEN) {
    if (CIRCLE_PULL_REQUEST) {
      const pullRequestId = Number(CIRCLE_PULL_REQUEST.split("/").pop());
      if (!pullRequestId) {
        console.error("Invalid Pull Request Id");
        return;
      }
      notifyGithubPr({
        owner: CIRCLE_PROJECT_USERNAME,
        repo: CIRCLE_PROJECT_REPONAME,
        issue_number: pullRequestId,
        token: GITHUB_TOKEN,
        artifactUrl,
        body: options.message
      });
    }

    notifyGithubCiStatus({
      owner: CIRCLE_PROJECT_USERNAME,
      repo: CIRCLE_PROJECT_REPONAME,
      token: GITHUB_TOKEN,
      artifactUrl,
      body: options.message,
      sha: CIRCLE_SHA1,
      context: options.label
    });
  } else {
    console.log("Github Token is not set or invalid");
  }
};
