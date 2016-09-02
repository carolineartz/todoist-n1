import {
  ComponentRegistry
} from 'nylas-exports';

import TodoistSidebar from './todoist-sidebar';

export function activate(state) {
  this.state = state;

  ComponentRegistry.register(TodoistSidebar, {
    role: 'MessageListSidebar:ContactCard',
  });
}

export function serialize() {
  return this.state;
}

export function deactivate() {
  ComponentRegistry.unregister(TodoistSidebar);
}
