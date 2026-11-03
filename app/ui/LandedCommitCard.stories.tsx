import { LandedCommitCard } from "./LandedCommitCard";

export default { component: LandedCommitCard };

export const Landed = {
  args: {
    repo: "acme/test-repo",
    branch: "main",
    sha: "3f9c2e1a7b8d4c6e5f0a1b2c3d4e5f6a7b8c9d0e",
    title: "Add a README badge",
  },
};
export const NoTitle = { args: { ...Landed.args, title: undefined } };
