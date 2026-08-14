# Tanstack DB in action

The team at tansack, makers of tanstack query aka react-query partnered with the [ElectricSQL](https://electric.ax/) team to give us s ething truly awesome

This library excites me for 2 reasons

### Joining data from multiple sources

Anyhthjng you can express as a cloction can be jined to another collection with sql like semantics and te library auotmtically jandles mitigating against N+1 querues

```ts
// Left join - all users, even without posts
const allUsers = createLiveQueryCollection((q) =>
  q
    .from({ user: usersCollection })
    .leftJoin({ post: postsCollection }, ({ user, post }) => eq(user.id, post.userId)),
);
```

### Basic local first functionality

The library shipped persistence in its latest version backed by sqlite with web and react native adapters enabling for some true local first approaches all of which s porvider and backend agnostic

In my usage of the library I have discoverd a few cool apporaches that make lie with this llbrary better
