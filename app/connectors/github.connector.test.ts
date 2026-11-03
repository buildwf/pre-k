import { connect, ConnectorError } from "point/connectors";
import { afterEach, describe, expect, it } from "vitest";
import { fakeGitHub, TEST_REPO } from "../testing/fake-github";
import github from "./github.connector";

const repo = TEST_REPO.full_name;
const setup = () => {
  const fake = fakeGitHub({ repos: [TEST_REPO] });

  return { fake, gh: connect(github, { token: "test-token", fetch: fake.fetch }) };
};

describe("github connector", () => {
  let fake = fakeGitHub();

  afterEach(() => fake.cleanup());

  it("keeps every built-in action", () => {
    for (const name of ["me", "getRepo", "listReposPage", "getPullRequestSummary", "listPullRequestFiles"])
      expect(github.actions).toHaveProperty(name);
  });

  it("opens a pull request and finds it again by branch", async () => {
    const s = setup();
    fake = s.fake;

    expect(await s.gh.findOpenPullRequest({ repo, head: "pre-k/fix-readme-ab12" })).toBeNull();
    const pr = await s.gh.createPullRequest({
      repo,
      head: "pre-k/fix-readme-ab12",
      base: "main",
      title: "Fix the README",
      body: "From a pre-k thread.",
    });

    expect(pr).toEqual({
      number: 1,
      title: "Fix the README",
      state: "open",
      draft: false,
      url: `https://github.com/${repo}/pull/1`,
      head: "pre-k/fix-readme-ab12",
      base: "main",
    });
    expect(await s.gh.findOpenPullRequest({ repo, head: "pre-k/fix-readme-ab12" })).toEqual(pr);
    expect(s.fake.calls.at(-1)?.path).toBe(
      "/repos/buildwf/pre-k-playground/pulls?head=buildwf%3Apre-k%2Ffix-readme-ab12&state=open&per_page=1",
    );
  });

  it("fails with GitHub's 422 when the branch already has an open PR", async () => {
    const s = setup();
    fake = s.fake;
    const input = { repo, head: "pre-k/a", base: "main", title: "A" };

    await s.gh.createPullRequest(input);
    await expect(s.gh.createPullRequest(input)).rejects.toMatchObject({ status: 422 });
  });

  it("does not find a closed PR", async () => {
    const s = setup();
    fake = s.fake;
    await s.gh.createPullRequest({ repo, head: "pre-k/b", base: "main", title: "B" });
    s.fake.setPull(repo, 1, "closed");

    expect(await s.gh.findOpenPullRequest({ repo, head: "pre-k/b" })).toBeNull();
  });

  it("refuses bad input before calling GitHub", async () => {
    const s = setup();
    fake = s.fake;

    await expect(
      s.gh.createPullRequest({ repo: "not a repo", head: "x", base: "main", title: "T" }),
    ).rejects.toThrow(/bad input/);
    await expect(
      s.gh.createPullRequest({ repo, head: "../escape", base: "main", title: "T" }),
    ).rejects.toThrow(/bad input/);
    expect(s.fake.calls).toEqual([]);
  });

  it("surfaces a revoked token as a 401 ConnectorError", async () => {
    const s = setup();
    fake = s.fake;
    s.fake.fail("unauthorized");

    const e = await s.gh.me({}).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ConnectorError);
    expect(e).toMatchObject({ status: 401 });
  });

  it("is a write action, so an agent call asks the person first", () => {
    expect(github.actions.createPullRequest.effect).toBe("write");
    expect(github.actions.findOpenPullRequest.effect).toBe("read");
  });
});
