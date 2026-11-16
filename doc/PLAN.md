
- [x] **Keep prompt boxes for user messages/prompts**.
	- Show it without padding to stand out of model/tools output.
	- Keep color to show effort for corresponding prompt.
	- Remove Pi thinking status in the chat "Thinking level: max", etc.
		- Because it will be reflected in color of the prompt/message in the session history.

- [ ] Make prompt boxes for user messages/prompts options.
  - Opt-out via config.
  - Document in README.
  - The purpose is to avoid modularity violation and side effects.

- [ ] Editor padding setting:
  - It should add padding only to the left part of the prompt box.
  - Is should also pad in the same way the boxes for user messages in the session.
  - Add demo recording with padding?

- [ ] **Add option to demo for error/retrying status visualization**:
  - [ ] Implement mock first if possible.
  - [ ] Adjust spinner and message color.
  - [ ] Adust space between spinner and message.
