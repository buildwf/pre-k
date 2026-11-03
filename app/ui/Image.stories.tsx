import { Image } from "./Image";

// An inline picture, so the stories need no network.
const picture =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect width="200" height="120" fill="%236ea8fe"/><circle cx="60" cy="60" r="36" fill="%23fff8db"/></svg>';

export default { component: Image };

export const Thumbnail = {
  args: { src: picture, alt: "A sun over a blue sky", size: "thumbnail" },
};

export const Medium = { args: { src: picture, alt: "A sun over a blue sky", size: "medium" } };
export const Full = { args: { src: picture, alt: "A sun over a blue sky" } };
