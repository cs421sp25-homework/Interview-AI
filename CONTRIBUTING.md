# Contributing Guidelines

We follow [GitHub Flow](https://docs.github.com/en/get-started/quickstart/github-flow) as a workflow for introducing changes to the code.

## Create a GitHub Issue

We use GitHub Issues to document the changes we make to the code and to communicate/collaborate with other developers.

- Create a GitHub Issue to document what change you will make to the code and why. (Guide: [How to create an issue from a repository](https://docs.github.com/en/issues/tracking-your-work-with-issues/creating-an-issue#creating-an-issue-from-a-repository))
  - Don't use generic titles such as "Fix Bug." Instead, use descriptive ones such as "Fix Bug: text in popover does not render line breaks."
- There are generally two types of changes: **bug fixes** (something isn't working) and **enhancement** (adding new features, updating existing features, refactoring, etc.)
- If fixing a bug, label the issue with the label `bug`. In the description of the issue:
  - Explain the expected (correct) behavior and the actual (erroneous) behavior. (Include any screenshots, error logs, etc.)
  - Enumerate the steps to reproduce the bug - be as specific as possible.
  - Include other specifications that provide more context about the issue, such as what device/operating system/browser you were using when the issues occurred.
- If making an enhancement, label the issue with the label `enhancement`. In the description of the issue, explain what you are implementing and why (when applicable, make a note of the related User Story by linking to its Notion doc).
  - If this issue corresponds to a task (an action item) to implement a user story, make sure to include a link to the GitHub Issue in the Notion document for that user story (under the "Actions" section).

## Create a Git Branch

We have a `main` and a `dev` branch. The `main` branch is the "production" branch. You should never directly push to this branch. The `dev` branch is the "development" branch. This is our "staging environment" as well, where the team (or clients) can review changes to the app before it is deployed to production. All changes must first be added to the `dev` branch.

- Create a new branch off the `dev` branch (or any other branch that you are currently working on).
- Your branch name must be in the form `<author>_<branch-type>_<branch-name>`:
  - `author` is your name (don't include spaces).
  - `branch-type` is either a `bug` or `feature` or `other`. (If you are refactoring the code, use `other` as the branch name.)
  - `branch-name` is a name describing what the branch is for. You can use `issue-#` where `#` is the issue number.

## Make Changes

This stage includes designing, implementing, testing, and updating documentation, etc.

- Write your code in the new branch.
- As you make changes, [commit early and often](https://youtu.be/Rep7vsUTaVI)!
- Make sure to frequently push your code to the project’s GitHub repository (this way, the team can track your progress).
- If you have questions about other existing code or need help from other developers, leave a comment under the GitHub issue and mention other developers. (Don’t use Slack for this!)

## Make a GitHub Pull Request

- Once you have finished work on your branch and pushed the changes, you should create a pull request from your branch into the current feature branch or the `dev` branch.
- Before making the pull request, check and see if the current feature branch (or `dev` branch) is "ahead" of your branch. If that is the case, it means the ranch has changed since you created your local branch of the other branch. For example, it could be that your teammate has already merged their working branch into the current feature branch or the `dev` branch.
- If the current feature branch (or `dev` branch, whichever you want to merge your working branch into) is ahead of your working branch, you should make a pull request from that branch to your working branch! No need to assign a reviewer at this stage. Just resolve any conflicts and complete the merge.
- Once you have completed the merge (or if the feature/dev branch was not ahead of your working branch), then make a pull request to merge your current working branch into the other branch.
- Please do not approve your pull request immediately. Instead, post in Slack to have your code reviewed.
- Once at least one and ideally two people review it, address any feedback.
- Continue this process until your code is approved!
- Merge your branch!
- At the end of each iteration, the team/tech lead will merge the `dev` into the `main` branch. You should never do this yourself!

## Delete your Git Branch

After you merge your pull request, delete your branch. This indicates that the work on the branch is complete and prevents you or others from accidentally using old branches.

## Resolve the GitHub Issue

- Once you have merged your working branch, mark your issue as resolved.
- Whenever you close an issue, you must leave a comment with a summary of what you have done.
- Make sure to include screenshots or a [Loom video](https://www.loom.com/) showing the app where the bug is fixed, or the new feature is presented.