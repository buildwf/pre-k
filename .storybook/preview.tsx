// Every story renders inside the app's Window, so stories get the kit's colors in light and dark like the windows do.
// A story that draws its own Window (the recipes) sets parameters: { window: false }.
import type { ReactElement } from "react";
import { Window } from "../app/ui/Window";

export default {
  decorators: [
    (Story: () => ReactElement, { parameters }: { parameters: { window?: boolean } }) =>
      parameters.window === false ? (
        <Story />
      ) : (
        <Window>
          <Story />
        </Window>
      ),
  ],
};
