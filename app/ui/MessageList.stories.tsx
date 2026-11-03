import { Message } from "./Message";
import { MessageList } from "./MessageList";

export default { component: MessageList };

export const Conversation = {
  args: {
    children: [
      <Message key="1" from="you">
        Add a test for the files router.
      </Message>,
      <Message key="2" from="tool" title="files.read">
        {'{"path":"app/rpc/files.ts"}'}
      </Message>,
      <Message key="3" from="agent">
        Added files.test.ts with two cases.
      </Message>,
    ],
  },
};
